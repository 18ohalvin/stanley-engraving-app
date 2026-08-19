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
    const res = await fetch('/api/orders');
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

async function syncToServer(orders) {
  try {
    if (typeof fetch !== 'undefined') {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orders)
      });
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
