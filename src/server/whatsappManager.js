import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for WhatsApp auth state and session keys
const SESSIONS_ROOT = path.join(__dirname, '../../data/wa_sessions');

// In-memory store for active store sessions
// Key: storeId (e.g. 'SG001', '004', 'default') -> Value: Session state
const sessions = new Map();

// Optional external broadcast hook (e.g. Server-Sent Events)
let broadcastHandler = null;

export function setBroadcastHandler(handler) {
  broadcastHandler = handler;
}

function notifyStatusUpdate(storeId) {
  const status = getStoreStatus(storeId);
  if (broadcastHandler) {
    try {
      broadcastHandler('whatsapp_status', { storeId, ...status });
    } catch (e) {
      console.warn(`[WA-${storeId}] Broadcast error:`, e.message);
    }
  }
}

let storePhoneResolver = null;

export function setStorePhoneResolver(resolver) {
  storePhoneResolver = resolver;
}

export function normalizePhoneDigits(phone, defaultCountryCode = '62') {
  if (!phone) return '';
  const raw = String(phone).trim();
  if (!raw) return '';

  const cleanDefaultCode = String(defaultCountryCode || '62').replace(/\D/g, '') || '62';

  // If raw string starts with '+', keep the explicit international country code
  if (raw.startsWith('+')) {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('6208')) {
      digits = '62' + digits.slice(3); // +62 0812 -> 62812
    } else if (digits.startsWith('6001')) {
      digits = '60' + digits.slice(3); // +60 012 -> 6012
    }
    return digits;
  }

  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // 1. Handle leading 0 (e.g. 08176530000 -> 628176530000)
  if (digits.startsWith('0')) {
    digits = cleanDefaultCode + digits.replace(/^0+/, '');
  }

  // 2. Handle 6208... (e.g. 6208123456 -> 628123456)
  if (digits.startsWith('6208')) {
    digits = '62' + digits.slice(3);
  }

  // 3. Handle Indonesian mobile numbers starting directly with '8' (e.g. 8176530000, 81277208270)
  if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) {
    digits = (cleanDefaultCode === '65' ? '65' : '62') + digits;
  }

  // 4. Handle Singapore 8-digit numbers (8xxx-xxxx or 9xxx-xxxx)
  if (cleanDefaultCode === '65' && digits.length === 8 && (digits.startsWith('8') || digits.startsWith('9'))) {
    digits = '65' + digits;
  }

  // 5. If digits don't start with known country codes and is 9-12 digits long
  if (!digits.startsWith('62') && !digits.startsWith('65') && !digits.startsWith('60') && !digits.startsWith('1') && !digits.startsWith('44')) {
    if (digits.startsWith('8') || digits.startsWith('9')) {
      digits = cleanDefaultCode + digits;
    }
  }

  return digits;
}

export function arePhonesMatching(phoneA, phoneB) {
  const normA = normalizePhoneDigits(phoneA);
  const normB = normalizePhoneDigits(phoneB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.endsWith(normB) || normB.endsWith(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    if (minLen >= 8) return true;
  }
  return false;
}

/**
 * Format any international or local phone number to WhatsApp JID (@s.whatsapp.net)
 */
export function formatToWhatsAppJid(phone, defaultCountryCode = '62') {
  if (!phone) return null;
  let digits = normalizePhoneDigits(phone, defaultCountryCode);
  if (!digits || digits.length < 8) return null;
  return `${digits}@s.whatsapp.net`;
}

function getStoreSessionDir(storeId) {
  const cleanId = String(storeId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(SESSIONS_ROOT, `store_${cleanId}`);
}

/**
 * Get current session info and status for a store
 */
export function getStoreStatus(storeId) {
  const session = sessions.get(storeId);
  if (!session) {
    // Check if session directory exists on disk with saved credentials
    const sessionDir = getStoreSessionDir(storeId);
    const hasCreds = fs.existsSync(path.join(sessionDir, 'creds.json'));
    return {
      storeId,
      status: hasCreds ? 'saved_offline' : 'disconnected',
      connected: false,
      phone: null,
      qr: null,
      error: null,
      lastUpdated: new Date().toISOString()
    };
  }

  return {
    storeId,
    status: session.status,
    connected: session.status === 'connected',
    phone: session.phone || null,
    qr: session.qrCodeDataUrl || null,
    error: session.error || null,
    lastUpdated: session.lastUpdated || new Date().toISOString()
  };
}

/**
 * Initialize or connect WhatsApp session for a given store
 */
export async function initStoreWhatsApp(storeId, options = {}) {
  const sessionDir = getStoreSessionDir(storeId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // If already connected, return existing status
  const existing = sessions.get(storeId);
  if (existing && existing.sock && existing.status === 'connected') {
    if (options.expectedPhone) existing.expectedPhone = options.expectedPhone;
    return getStoreStatus(storeId);
  }

  // Set up in-memory session object
  const sessionData = existing || {
    storeId,
    status: 'connecting',
    sock: null,
    phone: null,
    qrCodeDataUrl: null,
    expectedPhone: null,
    error: null,
    lastUpdated: new Date().toISOString(),
    isManualStop: false
  };
  sessionData.status = 'connecting';
  sessionData.isManualStop = false;
  sessionData.error = null;

  let expected = options.expectedPhone || null;
  if (!expected && storePhoneResolver) {
    try {
      expected = await storePhoneResolver(storeId);
    } catch (e) {
      console.warn(`[WA-${storeId}] Error resolving expected store phone:`, e.message);
      expected = null;
    }
  }
  if (expected && typeof expected.then === 'function') {
    try {
      expected = await expected;
    } catch (e) {
      expected = null;
    }
  }
  if (expected && typeof expected === 'string' && expected.trim().length > 0) {
    sessionData.expectedPhone = expected.trim();
  } else {
    sessionData.expectedPhone = null;
  }
  sessions.set(storeId, sessionData);
  notifyStatusUpdate(storeId);

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const silentLogger = pino({ level: 'silent' });

  const sock = makeWASocket({
    auth: state,
    logger: silentLogger,
    printQRInTerminal: false,
    browser: ['Stanley Engraving Admin', 'Chrome', '124.0.0']
  });

  sessionData.sock = sock;

  // Save updated credentials whenever changed
  sock.ev.on('creds.update', saveCreds);

  // Monitor connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        sessionData.qrCodeDataUrl = await QRCode.toDataURL(qr, {
          margin: 2,
          width: 300,
          color: {
            dark: '#1F2937',
            light: '#FFFFFF'
          }
        });
        sessionData.status = 'qr_ready';
        sessionData.lastUpdated = new Date().toISOString();
        console.log(`[WA-${storeId}] QR code generated. Ready for store device scan.`);
        notifyStatusUpdate(storeId);
      } catch (qrErr) {
        console.error(`[WA-${storeId}] QR generation failed:`, qrErr);
      }
    }

    if (connection === 'open') {
      // Extract phone number from WhatsApp user object (e.g. '6581234567:12@s.whatsapp.net')
      const rawUser = sock.user?.id || '';
      const cleanPhone = rawUser.split(':')[0].replace(/@.*$/, '');
      sessionData.phone = cleanPhone || sessionData.phone;

      // SECURITY VERIFICATION GUARD: Validate scanned device against expected store phone
      if (sessionData.expectedPhone) {
        const matches = arePhonesMatching(cleanPhone, sessionData.expectedPhone);
        if (!matches) {
          console.warn(`[WA-${storeId}] SECURITY REJECTION: Linked phone (+${cleanPhone}) does not match expected store phone (${sessionData.expectedPhone}). Aborting session.`);
          sessionData.status = 'rejected_mismatch';
          sessionData.error = `Security Rejection: Scanned phone (+${cleanPhone}) does not match official store phone (${sessionData.expectedPhone}). Device unlinked for security.`;
          sessionData.qrCodeDataUrl = null;
          sessionData.lastUpdated = new Date().toISOString();
          notifyStatusUpdate(storeId);

          try {
            await sock.logout();
          } catch (logoutErr) {}

          try {
            if (fs.existsSync(sessionDir)) {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            }
          } catch (rmErr) {}

          return;
        }
      }

      sessionData.status = 'connected';
      sessionData.error = null;
      sessionData.qrCodeDataUrl = null;
      sessionData.lastUpdated = new Date().toISOString();

      console.log(`[WA-${storeId}] WhatsApp Connected successfully! Linked phone: ${sessionData.phone}`);
      notifyStatusUpdate(storeId);
    } else if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      console.log(`[WA-${storeId}] Connection closed. Status code: ${statusCode}. Logged out: ${isLoggedOut}`);

      sessionData.qrCodeDataUrl = null;

      if (isLoggedOut || sessionData.isManualStop) {
        sessionData.status = 'disconnected';
        sessionData.phone = null;
        try {
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
        } catch (rmErr) {
          console.warn(`[WA-${storeId}] Error removing session folder:`, rmErr.message);
        }
        notifyStatusUpdate(storeId);
      } else {
        sessionData.status = 'disconnected';
        notifyStatusUpdate(storeId);
        // Automatically attempt to reconnect after a 3s backoff
        setTimeout(() => {
          if (!sessionData.isManualStop) {
            console.log(`[WA-${storeId}] Reconnecting session...`);
            initStoreWhatsApp(storeId).catch(err => {
              console.warn(`[WA-${storeId}] Reconnect failed:`, err.message);
            });
          }
        }, 3000);
      }
    }
  });

  return getStoreStatus(storeId);
}

/**
 * Disconnect and unlink a store's WhatsApp session
 */
export async function disconnectStore(storeId) {
  const session = sessions.get(storeId);
  const sessionDir = getStoreSessionDir(storeId);

  if (session) {
    session.isManualStop = true;
    session.status = 'disconnected';
    session.qrCodeDataUrl = null;
    session.phone = null;

    if (session.sock) {
      try {
        await session.sock.logout();
      } catch (e) {
        try {
          session.sock.end(undefined);
        } catch (e2) {}
      }
      session.sock = null;
    }
  }

  // Remove saved session files on disk
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`[WA-${storeId}] Error deleting session files:`, err.message);
  }

  sessions.delete(storeId);
  notifyStatusUpdate(storeId);

  return { success: true, storeId, status: 'disconnected' };
}

/**
 * Send a WhatsApp text notification to a customer from a store's linked session
 */
export async function sendStoreWhatsAppMessage(storeId, recipientPhone, messageText) {
  // 1. Try exact store session
  let session = sessions.get(storeId);
  let resolvedStoreId = storeId;

  // 2. If not found or not connected, try alias match (case-insensitive / digits-only)
  if (!session || !session.sock || session.status !== 'connected') {
    const targetClean = String(storeId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [sId, s] of sessions.entries()) {
      if (s && s.sock && s.status === 'connected') {
        const sClean = String(sId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (sClean === targetClean) {
          session = s;
          resolvedStoreId = sId;
          break;
        }
      }
    }
  }

  // 3. Fallback: Use ANY active connected store session (or 'default')
  if (!session || !session.sock || session.status !== 'connected') {
    for (const [sId, s] of sessions.entries()) {
      if (s && s.sock && s.status === 'connected') {
        console.log(`[WA-GATEWAY] Store "${storeId}" session not connected. Falling back to active connected session "${sId}".`);
        session = s;
        resolvedStoreId = sId;
        break;
      }
    }
  }

  if (!session || !session.sock || session.status !== 'connected') {
    return {
      success: false,
      error: `WhatsApp device for store "${storeId}" is not linked or not currently connected.`,
      status: session ? session.status : 'disconnected'
    };
  }

  // Infer default country code from store id or recipient phone
  let defaultCountry = '62';
  const phoneStr = String(recipientPhone || '').trim();
  if (String(storeId).toUpperCase().includes('SG') || phoneStr.startsWith('+65') || phoneStr.startsWith('65')) {
    defaultCountry = '65';
  }

  const jid = formatToWhatsAppJid(recipientPhone, defaultCountry);

  if (!jid) {
    return {
      success: false,
      error: `Invalid recipient phone number: "${recipientPhone}"`
    };
  }

  try {
    let targetJid = jid;

    // Check if number is registered on WhatsApp using Baileys onWhatsApp
    if (typeof session.sock.onWhatsApp === 'function') {
      try {
        const results = await session.sock.onWhatsApp(jid);
        if (Array.isArray(results) && results.length > 0 && results[0]?.exists && results[0]?.jid) {
          targetJid = results[0].jid;
        }
      } catch (onWaErr) {
        // Continue with formatted JID
      }
    }

    const result = await session.sock.sendMessage(targetJid, { text: messageText });
    return {
      success: true,
      messageId: result?.key?.id,
      recipientPhone,
      jid: targetJid,
      storeId: resolvedStoreId,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error(`[WA-${storeId}] Error sending message to ${recipientPhone}:`, err);
    return {
      success: false,
      error: err.message || 'Failed to dispatch WhatsApp message'
    };
  }
}

/**
 * Automatically restore saved sessions from disk upon server boot
 */
export async function autoRestoreSessions() {
  if (!fs.existsSync(SESSIONS_ROOT)) {
    return [];
  }

  try {
    const dirs = fs.readdirSync(SESSIONS_ROOT, { withFileTypes: true });
    const restored = [];

    for (const d of dirs) {
      if (d.isDirectory() && d.name.startsWith('store_')) {
        const storeId = d.name.replace(/^store_/, '');
        const credsPath = path.join(SESSIONS_ROOT, d.name, 'creds.json');
        if (fs.existsSync(credsPath)) {
          console.log(`[WA-BOOT] Auto-restoring linked session for store: ${storeId}`);
          initStoreWhatsApp(storeId).catch(err => {
            console.warn(`[WA-BOOT] Failed to restore session ${storeId}:`, err.message);
          });
          restored.push(storeId);
        }
      }
    }

    return restored;
  } catch (err) {
    console.error('[WA-BOOT] Error scanning session directories:', err);
    return [];
  }
}
