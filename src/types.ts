export type Language = 'id' | 'en';
export type UserMode = 'simple' | 'developer';
export type ThemeMode = 'light' | 'dark';
export type ActiveNav = 'tables' | 'sandbox' | 'docs' | 'db-online' | 'mysql-schema' | 'users' | 'mail-settings';

export type UserRole = 'superadmin' | 'admin' | 'user';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GmailSmtpAccount {
  id: string;
  name: string;
  gmailUser: string;
  fromName: string;
  host: string;
  port: number;
  secure: boolean;
  isActive: boolean;
  order: number;
  hasPassword: boolean;
  maskedUser?: string;
  lastTestedAt?: string;
  lastStatus?: 'success' | 'failed' | 'untested';
  lastErrorMessage?: string;
  successCount?: number;
  failCount?: number;
}

export interface MailConfig {
  service: 'gmail';
  accounts: GmailSmtpAccount[];
  // Legacy / convenience fields
  gmailUser?: string;
  fromName?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  hasPassword?: boolean;
  maskedUser?: string;
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

export type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'date' | 'email' | 'multiline';

export interface TableField {
  key: string;            // Column key / identifier (e.g. 'nama', 'harga', 'nis')
  label: string;          // Display label (e.g. 'Nama Lengkap', 'Harga Produk')
  type: FieldType;        // Data type
  required: boolean;      // Required or nullable
  defaultValue?: any;     // Optional default
  options?: string[];     // Select options if type === 'select'
  isPrimaryKey?: boolean; // Flag if this is the primary key (id)
}

export interface DatabaseTable {
  id: string;
  projectId: string;
  ownerId?: string;       // Owner user ID for multi-user isolation
  name: string;           // Display name (e.g. 'Siswa', 'Produk', 'Pesanan')
  slug: string;           // API route slug (e.g. 'siswa', 'produk', 'pesanan')
  description?: string;
  primaryKey: string;     // Usually 'id'
  fields: TableField[];   // List of defined columns
  apiVisibleFields?: string[];    // Field keys visible in API GET (if empty -> all)
  apiSearchableFields?: string[]; // Field keys searchable via API search (if empty -> all)
  token?: string;         // Dedicated table token (if rotated / isolated per table)
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseRecord {
  id: number | string;    // Primary key (MySQL style auto-increment or unique ID)
  tableId: string;
  projectId: string;
  data: Record<string, any>; // Column values keyed by field.key
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseProject {
  id: string;
  ownerId?: string;       // Owner user ID for multi-user isolation
  ownerEmail?: string;
  name: string;           // Database name (e.g. 'Sistem Sekolah', 'Database Toko Online')
  description: string;
  token: string;          // API token for external REST access
  color: string;
  icon: string;
  createdAt: string;
  updatedAt?: string;
}

