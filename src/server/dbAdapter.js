import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import pg from 'pg';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseAdapter {
  constructor() {
    this.driver = 'sqlite';
    this.sqliteDb = null;
    this.pgPool = null;
    this.mysqlPool = null;
    this.initialized = false;
  }

  detectDriver() {
    const dbUrl = process.env.DATABASE_URL || '';
    const dbType = (process.env.DB_TYPE || '').toLowerCase();

    if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://') || dbType === 'postgres' || dbType === 'postgresql' || process.env.PGHOST) {
      return 'postgres';
    }
    if (dbUrl.startsWith('mysql://') || dbType === 'mysql' || process.env.MYSQL_HOST) {
      return 'mysql';
    }
    return 'sqlite';
  }

  async init() {
    if (this.initialized) return;
    this.driver = this.detectDriver();

    if (this.driver === 'postgres') {
      const dbUrl = process.env.DATABASE_URL;
      const config = dbUrl ? { connectionString: dbUrl } : {
        host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
        user: process.env.PGUSER || process.env.DB_USER || 'postgres',
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.PGDATABASE || process.env.DB_NAME || 'stanley_db',
      };

      if (process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('sslmode=require')) {
        config.ssl = { rejectUnauthorized: false };
      }

      this.pgPool = new pg.Pool(config);
      console.log(`🔌 [Database] Connected to PostgreSQL pool (${config.host || 'via DATABASE_URL'})`);
    } else if (this.driver === 'mysql') {
      const dbUrl = process.env.DATABASE_URL;
      const config = dbUrl ? { uri: dbUrl } : {
        host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306', 10),
        user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
        password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'stanley_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      };

      this.mysqlPool = mysql.createPool(config);
      console.log(`🔌 [Database] Connected to MySQL pool (${config.host || 'via DATABASE_URL'})`);
    } else {
      const dataDir = path.resolve(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.resolve(dataDir, 'stanley.db');
      this.sqliteDb = new Database(dbPath);
      this.sqliteDb.pragma('journal_mode = WAL');
      console.log(`🔌 [Database] Connected to SQLite at ${dbPath}`);
    }

    this.initialized = true;
    await this.initSchema();
  }

  async initSchema() {
    if (this.driver === 'postgres') {
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          order_id VARCHAR(255) PRIMARY KEY,
          short_code VARCHAR(100),
          system_queue_number VARCHAR(100),
          intake_code VARCHAR(100),
          status VARCHAR(100),
          customer_name VARCHAR(255),
          phone VARCHAR(100),
          email VARCHAR(255),
          items_json TEXT,
          duration_seconds INT DEFAULT 0,
          store_code VARCHAR(100),
          store_id VARCHAR(100),
          store_name VARCHAR(255),
          created_at VARCHAR(100),
          updated_at VARCHAR(100)
        );

        CREATE TABLE IF NOT EXISTS staff_users (
          id VARCHAR(191) PRIMARY KEY,
          staff_id VARCHAR(191) UNIQUE,
          name VARCHAR(255),
          username VARCHAR(191),
          whatsapp VARCHAR(100),
          pin VARCHAR(255),
          role VARCHAR(100),
          store VARCHAR(255),
          status VARCHAR(50),
          is_developer INT DEFAULT 0,
          is_protected INT DEFAULT 0,
          created_at VARCHAR(100)
        );

        CREATE TABLE IF NOT EXISTS stores (
          id VARCHAR(191) PRIMARY KEY,
          code VARCHAR(100) UNIQUE,
          name VARCHAR(255),
          city VARCHAR(255),
          address TEXT,
          phone VARCHAR(100),
          total_machines INT DEFAULT 1,
          active_machines INT DEFAULT 1,
          status VARCHAR(50) DEFAULT 'Online',
          created_at VARCHAR(100)
        );

        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(191) PRIMARY KEY,
          value_json TEXT,
          updated_at VARCHAR(100)
        );

        CREATE TABLE IF NOT EXISTS analytics_logs (
          id VARCHAR(191) PRIMARY KEY,
          order_id VARCHAR(191),
          machine_id VARCHAR(100),
          duration_seconds INT,
          timestamp VARCHAR(100),
          metadata_json TEXT
        );

        CREATE TABLE IF NOT EXISTS auth_sessions (
          token VARCHAR(191) PRIMARY KEY,
          user_id VARCHAR(191),
          staff_id VARCHAR(191),
          role VARCHAR(100),
          store_id VARCHAR(191),
          is_developer INT DEFAULT 0,
          expires_at BIGINT,
          created_at VARCHAR(100)
        );
      `);
    } else if (this.driver === 'mysql') {
      const queries = [
        `CREATE TABLE IF NOT EXISTS orders (
          order_id VARCHAR(191) PRIMARY KEY,
          short_code VARCHAR(100),
          system_queue_number VARCHAR(100),
          intake_code VARCHAR(100),
          status VARCHAR(100),
          customer_name VARCHAR(255),
          phone VARCHAR(100),
          email VARCHAR(255),
          items_json LONGTEXT,
          duration_seconds INT DEFAULT 0,
          store_code VARCHAR(100),
          store_id VARCHAR(100),
          store_name VARCHAR(255),
          created_at VARCHAR(100),
          updated_at VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS staff_users (
          id VARCHAR(191) PRIMARY KEY,
          staff_id VARCHAR(191) UNIQUE,
          name VARCHAR(255),
          username VARCHAR(191),
          whatsapp VARCHAR(100),
          pin VARCHAR(255),
          role VARCHAR(100),
          store VARCHAR(255),
          status VARCHAR(50),
          is_developer INT DEFAULT 0,
          is_protected INT DEFAULT 0,
          created_at VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS stores (
          id VARCHAR(191) PRIMARY KEY,
          code VARCHAR(100) UNIQUE,
          name VARCHAR(255),
          city VARCHAR(255),
          address TEXT,
          phone VARCHAR(100),
          total_machines INT DEFAULT 1,
          active_machines INT DEFAULT 1,
          status VARCHAR(50) DEFAULT 'Online',
          created_at VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS settings (
          \`key\` VARCHAR(191) PRIMARY KEY,
          value_json LONGTEXT,
          updated_at VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS analytics_logs (
          id VARCHAR(191) PRIMARY KEY,
          order_id VARCHAR(191),
          machine_id VARCHAR(100),
          duration_seconds INT,
          timestamp VARCHAR(100),
          metadata_json LONGTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS auth_sessions (
          token VARCHAR(191) PRIMARY KEY,
          user_id VARCHAR(191),
          staff_id VARCHAR(191),
          role VARCHAR(100),
          store_id VARCHAR(191),
          is_developer INT DEFAULT 0,
          expires_at BIGINT,
          created_at VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      ];

      for (const q of queries) {
        await this.mysqlPool.query(q);
      }
    } else {
      this.sqliteDb.exec(`
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

        CREATE TABLE IF NOT EXISTS stores (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE,
          name TEXT,
          city TEXT,
          address TEXT,
          phone TEXT,
          total_machines INTEGER DEFAULT 1,
          active_machines INTEGER DEFAULT 1,
          status TEXT DEFAULT 'Online',
          created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value_json TEXT,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS analytics_logs (
          id TEXT PRIMARY KEY,
          order_id TEXT,
          machine_id TEXT,
          duration_seconds INTEGER,
          timestamp TEXT,
          metadata_json TEXT
        );

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
        this.sqliteDb.exec(`ALTER TABLE auth_sessions ADD COLUMN store_id TEXT;`);
      } catch (e) {}
      try {
        this.sqliteDb.exec(`ALTER TABLE stores ADD COLUMN phone TEXT;`);
      } catch (e) {}
    }
  }

  // Convert standard '?' parameter placeholders to PostgreSQL '$1, $2, ...'
  formatPgQuery(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  // Sanitize key column quoting for MySQL reserved keyword
  sanitizeSqlForDriver(sql) {
    if (this.driver === 'mysql') {
      return sql.replace(/\bsettings\s+WHERE\s+key\s*=/gi, 'settings WHERE `key` =')
                .replace(/\bINSERT\s+INTO\s+settings\s*\(\s*key\s*,/gi, 'INSERT INTO settings (`key`,')
                .replace(/\bINSERT\s+OR\s+REPLACE\s+INTO\s+settings\s*\(\s*key\s*,/gi, 'REPLACE INTO settings (`key`,');
    }
    return sql;
  }

  async query(sql, params = []) {
    if (!this.initialized) await this.init();
    const sanitized = this.sanitizeSqlForDriver(sql);

    if (this.driver === 'postgres') {
      const pgSql = this.formatPgQuery(sanitized);
      const res = await this.pgPool.query(pgSql, params);
      return res.rows;
    } else if (this.driver === 'mysql') {
      const [rows] = await this.mysqlPool.query(sanitized, params);
      return Array.isArray(rows) ? rows : [];
    } else {
      return this.sqliteDb.prepare(sanitized).all(...params);
    }
  }

  async get(sql, params = []) {
    if (!this.initialized) await this.init();
    const sanitized = this.sanitizeSqlForDriver(sql);

    if (this.driver === 'postgres') {
      const pgSql = this.formatPgQuery(sanitized);
      const res = await this.pgPool.query(pgSql, params);
      return res.rows[0] || null;
    } else if (this.driver === 'mysql') {
      const [rows] = await this.mysqlPool.query(sanitized, params);
      return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
    } else {
      return this.sqliteDb.prepare(sanitized).get(...params) || null;
    }
  }

  async run(sql, params = []) {
    if (!this.initialized) await this.init();
    let sanitized = this.sanitizeSqlForDriver(sql);

    if (this.driver === 'postgres') {
      // Convert SQLite 'INSERT OR REPLACE INTO' to PostgreSQL 'INSERT INTO ... ON CONFLICT'
      if (sanitized.includes('INSERT OR REPLACE INTO settings')) {
        sanitized = `
          INSERT INTO settings (key, value_json, updated_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (key) DO UPDATE SET
            value_json = EXCLUDED.value_json,
            updated_at = EXCLUDED.updated_at
        `;
        const res = await this.pgPool.query(sanitized, params);
        return { changes: res.rowCount };
      }

      if (sanitized.includes('INSERT OR REPLACE INTO orders')) {
        sanitized = `
          INSERT INTO orders (
            order_id, short_code, system_queue_number, intake_code, status,
            customer_name, phone, email, items_json, duration_seconds,
            store_code, store_id, store_name, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (order_id) DO UPDATE SET
            short_code = EXCLUDED.short_code,
            system_queue_number = EXCLUDED.system_queue_number,
            intake_code = EXCLUDED.intake_code,
            status = EXCLUDED.status,
            customer_name = EXCLUDED.customer_name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            items_json = EXCLUDED.items_json,
            duration_seconds = EXCLUDED.duration_seconds,
            store_code = EXCLUDED.store_code,
            store_id = EXCLUDED.store_id,
            store_name = EXCLUDED.store_name,
            updated_at = EXCLUDED.updated_at
        `;
        const res = await this.pgPool.query(sanitized, params);
        return { changes: res.rowCount };
      }

      if (sanitized.includes('INSERT OR REPLACE INTO auth_sessions')) {
        sanitized = `
          INSERT INTO auth_sessions (token, user_id, staff_id, role, store_id, is_developer, expires_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (token) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            staff_id = EXCLUDED.staff_id,
            role = EXCLUDED.role,
            store_id = EXCLUDED.store_id,
            is_developer = EXCLUDED.is_developer,
            expires_at = EXCLUDED.expires_at
        `;
        const res = await this.pgPool.query(sanitized, params);
        return { changes: res.rowCount };
      }

      const pgSql = this.formatPgQuery(sanitized);
      const res = await this.pgPool.query(pgSql, params);
      return { changes: res.rowCount };
    } else if (this.driver === 'mysql') {
      if (sanitized.includes('INSERT OR REPLACE INTO')) {
        sanitized = sanitized.replace('INSERT OR REPLACE INTO', 'REPLACE INTO');
      }
      const [res] = await this.mysqlPool.query(sanitized, params);
      return { changes: res.affectedRows, insertId: res.insertId };
    } else {
      const res = this.sqliteDb.prepare(sanitized).run(...params);
      return { changes: res.changes, lastInsertRowid: res.lastInsertRowid };
    }
  }

  async close() {
    if (this.pgPool) await this.pgPool.end();
    if (this.mysqlPool) await this.mysqlPool.end();
    if (this.sqliteDb) this.sqliteDb.close();
    this.initialized = false;
  }
}

export const dbAdapter = new DatabaseAdapter();
export default dbAdapter;
