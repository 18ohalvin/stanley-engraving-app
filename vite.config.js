import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import path from 'path';

// Clean empty starting state for production deployment
const SEED_ORDERS = [];

function crossDeviceSyncPlugin() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const dataFile = path.resolve(dataDir, 'orders.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  function getOrders() {
    try {
      if (fs.existsSync(dataFile)) {
        const raw = fs.readFileSync(dataFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading orders.json, using seed orders:', e);
    }
    saveOrders(SEED_ORDERS);
    return SEED_ORDERS;
  }

  function saveOrders(orders) {
    try {
      fs.writeFileSync(dataFile, JSON.stringify(orders, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving orders.json:', e);
    }
  }

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

  return {
    name: 'cross-device-sync-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // SSE Real-time stream endpoint
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

        // GET all orders across all devices
        if (req.url === '/api/orders' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(getOrders()));
          return;
        }

        // POST /api/orders (save or update order from any device)
        if (req.url === '/api/orders' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const orders = getOrders();

              if (Array.isArray(payload)) {
                saveOrders(payload);
                broadcast('orders_updated', payload);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, count: payload.length }));
                return;
              }

              // Single order upsert
              const idx = orders.findIndex(o => o.order_id === payload.order_id);
              if (idx !== -1) {
                orders[idx] = { ...orders[idx], ...payload, updated_at: new Date().toISOString() };
              } else {
                orders.unshift(payload);
              }

              saveOrders(orders);
              broadcast('orders_updated', orders);
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ success: true, order: payload }));
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // POST /api/reset (reset dummy database)
        if (req.url === '/api/reset' && req.method === 'POST') {
          saveOrders(SEED_ORDERS);
          broadcast('orders_updated', SEED_ORDERS);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: true, orders: SEED_ORDERS }));
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
