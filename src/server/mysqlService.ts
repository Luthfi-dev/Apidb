import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { DatabaseProject, DatabaseTable, DatabaseRecord } from '../../server';
import { User, getAllUsers } from './authService';
import { sendTelegramAlert } from './telegramService';

export interface MySQLConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl: boolean;
  uri?: string;
}

export interface MySQLStatus {
  engine: 'mysql' | 'local';
  connected: boolean;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  ssl?: boolean;
  latencyMs?: number;
  tablesCount?: number;
  recordsCount?: number;
  lastConnectedAt?: string;
  error?: string;
}

export interface EnvDbConfigInfo {
  isConfiguredInEnv: boolean;
  host: string;
  port: number;
  user: string;
  database: string;
  ssl: boolean;
  uri: string;
  hasPassword: boolean;
  envVariablesDetected: {
    hasDbHost: boolean;
    hasDbPort: boolean;
    hasDbUser: boolean;
    hasDbPassword: boolean;
    hasDbName: boolean;
    hasDbSsl: boolean;
    hasDatabaseUrl: boolean;
  };
}

export interface SmtpAccountRecord {
  id: string;
  name: string;
  gmailUser: string;
  gmailAppPassword: string;
  fromName: string;
  host: string;
  port: number;
  secure: boolean;
  isActive: boolean;
  order: number;
  lastTestedAt?: string;
  lastStatus?: 'success' | 'failed' | 'untested';
  lastErrorMessage?: string;
  successCount: number;
  failCount: number;
}

const SCHEMA_FILE = path.resolve(process.cwd(), 'database/schema.mysql.sql');

let currentPool: mysql.Pool | null = null;
let lastError: string | undefined = undefined;
let lastConnectedAt: string | undefined = undefined;

// Read MySQL configuration strictly from Environment Variables (.env)
export function getEnvDbConfig(): MySQLConfig {
  const uri = (process.env.DATABASE_URL || process.env.MYSQL_URL || '').trim();
  const host = (process.env.DB_HOST || process.env.MYSQL_HOST || '').trim();
  const portStr = (process.env.DB_PORT || process.env.MYSQL_PORT || '').trim();
  const port = portStr ? parseInt(portStr, 10) : 3306;
  const user = (process.env.DB_USER || process.env.MYSQL_USER || '').trim();
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = (process.env.DB_NAME || process.env.MYSQL_DATABASE || '').trim();
  const ssl = process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true' || false;

  // DB is considered configured if URI is present OR (host + user + database are given)
  const isConfigured = Boolean(uri.length > 0 || (host.length > 0 && user.length > 0 && database.length > 0));

  return {
    enabled: isConfigured,
    host: host || (uri ? '' : 'localhost'),
    port: isNaN(port) ? 3306 : port,
    user: user || '',
    password,
    database: database || '',
    ssl,
    uri
  };
}

export function getSafeDbConfig(): EnvDbConfigInfo {
  const envCfg = getEnvDbConfig();
  const rawUri = envCfg.uri || '';
  const maskedUri = rawUri ? rawUri.replace(/:([^@]+)@/, ':••••••••@') : '';

  return {
    isConfiguredInEnv: envCfg.enabled,
    host: envCfg.host,
    port: envCfg.port,
    user: envCfg.user,
    database: envCfg.database,
    ssl: envCfg.ssl,
    uri: maskedUri,
    hasPassword: Boolean(envCfg.password && envCfg.password.length > 0),
    envVariablesDetected: {
      hasDbHost: Boolean(process.env.DB_HOST || process.env.MYSQL_HOST),
      hasDbPort: Boolean(process.env.DB_PORT || process.env.MYSQL_PORT),
      hasDbUser: Boolean(process.env.DB_USER || process.env.MYSQL_USER),
      hasDbPassword: Boolean(process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD),
      hasDbName: Boolean(process.env.DB_NAME || process.env.MYSQL_DATABASE),
      hasDbSsl: Boolean(process.env.DB_SSL || process.env.MYSQL_SSL),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL || process.env.MYSQL_URL)
    }
  };
}

function parseConnectionOptions(cfg: MySQLConfig): mysql.PoolOptions {
  if (cfg.uri && (cfg.uri.startsWith('mysql://') || cfg.uri.startsWith('mysql2://'))) {
    const url = new URL(cfg.uri);
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, '') || 'dataforge_db',
      ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8000
    };
  }

  return {
    host: cfg.host || 'localhost',
    port: cfg.port || 3306,
    user: cfg.user || 'root',
    password: cfg.password || '',
    database: cfg.database || 'dataforge_db',
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 8000
  };
}

export async function testConnection(cfg: MySQLConfig): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  const startTime = Date.now();
  let tempPool: mysql.Pool | null = null;
  try {
    const opts = parseConnectionOptions(cfg);
    tempPool = mysql.createPool({ ...opts, connectionLimit: 1 });
    await tempPool.query('SELECT 1 + 1 AS pingResult');
    const latencyMs = Date.now() - startTime;
    return { success: true, latencyMs };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  } finally {
    if (tempPool) {
      try {
        await tempPool.end();
      } catch (_) {}
    }
  }
}

export async function testEnvConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  const cfg = getEnvDbConfig();
  if (!cfg.enabled) {
    return {
      success: false,
      error: 'Variabel lingkungan Database belum diatur di .env (DB_HOST, DB_USER, DB_NAME, DB_PASSWORD atau DATABASE_URL).'
    };
  }
  return testConnection(cfg);
}

// Helper to add column safely to table if not exists
async function addColumnIfNotExists(pool: mysql.Pool, table: string, column: string, colDef: string): Promise<void> {
  try {
    const [cols]: any = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
      [table, column]
    );
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${colDef}`);
    }
  } catch (err) {
    // Ignore if column already exists or schema query unsupported
  }
}

export async function initMySQLTables(pool: mysql.Pool): Promise<void> {
  // Create df_projects
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_projects\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`owner_id\` VARCHAR(64) NULL,
      \`owner_email\` VARCHAR(255) NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`description\` TEXT NULL,
      \`token\` VARCHAR(128) NOT NULL,
      \`color\` VARCHAR(50) NOT NULL DEFAULT 'indigo',
      \`icon\` VARCHAR(50) NOT NULL DEFAULT 'Database',
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_project_token\` (\`token\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create df_tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_tables\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`project_id\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`slug\` VARCHAR(128) NOT NULL,
      \`description\` TEXT NULL,
      \`primary_key\` VARCHAR(64) NOT NULL DEFAULT 'id',
      \`token\` VARCHAR(128) NULL,
      \`fields\` LONGTEXT NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_project_slug\` (\`project_id\`, \`slug\`),
      KEY \`idx_table_token\` (\`token\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create df_records
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_records\` (
      \`id\` VARCHAR(128) NOT NULL,
      \`table_id\` VARCHAR(64) NOT NULL,
      \`project_id\` VARCHAR(64) NOT NULL,
      \`data\` LONGTEXT NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`table_id\`, \`id\`),
      KEY \`idx_records_project\` (\`project_id\`),
      KEY \`idx_records_table\` (\`table_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create df_settings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_settings\` (
      \`key\` VARCHAR(64) NOT NULL,
      \`value\` LONGTEXT NOT NULL,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create df_smtp_accounts (Multi-Pool Failover & Persistent Storage)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_smtp_accounts\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`gmail_user\` VARCHAR(255) NOT NULL,
      \`gmail_app_password\` VARCHAR(255) NOT NULL,
      \`from_name\` VARCHAR(255) NOT NULL DEFAULT 'DataForge API Studio',
      \`host\` VARCHAR(255) NOT NULL DEFAULT 'smtp.gmail.com',
      \`port\` INT NOT NULL DEFAULT 465,
      \`secure\` TINYINT(1) NOT NULL DEFAULT 1,
      \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`order_num\` INT NOT NULL DEFAULT 1,
      \`last_tested_at\` DATETIME NULL,
      \`last_status\` VARCHAR(32) NOT NULL DEFAULT 'untested',
      \`last_error_message\` TEXT NULL,
      \`success_count\` INT NOT NULL DEFAULT 0,
      \`fail_count\` INT NOT NULL DEFAULT 0,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_smtp_active_order\` (\`is_active\`, \`order_num\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create df_users (RBAC Superadmin, Admin, User & Email Verification)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_users\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`email\` VARCHAR(255) NOT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`role\` ENUM('superadmin', 'admin', 'user') NOT NULL DEFAULT 'user',
      \`is_verified\` TINYINT(1) NOT NULL DEFAULT 0,
      \`verification_code\` VARCHAR(32) NULL,
      \`verification_token\` VARCHAR(128) NULL,
      \`verification_expires_at\` DATETIME NULL,
      \`reset_password_code\` VARCHAR(32) NULL,
      \`reset_password_token\` VARCHAR(128) NULL,
      \`reset_password_expires_at\` DATETIME NULL,
      \`last_otp_sent_at\` DATETIME NULL,
      \`last_reset_sent_at\` DATETIME NULL,
      \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_user_email\` (\`email\`),
      KEY \`idx_user_role\` (\`role\`),
      KEY \`idx_user_verified\` (\`is_verified\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure upgrade columns exist on existing df_users table
  await addColumnIfNotExists(pool, 'df_users', 'reset_password_code', 'VARCHAR(32) NULL');
  await addColumnIfNotExists(pool, 'df_users', 'reset_password_token', 'VARCHAR(128) NULL');
  await addColumnIfNotExists(pool, 'df_users', 'reset_password_expires_at', 'DATETIME NULL');
  await addColumnIfNotExists(pool, 'df_users', 'last_otp_sent_at', 'DATETIME NULL');
  await addColumnIfNotExists(pool, 'df_users', 'last_reset_sent_at', 'DATETIME NULL');

  // Auto-seed default users if df_users is empty
  const [userCountRows]: any = await pool.query('SELECT COUNT(*) AS total FROM df_users');
  if (userCountRows[0]?.total === 0) {
    const seedList = getAllUsers();
    for (const u of seedList) {
      await pool.query(
        `INSERT INTO df_users (id, name, email, password_hash, role, is_verified, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email, u.passwordHash, u.role, u.isVerified ? 1 : 0, u.isActive ? 1 : 0, new Date(u.createdAt), new Date(u.updatedAt)]
      );
    }
    console.log(`[MySQL] Berhasil seeding ${seedList.length} akun bawaan ke tabel df_users.`);
  }
}

export async function connectMySQL(cfg?: MySQLConfig): Promise<{ success: boolean; message: string; error?: string }> {
  const finalConfig = cfg || getEnvDbConfig();

  try {
    if (currentPool) {
      try {
        await currentPool.end();
      } catch (_) {}
      currentPool = null;
    }

    const opts = parseConnectionOptions(finalConfig);
    currentPool = mysql.createPool(opts);

    // Verify connection
    await currentPool.query('SELECT 1 AS ready');

    // Create tables if not exist
    await initMySQLTables(currentPool);

    lastError = undefined;
    lastConnectedAt = new Date().toISOString();

    const targetDesc = finalConfig.uri
      ? `Cloud URI (${finalConfig.uri.split('@')[1] || 'remote'})`
      : `${finalConfig.database} @ ${finalConfig.host}:${finalConfig.port}`;

    return {
      success: true,
      message: `Berhasil terhubung ke database online MySQL (${targetDesc})!`
    };
  } catch (err: any) {
    lastError = err.message || String(err);
    if (currentPool) {
      try {
        await currentPool.end();
      } catch (_) {}
      currentPool = null;
    }
    // Send Telegram alert
    await sendTelegramAlert(lastError || 'Unknown connection error', 'Gangguan Koneksi Database MySQL Online');
    return {
      success: false,
      message: 'Gagal menghubungkan ke database MySQL online dari variabel lingkungan (.env)',
      error: lastError
    };
  }
}

let autoReconnectTimer: NodeJS.Timeout | null = null;
export function startAutoReconnectLoop() {
  if (autoReconnectTimer) return;
  autoReconnectTimer = setInterval(async () => {
    const cfg = getEnvDbConfig();
    if (cfg.enabled && !currentPool) {
      console.log('[MySQL] Auto-reconnect: Mencoba menghubungkan ulang ke database online...');
      const res = await connectMySQL(cfg);
      if (res.success) {
        console.log('[MySQL] Auto-reconnect: Berhasil terhubung kembali ke database online!');
      }
    }
  }, 10000); // Check and retry every 10 seconds
}

export async function disconnectMySQL(): Promise<{ success: boolean }> {
  if (currentPool) {
    try {
      await currentPool.end();
    } catch (_) {}
    currentPool = null;
  }
  lastError = undefined;
  return { success: true };
}

export function isMySQLConnected(): boolean {
  return currentPool !== null;
}

export async function getMySQLStatus(): Promise<MySQLStatus> {
  const envCfg = getEnvDbConfig();
  if (!currentPool) {
    return {
      engine: 'local',
      connected: false,
      host: envCfg.host,
      port: envCfg.port,
      database: envCfg.database,
      user: envCfg.user,
      ssl: envCfg.ssl,
      error: lastError
    };
  }

  const start = Date.now();
  try {
    await currentPool.query('SELECT 1');
    const latencyMs = Date.now() - start;

    const [tableRows]: any = await currentPool.query('SELECT COUNT(*) AS total FROM df_tables');
    const [recordRows]: any = await currentPool.query('SELECT COUNT(*) AS total FROM df_records');

    return {
      engine: 'mysql',
      connected: true,
      host: envCfg.host,
      port: envCfg.port,
      database: envCfg.database,
      user: envCfg.user,
      ssl: envCfg.ssl,
      latencyMs,
      tablesCount: tableRows[0]?.total || 0,
      recordsCount: recordRows[0]?.total || 0,
      lastConnectedAt
    };
  } catch (err: any) {
    lastError = err.message || String(err);
    return {
      engine: 'mysql',
      connected: false,
      host: envCfg.host,
      port: envCfg.port,
      database: envCfg.database,
      user: envCfg.user,
      error: lastError
    };
  }
}

// -------------------------------------------------------------------
// DATA CRUD & SYNC OPERATIONS FOR PROJECTS, TABLES, RECORDS
// -------------------------------------------------------------------

export async function loadDataFromMySQL(): Promise<{
  projects: DatabaseProject[];
  tables: DatabaseTable[];
  records: DatabaseRecord[];
}> {
  if (!currentPool) {
    throw new Error('MySQL connection pool tidak aktif');
  }

  const [projRows]: any = await currentPool.query('SELECT * FROM df_projects ORDER BY created_at ASC');
  const [tblRows]: any = await currentPool.query('SELECT * FROM df_tables ORDER BY created_at ASC');
  const [recRows]: any = await currentPool.query('SELECT * FROM df_records ORDER BY created_at ASC');

  const loadedProjects: DatabaseProject[] = projRows.map((r: any) => ({
    id: r.id,
    ownerId: r.owner_id || undefined,
    ownerEmail: r.owner_email || undefined,
    name: r.name,
    description: r.description || '',
    token: r.token,
    color: r.color || 'indigo',
    icon: r.icon || 'Database',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined
  }));

  const loadedTables: DatabaseTable[] = tblRows.map((r: any) => {
    let fields = [];
    try {
      fields = typeof r.fields === 'string' ? JSON.parse(r.fields) : r.fields;
    } catch (_) {
      fields = [];
    }
    return {
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      slug: r.slug,
      description: r.description || '',
      token: r.token || undefined,
      primaryKey: r.primary_key || 'id',
      fields,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  });

  const loadedRecords: DatabaseRecord[] = recRows.map((r: any) => {
    let data = {};
    try {
      data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    } catch (_) {
      data = {};
    }
    return {
      id: isNaN(Number(r.id)) ? r.id : Number(r.id),
      tableId: r.table_id,
      projectId: r.project_id,
      data,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  });

  return {
    projects: loadedProjects,
    tables: loadedTables,
    records: loadedRecords
  };
}

export async function syncAllToMySQL(
  projects: DatabaseProject[],
  tables: DatabaseTable[],
  records: DatabaseRecord[]
): Promise<{ success: boolean; projectsCount: number; tablesCount: number; recordsCount: number }> {
  if (!currentPool) {
    throw new Error('MySQL connection pool tidak aktif');
  }

  // Ensure tables exist
  await initMySQLTables(currentPool);

  const conn = await currentPool.getConnection();
  try {
    await conn.beginTransaction();

    // Sync Projects
    for (const p of projects) {
      await conn.query(
        `INSERT INTO df_projects (id, owner_id, owner_email, name, description, token, color, icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           owner_id = VALUES(owner_id),
           owner_email = VALUES(owner_email),
           name = VALUES(name),
           description = VALUES(description),
           token = VALUES(token),
           color = VALUES(color),
           icon = VALUES(icon),
           updated_at = VALUES(updated_at)`,
        [p.id, p.ownerId || null, p.ownerEmail || null, p.name, p.description, p.token, p.color || 'indigo', p.icon || 'Database', new Date(p.createdAt), new Date(p.updatedAt || p.createdAt)]
      );
    }

    // Sync Tables
    for (const t of tables) {
      await conn.query(
        `INSERT INTO df_tables (id, project_id, name, slug, description, primary_key, token, fields, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           slug = VALUES(slug),
           description = VALUES(description),
           primary_key = VALUES(primary_key),
           token = VALUES(token),
           fields = VALUES(fields),
           updated_at = VALUES(updated_at)`,
        [t.id, t.projectId, t.name, t.slug, t.description || '', t.primaryKey || 'id', t.token || null, JSON.stringify(t.fields), new Date(t.createdAt), new Date(t.updatedAt)]
      );
    }

    // Sync Records
    for (const r of records) {
      const rec = r as any;
      await conn.query(
        `INSERT INTO df_records (id, table_id, project_id, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           project_id = VALUES(project_id),
           data = VALUES(data),
           updated_at = VALUES(updated_at)`,
        [String(rec.id), rec.tableId || rec.table_id, rec.projectId || rec.project_id, JSON.stringify(rec.data), new Date(rec.createdAt), new Date(rec.updatedAt)]
      );
    }

    await conn.commit();
    return {
      success: true,
      projectsCount: projects.length,
      tablesCount: tables.length,
      recordsCount: records.length
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function mysqlUpsertProject(p: DatabaseProject): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_projects (id, owner_id, owner_email, name, description, token, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         owner_id = VALUES(owner_id),
         owner_email = VALUES(owner_email),
         name = VALUES(name),
         description = VALUES(description),
         token = VALUES(token),
         color = VALUES(color),
         icon = VALUES(icon),
         updated_at = VALUES(updated_at)`,
      [p.id, p.ownerId || null, p.ownerEmail || null, p.name, p.description, p.token, p.color || 'indigo', p.icon || 'Database', new Date(p.createdAt), new Date(p.updatedAt || p.createdAt)]
    );
  } catch (err) {
    console.error('[MySQL] Error upserting project:', err);
  }
}

export async function mysqlDeleteProject(projectId: string): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query('DELETE FROM df_projects WHERE id = ?', [projectId]);
    await currentPool.query('DELETE FROM df_tables WHERE project_id = ?', [projectId]);
    await currentPool.query('DELETE FROM df_records WHERE project_id = ?', [projectId]);
  } catch (err) {
    console.error('[MySQL] Error deleting project:', err);
  }
}

export async function mysqlUpsertTable(t: DatabaseTable): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_tables (id, project_id, name, slug, description, primary_key, token, fields, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         slug = VALUES(slug),
         description = VALUES(description),
         primary_key = VALUES(primary_key),
         token = VALUES(token),
         fields = VALUES(fields),
         updated_at = VALUES(updated_at)`,
      [t.id, t.projectId, t.name, t.slug, t.description || '', t.primaryKey || 'id', t.token || null, JSON.stringify(t.fields), new Date(t.createdAt), new Date(t.updatedAt)]
    );
  } catch (err) {
    console.error('[MySQL] Error upserting table:', err);
  }
}

export async function mysqlDeleteTable(tableId: string): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query('DELETE FROM df_tables WHERE id = ?', [tableId]);
    await currentPool.query('DELETE FROM df_records WHERE table_id = ?', [tableId]);
  } catch (err) {
    console.error('[MySQL] Error deleting table:', err);
  }
}

export async function mysqlUpsertRecord(r: DatabaseRecord): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_records (id, table_id, project_id, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         project_id = VALUES(project_id),
         data = VALUES(data),
         updated_at = VALUES(updated_at)`,
      [String(r.id), r.tableId, r.projectId, JSON.stringify(r.data), new Date(r.createdAt), new Date(r.updatedAt)]
    );
  } catch (err) {
    console.error('[MySQL] Error upserting record:', err);
  }
}

export async function mysqlDeleteRecord(tableId: string, recordId: string | number): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query('DELETE FROM df_records WHERE table_id = ? AND id = ?', [tableId, String(recordId)]);
  } catch (err) {
    console.error('[MySQL] Error deleting record:', err);
  }
}

// -------------------------------------------------------------------
// USERS SYNC OPERATIONS
// -------------------------------------------------------------------

export async function loadUsersFromMySQL(): Promise<User[]> {
  if (!currentPool) return [];
  try {
    const [rows]: any = await currentPool.query('SELECT * FROM df_users ORDER BY created_at ASC');
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role,
      isVerified: Boolean(r.is_verified),
      verificationCode: r.verification_code || undefined,
      verificationToken: r.verification_token || undefined,
      verificationExpiresAt: r.verification_expires_at ? new Date(r.verification_expires_at).toISOString() : undefined,
      resetPasswordCode: r.reset_password_code || undefined,
      resetPasswordToken: r.reset_password_token || undefined,
      resetPasswordExpiresAt: r.reset_password_expires_at ? new Date(r.reset_password_expires_at).toISOString() : undefined,
      lastOtpSentAt: r.last_otp_sent_at ? new Date(r.last_otp_sent_at).toISOString() : undefined,
      lastResetSentAt: r.last_reset_sent_at ? new Date(r.last_reset_sent_at).toISOString() : undefined,
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));
  } catch (err) {
    console.error('[MySQL] Error loading users:', err);
    return [];
  }
}

export async function findUserByEmailFromMySQL(email: string): Promise<User | null> {
  if (!currentPool) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const [rows]: any = await currentPool.query('SELECT * FROM df_users WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role,
      isVerified: Boolean(r.is_verified),
      verificationCode: r.verification_code || undefined,
      verificationToken: r.verification_token || undefined,
      verificationExpiresAt: r.verification_expires_at ? new Date(r.verification_expires_at).toISOString() : undefined,
      resetPasswordCode: r.reset_password_code || undefined,
      resetPasswordToken: r.reset_password_token || undefined,
      resetPasswordExpiresAt: r.reset_password_expires_at ? new Date(r.reset_password_expires_at).toISOString() : undefined,
      lastOtpSentAt: r.last_otp_sent_at ? new Date(r.last_otp_sent_at).toISOString() : undefined,
      lastResetSentAt: r.last_reset_sent_at ? new Date(r.last_reset_sent_at).toISOString() : undefined,
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  } catch (err) {
    console.error('[MySQL] Error finding user by email:', err);
    return null;
  }
}

export async function mysqlUpsertUser(u: User): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_users (id, name, email, password_hash, role, is_verified, verification_code, verification_token, verification_expires_at, reset_password_code, reset_password_token, reset_password_expires_at, last_otp_sent_at, last_reset_sent_at, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         role = VALUES(role),
         is_verified = VALUES(is_verified),
         verification_code = VALUES(verification_code),
         verification_token = VALUES(verification_token),
         verification_expires_at = VALUES(verification_expires_at),
         reset_password_code = VALUES(reset_password_code),
         reset_password_token = VALUES(reset_password_token),
         reset_password_expires_at = VALUES(reset_password_expires_at),
         last_otp_sent_at = VALUES(last_otp_sent_at),
         last_reset_sent_at = VALUES(last_reset_sent_at),
         is_active = VALUES(is_active),
         updated_at = VALUES(updated_at)`,
      [
        u.id,
        u.name,
        u.email,
        u.passwordHash,
        u.role,
        u.isVerified ? 1 : 0,
        u.verificationCode || null,
        u.verificationToken || null,
        u.verificationExpiresAt ? new Date(u.verificationExpiresAt) : null,
        u.resetPasswordCode || null,
        u.resetPasswordToken || null,
        u.resetPasswordExpiresAt ? new Date(u.resetPasswordExpiresAt) : null,
        u.lastOtpSentAt ? new Date(u.lastOtpSentAt) : null,
        u.lastResetSentAt ? new Date(u.lastResetSentAt) : null,
        u.isActive ? 1 : 0,
        new Date(u.createdAt),
        new Date(u.updatedAt)
      ]
    );
  } catch (err) {
    console.error('[MySQL] Error upserting user:', err);
  }
}

export async function mysqlDeleteUser(userId: string): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query('DELETE FROM df_users WHERE id = ?', [userId]);
  } catch (err) {
    console.error('[MySQL] Error deleting user:', err);
  }
}

export async function syncAllUsersToMySQL(users: User[]): Promise<void> {
  if (!currentPool) return;
  for (const u of users) {
    await mysqlUpsertUser(u);
  }
}

// -------------------------------------------------------------------
// SMTP ACCOUNTS PERSISTENCE & SYNC OPERATIONS (df_smtp_accounts)
// -------------------------------------------------------------------

export async function loadSmtpAccountsFromMySQL(): Promise<SmtpAccountRecord[]> {
  if (!currentPool) return [];
  try {
    const [rows]: any = await currentPool.query('SELECT * FROM df_smtp_accounts ORDER BY order_num ASC, created_at ASC');
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      gmailUser: r.gmail_user,
      gmailAppPassword: r.gmail_app_password,
      fromName: r.from_name || 'DataForge API Studio',
      host: r.host || 'smtp.gmail.com',
      port: r.port || 465,
      secure: Boolean(r.secure),
      isActive: Boolean(r.is_active),
      order: r.order_num || 1,
      lastTestedAt: r.last_tested_at ? new Date(r.last_tested_at).toISOString() : undefined,
      lastStatus: r.last_status || 'untested',
      lastErrorMessage: r.last_error_message || undefined,
      successCount: r.success_count || 0,
      failCount: r.fail_count || 0
    }));
  } catch (err) {
    console.error('[MySQL] Error loading SMTP accounts:', err);
    return [];
  }
}

export async function mysqlUpsertSmtpAccount(acc: SmtpAccountRecord): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_smtp_accounts (
        id, name, gmail_user, gmail_app_password, from_name, host, port, secure, is_active, order_num,
        last_tested_at, last_status, last_error_message, success_count, fail_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        gmail_user = VALUES(gmail_user),
        gmail_app_password = VALUES(gmail_app_password),
        from_name = VALUES(from_name),
        host = VALUES(host),
        port = VALUES(port),
        secure = VALUES(secure),
        is_active = VALUES(is_active),
        order_num = VALUES(order_num),
        last_tested_at = VALUES(last_tested_at),
        last_status = VALUES(last_status),
        last_error_message = VALUES(last_error_message),
        success_count = VALUES(success_count),
        fail_count = VALUES(fail_count),
        updated_at = NOW()`,
      [
        acc.id,
        acc.name,
        acc.gmailUser,
        acc.gmailAppPassword,
        acc.fromName || 'DataForge API Studio',
        acc.host || 'smtp.gmail.com',
        acc.port || 465,
        acc.secure ? 1 : 0,
        acc.isActive ? 1 : 0,
        acc.order || 1,
        acc.lastTestedAt ? new Date(acc.lastTestedAt) : null,
        acc.lastStatus || 'untested',
        acc.lastErrorMessage || null,
        acc.successCount || 0,
        acc.failCount || 0
      ]
    );
  } catch (err) {
    console.error('[MySQL] Error upserting SMTP account:', err);
  }
}

export async function mysqlDeleteSmtpAccount(id: string): Promise<void> {
  if (!currentPool) return;
  try {
    await currentPool.query('DELETE FROM df_smtp_accounts WHERE id = ?', [id]);
  } catch (err) {
    console.error('[MySQL] Error deleting SMTP account:', err);
  }
}

export async function syncAllSmtpAccountsToMySQL(accounts: SmtpAccountRecord[]): Promise<void> {
  if (!currentPool) return;
  for (const acc of accounts) {
    await mysqlUpsertSmtpAccount(acc);
  }
}

export function getSchemaSQLContent(): string {
  try {
    if (fs.existsSync(SCHEMA_FILE)) {
      return fs.readFileSync(SCHEMA_FILE, 'utf-8');
    }
  } catch (err) {
    console.error('[MySQL] Gagal membaca schema.mysql.sql:', err);
  }
  return '-- Schema file not found';
}

export async function getDatabaseTablesList(): Promise<string[]> {
  if (!currentPool) {
    return ['df_users', 'df_projects', 'df_tables', 'df_records', 'df_smtp_accounts'];
  }
  try {
    const [rows]: any = await currentPool.query('SHOW TABLES');
    return rows.map((r: any) => Object.values(r)[0] as string);
  } catch (err) {
    return [];
  }
}

export async function getTableDataPaginated(tableName: string, page: number = 1, limit: number = 10): Promise<{ columns: string[]; rows: any[]; total: number }> {
  const offset = Math.max(0, (page - 1) * limit);
  if (!currentPool) {
    return { columns: [], rows: [], total: 0 };
  }
  try {
    const [countRows]: any = await currentPool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
    const total = countRows[0]?.total || 0;

    const [rows]: any = await currentPool.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [Number(limit), Number(offset)]);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return { columns, rows, total };
  } catch (err: any) {
    console.error('[MySQL] Error querying table data:', err);
    return { columns: [], rows: [], total: 0 };
  }
}

