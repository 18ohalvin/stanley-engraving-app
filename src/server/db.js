import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
      is_developer INTEGER DEFAULT 0,
      expires_at INTEGER,
      created_at TEXT
    );
  `);

  seedDefaultMasterData();
}

function seedDefaultMasterData() {
  // Seed Developer Access Master Account if empty
  const devCheck = db.prepare(`SELECT count(*) as count FROM staff_users WHERE staff_id = 'devsosco01'`).get();
  if (!devCheck || devCheck.count === 0) {
    db.prepare(`
      INSERT INTO staff_users (id, staff_id, name, username, whatsapp, pin, role, store, status, is_developer, is_protected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `).run(
      'devsosco01',
      'devsosco01',
      'Developer Access',
      'devsosco01',
      '+62 812-3456-7890',
      '707909',
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
// ORDERS QUERIES
// ----------------------------------------------------
export function getAllOrdersFromDb() {
  const rows = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all();
  return rows.map(r => ({
    ...r,
    items: r.items_json ? JSON.parse(r.items_json) : [],
    durationSeconds: r.duration_seconds
  }));
}

export function saveAllOrdersToDb(orders) {
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO orders (
      order_id, short_code, system_queue_number, intake_code, status,
      customer_name, phone, email, items_json, duration_seconds,
      store_code, store_id, store_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const clearStmt = db.prepare(`DELETE FROM orders`);

  const transaction = db.transaction((orderList) => {
    clearStmt.run();
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

  transaction(orders);
}

export function upsertSingleOrderInDb(order) {
  const existing = db.prepare(`SELECT * FROM orders WHERE order_id = ?`).get(order.order_id);
  const now = new Date().toISOString();
  
  if (existing) {
    db.prepare(`
      UPDATE orders SET
        short_code = ?, system_queue_number = ?, intake_code = ?, status = ?,
        customer_name = ?, phone = ?, email = ?, items_json = ?, duration_seconds = ?,
        store_code = ?, store_id = ?, store_name = ?, updated_at = ?
      WHERE order_id = ?
    `).run(
      order.short_code || existing.short_code,
      order.system_queue_number || existing.system_queue_number,
      order.intake_code || existing.intake_code,
      order.status || existing.status,
      order.customer_name || existing.customer_name,
      order.phone || existing.phone,
      order.email || existing.email,
      JSON.stringify(order.items || (existing.items_json ? JSON.parse(existing.items_json) : [])),
      order.durationSeconds !== undefined ? order.durationSeconds : existing.duration_seconds,
      order.store_code || existing.store_code,
      order.store_id || existing.store_id,
      order.store_name || existing.store_name,
      now,
      order.order_id
    );
  } else {
    db.prepare(`
      INSERT INTO orders (
        order_id, short_code, system_queue_number, intake_code, status,
        customer_name, phone, email, items_json, duration_seconds,
        store_code, store_id, store_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.order_id,
      order.short_code || '',
      order.system_queue_number || '',
      order.intake_code || '',
      order.status || 'pending_dropoff',
      order.customer_name || '',
      order.phone || '',
      order.email || '',
      JSON.stringify(order.items || []),
      order.durationSeconds || 0,
      order.store_code || '',
      order.store_id || '',
      order.store_name || '',
      order.created_at || now,
      now
    );
  }

  return getOrderByIdFromDb(order.order_id);
}

export function getOrderByIdFromDb(idOrCode) {
  const row = db.prepare(`
    SELECT * FROM orders 
    WHERE order_id = ? OR short_code = ? OR intake_code = ?
  `).get(idOrCode, idOrCode, idOrCode);

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

// ----------------------------------------------------
// STAFF AUTH & USER QUERIES
// ----------------------------------------------------
export function findStaffForAuth(idOrUsername) {
  const normalized = (idOrUsername || '').trim().toLowerCase();
  
  if (normalized === 'devsosco01') {
    return {
      id: 'devsosco01',
      staffId: 'devsosco01',
      username: 'devsosco01',
      name: 'Developer Access',
      pin: '707909',
      role: 'Super Admin',
      store: 'HQ Central',
      status: 'Active',
      isDeveloper: true,
      isProtected: true
    };
  }

  const row = db.prepare(`
    SELECT * FROM staff_users 
    WHERE LOWER(staff_id) = ? OR LOWER(username) = ? OR LOWER(name) = ?
  `).get(normalized, normalized, normalized);

  if (!row) return null;

  return {
    id: row.id,
    staffId: row.staff_id,
    username: row.username,
    name: row.name,
    whatsapp: row.whatsapp,
    pin: row.pin || '1913',
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
    pin: r.pin || '1913',
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

  if (existing) {
    db.prepare(`
      UPDATE staff_users SET
        name = ?, username = ?, whatsapp = ?, pin = ?, role = ?, store = ?, status = ?
      WHERE id = ?
    `).run(
      user.name,
      user.username || user.name,
      user.whatsapp || '',
      user.pin || '1913',
      user.role || 'Staff Store',
      user.store || '',
      user.status || 'Active',
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO staff_users (id, staff_id, name, username, whatsapp, pin, role, store, status, is_developer, is_protected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id || `usr-${Date.now()}`,
      user.staffId,
      user.name,
      user.username || user.name,
      user.whatsapp || '',
      user.pin || '1913',
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
  const token = `stk_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO auth_sessions (token, user_id, staff_id, role, is_developer, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    token,
    user.id,
    user.staffId,
    user.role,
    user.isDeveloper ? 1 : 0,
    expiresAt,
    now
  );

  return { token, expiresAt };
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
    isDeveloper: Boolean(session.is_developer)
  };
}

export function deleteAuthSessionToken(token) {
  db.prepare(`DELETE FROM auth_sessions WHERE token = ?`).run(token);
}

// Initialize database automatically
initDatabase();

export default db;
