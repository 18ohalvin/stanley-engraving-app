import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'stanley.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance concurrent reads and writes
db.pragma('journal_mode = WAL');

// Initialize database schema tables
export function initDatabase() {
  // 1. Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      short_code TEXT,
      system_queue_number TEXT,
      intake_code TEXT,
      status TEXT,
      customer_name TEXT,
      phone TEXT,
      email TEXT,
      items_json TEXT,
      duration_seconds INTEGER DEFAULT 0,
      store_code TEXT,
      store_id TEXT,
      store_name TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // 2. Staff Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_users (
      id TEXT PRIMARY KEY,
      staff_id TEXT UNIQUE,
      name TEXT,
      username TEXT,
      whatsapp TEXT,
      pin TEXT,
      role TEXT,
      store TEXT,
      status TEXT,
      is_developer INTEGER DEFAULT 0,
      is_protected INTEGER DEFAULT 0,
      created_at TEXT
    );
  `);

  // 3. Stores Network table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT,
      city TEXT,
      address TEXT,
      total_machines INTEGER DEFAULT 1,
      active_machines INTEGER DEFAULT 1,
      status TEXT DEFAULT 'Online',
      created_at TEXT
    );
  `);

  // 4. Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT,
      updated_at TEXT
    );
  `);

  // 5. Analytics Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_logs (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      machine_id TEXT,
      duration_seconds INTEGER,
      timestamp TEXT,
      metadata_json TEXT
    );
  `);

  // 6. Auth Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT,
      staff_id TEXT,
      role TEXT,
      store_id TEXT,
      is_developer INTEGER DEFAULT 0,
      expires_at INTEGER,
      created_at TEXT
    );
  `);
  try {
    db.exec(`ALTER TABLE auth_sessions ADD COLUMN store_id TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE stores ADD COLUMN phone TEXT;`);
  } catch (e) {}

  seedDefaultMasterData();
}

function seedDefaultMasterData() {
  // Seed Developer Access Master Account if empty
  const devCheck = db.prepare(`SELECT count(*) as count FROM staff_users WHERE staff_id = 'devsosco01'`).get();
  if (!devCheck || devCheck.count === 0) {
    const seedPin = process.env.DEVELOPER_MASTER_PIN;
    if (!seedPin) {
      throw new Error('DEVELOPER_MASTER_PIN env var must be set to seed the Developer Access master account.');
    }
    db.prepare(`
      INSERT INTO staff_users (id, staff_id, name, username, whatsapp, pin, role, store, status, is_developer, is_protected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `).run(
      'devsosco01',
      'devsosco01',
      'Developer Access',
      'devsosco01',
      '+62 812-3456-7890',
      bcrypt.hashSync(seedPin, 10),
      'Super Admin',
      'HQ Central',
      'Active',
      new Date().toISOString()
    );
  }

  // Migrate legacy data from data/orders.json if orders table is empty
  const legacyOrdersFile = path.resolve(dataDir, 'orders.json');
  const countStmt = db.prepare(`SELECT count(*) as count FROM orders`).get();
  if (countStmt.count === 0 && fs.existsSync(legacyOrdersFile)) {
    try {
      const raw = fs.readFileSync(legacyOrdersFile, 'utf-8');
      const orders = JSON.parse(raw);
      if (Array.isArray(orders) && orders.length > 0) {
        const insertStmt = db.prepare(`
          INSERT OR REPLACE INTO orders (
            order_id, short_code, system_queue_number, intake_code, status,
            customer_name, phone, email, items_json, duration_seconds,
            store_code, store_id, store_name, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertMany = db.transaction((orderList) => {
          for (const o of orderList) {
            insertStmt.run(
              o.order_id,
              o.short_code || '',
              o.system_queue_number || '',
              o.intake_code || '',
              o.status || 'pending_dropoff',
              o.customer_name || '',
              o.phone || '',
              o.email || '',
              JSON.stringify(o.items || []),
              o.durationSeconds || o.duration_seconds || 0,
              o.store_code || '',
              o.store_id || '',
              o.store_name || '',
              o.created_at || new Date().toISOString(),
              o.updated_at || new Date().toISOString()
            );
          }
        });
        insertMany(orders);
      }
    } catch (e) {
      console.warn('Failed to migrate legacy orders.json to SQLite:', e);
    }
  }
}

// ----------------------------------------------------
// ORDERS QUERIES (Multi-Tenancy Data Isolated)
// ----------------------------------------------------
const KNOWN_STORES = [
  { id: '001', code: '001', name: 'Stanley Pondok Indah Mall', aliases: ['001', 'eg-021', 'eg021', 'stanley pondok indah mall', 'stanley pondok indah mall 5', 'pondok indah mall', 'pim'] },
  { id: '002', code: '002', name: 'Stanley Grand Indonesia', aliases: ['002', 'eg-022', 'eg022', 'stanley grand indonesia', 'grand indonesia', 'gi'] },
  { id: '003', code: '003', name: 'Stanley Senayan City', aliases: ['003', 'eg-023', 'eg023', 'stanley senayan city', 'senayan city'] },
  { id: 'SG001', code: 'SG001', name: 'Stanley Singapore Store', aliases: ['sg001', 'sg-001', 'singapore', 'singapore store'] }
];

function getCanonicalStore(inputStr) {
  if (!inputStr) return null;
  const raw = String(inputStr).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const clean = lower.replace(/[^a-z0-9]/g, '');

  for (const store of KNOWN_STORES) {
    if (
      store.id.toLowerCase() === lower ||
      store.code.toLowerCase() === lower ||
      store.name.toLowerCase() === lower ||
      store.id.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
      store.code.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
      store.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
      store.aliases.includes(lower) ||
      store.aliases.includes(clean)
    ) {
      return store;
    }
  }

  return { id: raw, code: raw, name: raw, aliases: [lower, clean] };
}

function isSameStore(storeA, storeB) {
  if (!storeA || !storeB) return false;
  if (storeA === '*' || storeB === '*' || storeA === 'HQ Central' || storeB === 'HQ Central') return true;

  const sA = getCanonicalStore(storeA);
  const sB = getCanonicalStore(storeB);

  if (sA && sB) {
    if (sA.code === sB.code || sA.id === sB.id) return true;
  }

  const a = String(storeA).trim().toLowerCase();
  const b = String(storeB).trim().toLowerCase();
  if (a === b) return true;

  const cleanA = a.replace(/[^a-z0-9]/g, '');
  const cleanB = b.replace(/[^a-z0-9]/g, '');
  if (!cleanA || !cleanB) return false;
  return cleanA === cleanB;
}

export function getNextQueueNumberFromDb(storeId, dateStr = null) {
  const getYYYYMMDD = (dateInput) => {
    if (!dateInput) return new Date().toISOString().split('T')[0];
    if (typeof dateInput === 'string') {
      const match = dateInput.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    try {
      const d = new Date(dateInput);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {}
    return new Date().toISOString().split('T')[0];
  };

  const dateVal = getYYYYMMDD(dateStr);

  const rows = db.prepare(`
    SELECT system_queue_number, short_code, store_id, store_code, store_name
    FROM orders
    WHERE (DATE(created_at) = CURRENT_DATE OR DATE(created_at) = DATE(?) OR created_at LIKE ? || '%')
      AND status IN ('in_queue', 'engraving_in_progress', 'ready_for_pickup')
  `).all(dateVal, dateVal);

  let highest = 0;
  for (const r of rows) {
    if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
      const matchId = isSameStore(r.store_id, storeId);
      const matchCode = isSameStore(r.store_code, storeId);
      const matchName = isSameStore(r.store_name, storeId);
      if (!matchId && !matchCode && !matchName) continue;
    }

    const qNum = parseInt(r.system_queue_number, 10);
    const sNum = parseInt(r.short_code, 10);

    if (!isNaN(qNum) && qNum > highest) highest = qNum;
    if (!isNaN(sNum) && sNum > highest) highest = sNum;
  }

  const nextNum = highest + 1;
  return String(nextNum).padStart(4, '0');
}

export function getAllOrdersFromDb(storeId) {
  let rows = [];
  if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
    const s = String(storeId).trim().toLowerCase();
    rows = db.prepare(`
      SELECT * FROM orders 
      WHERE LOWER(store_id) = ? OR LOWER(store_code) = ? OR LOWER(store_name) = ?
      ORDER BY created_at DESC
    `).all(s, s, s);
  } else {
    rows = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all();
  }
  return rows.map(r => ({
    ...r,
    items: r.items_json ? JSON.parse(r.items_json) : [],
    durationSeconds: r.duration_seconds
  }));
}

export function saveAllOrdersToDb(orders, storeId) {
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO orders (
      order_id, short_code, system_queue_number, intake_code, status,
      customer_name, phone, email, items_json, duration_seconds,
      store_code, store_id, store_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((orderList) => {
    for (const o of orderList) {
      const finalStore = storeId || o.store_id || o.store_code || '';
      insertStmt.run(
        o.order_id,
        o.short_code || '',
        o.system_queue_number || '',
        o.intake_code || '',
        o.status || 'pending_dropoff',
        o.customer_name || '',
        o.phone || '',
        o.email || '',
        JSON.stringify(o.items || []),
        o.durationSeconds || o.duration_seconds || 0,
        o.store_code || finalStore,
        o.store_id || finalStore,
        o.store_name || '',
        o.created_at || new Date().toISOString(),
        o.updated_at || new Date().toISOString()
      );
    }
  });

  transaction(orders);
}

export function upsertSingleOrderInDb(order, storeId) {
  const targetStoreId = storeId || order.store_id || order.store_code || order.store_name || '';
  const existing = db.prepare(`SELECT * FROM orders WHERE order_id = ?`).get(order.order_id);
  const now = new Date().toISOString();
  
  if (existing && storeId && storeId !== '*' && storeId !== 'HQ Central') {
    const existingStore = (existing.store_id || existing.store_code || existing.store_name || '').trim().toLowerCase();
    const reqStore = String(storeId).trim().toLowerCase();
    if (existingStore && existingStore !== reqStore) {
      throw new Error(`Access denied: Cannot modify order belonging to store "${existing.store_id}"`);
    }
  }

  const finalStoreId = targetStoreId || (existing ? existing.store_id : '');

  if (existing) {
    let queueNum = order.system_queue_number || existing.system_queue_number || null;
    let shortCode = order.short_code || existing.short_code || null;
    const newStatus = order.status || existing.status;

    // If order transitions to in_queue (or beyond) and lacks queueNum/shortCode, generate it now!
    if ((newStatus === 'in_queue' || newStatus === 'engraving_in_progress' || newStatus === 'ready_for_pickup') && !queueNum) {
      queueNum = getNextQueueNumberFromDb(finalStoreId, existing.created_at || now);
      shortCode = queueNum;
    }

    db.prepare(`
      UPDATE orders SET
        short_code = ?, system_queue_number = ?, intake_code = ?, status = ?,
        customer_name = ?, phone = ?, email = ?, items_json = ?, duration_seconds = ?,
        store_code = ?, store_id = ?, store_name = ?, updated_at = ?
      WHERE order_id = ?
    `).run(
      shortCode,
      queueNum,
      order.intake_code || existing.intake_code,
      newStatus,
      order.customer_name || existing.customer_name,
      order.phone || existing.phone,
      order.email || existing.email,
      JSON.stringify(order.items || (existing.items_json ? JSON.parse(existing.items_json) : [])),
      order.durationSeconds !== undefined ? order.durationSeconds : existing.duration_seconds,
      order.store_code || finalStoreId,
      order.store_id || finalStoreId,
      order.store_name || existing.store_name,
      now,
      order.order_id
    );
  } else {
    // New Order Creation: short_code and system_queue_number MUST be null if pending_dropoff
    const newStatus = order.status || 'pending_dropoff';
    let queueNum = order.system_queue_number || null;
    let shortCode = order.short_code || null;

    if (newStatus !== 'pending_dropoff' && !queueNum) {
      queueNum = getNextQueueNumberFromDb(finalStoreId, order.created_at || now);
      shortCode = queueNum;
    }

    db.prepare(`
      INSERT INTO orders (
        order_id, short_code, system_queue_number, intake_code, status,
        customer_name, phone, email, items_json, duration_seconds,
        store_code, store_id, store_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.order_id,
      shortCode,
      queueNum,
      order.intake_code || '',
      newStatus,
      order.customer_name || '',
      order.phone || '',
      order.email || '',
      JSON.stringify(order.items || []),
      order.durationSeconds || 0,
      order.store_code || finalStoreId,
      order.store_id || finalStoreId,
      order.store_name || '',
      order.created_at || now,
      now
    );
  }

  return getOrderByIdFromDb(order.order_id, storeId);
}

export function getOrderByIdFromDb(idOrCode, storeId) {
  let row = null;
  if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
    const s = String(storeId).trim().toLowerCase();
    row = db.prepare(`
      SELECT * FROM orders 
      WHERE (order_id = ? OR short_code = ? OR intake_code = ?)
        AND (LOWER(store_id) = ? OR LOWER(store_code) = ? OR LOWER(store_name) = ?)
    `).get(idOrCode, idOrCode, idOrCode, s, s, s);
  } else {
    row = db.prepare(`
      SELECT * FROM orders 
      WHERE order_id = ? OR short_code = ? OR intake_code = ?
    `).get(idOrCode, idOrCode, idOrCode);
  }

  if (!row) return null;
  return {
    ...row,
    items: row.items_json ? JSON.parse(row.items_json) : [],
    durationSeconds: row.duration_seconds
  };
}

export function clearAllOrdersInDb() {
  db.prepare(`DELETE FROM orders`).run();
}

export function resetAllDatabaseExceptStaff() {
  db.prepare(`DELETE FROM orders`).run();
  db.prepare(`DELETE FROM stores`).run();
  db.prepare(`DELETE FROM settings`).run();
  db.prepare(`DELETE FROM analytics_logs`).run();
  db.prepare(`DELETE FROM auth_sessions`).run();

  const devCheck = db.prepare(`SELECT count(*) as count FROM staff_users WHERE staff_id = 'devsosco01'`).get();
  if (!devCheck || devCheck.count === 0) {
    const seedPin = process.env.DEVELOPER_MASTER_PIN;
    if (!seedPin) {
      throw new Error('DEVELOPER_MASTER_PIN env var must be set to seed the Developer Access master account.');
    }
    db.prepare(`
      INSERT INTO staff_users (id, staff_id, name, username, whatsapp, pin, role, store, status, is_developer, is_protected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `).run(
      'devsosco01',
      'devsosco01',
      'Developer Access',
      'devsosco01',
      '+62 812-3456-7890',
      bcrypt.hashSync(seedPin, 10),
      'Super Admin',
      'HQ Central',
      'Active',
      new Date().toISOString()
    );
  }

  const legacyOrdersFile = path.resolve(dataDir, 'orders.json');
  try {
    fs.writeFileSync(legacyOrdersFile, JSON.stringify([], null, 2), 'utf-8');
  } catch (e) {}
}

// ----------------------------------------------------
// STAFF AUTH & USER QUERIES
// ----------------------------------------------------
export function findStaffForAuth(idOrUsername) {
  const normalized = (idOrUsername || '').trim().toLowerCase();

  const row = db.prepare(`
    SELECT * FROM staff_users 
    WHERE LOWER(staff_id) = ? OR LOWER(username) = ? OR LOWER(name) = ? OR LOWER(id) = ?
  `).get(normalized, normalized, normalized, normalized);

  if (!row) return null;

  return {
    id: row.id,
    staffId: row.staff_id,
    username: row.username,
    name: row.name,
    whatsapp: row.whatsapp,
    pin: row.pin || '',
    role: row.role,
    store: row.store,
    status: row.status,
    isDeveloper: Boolean(row.is_developer),
    isProtected: Boolean(row.is_protected)
  };
}

export function getAllStaffUsersFromDb() {
  const rows = db.prepare(`SELECT * FROM staff_users ORDER BY created_at ASC`).all();
  return rows.map(r => ({
    id: r.id,
    staffId: r.staff_id,
    username: r.username,
    name: r.name,
    whatsapp: r.whatsapp,
    role: r.role,
    store: r.store,
    status: r.status,
    isDeveloper: Boolean(r.is_developer),
    isProtected: Boolean(r.is_protected)
  }));
}

export function saveStaffUserInDb(user) {
  const existing = db.prepare(`SELECT * FROM staff_users WHERE id = ? OR staff_id = ?`).get(user.id, user.staffId);
  const now = new Date().toISOString();
  const newPin = (user.pin || '').trim();

  if (existing) {
    const pinToStore = newPin ? bcrypt.hashSync(newPin, 10) : existing.pin;
    db.prepare(`
      UPDATE staff_users SET
        name = ?, username = ?, whatsapp = ?, pin = ?, role = ?, store = ?, status = ?
      WHERE id = ?
    `).run(
      user.name,
      user.username || user.name,
      user.whatsapp || '',
      pinToStore,
      user.role || 'Staff Store',
      user.store || '',
      user.status || 'Active',
      existing.id
    );
  } else {
    if (!newPin) {
      throw new Error('PIN is required to create a new staff account.');
    }
    db.prepare(`
      INSERT INTO staff_users (id, staff_id, name, username, whatsapp, pin, role, store, status, is_developer, is_protected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id || `usr-${Date.now()}`,
      user.staffId,
      user.name,
      user.username || user.name,
      user.whatsapp || '',
      bcrypt.hashSync(newPin, 10),
      user.role || 'Staff Store',
      user.store || '',
      user.status || 'Active',
      user.isDeveloper ? 1 : 0,
      user.isProtected ? 1 : 0,
      now
    );
  }
}

export function deleteStaffUserFromDb(id) {
  const user = db.prepare(`SELECT * FROM staff_users WHERE id = ?`).get(id);
  if (user && (user.is_developer || user.staff_id === 'devsosco01')) {
    return false; // Protected master account cannot be deleted
  }
  db.prepare(`DELETE FROM staff_users WHERE id = ?`).run(id);
  return true;
}

// ----------------------------------------------------
// AUTH SESSION TOKENS
// ----------------------------------------------------
export function createAuthSessionInDb(user) {
  const token = `stk_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry
  const now = new Date().toISOString();
  const storeId = user.store || user.storeId || user.store_id || '';

  db.prepare(`
    INSERT INTO auth_sessions (token, user_id, staff_id, role, store_id, is_developer, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    token,
    user.id,
    user.staffId,
    user.role,
    storeId,
    user.isDeveloper ? 1 : 0,
    expiresAt,
    now
  );

  return { token, expiresAt, storeId };
}

export function verifyAuthSessionToken(token) {
  if (!token) return null;
  const session = db.prepare(`SELECT * FROM auth_sessions WHERE token = ?`).get(token);
  if (!session) return null;

  if (Date.now() > session.expires_at) {
    db.prepare(`DELETE FROM auth_sessions WHERE token = ?`).run(token);
    return null;
  }

  return {
    userId: session.user_id,
    staffId: session.staff_id,
    role: session.role,
    storeId: session.store_id || '',
    isDeveloper: Boolean(session.is_developer)
  };
}

export function deleteAuthSessionToken(token) {
  db.prepare(`DELETE FROM auth_sessions WHERE token = ?`).run(token);
}

// Initialize database automatically
initDatabase();

export default db;
