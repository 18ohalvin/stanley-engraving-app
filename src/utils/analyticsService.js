/**
 * Analytics and Webhook Integration Service
 * Manages ops logging and simulated customer notification webhooks
 * Enforces server database as the single source of truth without localStorage
 */

// Active in-memory log caches (No localStorage)
let inMemoryAnalyticsLogs = [];
let inMemoryWhatsAppLogs = [];
const recentClientDispatches = new Map();

// Proactively clear any legacy cached notifications in client localStorage
if (typeof localStorage !== 'undefined') {
  try {
    localStorage.removeItem('stanley_whatsapp_notifications');
    localStorage.removeItem('stanley_whatsapp_webhook_logs');
    localStorage.removeItem('stanley_engraving_analytics_logs');
  } catch (e) {}
}

/**
 * Log completed engraving duration and metadata
 * @param {Object} payload 
 */
export function logEngravingAnalytics(payload) {
  const logEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    orderId: payload.orderId,
    shortCode: payload.shortCode,
    machineId: payload.machineId,
    machineName: payload.machineName,
    durationSeconds: payload.durationSeconds || 0,
    durationFormatted: formatDuration(payload.durationSeconds || 0),
    customerName: payload.customerName,
    model: payload.model,
    size: payload.size,
    orientation: payload.orientation,
    font: payload.font,
    textLength: payload.text ? payload.text.length : 0
  };

  inMemoryAnalyticsLogs.unshift(logEntry);
  if (inMemoryAnalyticsLogs.length > 100) inMemoryAnalyticsLogs.pop();

  return logEntry;
}

/**
 * Retrieve all analytics logs
 */
export function getAnalyticsLogs() {
  return inMemoryAnalyticsLogs;
}

/**
 * Clear all stored analytics and webhook logs
 */
export function clearAnalyticsLogs() {
  inMemoryAnalyticsLogs = [];
  inMemoryWhatsAppLogs = [];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('stanley_whatsapp_notifications');
      localStorage.removeItem('stanley_whatsapp_webhook_logs');
      localStorage.removeItem('stanley_engraving_analytics_logs');
    } catch (e) {}
  }
}

/**
 * Helper to interpolate template variables in WhatsApp messages
 */
export function interpolateWhatsAppMessage(template, vars = {}) {
  if (!template) return '';
  let msg = template;
  msg = msg.replace(/\{customer_name\}/gi, vars.customer_name || 'Customer');
  msg = msg.replace(/\{short_code\}/gi, vars.short_code || '');
  msg = msg.replace(/\{store_name\}/gi, vars.store_name || 'Stanley Store');
  msg = msg.replace(/\{order_id\}/gi, vars.order_id || '');
  msg = msg.replace(/\{queue_number\}/gi, vars.queue_number || vars.short_code || '');
  return msg;
}

/**
 * Trigger WhatsApp notification upon job completion or queue events
 * Dispatches to backend which pulls official English templates directly from database
 * @param {Object} order 
 * @param {string} triggerType 'order_completed' | 'order_accepted' | 'queue_threshold'
 */
export function sendWhatsAppNotification(order, triggerType = 'order_completed') {
  if (!order || !order.phone) return null;

  const dedupKey = `${order.order_id || order.short_code}_${triggerType}`;
  const now = Date.now();
  const lastDispatched = recentClientDispatches.get(dedupKey);
  if (lastDispatched && (now - lastDispatched < 30000)) {
    console.info(`[WHATSAPP DISPATCH] Deduped notification trigger for ${dedupKey} (already sent ${Math.round((now - lastDispatched)/1000)}s ago)`);
    return null;
  }
  recentClientDispatches.set(dedupKey, now);

  const origin = (typeof window !== 'undefined' && window.location && window.location.origin) 
    ? window.location.origin 
    : (process.env.APP_URL || 'http://localhost:3000');
  const ticketCode = order.short_code || order.system_queue_number || order.intake_code || '';
  const storeName = order.store_name || 'Stanley Store';
  const customerName = order.customer_name || 'Customer';

  // Standard English notification for local feedback / logging
  let message = '';
  if (triggerType === 'order_accepted') {
    message = `Hi ${customerName}! Your custom Stanley order #${ticketCode} has been received at ${storeName}. Please wait while we engrave your cup. Track status: ${origin}/queue/${order.order_id}`;
  } else if (triggerType === 'queue_threshold') {
    message = `Hi ${customerName}! Our store queue at ${storeName} is currently busy. Thank you for your patience, we will begin engraving your custom Stanley soon. Track queue: ${origin}/queue/${order.order_id}`;
  } else {
    message = `Hi ${customerName}! Your custom Stanley order #${ticketCode} is engraved and ready for pickup at ${storeName}. Thank you for shopping with Stanley! Check ticket: ${origin}/queue/${order.order_id}`;
  }

  const webhookPayload = {
    id: `wa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    recipientPhone: order.phone,
    recipientName: customerName,
    orderId: order.order_id,
    shortCode: ticketCode,
    storeId: order.store_id || order.store_code || '',
    storeName,
    senderPhone: order.store_phone || '',
    triggerType,
    message,
    status: 'delivered'
  };

  inMemoryWhatsAppLogs.unshift(webhookPayload);
  if (inMemoryWhatsAppLogs.length > 50) inMemoryWhatsAppLogs.pop();

  // Asynchronously dispatch to real WhatsApp engine on backend if in browser
  // Backend renders the official template directly from the central database
  if (typeof window !== 'undefined' && window.location && window.location.origin && order.phone) {
    const storeId = order.store_id || order.store_code || order.store || 'SG001';
    const dispatchUrl = new URL(`/api/whatsapp/${encodeURIComponent(storeId)}/dispatch`, window.location.origin).toString();
    const staffToken = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
    const dispatchHeaders = { 'Content-Type': 'application/json' };
    if (staffToken) dispatchHeaders['Authorization'] = `Bearer ${staffToken}`;
    fetch(dispatchUrl, {
      method: 'POST',
      headers: dispatchHeaders,
      body: JSON.stringify({
        recipientPhone: order.phone,
        orderId: order.order_id,
        triggerType,
        customerName,
        shortCode: ticketCode,
        storeName,
        queueNumber: order.system_queue_number || ticketCode,
        message // Default English message fallback
      })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        if (data.message) {
          webhookPayload.message = data.message;
        }
        console.log(`[WHATSAPP GATEWAY] Real message sent to ${order.phone} via store ${storeId} (ID: ${data.messageId})`);
      } else {
        console.info(`[WHATSAPP GATEWAY] Store ${storeId} message status:`, data.error || data.status);
      }
    }).catch(err => {
      console.debug('[WHATSAPP GATEWAY] Dispatch notice:', err.message);
    });
  }

  console.log(`[WHATSAPP DISPATCH] Notification dispatched to ${order.phone}: "${webhookPayload.message}"`);
  return webhookPayload;
}

/**
 * Retrieve all WhatsApp webhook logs
 */
export function getWhatsAppLogs() {
  return inMemoryWhatsAppLogs;
}

/**
 * Calculate aggregate analytics stats
 */
export function getAnalyticsSummary() {
  const logs = inMemoryAnalyticsLogs;
  const totalCompleted = logs.length;
  if (totalCompleted === 0) {
    return {
      totalCompleted: 0,
      avgDurationSeconds: 0,
      avgDurationFormatted: '00:00',
      fastestDurationFormatted: '00:00'
    };
  }

  const totalSeconds = logs.reduce((sum, entry) => sum + (entry.durationSeconds || 0), 0);
  const avgSeconds = Math.round(totalSeconds / totalCompleted);
  const fastestSeconds = Math.min(...logs.map(e => e.durationSeconds || 9999));

  return {
    totalCompleted,
    avgDurationSeconds: avgSeconds,
    avgDurationFormatted: formatDuration(avgSeconds),
    fastestDurationFormatted: formatDuration(fastestSeconds === 9999 ? 0 : fastestSeconds)
  };
}

function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}
