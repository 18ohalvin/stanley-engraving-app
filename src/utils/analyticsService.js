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
 * Trigger simulated WhatsApp Webhook notification upon job completion or queue events
 * @param {Object} order 
 * @param {string} triggerType 'order_completed' | 'order_accepted' | 'queue_threshold'
 */
export function sendWhatsAppNotification(order, triggerType = 'order_completed') {
  if (!order || !order.phone) return null;

  // Retrieve personalized notification templates from storage
  let message = '';
  let senderPhone = '';
  try {
    if (typeof localStorage !== 'undefined') {
      const rawNotif = localStorage.getItem('stanley_whatsapp_notifications');
      if (rawNotif) {
        const parsed = JSON.parse(rawNotif);
        const storeKey = order.store_id || order.store_code || order.store || 'default';
        const storeSettings = parsed[storeKey] || parsed['default'] || Object.values(parsed)[0];
        
        if (storeSettings) {
          senderPhone = storeSettings.phone || '';
          const profiles = storeSettings.profiles || [];
          const matched = profiles.find(p => p.triggerType === triggerType && p.isActive);
          if (matched) {
            message = interpolateWhatsAppMessage(matched.message, {
              customer_name: order.customer_name,
              short_code: order.short_code,
              store_name: order.store_name || 'Stanley Store',
              order_id: order.order_id,
              queue_number: order.system_queue_number
            });
          }
        }
      }
    }
  } catch (e) {}

  // Fallback to standard message if no personalized template found
  if (!message) {
    message = `Hi ${order.customer_name}! Your custom Stanley cup (#${order.short_code}) has been laser-engraved and is ready for pickup at ${order.store_name || 'Stanley Store'}. View your ticket: http://10.77.1.25:5173/queue/${order.order_id}`;
  }

  const existing = getStoredLogs(STORAGE_KEY_WHATSAPP);
  const webhookPayload = {
    id: `wa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    recipientPhone: order.phone,
    recipientName: order.customer_name,
    orderId: order.order_id,
    shortCode: order.short_code,
    storeId: order.store_id || order.store_code || '',
    storeName: order.store_name || 'Stanley Store',
    senderPhone: senderPhone || '0812 3456 7890',
    triggerType,
    message,
    status: 'delivered'
  };

  existing.unshift(webhookPayload);
  if (existing.length > 50) existing.pop();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WHATSAPP, JSON.stringify(existing));
    }
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
