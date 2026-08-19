import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dataFile = path.join(dataDir, 'orders.json');

// Initial seed orders for fallback / reset
const SEED_ORDERS = [];

function getOrders() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading orders.json, fallback to seed orders:', e);
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

// GET all orders
app.get('/api/orders', (req, res) => {
  res.json(getOrders());
});

// POST (save/upsert orders)
app.post('/api/orders', (req, res) => {
  try {
    const payload = req.body;
    const orders = getOrders();

    if (Array.isArray(payload)) {
      saveOrders(payload);
      broadcast('orders_updated', payload);
      return res.json({ success: true, count: payload.length });
    }

    const idx = orders.findIndex(o => o.order_id === payload.order_id);
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], ...payload, updated_at: new Date().toISOString() };
    } else {
      orders.unshift(payload);
    }

    saveOrders(orders);
    broadcast('orders_updated', orders);
    res.json({ success: true, order: payload });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST reset orders
app.post('/api/reset', (req, res) => {
  saveOrders(SEED_ORDERS);
  broadcast('orders_updated', SEED_ORDERS);
  res.json({ success: true, orders: SEED_ORDERS });
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
  console.log(`🚀 Stanley Engraving Standalone Server running at http://0.0.0.0:${PORT}`);
});
