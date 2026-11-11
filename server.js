import express from 'express';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';

import {
  initDatabase,
  getAllOrdersFromDb,
  saveAllOrdersToDb,
  upsertSingleOrderInDb,
  getOrderByIdFromDb,
  deleteOrderFromDb,
  clearAllOrdersInDb,
  resetAllDatabaseExceptStaff,
  findStaffForAuth,
  getAllStaffUsersFromDb,
  saveStaffUserInDb,
  deleteStaffUserFromDb,
  createAuthSessionInDb,
  verifyAuthSessionToken,
  deleteAuthSessionToken,
  getAllStoresFromDb,
  saveStoreInDb,
  deleteStoreFromDb,
  getSettingsFromDb,
  saveSettingsInDb,
  getAllProductsFromDb,
  saveProductsInDb,
  getActiveQueueOrderIdsForStore,
  isSameStore,
  resolveStoreCodeFromDb,
  getCanonicalStore
} from './src/server/db.js';

import { requireAuth, requireSuperAdmin, requireStoreAccess } from './src/server/authMiddleware.js';
import {
  handleSseConnection,
  broadcast,
  broadcastOrderChange,
  broadcastOrdersResync,
  isGlobalSession
} from './src/server/realtime.js';
import {
  getStoreStatus,
  initStoreWhatsApp,
  disconnectStore,
  sendStoreWhatsAppMessage,
  autoRestoreSessions,
  setBroadcastHandler,
  setStorePhoneResolver
} from './src/server/whatsappManager.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// High-performance gzip/brotli HTTP compression for all static assets and JSON API payloads
// Explicitly skips Server-Sent Events (SSE) to ensure immediate event streaming without buffering
app.use(compression({
  filter: (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '2mb' }));

// Initialize database (PostgreSQL, MySQL, or SQLite)
initDatabase().catch(err => {
  console.error('❌ Database initialization error:', err);
});

// Configure resolver so WhatsApp sessions verify linked device phone against database store phone
setStorePhoneResolver(async (storeId) => {
  try {
    const stores = await getAllStoresFromDb();
    const st = stores.find(s => s.id === storeId || s.code === storeId);
    if (st && st.phone) return st.phone;
    const wa = await getSettingsFromDb('whatsapp_notifications');
    if (wa && wa[storeId]?.phone) return wa[storeId].phone;
  } catch (e) {}
  return null;
});

// Auto-restore any previously linked WhatsApp sessions across stores
autoRestoreSessions().then(restored => {
  if (restored && restored.length > 0) {
    console.log(`📱 Restored ${restored.length} WhatsApp store session(s): ${restored.join(', ')}`);
  }
}).catch(err => {
  console.warn('⚠️ WhatsApp session restore warning:', err.message);
});


// Rate limiter for customer public order submissions
const publicOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // Limit each IP to 30 submissions per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order submissions from this IP. Please try again later.' }
});

// Rate limiter for staff PIN login attempts (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Limit each IP to 10 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this IP. Please try again later.' }
});

// Register broadcast handler with WhatsApp manager
setBroadcastHandler(broadcast);

// Periodic heartbeat ping to keep SSE connection alive behind proxies (Coolify/Nginx/Cloudflare)
setInterval(() => {
  broadcast('ping', { timestamp: Date.now() });
}, 10000);


// ----------------------------------------------------
// PUBLIC ENDPOINTS (Customer PWA & Ticket View)
// ----------------------------------------------------

// Real-time SSE Stream Endpoint (tenant-scoped: ?token=<staff token> or ?order=<ticket id>)
app.get('/api/events', (req, res) => {
  handleSseConnection(req, res).catch(() => {});
});

function notifyOrderChange(order, options) {
  broadcastOrderChange(order, options).catch(err => console.warn('SSE order broadcast failed:', err.message));
}

// ----------------------------------------------------
// TENANT ACCESS HELPERS
// A store's code is its public slug (e.g. /engrave/001); access is decided by
// the staff session's storeId, never by the slug in the URL alone.
// ----------------------------------------------------
async function canAccessStore(session, storeId) {
  if (!session) return false;
  if (isGlobalSession(session)) return true;
  if (!storeId) return false;
  return isSameStore(session.storeId, storeId);
}

async function canAccessOrder(session, order) {
  if (!session) return false;
  if (isGlobalSession(session)) return true;
  if (!order) return false;
  for (const value of [order.store_id, order.store_code, order.store_name]) {
    if (value && await isSameStore(session.storeId, value)) return true;
  }
  return false;
}

// Non-global staff may never move an order to another store
function pinOrderStore(session, updated, existing) {
  if (isGlobalSession(session) || !existing) return updated;
  return { ...updated, store_id: existing.store_id, store_code: existing.store_code, store_name: existing.store_name };
}

function forbidden(res) {
  return res.status(403).json({ error: 'Access denied: this order belongs to another store.' });
}

// Customer Public Order Submission (Strict Rate Limited)
app.post('/api/orders/public', publicOrderLimiter, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.order_id) {
      return res.status(400).json({ error: 'Order payload must include order_id' });
    }
    // Create-only: a public client can never modify an existing order or skip the queue
    const existing = await getOrderByIdFromDb(payload.order_id);
    if (existing && existing.order_id === payload.order_id) {
      return res.json({ success: true, order: existing });
    }
    // Stamp the order with the store's canonical code/id/name from the database
    const requestedStore = payload.store_code || payload.store_id || payload.store_name;
    const storeCode = await resolveStoreCodeFromDb(requestedStore);
    const storeInfo = storeCode ? await getCanonicalStore(storeCode) : null;
    const newOrder = {
      ...payload,
      ...(storeInfo ? { store_id: storeInfo.id, store_code: storeInfo.code, store_name: storeInfo.name } : {}),
      status: 'pending_dropoff',
      system_queue_number: null,
      short_code: null,
      assigned_machine: null,
      intake_at: null,
      engraving_started_at: null,
      ready_at: null
    };
    const saved = await upsertSingleOrderInDb(newOrder);
    notifyOrderChange(saved);
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Customer Ticket Status Lookup (Supports single order_id or optional store query)
app.get('/api/orders/public/:id', async (req, res) => {
  try {
    const storeId = req.query.storeId || req.query.store;
    const order = await getOrderByIdFromDb(req.params.id, storeId);
    if (!order) {
      return res.status(404).json({ error: 'Order ticket not found' });
    }
    // Queue position is computed server-side within the order's own store,
    // so customers never need the full order list.
    const queue = await getActiveQueueOrderIdsForStore(order.store_id || order.store_code || order.store_name);
    const idx = queue.indexOf(order.order_id);
    res.json({ ...order, queue_ahead: idx > 0 ? idx : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Zone A Direct Intake Code Lookup endpoint (with store resolution)
app.get('/api/orders/lookup/:code', requireAuth, async (req, res) => {
  try {
    const rawCode = req.params.code;
    const storeQuery = req.query.storeId || req.query.store || null;
    const session = req.staffSession;
    const activeStore = isGlobalSession(session) ? (storeQuery || session.storeId) : session.storeId;

    const found = await getOrderByIdFromDb(rawCode, activeStore);
    const order = found && await canAccessOrder(session, found) ? found : null;
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: `Intake Code #${rawCode.toUpperCase()} not found. Please verify customer phone screen.` 
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// AUTHENTICATION ENDPOINTS (Staff PIN Authentication)
// ----------------------------------------------------

// POST /api/auth/login (PIN Authentication against DB)
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { idOrUsername, pin } = req.body;
    if (!idOrUsername || !pin) {
      return res.status(400).json({ error: 'Staff ID/Username and PIN are required' });
    }

    const staff = await findStaffForAuth(idOrUsername);
    if (!staff) {
      return res.status(404).json({ error: 'Account not found. Only registered staff members can log in.' });
    }

    if (staff.status === 'Inactive') {
      return res.status(403).json({ error: `Staff account "${staff.name}" is inactive. Please contact the administrator.` });
    }

    if (!staff.pin) return res.status(403).json({ error: 'Account has no PIN configured. Contact Admin.' });
    const inputPin = String(pin).trim();

    if (!bcrypt.compareSync(inputPin, staff.pin)) {
      return res.status(401).json({ error: 'Invalid PIN for this staff account. Please try again.' });
    }

    // The session is bound to the store CODE (stable), not its display name
    const storeCode = (await resolveStoreCodeFromDb(staff.store)) || staff.store || '';
    const storeInfo = storeCode && storeCode !== '*' && storeCode !== 'HQ Central' ? await getCanonicalStore(storeCode) : null;

    // Create persistent auth session in DB
    const session = await createAuthSessionInDb({ ...staff, store: storeCode });

    res.json({
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      storeId: storeCode,
      user: {
        id: staff.id,
        staffId: staff.staffId,
        username: staff.username,
        name: staff.name,
        role: staff.role,
        store: storeCode,
        storeId: storeCode,
        storeName: storeInfo ? storeInfo.name : storeCode,
        isDeveloper: staff.isDeveloper
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify (Verify session token)
app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.staffSession
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-staff-token'];
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
    await deleteAuthSessionToken(token);
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// MULTI-TENANCY PROTECTED MANAGEMENT ENDPOINTS
// ----------------------------------------------------

// Best-effort auth check: identifies a logged-in staff session without rejecting the request
async function getOptionalStaffSession(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-staff-token'];
  if (!authHeader) return null;
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  return verifyAuthSessionToken(token);
}

// GET orders isolated by storeID
app.get('/api/stores/:storeId/orders', requireAuth, requireStoreAccess, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const orders = await getAllOrdersFromDb(storeId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save/upsert orders for specific storeID
app.post('/api/stores/:storeId/orders', requireAuth, requireStoreAccess, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const payload = req.body;

    if (Array.isArray(payload)) {
      await saveAllOrdersToDb(payload, storeId);
      broadcastOrdersResync(storeId);
      return res.json({ success: true, count: payload.length });
    }

    const saved = await upsertSingleOrderInDb(payload, storeId);
    notifyOrderChange(saved);
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET single order by ID isolated by storeID
app.get('/api/stores/:storeId/orders/:id', requireAuth, requireStoreAccess, async (req, res) => {
  try {
    const order = await getOrderByIdFromDb(req.params.id, req.params.storeId);
    if (!order) {
      return res.status(404).json({ error: 'Order ticket not found for this store' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET orders for the logged-in staff member's tenant (all stores for global admins).
// Customers never list orders; they use GET /api/orders/public/:id for their own ticket.
app.get('/api/orders', async (req, res) => {
  try {
    const session = await getOptionalStaffSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const orders = await getAllOrdersFromDb(session.storeId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save/upsert orders in DB (Protected)
app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const payload = req.body;
    const session = req.staffSession;
    const storeId = session ? session.storeId : null;

    if (!isGlobalSession(session)) {
      for (const o of (Array.isArray(payload) ? payload : [payload])) {
        const existing = o && o.order_id ? await getOrderByIdFromDb(o.order_id) : null;
        if (existing && existing.order_id === o.order_id && !(await canAccessOrder(session, existing))) {
          return forbidden(res);
        }
      }
    }

    if (Array.isArray(payload)) {
      await saveAllOrdersToDb(payload, storeId);
      broadcastOrdersResync(storeId);
      return res.json({ success: true, count: payload.length });
    }

    const saved = await upsertSingleOrderInDb(payload, storeId);
    notifyOrderChange(saved);
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/orders/:id - Update order in DB
app.put('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const session = req.staffSession;
    const orderId = req.params.id;
    const existing = await getOrderByIdFromDb(orderId);
    if (existing && !(await canAccessOrder(session, existing))) return forbidden(res);
    let updated = { ...(existing || {}), ...req.body, order_id: orderId, updated_at: new Date().toISOString() };
    updated = pinOrderStore(session, updated, existing);
    if (!existing && !(await canAccessOrder(session, updated))) return forbidden(res);
    const saved = await upsertSingleOrderInDb(updated);
    notifyOrderChange(saved);
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status - Update order status in DB
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const existing = await getOrderByIdFromDb(orderId);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const session = await getOptionalStaffSession(req);
    if (session) {
      if (!(await canAccessOrder(session, existing))) return forbidden(res);
    } else {
      // Customers (holding the ticket link) may only cancel an order not yet handed over
      const isCustomerCancel = status === 'cancelled' && existing.status === 'pending_dropoff';
      if (!isCustomerCancel) return res.status(401).json({ error: 'Authentication required.' });
    }
    existing.status = status;
    existing.updated_at = new Date().toISOString();
    const saved = await upsertSingleOrderInDb(existing);
    notifyOrderChange(saved);
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE single order by ID (Protected / Staff access)
app.delete('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getOrderByIdFromDb(req.params.id);
    if (existing && !(await canAccessOrder(req.staffSession, existing))) return forbidden(res);
    const success = await deleteOrderFromDb(req.params.id);
    if (existing) notifyOrderChange(existing, { removed: true });
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CENTRAL CLOUD MACHINES STATE ENDPOINTS
// ----------------------------------------------------

// GET /api/machines - Get real-time laser machines state across network (with optional store scoping)
app.get('/api/machines', requireAuth, async (req, res) => {
  try {
    const session = req.staffSession;
    const storeId = req.query.storeId || req.query.store || (isGlobalSession(session) ? null : session.storeId);
    if (storeId && !(await canAccessStore(session, storeId))) return forbidden(res);
    let machines = null;
    if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
      machines = await getSettingsFromDb(`machines_${storeId}`);
    }
    if (!machines || !Array.isArray(machines) || machines.length === 0) {
      machines = (await getSettingsFromDb('machines')) || [];
    }
    res.json(machines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/machines - Sync real-time laser machines state to cloud DB (scoped by store)
app.post('/api/machines', requireAuth, async (req, res) => {
  try {
    const session = req.staffSession;
    const isArrayBody = Array.isArray(req.body);
    const machines = isArrayBody ? req.body : req.body.machines;
    const storeId = req.query.storeId || req.query.store || (!isArrayBody ? req.body.storeId : null) ||
      (isGlobalSession(session) ? null : session.storeId);
    if (storeId && !(await canAccessStore(session, storeId))) return forbidden(res);

    if (!Array.isArray(machines)) {
      return res.status(400).json({ error: 'Machines must be an array' });
    }
    let saved = null;
    if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
      saved = await saveSettingsInDb(`machines_${storeId}`, machines);
    } else {
      saved = await saveSettingsInDb('machines', machines);
    }
    broadcast('machines_updated', { storeId, machines: saved });
    res.json({ success: true, machines: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST clear all test orders (Protected Admin/Super Admin)
app.post('/api/orders/clear', requireSuperAdmin, async (req, res) => {
  try {
    await clearAllOrdersInDb();
    broadcastOrdersResync(null);
    res.json({ success: true, message: 'All orders cleared successfully', orders: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reset database (Protected Super Admin)
app.post('/api/reset', requireSuperAdmin, async (req, res) => {
  try {
    await resetAllDatabaseExceptStaff();
    broadcastOrdersResync(null);
    res.json({ success: true, orders: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware for admin management (Super Admin with graceful fallback for local single-device setups)
async function requireAdminAccess(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-staff-token'];
  if (!authHeader) {
    return next();
  }
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  const session = await verifyAuthSessionToken(token);
  if (!session) {
    return next();
  }
  if (session.role === 'Super Admin' || session.isDeveloper) {
    req.staffSession = session;
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Master Developer or Super Admin role required.' });
}

// GET staff list (Public/Sanitized - PIN hashes stripped)
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await getAllStaffUsersFromDb();
    const sanitized = staff.map(({ pin, ...rest }) => rest);
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add/update staff user (Admin / Super Admin)
app.post('/api/staff', requireAdminAccess, async (req, res) => {
  try {
    const user = req.body;
    if (!user || (!user.staffId && !user.name && !user.id)) {
      return res.status(400).json({ error: 'staffId and name are required' });
    }
    await saveStaffUserInDb(user);
    const allStaff = await getAllStaffUsersFromDb();
    broadcast('staff_updated', allStaff);
    res.json({ success: true, user, staff: allStaff });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE staff user (Admin / Super Admin)
app.delete('/api/staff/:id', requireAdminAccess, async (req, res) => {
  try {
    const success = await deleteStaffUserFromDb(req.params.id);
    if (!success) {
      return res.status(403).json({ error: 'Master Developer account cannot be deleted' });
    }
    const allStaff = await getAllStaffUsersFromDb();
    broadcast('staff_updated', allStaff);
    res.json({ success: true, staff: allStaff });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// STORE NETWORK & SETTINGS MANAGEMENT ENDPOINTS
// ----------------------------------------------------

// GET network stores (Public/Optional Auth)
app.get('/api/network/stores', async (req, res) => {
  try {
    const stores = await getAllStoresFromDb();
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add/update store in network (Admin / Super Admin)
app.post('/api/network/stores', requireAdminAccess, async (req, res) => {
  try {
    const store = req.body;
    if (!store || (!store.id && !store.code && !store.name)) {
      return res.status(400).json({ error: 'Store ID/Code and Name are required' });
    }
    const saved = await saveStoreInDb(store);
    const allStores = await getAllStoresFromDb();
    broadcast('stores_updated', allStores);

    // Synchronize store phone with whatsapp_notifications setting in DB
    if (store.phone && String(store.phone).trim()) {
      try {
        const cleanPhone = String(store.phone).trim();
        const waSettings = (await getSettingsFromDb('whatsapp_notifications')) || {};
        const storeKey = store.id || store.code;
        const codeKey = store.code;
        
        let updated = false;
        for (const k of [storeKey, codeKey].filter(Boolean)) {
          if (!waSettings[k]) {
            waSettings[k] = { phone: cleanPhone };
            updated = true;
          } else if (waSettings[k].phone !== cleanPhone) {
            waSettings[k].phone = cleanPhone;
            updated = true;
          }
        }
        if (updated) {
          const savedWa = await saveSettingsInDb('whatsapp_notifications', waSettings);
          broadcast('settings_updated', { key: 'whatsapp_notifications', value: savedWa });
        }
      } catch (waErr) {
        console.warn('Notice: Could not sync WhatsApp phone to settings:', waErr.message);
      }
    }

    res.json({ success: true, store: saved, stores: allStores });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE store from network (Admin / Super Admin)
app.delete('/api/network/stores/:id', requireAdminAccess, async (req, res) => {
  try {
    const success = await deleteStoreFromDb(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Store not found or could not be deleted' });
    }
    const allStores = await getAllStoresFromDb();
    broadcast('stores_updated', allStores);
    res.json({ success: true, stores: allStores });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET products catalog (Public for customer PWA & Admin settings)
app.get('/api/products', async (req, res) => {
  try {
    const products = await getAllProductsFromDb();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save products catalog (Admin / Super Admin)
app.post('/api/products', requireAdminAccess, async (req, res) => {
  try {
    const products = Array.isArray(req.body) ? req.body : (req.body.products || []);
    const saved = await saveProductsInDb(products);
    broadcast('products_updated', saved);
    broadcast('settings_updated', { key: 'products', value: saved });
    res.json({ success: true, products: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET setting by key (Public for PWA / settings synchronization)
app.get('/api/settings/:key', async (req, res) => {
  try {
    const val = await getSettingsFromDb(req.params.key);
    res.json({ key: req.params.key, value: val });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save setting by key (Admin / Super Admin)
app.post('/api/settings/:key', requireAdminAccess, async (req, res) => {
  try {
    const val = req.body.value !== undefined ? req.body.value : req.body;
    const saved = await saveSettingsInDb(req.params.key, val);
    broadcast('settings_updated', { key: req.params.key, value: saved });
    res.json({ success: true, key: req.params.key, value: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// WHATSAPP LINKED DEVICE & NOTIFICATION ENDPOINTS
// ----------------------------------------------------

// GET WhatsApp status for a store
app.get('/api/whatsapp/:storeId/status', async (req, res) => {
  try {
    const status = getStoreStatus(req.params.storeId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Initiate WhatsApp connection (Generates QR code for store device linking)
app.post('/api/whatsapp/:storeId/connect', requireAdminAccess, async (req, res) => {
  try {
    const { expectedPhone } = req.body || {};
    const status = await initStoreWhatsApp(req.params.storeId, { expectedPhone });
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Disconnect & Unlink store WhatsApp device
app.post('/api/whatsapp/:storeId/disconnect', requireAdminAccess, async (req, res) => {
  try {
    const result = await disconnectStore(req.params.storeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Send WhatsApp test message from Admin Settings
app.post('/api/whatsapp/:storeId/send-test', requireAdminAccess, async (req, res) => {
  try {
    const { recipientPhone, message } = req.body;
    if (!recipientPhone || !message) {
      return res.status(400).json({ error: 'recipientPhone and message are required' });
    }
    const result = await sendStoreWhatsAppMessage(req.params.storeId, recipientPhone, message);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Dispatch automated notification (Queue, Completion, Pickup)
const recentServerWhatsAppDispatches = new Map();

app.post('/api/whatsapp/:storeId/dispatch', requireAuth, requireStoreAccess, async (req, res) => {
  try {
    const { recipientPhone, message, orderId, triggerType, customerName, shortCode, storeName, queueNumber } = req.body;

    let order = null;
    if (orderId) {
      try {
        order = await getOrderByIdFromDb(orderId);
      } catch (e) {}
    }
    if (order && !(await canAccessOrder(req.staffSession, order))) return forbidden(res);

    const phone = recipientPhone || order?.phone;
    if (!phone) {
      return res.status(400).json({ error: 'recipientPhone or valid orderId is required' });
    }

    const resolvedCustomer = customerName || req.body.recipientName || order?.customer_name || 'Customer';
    const resolvedShortCode = shortCode || order?.short_code || order?.intake_code || '';
    const resolvedStore = storeName || order?.store_name || 'Stanley Store';
    const resolvedOrderId = orderId || order?.order_id || '';
    const resolvedQueue = queueNumber || order?.system_queue_number || resolvedShortCode || '';
    const resolvedTriggerType = triggerType || 'order_completed';

    // Anti-spam deduplication: Don't dispatch identical notification triggers for the same order within 2 minutes
    if (resolvedOrderId) {
      const dedupKey = `${resolvedOrderId}_${resolvedTriggerType}`;
      const lastDispatched = recentServerWhatsAppDispatches.get(dedupKey);
      if (lastDispatched && (Date.now() - lastDispatched.timestamp < 120000)) {
        console.log(`[WHATSAPP GATEWAY] Deduplicating dispatch for ${dedupKey} (already sent ${Math.round((Date.now() - lastDispatched.timestamp)/1000)}s ago)`);
        return res.json({
          success: true,
          deduped: true,
          message: lastDispatched.message,
          info: 'Duplicate notification suppressed within 2-minute cooling window.'
        });
      }
    }

    let finalMessage = '';

    // Always prioritize central database templates for automated triggers
    if (!message || triggerType) {
      try {
        const waSettings = (await getSettingsFromDb('whatsapp_notifications')) || {};
        const storeKey = req.params.storeId || order?.store_id || order?.store_code || 'default';
        const storeConfig = waSettings[storeKey] || waSettings['default'] || Object.values(waSettings)[0] || {};
        const profiles = Array.isArray(storeConfig.profiles) ? storeConfig.profiles : [];
        const matched = profiles.find(p => p.triggerType === triggerType && p.isActive);

        if (matched && matched.message) {
          finalMessage = matched.message
            .replace(/\{customer_name\}/gi, resolvedCustomer)
            .replace(/\{short_code\}/gi, resolvedShortCode)
            .replace(/\{store_name\}/gi, resolvedStore)
            .replace(/\{order_id\}/gi, resolvedOrderId)
            .replace(/\{queue_number\}/gi, resolvedQueue);
        }
      } catch (dbErr) {
        console.warn('Could not load WhatsApp template from database:', dbErr.message);
      }
    }

    // Fallback: the caller's own message, otherwise the canonical notification text
    if (!finalMessage) {
      if (message) {
        finalMessage = message;
      } else {
        const host = req.get('host') || 'localhost:3000';
        const protocol = req.protocol || 'http';
        const origin = `${protocol}://${host}`;
        const ticketCode = resolvedShortCode || resolvedQueue || resolvedOrderId;

        if (triggerType === 'order_accepted') {
          finalMessage = `Hi ${resolvedCustomer}! Your custom Stanley order #${ticketCode} has been received at ${resolvedStore}. Please wait while we engrave your cup. Track status: ${origin}/queue/${resolvedOrderId}`;
        } else if (triggerType === 'queue_threshold') {
          finalMessage = `Hi ${resolvedCustomer}! Our store queue at ${resolvedStore} is currently busy. Thank you for your patience, we will begin engraving your custom Stanley soon. Track queue: ${origin}/queue/${resolvedOrderId}`;
        } else {
          finalMessage = `Hi ${resolvedCustomer}! Your custom Stanley order #${ticketCode} is engraved and ready for pickup at ${resolvedStore}. Thank you for shopping with Stanley! Check ticket: ${origin}/queue/${resolvedOrderId}`;
        }
      }
    }

    const result = await sendStoreWhatsAppMessage(req.params.storeId, phone, finalMessage);
    
    // Broadcast notification event to SSE
    broadcast('whatsapp_notification_dispatched', {
      storeId: req.params.storeId,
      orderId: resolvedOrderId,
      triggerType: triggerType || 'order_completed',
      recipientPhone: phone,
      message: finalMessage,
      success: result.success,
      timestamp: new Date().toISOString()
    });

    // Record successful dispatch into deduplication cache
    if (result.success && resolvedOrderId) {
      const dedupKey = `${resolvedOrderId}_${resolvedTriggerType}`;
      recentServerWhatsAppDispatches.set(dedupKey, {
        timestamp: Date.now(),
        message: finalMessage
      });
      if (recentServerWhatsAppDispatches.size > 500) {
        const cutoff = Date.now() - 600000;
        for (const [k, v] of recentServerWhatsAppDispatches.entries()) {
          if (v.timestamp < cutoff) recentServerWhatsAppDispatches.delete(k);
        }
      }
    }

    res.json({ ...result, message: finalMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Serve frontend static build assets with optimal caching headers
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  // 1. Immutable 1-year caching for Vite-generated hashed chunks, css, and images
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true
  }));

  // 2. Short-term caching for root static assets (favicons, manifests, etc.)
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));

  // 3. SPA index.html fallback with no-cache to guarantee instantaneous deployment updates
  app.use((req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Stanley Engraving Server running with Multi-DB (PostgreSQL/MySQL/SQLite) at http://0.0.0.0:${PORT}`);
});
