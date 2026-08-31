const STORAGE_KEY_ORDERS = 'stanley_engraving_orders';
const STORAGE_KEY_CURRENT_ORDER = 'stanley_current_order_id';

let syncChannel = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    syncChannel = new BroadcastChannel('stanley_sync_channel');
  } catch (e) {}
}

export function getBroadcastChannel() {
  return syncChannel;
}

export function broadcastSyncMessage(type, payload) {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type, payload, timestamp: Date.now() });
    } catch (e) {}
  }
}

/**
 * Get all stored orders from local cache
 */
export function getStoredOrders() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

/**
 * Save orders list to both localStorage and central server
 */
export function saveStoredOrders(orders) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
      window.dispatchEvent(new Event('stanley_orders_updated'));
      broadcastSyncMessage('orders_updated', orders);
    }
    // Sync to central server for cross-device visibility
    syncToServer(orders);
  } catch (err) {
    console.warn('Failed to save orders locally:', err);
  }
}

/**
 * Fetch fresh orders from central server (cross-device sync)
 */
export async function fetchServerOrders() {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/orders', { headers });
    if (res.ok) {
      const orders = await res.json();
      if (Array.isArray(orders) && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
        window.dispatchEvent(new Event('stanley_orders_updated'));
        broadcastSyncMessage('orders_updated', orders);
      }
      return orders;
    }
  } catch (e) {
    // Silent fail in offline/node environment
  }
  return null;
}

/**
 * Wipe client localStorage cache except staff credentials
 */
export function clearAllClientStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_ORDERS);
      localStorage.removeItem(STORAGE_KEY_CURRENT_ORDER);
      localStorage.removeItem('stanley_engraving_analytics_logs');
      localStorage.removeItem('stanley_whatsapp_webhook_logs');
      localStorage.removeItem('stanley_custom_stores');
      localStorage.removeItem('stanley_machines_state');
      localStorage.removeItem('stanley_product_catalog_order');
      localStorage.removeItem('stanley_category_targets');
      localStorage.removeItem('stanley_size_presets');
      window.dispatchEvent(new Event('stanley_orders_updated'));
      broadcastSyncMessage('orders_updated', []);
    }
  } catch (e) {}
}

async function syncToServer(orders) {
  try {
    if (typeof fetch !== 'undefined') {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
      if (token) {
        await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(orders)
        });
      } else if (Array.isArray(orders) && orders.length > 0) {
        // Direct sync for unauthenticated customer PWA submissions
        const latestOrder = orders[0];
        if (latestOrder && latestOrder.order_id) {
          await fetch('/api/orders/public', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(latestOrder)
          });
        }
      }
    }
  } catch (e) {
    // Ignore network fail
  }
}

/**
 * Get an order by ID or short code
 */
export function getOrderById(idOrCode) {
  const orders = getStoredOrders();
  return orders.find(o => o.order_id === idOrCode || o.short_code === idOrCode || o.intake_code === idOrCode);
}
