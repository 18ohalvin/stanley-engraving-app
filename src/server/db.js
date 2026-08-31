import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dbAdapter from './dbAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Master product catalog seeded by default
export const DEFAULT_PRODUCT_CATALOG = [
  {
    id: 'prod-quencher-40',
    name: 'Quencher H2.O FlowState 40 Oz',
    modelKey: 'quencher-h20-flowstate-40-oz',
    image: '/src/assets/images/product-step1.png',
    engravedImage: '/src/assets/images/product-step2.png',
    availableSizes: ['20 Oz', '30 Oz', '40 Oz'],
    availablePositions: ['Vertical', 'Horizontal'],
    defaultDuration: '03:45',
    maxChars: 7,
    isActive: true
  },
  {
    id: 'prod-iceflow-30',
    name: 'IceFlow Flip Straw 30 Oz',
    modelKey: 'iceflow-flip-straw-30-oz',
    image: '/src/assets/images/product-iceflow-fastflow.png',
    engravedImage: '/src/assets/images/product-step2.png',
    availableSizes: ['16 Oz', '30 Oz'],
    availablePositions: ['Vertical', 'Horizontal'],
    defaultDuration: '03:30',
    maxChars: 7,
    isActive: true
  }
];

// Initialize database schema tables & seed master data
export async function initDatabase() {
  await dbAdapter.init();
  await seedDefaultMasterData();
}

async function seedDefaultMasterData() {
  // Seed Developer Access Master Account if empty
  const devCheck = await dbAdapter.get(`SELECT count(*) as count FROM staff_users WHERE id = ?`, ['devsosco01']);
  const devCount = Number(devCheck?.count || devCheck?.COUNT || 0);
  if (devCount === 0) {
    const seedPin = process.env.DEVELOPER_MASTER_PIN;
    if (!seedPin) {
      throw new Error('DEVELOPER_MASTER_PIN env var must be set to seed the Developer Access master account.');
    }
    await dbAdapter.run(`
      INSERT INTO staff_users (id, staff_id, name, username, whatsapp, pin, role, store, status, is_developer, is_protected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `, [
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
    ]);
  } else if (process.env.DEVELOPER_MASTER_PIN) {
    await dbAdapter.run(`
      UPDATE staff_users 
      SET pin = ? 
      WHERE (id = 'devsosco01' OR staff_id = 'devsosco01' OR username = 'devsosco01')
    `, [bcrypt.hashSync(process.env.DEVELOPER_MASTER_PIN, 10)]);
  }

  // Seed default network stores if empty
  const storeCheck = await dbAdapter.get(`SELECT count(*) as count FROM stores`);
  const storeCount = Number(storeCheck?.count || storeCheck?.COUNT || 0);
  if (storeCount === 0) {
    const defaultStores = [
      { id: '001', code: '001', name: 'Stanley Pondok Indah Mall', city: 'Jakarta Selatan', address: 'Pondok Indah Mall 5, Lt 2, Jakarta', phone: '+62 817-5566-7788', total_machines: 2, active_machines: 2, status: 'Online' },
      { id: '002', code: '002', name: 'Stanley Grand Indonesia', city: 'Jakarta Pusat', address: 'Grand Indonesia East Mall, Lt 1, Jakarta', phone: '+62 812-9988-7766', total_machines: 2, active_machines: 2, status: 'Online' },
      { id: '003', code: '003', name: 'Stanley Senayan City', city: 'Jakarta Selatan', address: 'Senayan City Mall, Lt Ground, Jakarta', phone: '+62 813-1122-3344', total_machines: 1, active_machines: 1, status: 'Online' },
      { id: 'SG001', code: 'SG001', name: 'Stanley Singapore Store', city: 'Singapore', address: 'Orchard Road #01-12, Singapore', phone: '+65 8123 4567', total_machines: 1, active_machines: 1, status: 'Online' }
    ];

    const now = new Date().toISOString();
    for (const s of defaultStores) {
      await dbAdapter.run(`
        INSERT INTO stores (id, code, name, city, address, phone, total_machines, active_machines, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [s.id, s.code, s.name, s.city, s.address, s.phone, s.total_machines, s.active_machines, s.status, now]);
    }
  }

  // Seed default product catalog in settings table if empty
  const productCheck = await dbAdapter.get(`SELECT count(*) as count FROM settings WHERE key = ?`, ['products']);
  const productCount = Number(productCheck?.count || productCheck?.COUNT || 0);
  if (productCount === 0) {
    await saveSettingsInDb('products', DEFAULT_PRODUCT_CATALOG);
  }

  // Seed default size presets in settings table if empty
  const presetCheck = await dbAdapter.get(`SELECT count(*) as count FROM settings WHERE key = ?`, ['size_presets']);
  const presetCount = Number(presetCheck?.count || presetCheck?.COUNT || 0);
  if (presetCount === 0) {
    await saveSettingsInDb('size_presets', ['12 Oz', '14 Oz', '16 Oz', '20 Oz', '24 Oz', '30 Oz', '36 Oz', '40 Oz', '48 Oz']);
  }

  // Migrate legacy data from data/orders.json if orders table is empty (SQLite local mode)
  const legacyOrdersFile = path.resolve(dataDir, 'orders.json');
  const countStmt = await dbAdapter.get(`SELECT count(*) as count FROM orders`);
  const ordersCount = Number(countStmt?.count || countStmt?.COUNT || 0);
  if (ordersCount === 0 && fs.existsSync(legacyOrdersFile)) {
    try {
      const raw = fs.readFileSync(legacyOrdersFile, 'utf-8');
      const orders = JSON.parse(raw);
      if (Array.isArray(orders) && orders.length > 0) {
        for (const o of orders) {
          await dbAdapter.run(`
            INSERT OR REPLACE INTO orders (
              order_id, short_code, system_queue_number, intake_code, status,
              customer_name, phone, email, items_json, duration_seconds,
              store_code, store_id, store_name, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
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
          ]);
        }
      }
    } catch (e) {
      console.warn('Failed to migrate legacy orders.json to database:', e);
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

export async function getCanonicalStore(inputStr) {
  if (!inputStr) return null;
  const raw = String(inputStr).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const clean = lower.replace(/[^a-z0-9]/g, '');

  try {
    const rows = await dbAdapter.query(`SELECT id, code, name, phone FROM stores`);
    for (const store of rows) {
      const sId = (store.id || '').toLowerCase();
      const sCode = (store.code || '').toLowerCase();
      const sName = (store.name || '').toLowerCase();
      const sIdClean = sId.replace(/[^a-z0-9]/g, '');
      const sCodeClean = sCode.replace(/[^a-z0-9]/g, '');
      const sNameClean = sName.replace(/[^a-z0-9]/g, '');

      if (
        sId === lower || sCode === lower || sName === lower ||
        sIdClean === clean || sCodeClean === clean || sNameClean === clean
      ) {
        return {
          id: store.id,
          code: store.code || store.id,
          name: store.name,
          phone: store.phone || '+62 817-5566-7788',
          aliases: [sId, sCode, sName, sIdClean, sCodeClean, sNameClean]
        };
      }
    }
  } catch (e) {}

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

export async function isSameStore(storeA, storeB) {
  if (!storeA || !storeB) return false;
  if (storeA === '*' || storeB === '*' || storeA === 'HQ Central' || storeB === 'HQ Central') return true;

  const sA = await getCanonicalStore(storeA);
  const sB = await getCanonicalStore(storeB);

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

export async function getNextQueueNumberFromDb(storeId, dateStr = null) {
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

  const rows = await dbAdapter.query(`
    SELECT system_queue_number, short_code, store_id, store_code, store_name, created_at
    FROM orders
    WHERE (created_at LIKE ? OR created_at LIKE ?)
      AND status IN ('in_queue', 'engraving_in_progress', 'ready_for_pickup')
  `, [`${dateVal}%`, `%${dateVal}%`]);

  let highest = 0;
  for (const r of rows) {
    if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
      const matchId = await isSameStore(r.store_id, storeId);
      const matchCode = await isSameStore(r.store_code, storeId);
      const matchName = await isSameStore(r.store_name, storeId);
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

export async function getAllOrdersFromDb(storeId) {
  const allRows = await dbAdapter.query(`SELECT * FROM orders ORDER BY created_at DESC`);
  let rows = allRows;

  if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
    const canonical = await getCanonicalStore(storeId);
    const aliases = canonical ? [canonical.id, canonical.code, canonical.name, ...(canonical.aliases || [])] : [storeId];
    const cleanAliases = aliases.map(a => String(a).trim().toLowerCase()).filter(Boolean);

    rows = allRows.filter(r => {
      const sId = String(r.store_id || '').trim().toLowerCase();
      const sCode = String(r.store_code || '').trim().toLowerCase();
      const sName = String(r.store_name || '').trim().toLowerCase();
      return cleanAliases.includes(sId) || cleanAliases.includes(sCode) || cleanAliases.includes(sName);
    });
  }

  return rows.map(r => ({
    ...r,
    items: r.items_json ? (typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json) : [],
    durationSeconds: r.duration_seconds
  }));
}

export async function saveAllOrdersToDb(orders, storeId) {
  for (const o of orders) {
    const finalStore = storeId || o.store_id || o.store_code || '';
    await dbAdapter.run(`
      INSERT OR REPLACE INTO orders (
        order_id, short_code, system_queue_number, intake_code, status,
        customer_name, phone, email, items_json, duration_seconds,
        store_code, store_id, store_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    ]);
  }
}

export async function upsertSingleOrderInDb(order, storeId) {
  const targetStoreId = storeId || order.store_id || order.store_code || order.store_name || '';
  const existing = await dbAdapter.get(`SELECT * FROM orders WHERE order_id = ?`, [order.order_id]);
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

    if ((newStatus === 'in_queue' || newStatus === 'engraving_in_progress' || newStatus === 'ready_for_pickup') && !queueNum) {
      queueNum = await getNextQueueNumberFromDb(finalStoreId, existing.created_at || now);
      shortCode = queueNum;
    }

    await dbAdapter.run(`
      UPDATE orders SET
        short_code = ?, system_queue_number = ?, intake_code = ?, status = ?,
        customer_name = ?, phone = ?, email = ?, items_json = ?, duration_seconds = ?,
        store_code = ?, store_id = ?, store_name = ?, updated_at = ?
      WHERE order_id = ?
    `, [
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
    ]);
  } else {
    const newStatus = order.status || 'pending_dropoff';
    let queueNum = order.system_queue_number || null;
    let shortCode = order.short_code || null;

    if (newStatus !== 'pending_dropoff' && !queueNum) {
      queueNum = await getNextQueueNumberFromDb(finalStoreId, order.created_at || now);
      shortCode = queueNum;
    }

    await dbAdapter.run(`
      INSERT INTO orders (
        order_id, short_code, system_queue_number, intake_code, status,
        customer_name, phone, email, items_json, duration_seconds,
        store_code, store_id, store_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    ]);
  }

  return getOrderByIdFromDb(order.order_id, storeId);
}

export async function getOrderByIdFromDb(idOrCode, storeId) {
  if (!idOrCode) return null;
  const clean = String(idOrCode).replace('#', '').trim().toLowerCase();
  if (!clean || clean === 'undefined' || clean === 'null') return null;
  const parts = clean.split('-');
  const subCode = parts[parts.length - 1];
  
  let row = null;
  if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
    const canonical = await getCanonicalStore(storeId);
    const aliases = canonical ? [canonical.id, canonical.code, canonical.name, ...(canonical.aliases || [])] : [storeId];
    const cleanAliases = aliases.map(a => String(a).trim().toLowerCase()).filter(Boolean);

    const allMatches = await dbAdapter.query(`
      SELECT * FROM orders 
      WHERE (
        LOWER(order_id) = ? 
        OR (short_code IS NOT NULL AND short_code != '' AND LOWER(short_code) = ?) 
        OR (intake_code IS NOT NULL AND intake_code != '' AND LOWER(intake_code) = ?) 
        OR (system_queue_number IS NOT NULL AND system_queue_number != '' AND LOWER(system_queue_number) = ?) 
        OR (LENGTH(?) >= 3 AND short_code IS NOT NULL AND short_code != '' AND LOWER(short_code) = ?) 
        OR (LENGTH(?) >= 3 AND intake_code IS NOT NULL AND intake_code != '' AND LOWER(intake_code) = ?)
        OR (LENGTH(?) >= 3 AND LOWER(order_id) LIKE ?)
      )
      ORDER BY created_at DESC
    `, [clean, clean, clean, clean, subCode, subCode, subCode, subCode, clean, `%${clean}%`]);

    row = allMatches.find(r => {
      const sId = String(r.store_id || '').trim().toLowerCase();
      const sCode = String(r.store_code || '').trim().toLowerCase();
      const sName = String(r.store_name || '').trim().toLowerCase();
      return cleanAliases.includes(sId) || cleanAliases.includes(sCode) || cleanAliases.includes(sName);
    });
  }

  if (!row) {
    row = await dbAdapter.get(`
      SELECT * FROM orders 
      WHERE LOWER(order_id) = ? 
         OR (short_code IS NOT NULL AND short_code != '' AND LOWER(short_code) = ?) 
         OR (intake_code IS NOT NULL AND intake_code != '' AND LOWER(intake_code) = ?) 
         OR (system_queue_number IS NOT NULL AND system_queue_number != '' AND LOWER(system_queue_number) = ?) 
         OR (LENGTH(?) >= 3 AND short_code IS NOT NULL AND short_code != '' AND LOWER(short_code) = ?) 
         OR (LENGTH(?) >= 3 AND intake_code IS NOT NULL AND intake_code != '' AND LOWER(intake_code) = ?)
         OR (LENGTH(?) >= 3 AND LOWER(order_id) LIKE ?)
      ORDER BY created_at DESC LIMIT 1
    `, [clean, clean, clean, clean, subCode, subCode, subCode, subCode, clean, `%${clean}%`]);
  }

  if (!row) return null;
  return {
    ...row,
    items: row.items_json ? (typeof row.items_json === 'string' ? JSON.parse(row.items_json) : row.items_json) : [],
    durationSeconds: row.duration_seconds
  };
}

export async function clearAllOrdersInDb() {
  await dbAdapter.run(`DELETE FROM orders`);
}

export async function resetAllDatabaseExceptStaff() {
  await dbAdapter.run(`DELETE FROM orders`);
  await dbAdapter.run(`DELETE FROM stores`);
  await dbAdapter.run(`DELETE FROM settings`);
  await dbAdapter.run(`DELETE FROM analytics_logs`);
  await dbAdapter.run(`DELETE FROM auth_sessions`);

  const devCheck = await dbAdapter.get(`SELECT count(*) as count FROM staff_users WHERE id = ?`, ['devsosco01']);
  const devCount = Number(devCheck?.count || devCheck?.COUNT || 0);
  if (devCount === 0) {
    const seedPin = process.env.DEVELOPER_MASTER_PIN;
    if (!seedPin) {
      throw new Error('DEVELOPER_MASTER_PIN env var must be set to seed the Developer Access master account.');
    }
    await dbAdapter.run(`
      INSERT INTO staff_users (id, staff_id, name, username, whatsapp, pin, role, store, status, is_developer, is_protected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `, [
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
    ]);
  }
}

// ----------------------------------------------------
// STAFF AUTH & USER QUERIES
// ----------------------------------------------------
export async function findStaffForAuth(idOrUsername) {
  const normalized = (idOrUsername || '').trim().toLowerCase();

  const row = await dbAdapter.get(`
    SELECT * FROM staff_users 
    WHERE LOWER(staff_id) = ? OR LOWER(username) = ? OR LOWER(name) = ? OR LOWER(id) = ?
  `, [normalized, normalized, normalized, normalized]);

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

export async function getAllStaffUsersFromDb() {
  const rows = await dbAdapter.query(`SELECT * FROM staff_users ORDER BY created_at ASC`);
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

export async function saveStaffUserInDb(user) {
  if (!user || (!user.id && !user.staffId && !user.name)) {
    throw new Error('Staff user must include valid id, staffId, or name.');
  }

  const staffIdVal = (user.staffId || user.idCode || user.id || `STF-${Date.now()}`).trim().toUpperCase();
  const existing = await dbAdapter.get(`SELECT * FROM staff_users WHERE id = ? OR staff_id = ? OR LOWER(username) = LOWER(?)`, [user.id || '', staffIdVal, user.username || user.name || '']);
  const now = new Date().toISOString();
  const newPin = (user.pin || '').trim();

  if (existing) {
    const pinToStore = newPin ? bcrypt.hashSync(newPin, 10) : existing.pin;
    await dbAdapter.run(`
      UPDATE staff_users SET
        staff_id = ?, name = ?, username = ?, whatsapp = ?, pin = ?, role = ?, store = ?, status = ?
      WHERE id = ?
    `, [
      staffIdVal,
      user.name || existing.name,
      user.username || user.name || existing.username,
      user.whatsapp !== undefined ? user.whatsapp : existing.whatsapp,
      pinToStore,
      user.role || existing.role || 'Staff Store',
      user.store !== undefined ? user.store : existing.store,
      user.status || existing.status || 'Active',
      existing.id
    ]);
  } else {
    const finalPin = newPin || '1234';
    await dbAdapter.run(`
      INSERT INTO staff_users (id, staff_id, name, username, whatsapp, pin, role, store, status, is_developer, is_protected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id || `usr-${Date.now()}`,
      staffIdVal,
      user.name || 'Staff User',
      user.username || user.name || staffIdVal,
      user.whatsapp || '',
      bcrypt.hashSync(finalPin, 10),
      user.role || 'Staff Store',
      user.store || '',
      user.status || 'Active',
      user.isDeveloper ? 1 : 0,
      user.isProtected ? 1 : 0,
      now
    ]);
  }
}

export async function deleteStaffUserFromDb(id) {
  const user = await dbAdapter.get(`SELECT * FROM staff_users WHERE id = ? OR staff_id = ?`, [id, id]);
  if (user && (user.is_developer || user.staff_id === 'devsosco01')) {
    return false;
  }
  const res = await dbAdapter.run(`DELETE FROM staff_users WHERE id = ? OR staff_id = ?`, [id, id]);
  return res.changes > 0;
}

// ----------------------------------------------------
// AUTH SESSION TOKENS
// ----------------------------------------------------
export async function createAuthSessionInDb(user) {
  const token = `stk_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const now = new Date().toISOString();
  const storeId = user.store || user.storeId || user.store_id || '';

  await dbAdapter.run(`
    INSERT OR REPLACE INTO auth_sessions (token, user_id, staff_id, role, store_id, is_developer, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    token,
    user.id,
    user.staffId,
    user.role,
    storeId,
    user.isDeveloper ? 1 : 0,
    expiresAt,
    now
  ]);

  return { token, expiresAt, storeId };
}

export async function verifyAuthSessionToken(token) {
  if (!token) return null;
  const session = await dbAdapter.get(`SELECT * FROM auth_sessions WHERE token = ?`, [token]);
  if (!session) return null;

  if (Date.now() > Number(session.expires_at)) {
    await dbAdapter.run(`DELETE FROM auth_sessions WHERE token = ?`, [token]);
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

export async function deleteAuthSessionToken(token) {
  await dbAdapter.run(`DELETE FROM auth_sessions WHERE token = ?`, [token]);
}

// ----------------------------------------------------
// STORE NETWORK & SETTINGS QUERIES
// ----------------------------------------------------
export async function getAllStoresFromDb() {
  const rows = await dbAdapter.query(`SELECT * FROM stores ORDER BY created_at ASC`);
  return rows.map(r => ({
    id: r.id,
    code: r.code || r.id,
    name: r.name,
    city: r.city || '',
    address: r.address || '',
    phone: r.phone || '',
    totalMachines: r.total_machines || 1,
    activeMachines: r.active_machines || 1,
    total_machines: r.total_machines || 1,
    active_machines: r.active_machines || 1,
    status: r.status || 'Online',
    createdAt: r.created_at
  }));
}

export async function saveStoreInDb(store) {
  if (!store || (!store.id && !store.code && !store.name)) {
    throw new Error('Store ID/Code and Name are required.');
  }

  const storeId = store.id || store.code || `str-${Date.now()}`;
  const storeCode = (store.code || storeId).trim().toUpperCase();
  const storeName = (store.name || 'Stanley Store').trim();
  const existing = await dbAdapter.get(`SELECT * FROM stores WHERE id = ? OR code = ?`, [storeId, storeCode]);
  const now = new Date().toISOString();

  const totalMachines = Number(store.totalMachines || store.total_machines || (existing ? existing.total_machines : 1)) || 1;
  const activeMachines = Number(store.activeMachines !== undefined ? store.activeMachines : (store.active_machines !== undefined ? store.active_machines : (existing ? existing.active_machines : totalMachines))) || totalMachines;

  if (existing) {
    await dbAdapter.run(`
      UPDATE stores SET
        code = ?, name = ?, city = ?, address = ?, phone = ?,
        total_machines = ?, active_machines = ?, status = ?
      WHERE id = ? OR code = ?
    `, [
      storeCode,
      storeName,
      store.city !== undefined ? store.city : existing.city,
      store.address !== undefined ? store.address : existing.address,
      store.phone !== undefined ? store.phone : existing.phone,
      totalMachines,
      activeMachines,
      store.status || existing.status || 'Online',
      existing.id,
      storeCode
    ]);
  } else {
    await dbAdapter.run(`
      INSERT INTO stores (id, code, name, city, address, phone, total_machines, active_machines, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      storeId,
      storeCode,
      storeName,
      store.city || 'Jakarta',
      store.address || '',
      store.phone || '',
      totalMachines,
      activeMachines,
      store.status || 'Online',
      now
    ]);
  }

  return dbAdapter.get(`SELECT * FROM stores WHERE id = ? OR code = ?`, [storeId, storeCode]);
}

export async function deleteStoreFromDb(id) {
  const res = await dbAdapter.run(`DELETE FROM stores WHERE id = ? OR code = ?`, [id, id]);
  return res.changes > 0;
}

export async function getSettingsFromDb(key) {
  const row = await dbAdapter.get(`SELECT * FROM settings WHERE key = ?`, [key]);
  if (!row) return null;
  try {
    return JSON.parse(row.value_json);
  } catch (e) {
    return row.value_json;
  }
}

export async function saveSettingsInDb(key, value) {
  const now = new Date().toISOString();
  const valueJson = typeof value === 'string' ? value : JSON.stringify(value);
  await dbAdapter.run(`
    INSERT OR REPLACE INTO settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
  `, [key, valueJson, now]);
  return getSettingsFromDb(key);
}

export async function getAllProductsFromDb() {
  const saved = await getSettingsFromDb('products');
  if (Array.isArray(saved) && saved.length > 0) {
    return saved;
  }
  return DEFAULT_PRODUCT_CATALOG;
}

export async function saveProductsInDb(products) {
  if (!Array.isArray(products)) {
    throw new Error('Products must be an array.');
  }
  return saveSettingsInDb('products', products);
}

// Auto-initialize DB on startup
initDatabase().catch(err => {
  console.error('❌ Failed to initialize database:', err);
});

export default dbAdapter;
