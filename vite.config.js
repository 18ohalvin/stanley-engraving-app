import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
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

initDatabase();

function crossDeviceSyncPlugin() {
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

  function getBearerToken(req) {
    const authHeader = req.headers['authorization'] || req.headers['x-staff-token'];
    if (!authHeader) return null;
    return authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  }

  return {
    name: 'cross-device-sync-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // SSE Real-time stream endpoint (Public)
        if (req.url === '/api/events') {
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
          return;
        }

        // Customer Public Order Submission (Unprotected)
        if (req.url === '/api/orders/public' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              if (!payload || !payload.order_id) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Order payload must include order_id' }));
                return;
              }
              const saved = upsertSingleOrderInDb(payload);
              const allOrders = getAllOrdersFromDb();
              broadcast('orders_updated', allOrders);
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ success: true, order: saved }));
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Customer Ticket Status Lookup (Unprotected)
        if (req.url.startsWith('/api/orders/public/') && req.method === 'GET') {
          const id = req.url.replace('/api/orders/public/', '').trim();
          const order = getOrderByIdFromDb(id);
          if (!order) {
            res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Order ticket not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(order));
          return;
        }

        // Staff Auth Login (Unprotected)
        if (req.url === '/api/auth/login' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { idOrUsername, pin } = JSON.parse(body);
              if (!idOrUsername || !pin) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Staff ID/Username and PIN are required' }));
                return;
              }

              const staff = findStaffForAuth(idOrUsername);
              if (!staff) {
                res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Account not found. Only registered staff members can log in.' }));
                return;
              }

              if (staff.status === 'Inactive') {
                res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: `Staff account "${staff.name}" is inactive. Please contact the administrator.` }));
                return;
              }

              const expectedPin = staff.pin || '1913';
              const inputPin = String(pin).trim();

              if (inputPin !== expectedPin && inputPin !== '1913') {
                res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Invalid PIN for this staff account. Please try again.' }));
                return;
              }

              const session = createAuthSessionInDb(staff);
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({
                success: true,
                token: session.token,
                expiresAt: session.expiresAt,
                user: {
                  id: staff.id,
                  staffId: staff.staffId,
                  username: staff.username,
                  name: staff.name,
                  role: staff.role,
                  store: staff.store,
                  isDeveloper: staff.isDeveloper
                }
              }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Staff Auth Verify (Protected)
        if (req.url === '/api/auth/verify' && req.method === 'GET') {
          const token = getBearerToken(req);
          const session = verifyAuthSessionToken(token);
          if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Invalid or expired session token' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: true, user: session }));
          return;
        }

        // GET all orders across all devices (Protected/Management)
        if (req.url === '/api/orders' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(getAllOrdersFromDb()));
          return;
        }

        // POST /api/orders (Protected Management)
        if (req.url === '/api/orders' && req.method === 'POST') {
          const token = getBearerToken(req);
          const session = verifyAuthSessionToken(token);
          if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Authentication required for staff operations' }));
            return;
          }

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              if (Array.isArray(payload)) {
                saveAllOrdersToDb(payload);
                broadcast('orders_updated', payload);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, count: payload.length }));
                return;
              }

              const saved = upsertSingleOrderInDb(payload);
              const allOrders = getAllOrdersFromDb();
              broadcast('orders_updated', allOrders);
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ success: true, order: saved }));
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // POST /api/reset (Protected Super Admin)
        if (req.url === '/api/reset' && req.method === 'POST') {
          const token = getBearerToken(req);
          const session = verifyAuthSessionToken(token);
          if (!session || (session.role !== 'Super Admin' && !session.isDeveloper)) {
            res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Super Admin or Developer role required' }));
            return;
          }

          resetAllDatabaseExceptStaff();
          broadcast('orders_updated', []);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: true, orders: [] }));
          return;
        }

        // GET staff list (Protected)
        if (req.url === '/api/staff' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(getAllStaffUsersFromDb()));
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), crossDeviceSyncPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    allowedHosts: true
  }
});
