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
const SEED_ORDERS = [
  {
    order_id: '130826-0001',
    intake_code: 'A8R',
    short_code: '0001',
    system_queue_number: '0001',
    customer_name: 'Raissa Sabrina',
    email: 'raissa.sabrina@gmail.com',
    phone: '+6281299887701',
    booking_time: '10:00',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-1',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'RAISSA',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      }
    ]
  },
  {
    order_id: '130826-0002',
    intake_code: '3M2',
    short_code: '0002',
    system_queue_number: '0002',
    customer_name: 'Liovian Kurniawan',
    email: 'liovian.k@outlook.com',
    phone: '+6281311223302',
    booking_time: '10:15',
    created_at: new Date(Date.now() - 3600000 * 4.5).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-2',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '30oz',
        position: 'Vertical',
        text: 'LIOVIAN',
        font: 'Caveat',
        fontId: 'caveat',
        fontClass: 'font-engraving-caveat'
      }
    ]
  },
  {
    order_id: '130826-0003',
    intake_code: '7K9',
    short_code: '0003',
    system_queue_number: '0003',
    customer_name: 'Jane Abigail',
    email: 'jane.abigail@gmail.com',
    phone: '+6281755667703',
    booking_time: '10:30',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-3',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'ABIGAIL',
        font: 'Lobster',
        fontId: 'lobster',
        fontClass: 'font-engraving-lobster'
      }
    ]
  },
  {
    order_id: '130826-0004',
    intake_code: 'B2P',
    short_code: '0004',
    system_queue_number: '0004',
    customer_name: 'Daffa Pratama',
    email: 'daffa.pratama@yahoo.com',
    phone: '+6281899001104',
    booking_time: '10:45',
    created_at: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-4',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '20oz',
        position: 'Vertical',
        text: 'DAFFA',
        font: 'ABeeZee',
        fontId: 'abeezee',
        fontClass: 'font-engraving-abeezee'
      }
    ]
  },
  {
    order_id: '130826-0005',
    intake_code: '8Y4',
    short_code: '0005',
    system_queue_number: '0005',
    customer_name: 'Clarissa Wong',
    email: 'clarissa.wong@gmail.com',
    phone: '+6281922334405',
    booking_time: '11:00',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-5',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'CLARISSA',
        font: 'Pinyon Script',
        fontId: 'pinyon',
        fontClass: 'font-engraving-pinyon'
      }
    ]
  }
];

function getOrders() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Stanley Engraving Standalone Server running at http://0.0.0.0:${PORT}`);
});
