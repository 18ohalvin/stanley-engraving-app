import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';

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
  deleteAuthSessionToken
} from './src/server/db.js';

import { requireAuth, requireSuperAdmin, requireStoreAccess } from './src/server/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Initialize SQLite database
initDatabase();

// Rate limiter for customer public order submissions
const publicOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // Limit each IP to 30 submissions per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order submissions from this IP. Please try again later.' }
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

// ----------------------------------------------------
// PUBLIC ENDPOINTS (Customer PWA & Ticket View)
// ----------------------------------------------------

// Real-time SSE Stream Endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Customer Public Order Submission (Strict Rate Limited)
app.post('/api/orders/public', publicOrderLimiter, (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.order_id) {
      return res.status(400).json({ error: 'Order payload must include order_id' });
    }
    const saved = upsertSingleOrderInDb(payload);
    const allOrders = getAllOrdersFromDb();
    broadcast('orders_updated', allOrders);
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Customer Ticket Status Lookup
app.get('/api/orders/public/:id', (req, res) => {
  const order = getOrderByIdFromDb(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order ticket not found' });
  }
  res.json(order);
});

// ----------------------------------------------------
// AUTHENTICATION ENDPOINTS (Staff PIN Authentication)
// ----------------------------------------------------

// POST /api/auth/login (PIN Authentication against SQLite)
app.post('/api/auth/login', (req, res) => {
  try {
    const { idOrUsername, pin } = req.body;
    if (!idOrUsername || !pin) {
      return res.status(400).json({ error: 'Staff ID/Username and PIN are required' });
    }

    const staff = findStaffForAuth(idOrUsername);
    if (!staff) {
      return res.status(404).json({ error: 'Account not found. Only registered staff members can log in.' });
    }

    if (staff.status === 'Inactive') {
      return res.status(403).json({ error: `Staff account "${staff.name}" is inactive. Please contact the administrator.` });
    }

    if (!staff.pin) return res.status(403).json({ error: 'Account has no PIN configured. Contact Admin.' });
    const expectedPin = String(staff.pin).trim();
    const inputPin = String(pin).trim();

    if (inputPin !== expectedPin) {
      return res.status(401).json({ error: 'Invalid PIN for this staff account. Please try again.' });
    }

    // Create persistent auth session in SQLite
    const session = createAuthSessionInDb(staff);

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
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-staff-token'];
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
    deleteAuthSessionToken(token);
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// MULTI-TENANCY PROTECTED MANAGEMENT ENDPOINTS
// ----------------------------------------------------

// GET orders isolated by storeID
app.get('/api/stores/:storeId/orders', requireAuth, requireStoreAccess, (req, res) => {
  const storeId = req.params.storeId;
  res.json(getAllOrdersFromDb(storeId));
});

// POST save/upsert orders for specific storeID
app.post('/api/stores/:storeId/orders', requireAuth, requireStoreAccess, (req, res) => {
  try {
    const storeId = req.params.storeId;
    const payload = req.body;

    if (Array.isArray(payload)) {
      saveAllOrdersToDb(payload, storeId);
      broadcast('orders_updated', getAllOrdersFromDb());
      return res.json({ success: true, count: payload.length });
    }

    const saved = upsertSingleOrderInDb(payload, storeId);
    broadcast('orders_updated', getAllOrdersFromDb());
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET single order by ID isolated by storeID
app.get('/api/stores/:storeId/orders/:id', requireAuth, requireStoreAccess, (req, res) => {
  const order = getOrderByIdFromDb(req.params.id, req.params.storeId);
  if (!order) {
    return res.status(404).json({ error: 'Order ticket not found for this store' });
  }
  res.json(order);
});

// GET all orders from SQLite (Filtered by staff session storeId if provided)
app.get('/api/orders', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-staff-token'];
  let storeId = null;
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
    const session = verifyAuthSessionToken(token);
    if (session) storeId = session.storeId;
  }
  res.json(getAllOrdersFromDb(storeId));
});

// POST save/upsert orders in SQLite (Protected)
app.post('/api/orders', requireAuth, (req, res) => {
  try {
    const payload = req.body;
    const storeId = req.staffSession ? req.staffSession.storeId : null;

    if (Array.isArray(payload)) {
      saveAllOrdersToDb(payload, storeId);
      broadcast('orders_updated', getAllOrdersFromDb());
      return res.json({ success: true, count: payload.length });
    }

    const saved = upsertSingleOrderInDb(payload, storeId);
    broadcast('orders_updated', getAllOrdersFromDb());
    res.json({ success: true, order: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST reset database (Protected Super Admin)
app.post('/api/reset', requireSuperAdmin, (req, res) => {
  resetAllDatabaseExceptStaff();
  broadcast('orders_updated', []);
  res.json({ success: true, orders: [] });
});

// GET staff users (Protected)
app.get('/api/staff', requireAuth, (req, res) => {
  res.json(getAllStaffUsersFromDb());
});

// POST add/update staff user (Protected Super Admin)
app.post('/api/staff', requireSuperAdmin, (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.staffId || !user.name) {
      return res.status(400).json({ error: 'staffId and name are required' });
    }
    saveStaffUserInDb(user);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE staff user (Protected Super Admin)
app.delete('/api/staff/:id', requireSuperAdmin, (req, res) => {
  const success = deleteStaffUserFromDb(req.params.id);
  if (!success) {
    return res.status(403).json({ error: 'Master Developer account cannot be deleted' });
  }
  res.json({ success: true });
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
  console.log(`🚀 Stanley Engraving Server running with SQLite & Express Auth at http://0.0.0.0:${PORT}`);
});
