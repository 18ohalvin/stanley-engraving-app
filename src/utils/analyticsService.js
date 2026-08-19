/**
 * Analytics and Webhook Integration Service
 * Manages ops logging and simulated customer notification webhooks
 */

const STORAGE_KEY_ANALYTICS = 'stanley_engraving_analytics_logs';
const STORAGE_KEY_WHATSAPP = 'stanley_whatsapp_webhook_logs';

/**
 * Log completed engraving duration and metadata
 * @param {Object} payload 
 */
export function logEngravingAnalytics(payload) {
  const existing = getStoredLogs(STORAGE_KEY_ANALYTICS);
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

  existing.unshift(logEntry);
  // Keep last 100 entries in storage
  if (existing.length > 100) existing.pop();

  try {
    localStorage.setItem(STORAGE_KEY_ANALYTICS, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to save analytics log to localStorage', e);
  }

  return logEntry;
}

/**
 * Retrieve all analytics logs
 */
export function getAnalyticsLogs() {
  return getStoredLogs(STORAGE_KEY_ANALYTICS);
}

/**
 * Clear all stored analytics and webhook logs
 */
export function clearAnalyticsLogs() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_ANALYTICS);
      localStorage.removeItem(STORAGE_KEY_WHATSAPP);
    }
  } catch (e) {}
}

/**
 * Trigger simulated WhatsApp Webhook notification upon job completion
 * @param {Object} order 
 */
export function sendWhatsAppNotification(order) {
  const existing = getStoredLogs(STORAGE_KEY_WHATSAPP);
  const webhookPayload = {
    id: `wa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    recipientPhone: order.phone,
    recipientName: order.customer_name,
    orderId: order.order_id,
    shortCode: order.short_code,
    message: `Hi ${order.customer_name}! Your custom Stanley cup (#${order.short_code}) has been laser-engraved and is ready for pickup at Stanley Pondok Indah Mall 5. View your ticket: http://10.77.1.25:5173/queue/${order.order_id}`,
    status: 'delivered'
  };

  existing.unshift(webhookPayload);
  if (existing.length > 50) existing.pop();

  try {
    localStorage.setItem(STORAGE_KEY_WHATSAPP, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to save WhatsApp webhook log to localStorage', e);
  }

  console.log(`[WHATSAPP WEBHOOK] Notification dispatched to ${order.phone}: "${webhookPayload.message}"`);
  return webhookPayload;
}

/**
 * Retrieve all WhatsApp webhook logs
 */
export function getWhatsAppLogs() {
  return getStoredLogs(STORAGE_KEY_WHATSAPP);
}

/**
 * Calculate aggregate analytics stats
 */
export function getAnalyticsSummary() {
  const logs = getAnalyticsLogs();
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

function getStoredLogs(key) {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
