import express from 'express';
import cors from 'cors';
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
  saveProductsInDb
} from './src/server/db.js';

import { requireAuth, requireSuperAdmin, requireStoreAccess } from './src/server/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Initialize database (PostgreSQL, MySQL, or SQLite)
initDatabase().catch(err => {
  console.error('❌ Database initialization error:', err);
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

// Server-Sent Events (SSE) active clients pool
const sseClients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Periodic heartbeat ping to keep SSE connection alive behind proxies (Coolify/Nginx/Cloudflare)
setInterval(() => {
  broadcast('ping', { timestamp: Date.now() });
}, 15000);

// ----------------------------------------------------
// PUBLIC ENDPOINTS (Customer PWA & Ticket View)
// ----------------------------------------------------

// Real-time SSE Stream Endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Customer Public Order Submission (Strict Rate Limited)
app.post('/api/orders/public', publicOrderLimiter, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.order_id) {
      return res.status(400).json({ error: 'Order payload must include order_id' });
    }
    const saved = await upsertSingleOrderInDb(payload);
    const allOrders = await getAllOrdersFromDb();
    broadcast('orders_updated', allOrders);
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
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // Create persistent auth session in DB
    const session = await createAuthSessionInDb(staff);

    res.json({
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      storeId: staff.store || '',
      user: {
        id: staff.id,
        staffId: staff.staffId,
        username: staff.username,
        name: staff.name,
        role: staff.role,
        store: staff.store,
        storeId: staff.store,
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
      const allOrders = await getAllOrdersFromDb();
      broadcast('orders_updated', allOrders);
      return res.json({ success: true, count: payload.length });
    }

    const saved = await upsertSingleOrderInDb(payload, storeId);
    const allOrders = await getAllOrdersFromDb();
    broadcast('orders_updated', allOrders);
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

// GET all orders from DB (filtered by staff session storeId if authenticated;
// customer PII stripped for unauthenticated/public access)
app.get('/api/orders', async (req, res) => {
  try {
    const session = await getOptionalStaffSession(req);
    const orders = await getAllOrdersFromDb(session ? session.storeId : null);
    if (session) {
      return res.json(orders);
    }
    const sanitized = orders.map(({ phone, email, ...rest }) => rest);
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save/upsert orders in DB (Protected)
app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const payload = req.body;
    const storeId = req.staffSession ? req.staffSession.storeId : null;

    if (Array.isArray(payload)) {
      await saveAllOrdersToDb(payload, storeId);
      const allOrders = await getAllOrdersFromDb();
      broadcast('orders_updated', allOrders);
      return res.json({ success: true, count: payload.length });
    }

    const saved = await upsertSingleOrderInDb(payload, storeId);
    const allOrders = await getAllOrdersFromDb();
    broadcast('orders_updated', allOrders);
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST clear all test orders (Protected Admin/Super Admin)
app.post('/api/orders/clear', requireAuth, async (req, res) => {
  try {
    await clearAllOrdersInDb();
    broadcast('orders_updated', []);
    res.json({ success: true, message: 'All orders cleared successfully', orders: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reset database (Protected Super Admin)
app.post('/api/reset', requireSuperAdmin, async (req, res) => {
  try {
    await resetAllDatabaseExceptStaff();
    broadcast('orders_updated', []);
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

// Serve frontend static build assets
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Stanley Engraving Server running with Multi-DB (PostgreSQL/MySQL/SQLite) at http://0.0.0.0:${PORT}`);
});
