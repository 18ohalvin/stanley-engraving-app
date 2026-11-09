/**
 * Tenant-scoped Server-Sent Events hub.
 *
 * Every SSE connection gets a scope when it connects:
 *   - staff (via ?token=): global (Super Admin / Developer / HQ) or bound to one store
 *   - public customer (via ?order=): bound to exactly one order and that order's store
 *   - anonymous public: only catalogue-level events (products, stores)
 *
 * Order changes are pushed as single-order deltas, only to the connections that
 * are allowed to see them. Customers never receive other customers' orders; they
 * only get their own order plus a queue-position number.
 */
import {
  verifyAuthSessionToken,
  getCanonicalStore,
  getOrderByIdFromDb,
  getActiveQueueOrderIdsForStore
} from './db.js';

/** @type {Map<import('http').ServerResponse, {staff:boolean, global:boolean, storeKeys:Set<string>, orderId:string|null}>} */
const clients = new Map();

const PUBLIC_EVENTS = new Set(['ping', 'products_updated', 'stores_updated']);
const GLOBAL_STAFF_EVENTS = new Set(['staff_updated']);
const STORE_SCOPED_STAFF_EVENTS = new Set(['machines_updated', 'whatsapp_status', 'whatsapp_notification_dispatched']);

function keyVariants(value) {
  const lower = String(value ?? '').trim().toLowerCase();
  if (!lower) return [];
  const clean = lower.replace(/[^a-z0-9]/g, '');
  return clean && clean !== lower ? [lower, clean] : [lower];
}

function storeIdOf(order) {
  return order ? (order.store_id || order.store_code || order.store_name || '') : '';
}

function matchesStoreValue(storeKeys, value) {
  return keyVariants(value).some(k => storeKeys.has(k));
}

function matchesOrderStore(storeKeys, order) {
  if (!order || storeKeys.size === 0) return false;
  return [order.store_id, order.store_code, order.store_name].some(v => matchesStoreValue(storeKeys, v));
}

export function isGlobalSession(session) {
  if (!session) return false;
  // An empty storeId mirrors GET /api/orders, which returns the full network for such sessions.
  return Boolean(
    session.isDeveloper ||
    session.role === 'Super Admin' ||
    !session.storeId ||
    session.storeId === '*' ||
    session.storeId === 'HQ Central'
  );
}

async function resolveStoreKeys(storeId) {
  const keys = new Set();
  if (!storeId) return keys;
  const canonical = await getCanonicalStore(storeId);
  const values = canonical
    ? [storeId, canonical.id, canonical.code, canonical.name, ...(canonical.aliases || [])]
    : [storeId];
  values.forEach(v => keyVariants(v).forEach(k => keys.add(k)));
  return keys;
}

function write(res, event, serialized) {
  try {
    res.write(`event: ${event}\ndata: ${serialized}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  } catch (e) {
    clients.delete(res);
  }
}

function canStaffSee(scope, storeId) {
  if (!scope.staff) return false;
  if (scope.global || !storeId) return true;
  return matchesStoreValue(scope.storeKeys, storeId);
}

/**
 * GET /api/events?token=<staff token>  |  ?order=<order id or code>
 */
export async function handleSseConnection(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform, private',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Content-Encoding': 'none'
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let closed = false;
  const cleanup = () => {
    closed = true;
    clients.delete(res);
  };
  req.on('close', cleanup);
  res.on('finish', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);

  const scope = { staff: false, global: false, storeKeys: new Set(), orderId: null };
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : null;
    if (token) {
      const session = await verifyAuthSessionToken(token);
      if (session) {
        scope.staff = true;
        scope.global = isGlobalSession(session);
        if (!scope.global) scope.storeKeys = await resolveStoreKeys(session.storeId);
      }
    }
    const orderRef = typeof req.query.order === 'string' ? req.query.order : null;
    const storeRef = typeof req.query.store === 'string' ? req.query.store : null;
    if (!scope.staff && orderRef) {
      const order = await getOrderByIdFromDb(orderRef, storeRef);
      if (order) {
        scope.orderId = order.order_id;
        scope.storeKeys = await resolveStoreKeys(storeIdOf(order));
      } else {
        // The ticket page can open before the order's POST has landed; bind to the id
        // anyway and learn the store when that order is first broadcast.
        scope.orderId = orderRef.replace('#', '').trim();
        if (storeRef) scope.storeKeys = await resolveStoreKeys(storeRef);
      }
    }
  } catch (e) {
    // Fall back to an anonymous public scope
  }

  if (closed) return;
  clients.set(res, scope);
  write(res, 'connected', JSON.stringify({ staff: scope.staff, global: scope.global, orderId: scope.orderId }));
}

/**
 * Generic (non-order) events, routed by sensitivity.
 */
export function broadcast(event, data) {
  const serialized = JSON.stringify(data);

  if (PUBLIC_EVENTS.has(event)) {
    for (const res of clients.keys()) write(res, event, serialized);
    return;
  }

  // Product catalogue changes are needed by the customer flow; other settings are staff-only.
  if (event === 'settings_updated' && data && data.key === 'products') {
    for (const res of clients.keys()) write(res, event, serialized);
    return;
  }

  if (GLOBAL_STAFF_EVENTS.has(event)) {
    for (const [res, scope] of clients) {
      if (scope.staff && scope.global) write(res, event, serialized);
    }
    return;
  }

  if (STORE_SCOPED_STAFF_EVENTS.has(event)) {
    const storeId = data && data.storeId;
    for (const [res, scope] of clients) {
      if (canStaffSee(scope, storeId)) write(res, event, serialized);
    }
    return;
  }

  // Anything else (settings_updated, unknown events) defaults to staff-only.
  for (const [res, scope] of clients) {
    if (scope.staff) write(res, event, serialized);
  }
}

/**
 * Push a single created/updated order to the staff of its store, the global
 * admins, and the customer who owns it. Other customers of the same store
 * receive only their new queue position.
 */
export async function broadcastOrderChange(order, { removed = false } = {}) {
  if (!order || !order.order_id) return;
  const event = removed ? 'order_removed' : 'order_upsert';
  const staffPayload = JSON.stringify(removed ? { order_id: order.order_id } : order);
  const queueWatchers = [];

  for (const [res, scope] of clients) {
    if (scope.staff) {
      if (scope.global || matchesOrderStore(scope.storeKeys, order)) write(res, event, staffPayload);
      continue;
    }
    // The customer's own order (same fields GET /api/orders/public/:id returns).
    if (scope.orderId && scope.orderId === order.order_id) {
      write(res, event, staffPayload);
      if (scope.storeKeys.size === 0) {
        resolveStoreKeys(storeIdOf(order)).then(keys => { scope.storeKeys = keys; }).catch(() => {});
      }
    }
    if (scope.orderId && matchesOrderStore(scope.storeKeys, order)) {
      queueWatchers.push([res, scope]);
    }
  }

  if (queueWatchers.length === 0) return;
  try {
    const queue = await getActiveQueueOrderIdsForStore(storeIdOf(order));
    for (const [res, scope] of queueWatchers) {
      if (!clients.has(res)) continue;
      const idx = queue.indexOf(scope.orderId);
      write(res, 'queue_position', JSON.stringify({ order_id: scope.orderId, queue_ahead: idx > 0 ? idx : 0 }));
    }
  } catch (e) {
    // Queue position is best-effort; the ticket refreshes on focus anyway.
  }
}

/**
 * Bulk writes / wipes: tell affected staff to re-fetch their own scoped list.
 * storeId null = every staff connection.
 */
export function broadcastOrdersResync(storeId = null) {
  const serialized = JSON.stringify({ storeId: storeId || null });
  for (const [res, scope] of clients) {
    if (canStaffSee(scope, storeId)) write(res, 'orders_resync', serialized);
  }
}

export function getConnectedClientCount() {
  return clients.size;
}
