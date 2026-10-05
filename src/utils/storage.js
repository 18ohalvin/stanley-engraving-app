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
 * Temporary in-memory cache fallback for non-browser/test environments
 */
let inMemoryOrders = [];

export function getStoredOrders() {
  return inMemoryOrders;
}

/**
 * Update active in-memory orders and broadcast change event
 */
export function saveStoredOrders(orders) {
  inMemoryOrders = Array.isArray(orders) ? orders : [];
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stanley_orders_updated'));
    broadcastSyncMessage('orders_updated', inMemoryOrders);
  }
}

/**
 * Fetch fresh orders directly from central cloud server
 */
export async function fetchServerOrders(storeId = null) {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const url = storeId && storeId !== '*' && storeId !== 'HQ Central'
      ? `/api/stores/${encodeURIComponent(storeId)}/orders`
      : '/api/orders';
    const res = await fetch(url, { headers });
    if (res.ok) {
      const orders = await res.json();
      if (Array.isArray(orders)) {
        inMemoryOrders = orders;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('stanley_orders_updated'));
          broadcastSyncMessage('orders_updated', orders);
        }
        return orders;
      }
    }
  } catch (e) {
    // Return in-memory fallback on network failure
  }
  return inMemoryOrders;
}

/**
 * Wipe client temporary data
 */
export function clearAllClientStorage() {
  inMemoryOrders = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('stanley_engraving_orders');
      localStorage.removeItem('stanley_current_order_id');
      localStorage.removeItem('stanley_machines_state');
      localStorage.removeItem('stanley_custom_stores');
      localStorage.removeItem('stanley_store_overrides');
      window.dispatchEvent(new Event('stanley_orders_updated'));
      broadcastSyncMessage('orders_updated', []);
    }
  } catch (e) {}
}

/**
 * Get an order by ID or short code from active in-memory list
 */
export function getOrderById(idOrCode) {
  const orders = getStoredOrders();
  return orders.find(o => o.order_id === idOrCode || o.short_code === idOrCode || o.intake_code === idOrCode);
}
