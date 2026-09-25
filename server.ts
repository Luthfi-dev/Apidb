import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  getEnvDbConfig,
  getSafeDbConfig,
  testConnection,
  testEnvConnection,
  connectMySQL,
  disconnectMySQL,
  isMySQLConnected,
  getMySQLStatus,
  loadDataFromMySQL,
  syncAllToMySQL,
  mysqlUpsertProject,
  mysqlDeleteProject,
  mysqlUpsertTable,
  mysqlDeleteTable,
  mysqlUpsertRecord,
  mysqlDeleteRecord,
  loadUsersFromMySQL,
  mysqlUpsertUser,
  mysqlDeleteUser,
  syncAllUsersToMySQL,
  getSchemaSQLContent,
  getDatabaseTablesList,
  getTableDataPaginated,
  startAutoReconnectLoop
} from './src/server/mysqlService';
import {
  registerUser,
  loginUser,
  verifyUserEmail,
  resendVerificationCode,
  requestPasswordReset,
  resetPasswordWithCodeOrToken,
  verifyResetCode,
  updateUserProfile,
  verifyJwtToken,
  getAllUsers,
  setAllUsers,
  toSafeUser,
  User,
  SafeUser,
  UserRole
} from './src/server/authService';
import {
  loadMailConfig,
  saveMailConfig,
  getSafeMailConfig,
  addSmtpAccount,
  updateSmtpAccount,
  deleteSmtpAccount,
  reorderSmtpAccounts,
  testSingleSmtpAccount,
  sendEmailWithFailover,
  syncMailConfigWithMySQL
} from './src/server/mailService';

export type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'date' | 'email' | 'multiline';

export interface TableField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  isPrimaryKey?: boolean;
}

export interface DatabaseTable {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description?: string;
  token?: string;
  primaryKey: string;
  fields: TableField[];
  apiVisibleFields?: string[];
  apiSearchableFields?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseRecord {
  id: number | string;
  tableId: string;
  projectId: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseProject {
  id: string;
  ownerId?: string;
  ownerEmail?: string;
  name: string;
  description: string;
  token: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt?: string;
}

interface AppDatabaseData {
  projects: DatabaseProject[];
  tables: DatabaseTable[];
  records: DatabaseRecord[];
  users?: User[];
  nextIdCounters?: Record<string, number>; // tableId -> next auto_increment integer
}

const DATA_FILE = path.resolve(process.cwd(), 'data.json');

let projects: DatabaseProject[] = [];
let tables: DatabaseTable[] = [];
let records: DatabaseRecord[] = [];
let nextIdCounters: Record<string, number> = {};

function getNextRecordId(tableId: string): number {
  if (!nextIdCounters[tableId]) {
    // Find current highest numerical id in this table
    const tableRecords = records.filter(r => r.tableId === tableId);
    let maxId = 0;
    for (const r of tableRecords) {
      const num = typeof r.id === 'number' ? r.id : parseInt(String(r.id), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
    nextIdCounters[tableId] = maxId + 1;
  }
  const id = nextIdCounters[tableId]++;
  return id;
}

function seedDefaultDatabase() {
  const proj1Id = 'proj-sekolah';
  const proj2Id = 'proj-toko';

  const defaultProjects: DatabaseProject[] = [
    {
      id: proj1Id,
      name: 'Database Sistem Sekolah',
      description: 'Pusat data siswa, guru, dan administrasi akademik sekolah dengan akses REST API',
      token: 'sb_live_sekolah_9823471029384721',
      color: 'indigo',
      icon: 'GraduationCap',
      createdAt: new Date().toISOString()
    },
    {
      id: proj2Id,
      name: 'Database Toko Online & Produk',
      description: 'Katalog produk e-commerce, stok gudang, dan riwayat transaksi pesanan',
      token: 'sb_live_toko_4918237491029384',
      color: 'emerald',
      icon: 'Store',
      createdAt: new Date().toISOString()
    }
  ];

  const defaultTables: DatabaseTable[] = [
    {
      id: 'tbl-siswa',
      projectId: proj1Id,
      name: 'Data Siswa',
      slug: 'siswa',
      description: 'Daftar biodata siswa aktif dan status akademik',
      primaryKey: 'id',
      fields: [
        { key: 'id', label: 'ID (PK)', type: 'number', required: true, isPrimaryKey: true },
        { key: 'nis', label: 'NIS', type: 'text', required: true },
        { key: 'nama', label: 'Nama Siswa', type: 'text', required: true },
        { key: 'kelas', label: 'Kelas', type: 'select', required: true, options: ['X RPL 1', 'XI RPL 1', 'XII RPL 1', 'XII TKJ 2'] },
        { key: 'jurusan', label: 'Jurusan', type: 'text', required: false },
        { key: 'email', label: 'Email', type: 'email', required: false },
        { key: 'status', label: 'Status', type: 'select', required: true, options: ['Aktif', 'Lulus', 'Cuti'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'tbl-guru',
      projectId: proj1Id,
      name: 'Data Guru',
      slug: 'guru',
      description: 'Tenaga pengajar dan pengampu mata pelajaran',
      primaryKey: 'id',
      fields: [
        { key: 'id', label: 'ID (PK)', type: 'number', required: true, isPrimaryKey: true },
        { key: 'nip', label: 'NIP', type: 'text', required: true },
        { key: 'nama', label: 'Nama Guru', type: 'text', required: true },
        { key: 'mata_pelajaran', label: 'Mata Pelajaran', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: false },
        { key: 'status', label: 'Status', type: 'select', required: true, options: ['Aktif', 'Cuti'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'tbl-produk',
      projectId: proj2Id,
      name: 'Katalog Produk',
      slug: 'produk',
      description: 'Master data barang dan stok ketersediaan',
      primaryKey: 'id',
      fields: [
        { key: 'id', label: 'ID (PK)', type: 'number', required: true, isPrimaryKey: true },
        { key: 'sku', label: 'Kode SKU', type: 'text', required: true },
        { key: 'nama_produk', label: 'Nama Produk', type: 'text', required: true },
        { key: 'kategori', label: 'Kategori', type: 'select', required: true, options: ['Elektronik', 'Pakaian', 'Aksesoris', 'Buku'] },
        { key: 'harga', label: 'Harga (Rp)', type: 'number', required: true },
        { key: 'stok', label: 'Stok Barang', type: 'number', required: true },
        { key: 'status', label: 'Status Stok', type: 'select', required: true, options: ['Tersedia', 'Habis', 'Preorder'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'tbl-pesanan',
      projectId: proj2Id,
      name: 'Data Pesanan',
      slug: 'pesanan',
      description: 'Catatan order masuk dari aplikasi luar atau web',
      primaryKey: 'id',
      fields: [
        { key: 'id', label: 'ID (PK)', type: 'number', required: true, isPrimaryKey: true },
        { key: 'nomor_resi', label: 'No. Pesanan', type: 'text', required: true },
        { key: 'pelanggan', label: 'Nama Pelanggan', type: 'text', required: true },
        { key: 'total_bayar', label: 'Total Bayar (Rp)', type: 'number', required: true },
        { key: 'metode', label: 'Metode Bayar', type: 'select', required: true, options: ['Transfer Bank', 'QRIS', 'COD', 'E-Wallet'] },
        { key: 'status', label: 'Status Pesanan', type: 'select', required: true, options: ['Dibayar', 'Diproses', 'Dikirim', 'Selesai'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultRecords: DatabaseRecord[] = [
    // Siswa records
    {
      id: 1,
      tableId: 'tbl-siswa',
      projectId: proj1Id,
      data: { id: 1, nis: '202401', nama: 'Ahmad Faisal', kelas: 'XII RPL 1', jurusan: 'Rekayasa Perangkat Lunak', email: 'ahmad@sekolah.sch.id', status: 'Aktif' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      tableId: 'tbl-siswa',
      projectId: proj1Id,
      data: { id: 2, nis: '202402', nama: 'Siti Rahmawati', kelas: 'XII RPL 1', jurusan: 'Rekayasa Perangkat Lunak', email: 'siti@sekolah.sch.id', status: 'Aktif' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      tableId: 'tbl-siswa',
      projectId: proj1Id,
      data: { id: 3, nis: '202403', nama: 'Budi Kurniawan', kelas: 'XII TKJ 2', jurusan: 'Teknik Komputer Jaringan', email: 'budi@sekolah.sch.id', status: 'Aktif' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 4,
      tableId: 'tbl-siswa',
      projectId: proj1Id,
      data: { id: 4, nis: '202404', nama: 'Dewi Lestari', kelas: 'XI RPL 1', jurusan: 'Rekayasa Perangkat Lunak', email: 'dewi@sekolah.sch.id', status: 'Cuti' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Guru records
    {
      id: 1,
      tableId: 'tbl-guru',
      projectId: proj1Id,
      data: { id: 1, nip: '198501012010', nama: 'Ir. Bambang Sugiarto, M.Kom', mata_pelajaran: 'Pemrograman Web & REST API', email: 'bambang@sekolah.sch.id', status: 'Aktif' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      tableId: 'tbl-guru',
      projectId: proj1Id,
      data: { id: 2, nip: '199003152015', nama: 'Nurul Hidayah, S.Pd', mata_pelajaran: 'Basis Data & SQL', email: 'nurul@sekolah.sch.id', status: 'Aktif' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Produk records
    {
      id: 1,
      tableId: 'tbl-produk',
      projectId: proj2Id,
      data: { id: 1, sku: 'PRD-001', nama_produk: 'Laptop Pro Creator 15"', kategori: 'Elektronik', harga: 16500000, stok: 14, status: 'Tersedia' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      tableId: 'tbl-produk',
      projectId: proj2Id,
      data: { id: 2, sku: 'PRD-002', nama_produk: 'Mouse Wireless Ergonomic', kategori: 'Aksesoris', harga: 350000, stok: 48, status: 'Tersedia' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      tableId: 'tbl-produk',
      projectId: proj2Id,
      data: { id: 3, sku: 'PRD-003', nama_produk: 'Keyboard Mechanical RGB', kategori: 'Elektronik', harga: 850000, stok: 0, status: 'Habis' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Pesanan records
    {
      id: 1,
      tableId: 'tbl-pesanan',
      projectId: proj2Id,
      data: { id: 1, nomor_resi: 'INV-2026-0091', pelanggan: 'Hendro Wijaya', total_bayar: 16850000, metode: 'Transfer Bank', status: 'Dikirim' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      tableId: 'tbl-pesanan',
      projectId: proj2Id,
      data: { id: 2, nomor_resi: 'INV-2026-0092', pelanggan: 'Anisa Putri', total_bayar: 350000, metode: 'QRIS', status: 'Selesai' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  projects = defaultProjects;
  tables = defaultTables;
  records = defaultRecords;
  nextIdCounters = {
    'tbl-siswa': 5,
    'tbl-guru': 3,
    'tbl-produk': 4,
    'tbl-pesanan': 3
  };

  saveDataToFile();
}

function loadDataFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.users)) {
        setAllUsers(parsed.users);
      }
      if (Array.isArray(parsed.tables) && Array.isArray(parsed.records)) {
        projects = Array.isArray(parsed.projects) ? parsed.projects : [];
        tables = parsed.tables;
        records = parsed.records;
        nextIdCounters = parsed.nextIdCounters || {};
        console.log(`[Database] Loaded ${projects.length} databases, ${tables.length} tables, ${records.length} records, ${getAllUsers().length} users.`);
        return;
      }
    }
  } catch (err) {
    console.error('[Database] Error reading data.json, re-seeding:', err);
  }

  seedDefaultDatabase();
}

function saveDataToFile() {
  try {
    const data: AppDatabaseData = {
      projects,
      tables,
      records,
      users: getAllUsers(),
      nextIdCounters
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Failed to write data.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  loadDataFromFile();

  // Enforce connecting to online MySQL if environment variable is set
  const envDbConfig = getEnvDbConfig();
  if (envDbConfig.enabled) {
    console.log('[MySQL] Membaca konfigurasi dari Environment Variables (.env). Menghubungkan ke online database...');
    try {
      const res = await connectMySQL(envDbConfig);
      if (res.success) {
        console.log('[MySQL] Berhasil terhubung ke database online!');
        try {
          const mysqlData = await loadDataFromMySQL();
          if (mysqlData.projects.length > 0) {
            projects = mysqlData.projects;
            tables = mysqlData.tables;
            records = mysqlData.records;
            console.log(`[MySQL] Memuat ${projects.length} project, ${tables.length} tabel, ${records.length} records dari MySQL.`);
          } else {
            console.log('[MySQL] Database MySQL kosong. Mengunggah data lokal ke MySQL...');
            await syncAllToMySQL(projects, tables, records);
          }

          // Load / sync users with MySQL
          const mysqlUsers = await loadUsersFromMySQL();
          if (mysqlUsers.length > 0) {
            setAllUsers(mysqlUsers);
            console.log(`[MySQL] Memuat ${mysqlUsers.length} pengguna dari MySQL.`);
          } else {
            console.log('[MySQL] Mengunggah akun pengguna ke MySQL...');
            await syncAllUsersToMySQL(getAllUsers());
          }

          // Load / sync SMTP configs with MySQL
          await syncMailConfigWithMySQL();
        } catch (syncErr) {
          console.error('[MySQL] Gagal inisialisasi data dari MySQL:', syncErr);
        }
      } else {
        console.error('[MySQL] Belum dapat terhubung ke MySQL online dari .env:', res.error);
      }
    } catch (err) {
      console.error('[MySQL] Gagal inisialisasi koneksi:', err);
    }
  } else {
    console.log('[Database] Tidak ada konfigurasi MySQL di .env. Menggunakan mode penyimpanan lokal (data.json).');
  }

  // Start background auto-reconnect loop
  startAutoReconnectLoop();

  // Middleware
  app.use(express.json());

  // Global CORS headers for external API integration
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // -------------------------------------------------------------
  // ONLINE DATABASE ENGINE & MYSQL SYNC MANAGEMENT APIS
  // -------------------------------------------------------------
  app.get('/api/db/status', async (req, res) => {
    try {
      const status = await getMySQLStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/db/config', (req, res) => {
    res.json(getSafeDbConfig());
  });

  // Test connection using configuration directly from Environment Variables
  app.post('/api/db/test-env', async (req, res) => {
    try {
      const result = await testEnvConnection();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Legacy test endpoint
  app.post('/api/db/test', async (req, res) => {
    try {
      const result = await testEnvConnection();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reconnect & sync using configuration from .env
  app.post(['/api/db/reconnect-env', '/api/db/reconnect'], async (req, res) => {
    try {
      const envCfg = getEnvDbConfig();
      if (!envCfg.enabled) {
        return res.status(400).json({
          success: false,
          error: 'Variabel lingkungan database belum diatur di file .env atau hosting environment.'
        });
      }

      const result = await connectMySQL(envCfg);
      if (result.success) {
        const mysqlData = await loadDataFromMySQL();
        if (mysqlData.projects.length > 0) {
          projects = mysqlData.projects;
          tables = mysqlData.tables;
          records = mysqlData.records;
          saveDataToFile();
        } else {
          await syncAllToMySQL(projects, tables, records);
        }

        const mysqlUsers = await loadUsersFromMySQL();
        if (mysqlUsers.length > 0) {
          setAllUsers(mysqlUsers);
        } else {
          await syncAllUsersToMySQL(getAllUsers());
        }

        await syncMailConfigWithMySQL();
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/db/connect', async (req, res) => {
    try {
      const envCfg = getEnvDbConfig();
      const result = await connectMySQL(envCfg);
      if (result.success) {
        const mysqlData = await loadDataFromMySQL();
        if (mysqlData.projects.length > 0) {
          projects = mysqlData.projects;
          tables = mysqlData.tables;
          records = mysqlData.records;
          saveDataToFile();
        } else {
          await syncAllToMySQL(projects, tables, records);
        }
        await syncMailConfigWithMySQL();
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/db/disconnect', async (req, res) => {
    try {
      const result = await disconnectMySQL();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/db/sync-to-mysql', async (req, res) => {
    try {
      const result = await syncAllToMySQL(projects, tables, records);
      await syncMailConfigWithMySQL();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/db/sync-from-mysql', async (req, res) => {
    try {
      const mysqlData = await loadDataFromMySQL();
      projects = mysqlData.projects;
      tables = mysqlData.tables;
      records = mysqlData.records;
      saveDataToFile();
      await syncMailConfigWithMySQL();
      res.json({
        success: true,
        projectsCount: projects.length,
        tablesCount: tables.length,
        recordsCount: records.length
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/db/schema-sql', (req, res) => {
    res.type('text/plain').send(getSchemaSQLContent());
  });

  app.get('/api/db/tables-list', async (req, res) => {
    try {
      const tablesList = await getDatabaseTablesList();
      res.json({ success: true, tables: tablesList });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, tables: [] });
    }
  });

  app.get('/api/db/table-rows', async (req, res) => {
    try {
      const tableName = String(req.query.table || '');
      const page = parseInt(String(req.query.page || '1'), 10) || 1;
      const limit = parseInt(String(req.query.limit || '10'), 10) || 10;
      const data = await getTableDataPaginated(tableName, page, limit);
      res.json({ success: true, ...data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, columns: [], rows: [], total: 0 });
    }
  });

  // -------------------------------------------------------------
  // AUTHENTICATION & RBAC MIDDLEWARE & APIS
  // -------------------------------------------------------------
  const getAuthUserFromRequest = (req: any): { userId: string; email: string; role: UserRole; name: string } | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return verifyJwtToken(parts[1]);
    }
    return null;
  };

  // 1. Register User (Email Verification Required)
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password } = req.body || {};
      const appUrl = `${req.protocol}://${req.get('host')}`;
      const result = await registerUser(name, email, password, appUrl);
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const created = all.find(u => u.id === result.user!.id);
        if (created) {
          mysqlUpsertUser(created);
        }
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2. Login User
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const result = await loginUser(email, password);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 3. Verify Email (via 6-digit code or URL token)
  app.post('/api/auth/verify', async (req, res) => {
    try {
      const { email, code, token } = req.body || {};
      const result = await verifyUserEmail({ email, code, token });
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find(u => u.id === result.user!.id);
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4. Resend Verification Code
  app.post('/api/auth/resend-code', async (req, res) => {
    try {
      const { email } = req.body || {};
      const appUrl = `${req.protocol}://${req.get('host')}`;
      const result = await resendVerificationCode(email, appUrl);
      if (result.success) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find(u => u.email === (email || '').toLowerCase().trim());
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4b. Forgot Password - Request OTP & Reset Token
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body || {};
      const appUrl = `${req.protocol}://${req.get('host')}`;
      const result = await requestPasswordReset(email, appUrl);
      if (result.success) {
        saveDataToFile();
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4c. Verify Reset OTP Code
  app.post('/api/auth/verify-reset-code', async (req, res) => {
    try {
      const { email, code, token } = req.body || {};
      const result = await verifyResetCode({ email, code, token });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4d. Reset Password with OTP Code or Reset Token
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, code, token, newPassword } = req.body || {};
      const result = await resetPasswordWithCodeOrToken({ email, code, token, newPassword });
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find(u => u.id === result.user!.id);
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4d. Verify Reset Token status
  app.get('/api/auth/verify-reset-token', (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ valid: false, message: 'Token tidak disediakan.' });
    }
    const user = getAllUsers().find(u => u.resetPasswordToken === token);
    if (!user) {
      return res.status(404).json({ valid: false, message: 'Token reset kata sandi tidak ditemukan atau sudah digunakan.' });
    }
    if (user.resetPasswordExpiresAt && Date.now() > new Date(user.resetPasswordExpiresAt).getTime()) {
      return res.status(410).json({ valid: false, message: 'Token reset kata sandi telah kedaluwarsa.' });
    }
    res.json({
      valid: true,
      email: user.email,
      name: user.name
    });
  });

  // 5. Get Current User Profile (me)
  app.get('/api/auth/me', (req, res) => {
    const payload = getAuthUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }
    const user = getAllUsers().find(u => u.id === payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      user: toSafeUser(user)
    });
  });

  // 6. Update Profile & Password
  app.put('/api/auth/profile', async (req, res) => {
    try {
      const payload = getAuthUserFromRequest(req);
      if (!payload) {
        return res.status(401).json({ success: false, message: 'Sesi Anda telah berakhir. Silakan login kembali.' });
      }
      const { name, oldPassword, newPassword } = req.body || {};
      const result = await updateUserProfile(payload.userId, name, oldPassword, newPassword);
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find(u => u.id === payload.userId);
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 7. Logout
  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });


  // -------------------------------------------------------------
  // USER MANAGEMENT APIS (Admin & Superadmin Only)
  // -------------------------------------------------------------
  app.get('/api/users', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    // Allow public access for initial bootstrap if no token, otherwise enforce admin/superadmin
    if (authUser && authUser.role !== 'superadmin' && authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak: Hanya Admin dan Superadmin yang dapat mengelola pengguna.' });
    }
    const safeUsers = getAllUsers().map(toSafeUser);
    res.json(safeUsers);
  });

  // Update user role
  app.put('/api/users/:id/role', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['superadmin', 'admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }

    if (authUser && authUser.role !== 'superadmin') {
      if (role === 'superadmin') {
        return res.status(403).json({ error: 'Hanya Superadmin yang dapat menunjuk Superadmin lain.' });
      }
      if (authUser.role !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak.' });
      }
    }

    const all = getAllUsers();
    const user = all.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    user.role = role as UserRole;
    user.updatedAt = new Date().toISOString();
    saveDataToFile();
    mysqlUpsertUser(user);

    res.json({ success: true, user: toSafeUser(user) });
  });

  // Toggle user active status
  app.put('/api/users/:id/status', (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const all = getAllUsers();
    const user = all.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    user.isActive = Boolean(isActive);
    user.updatedAt = new Date().toISOString();
    saveDataToFile();
    mysqlUpsertUser(user);

    res.json({ success: true, user: toSafeUser(user) });
  });

  // Manually verify user (Admin bypass)
  app.post('/api/users/:id/verify-manual', (req, res) => {
    const { id } = req.params;
    const all = getAllUsers();
    const user = all.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationToken = undefined;
    user.verificationExpiresAt = undefined;
    user.updatedAt = new Date().toISOString();
    saveDataToFile();
    mysqlUpsertUser(user);

    res.json({ success: true, message: `Akun ${user.name} berhasil diverifikasi manual.`, user: toSafeUser(user) });
  });

  // Delete user (Superadmin & Admin)
  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUserFromRequest(req);
      const all = getAllUsers();
      const targetUser = all.find(u => u.id === id);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
      }

      // If user is authenticated, enforce RBAC checks
      if (authUser) {
        if (authUser.userId === id) {
          return res.status(400).json({ success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang login.' });
        }
        if (authUser.role === 'admin' && targetUser.role === 'superadmin') {
          return res.status(403).json({ success: false, error: 'Admin tidak memiliki izin untuk menghapus akun Superadmin.' });
        }
        if (authUser.role === 'user') {
          return res.status(403).json({ success: false, error: 'User biasa tidak memiliki izin untuk mengelola atau menghapus akun.' });
        }
      }

      // Protect last superadmin from being deleted
      if (targetUser.role === 'superadmin') {
        const superCount = all.filter(u => u.role === 'superadmin').length;
        if (superCount <= 1) {
          return res.status(400).json({ success: false, error: 'Tidak dapat menghapus satu-satunya akun Superadmin utama.' });
        }
      }

      const filtered = all.filter(u => u.id !== id);
      setAllUsers(filtered);
      saveDataToFile();
      await mysqlDeleteUser(id);

      console.log(`[Users] Akun pengguna "${targetUser.name}" (${targetUser.email}, ${targetUser.role}) berhasil dihapus.`);
      res.json({ success: true, message: `Akun pengguna "${targetUser.name}" (${targetUser.email}) berhasil dihapus.` });
    } catch (err: any) {
      console.error('[Users] Gagal menghapus pengguna:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal menghapus pengguna.' });
    }
  });

  // -------------------------------------------------------------
  // SERVER SEND MAIL (GMAIL MULTI-SMTP FAILOVER POOL) APIS (Superadmin Only)
  // -------------------------------------------------------------
  app.get('/api/mail/config', (req, res) => {
    res.json(getSafeMailConfig());
  });

  // Add new SMTP account
  app.post('/api/mail/accounts', (req, res) => {
    try {
      const { name, gmailUser, gmailAppPassword, fromName, host, port, secure, isActive } = req.body || {};
      if (!gmailUser || !gmailAppPassword) {
        return res.status(400).json({ error: 'Alamat Gmail dan Sandi Aplikasi (16-karakter) wajib diisi.' });
      }
      const acc = addSmtpAccount({
        name,
        gmailUser,
        gmailAppPassword,
        fromName,
        host,
        port: parseInt(port, 10) || 465,
        secure: secure ?? true,
        isActive: isActive ?? true
      });
      res.json({ success: true, message: 'Akun Gmail SMTP berhasil ditambahkan.', account: acc, config: getSafeMailConfig() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update existing SMTP account
  app.put('/api/mail/accounts/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, gmailUser, gmailAppPassword, fromName, host, port, secure, isActive, order } = req.body || {};
      const updated = updateSmtpAccount(id, {
        name,
        gmailUser,
        gmailAppPassword,
        fromName,
        host,
        port: port ? parseInt(port, 10) : undefined,
        secure,
        isActive,
        order
      });
      if (!updated) {
        return res.status(404).json({ error: 'Akun SMTP tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Akun Gmail SMTP berhasil diperbarui.', config: getSafeMailConfig() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete SMTP account
  app.delete('/api/mail/accounts/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = deleteSmtpAccount(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Akun SMTP tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Akun Gmail SMTP berhasil dihapus.', config: getSafeMailConfig() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reorder accounts
  app.post('/api/mail/reorder', (req, res) => {
    try {
      const { ids } = req.body || {};
      if (Array.isArray(ids)) {
        reorderSmtpAccounts(ids);
      }
      res.json({ success: true, config: getSafeMailConfig() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Test single SMTP account
  app.post('/api/mail/accounts/:id/test', async (req, res) => {
    try {
      const { id } = req.params;
      const { testEmail } = req.body || {};
      const result = await testSingleSmtpAccount(id, testEmail);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Test all active accounts via Failover Pool
  app.post('/api/mail/test-all', async (req, res) => {
    try {
      const { testEmail } = req.body || {};
      if (!testEmail) {
        return res.status(400).json({ error: 'Email penerima uji coba wajib diisi.' });
      }
      const subject = `[Uji Failover Pool] Tes Kirim Server DataForge (${new Date().toLocaleTimeString('id-ID')})`;
      const text = `Halo,\n\nIni adalah pengujian failover multi-akun SMTP Gmail DataForge API Studio.\nEmail berhasil dikirim!\n\nWaktu: ${new Date().toLocaleString('id-ID')}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h3 style="color: #4f46e5; margin-top: 0;">Pengujian Failover Pool Berhasil!</h3>
          <p style="color: #334155; font-size: 13px;">Email ini dikirimkan melalui pengujian pool multi-SMTP Gmail.</p>
          <p style="color: #64748b; font-size: 11px;">Waktu: ${new Date().toLocaleString('id-ID')}</p>
        </div>
      `;
      const result = await sendEmailWithFailover({ toEmail: testEmail, subject, text, html });
      res.json({
        success: result.sent,
        accountUsed: result.accountUsed,
        attempts: result.attempts,
        message: result.sent
          ? `Sukses terkirim menggunakan ${result.accountUsed}!`
          : 'Gagal mengirim email: Seluruh akun SMTP dalam pool mengalami kegagalan.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });


  // -------------------------------------------------------------
  // INTERNAL MANAGEMENT APIS (Used by the web frontend)
  // -------------------------------------------------------------

  // --- Projects (Databases) ---
  app.get('/api/projects', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      // Unauthenticated returns empty projects
      return res.json([]);
    }

    if (authUser.role === 'superadmin' || authUser.role === 'admin') {
      return res.json(projects);
    }

    // Regular users ONLY see their own databases/projects
    const userProjects = projects.filter(p => (p as any).ownerId === authUser.userId);
    res.json(userProjects);
  });

  app.post('/api/projects', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const { name, description, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama database wajib diisi' });
    }

    const newProject: DatabaseProject = {
      id: `proj-${Date.now()}`,
      ownerId: authUser ? authUser.userId : 'usr-superadmin',
      ownerEmail: authUser ? authUser.email : 'superadmin@dataforge.io',
      name: name.trim(),
      description: description ? description.trim() : '',
      token: `sb_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      color: color || 'indigo',
      icon: icon || 'Database',
      createdAt: new Date().toISOString()
    };

    projects.unshift(newProject);
    saveDataToFile();
    mysqlUpsertProject(newProject);
    res.json(newProject);
  });

  app.put('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, color, icon } = req.body;
    const project = projects.find(p => p.id === id);
    if (!project) return res.status(404).json({ error: 'Database not found' });

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (color) project.color = color;
    if (icon) project.icon = icon;
    project.updatedAt = new Date().toISOString();

    saveDataToFile();
    mysqlUpsertProject(project);
    res.json(project);
  });

  app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    projects = projects.filter(p => p.id !== id);
    // Cascade delete tables and records
    const removedTableIds = tables.filter(t => t.projectId === id).map(t => t.id);
    tables = tables.filter(t => t.projectId !== id);
    records = records.filter(r => !removedTableIds.includes(r.tableId));

    saveDataToFile();
    mysqlDeleteProject(id);
    res.json({ success: true, message: 'Database and its tables deleted' });
  });

  // Refresh / Rotate Project Database Token
  const handleRefreshProjectToken = (req: any, res: any) => {
    const { id } = req.params;
    const project = projects.find(p => p.id === id);
    if (!project) return res.status(404).json({ error: 'Database tidak ditemukan' });

    const oldToken = project.token;
    project.token = `sb_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    project.updatedAt = new Date().toISOString();

    saveDataToFile();
    mysqlUpsertProject(project);
    res.json({
      success: true,
      message: `Token database "${project.name}" berhasil di-refresh. Token lama telah dicabut.`,
      token: project.token,
      oldToken,
      project
    });
  };

  app.post('/api/projects/:id/regenerate-token', handleRefreshProjectToken);
  app.post('/api/projects/:id/refresh-token', handleRefreshProjectToken);

  // --- Tables Management ---
  app.get('/api/projects/:projectId/tables', (req, res) => {
    const { projectId } = req.params;
    const projectTables = tables.filter(t => t.projectId === projectId);
    res.json(projectTables);
  });

  app.post('/api/projects/:projectId/tables', (req, res) => {
    const { projectId } = req.params;
    const { name, slug, description, fields, apiVisibleFields, apiSearchableFields } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Table name is required' });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');

    // Check slug collision within same project
    const exists = tables.some(t => t.projectId === projectId && t.slug === cleanSlug);
    if (exists) {
      return res.status(400).json({ error: `Table with slug "${cleanSlug}" already exists in this database` });
    }

    // Ensure Primary Key 'id' is always present as the first field
    let tableFields: TableField[] = Array.isArray(fields) && fields.length > 0 ? fields : [];
    if (!tableFields.some(f => f.key === 'id' || f.isPrimaryKey)) {
      tableFields = [
        { key: 'id', label: 'ID (PK)', type: 'number', required: true, isPrimaryKey: true },
        ...tableFields
      ];
    } else {
      tableFields = tableFields.map(f => f.key === 'id' ? { ...f, isPrimaryKey: true, required: true } : f);
    }

    const newTable: DatabaseTable = {
      id: `tbl-${Date.now()}`,
      projectId,
      name: name.trim(),
      slug: cleanSlug,
      description: description ? description.trim() : '',
      primaryKey: 'id',
      fields: tableFields,
      apiVisibleFields: Array.isArray(apiVisibleFields) ? apiVisibleFields : [],
      apiSearchableFields: Array.isArray(apiSearchableFields) ? apiSearchableFields : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tables.push(newTable);
    saveDataToFile();
    mysqlUpsertTable(newTable);
    res.json(newTable);
  });

  app.put('/api/projects/:projectId/tables/:tableId', (req, res) => {
    const { projectId, tableId } = req.params;
    const { name, slug, description, fields, apiVisibleFields, apiSearchableFields } = req.body;

    const table = tables.find(t => t.id === tableId && t.projectId === projectId);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    if (name) table.name = name.trim();
    if (description !== undefined) table.description = description.trim();
    if (slug) {
      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
      const collision = tables.some(t => t.projectId === projectId && t.id !== tableId && t.slug === cleanSlug);
      if (collision) return res.status(400).json({ error: 'Table slug already in use' });
      table.slug = cleanSlug;
    }

    if (Array.isArray(fields)) {
      // Ensure primary key exists
      let updatedFields = [...fields];
      if (!updatedFields.some(f => f.key === 'id' || f.isPrimaryKey)) {
        updatedFields.unshift({ key: 'id', label: 'ID (PK)', type: 'number', required: true, isPrimaryKey: true });
      }
      table.fields = updatedFields;
    }

    if (apiVisibleFields !== undefined) {
      table.apiVisibleFields = Array.isArray(apiVisibleFields) ? apiVisibleFields : [];
    }
    if (apiSearchableFields !== undefined) {
      table.apiSearchableFields = Array.isArray(apiSearchableFields) ? apiSearchableFields : [];
    }

    table.updatedAt = new Date().toISOString();
    saveDataToFile();
    mysqlUpsertTable(table);
    res.json(table);
  });

  app.delete('/api/projects/:projectId/tables/:tableId', (req, res) => {
    const { projectId, tableId } = req.params;
    tables = tables.filter(t => !(t.id === tableId && t.projectId === projectId));
    records = records.filter(r => r.tableId !== tableId);

    saveDataToFile();
    mysqlDeleteTable(tableId);
    res.json({ success: true, message: 'Table and its records deleted' });
  });

  // Refresh / Create dedicated Token for a specific Table
  app.post('/api/projects/:projectId/tables/:tableId/refresh-token', (req, res) => {
    const { projectId, tableId } = req.params;
    const table = tables.find(t => t.id === tableId && t.projectId === projectId);
    if (!table) return res.status(404).json({ error: 'Tabel tidak ditemukan' });

    const oldToken = table.token;
    table.token = `sb_tbl_${table.slug}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    table.updatedAt = new Date().toISOString();

    saveDataToFile();
    mysqlUpsertTable(table);
    res.json({
      success: true,
      message: `Token khusus tabel "${table.name}" berhasil di-refresh. Token lama telah dicabut.`,
      token: table.token,
      oldToken,
      table
    });
  });

  // Revoke dedicated Table Token (fallback to Project Master Token)
  app.delete('/api/projects/:projectId/tables/:tableId/token', (req, res) => {
    const { projectId, tableId } = req.params;
    const table = tables.find(t => t.id === tableId && t.projectId === projectId);
    if (!table) return res.status(404).json({ error: 'Tabel tidak ditemukan' });

    delete table.token;
    table.updatedAt = new Date().toISOString();

    saveDataToFile();
    mysqlUpsertTable(table);
    res.json({
      success: true,
      message: `Token khusus tabel "${table.name}" dicabut. Tabel kini kembali menggunakan Token Master Database.`,
      table
    });
  });

function validateSelectFieldValues(table: DatabaseTable, payload: Record<string, any>): string | null {
  if (!table || !table.fields) return null;
  for (const field of table.fields) {
    if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
      const val = payload[field.key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const strVal = String(val).trim();
        // Strict case-sensitive match
        const exists = field.options.some(opt => String(opt).trim() === strVal);
        if (!exists) {
          const allowedOpts = field.options.map(o => `'${o}'`).join(', ');
          return `Nilai '${strVal}' pada kolom '${field.label}' (${field.key}) tidak valid (harus sama persis termasuk huruf besar/kecil). Opsi yang diperbolehkan hanya: [${allowedOpts}]`;
        }
      }
    }
  }
  return null;
}

  // --- Records Management (Internal) ---
  app.get('/api/projects/:projectId/tables/:tableId/records', (req, res) => {
    const { projectId, tableId } = req.params;
    const { search, sort, order } = req.query;

    let tableRecords = records.filter(r => r.projectId === projectId && r.tableId === tableId);

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      tableRecords = tableRecords.filter(r => {
        if (String(r.id).toLowerCase().includes(q)) return true;
        return Object.values(r.data).some(val => String(val || '').toLowerCase().includes(q));
      });
    }

    if (sort && typeof sort === 'string') {
      tableRecords.sort((a, b) => {
        const valA = sort === 'id' ? a.id : a.data[sort];
        const valB = sort === 'id' ? b.id : b.data[sort];
        if (valA === valB) return 0;
        const result = valA > valB ? 1 : -1;
        return order === 'desc' ? -result : result;
      });
    } else {
      // Default: order by ID ascending like standard database
      tableRecords.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    }

    res.json(tableRecords);
  });

  app.post('/api/projects/:projectId/tables/:tableId/records', (req, res) => {
    const { projectId, tableId } = req.params;
    const inputData = req.body || {};

    const table = tables.find(t => t.id === tableId && t.projectId === projectId);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    // Validate select field options
    const selectError = validateSelectFieldValues(table, inputData);
    if (selectError) {
      return res.status(400).json({ error: selectError });
    }

    // Generate auto-increment primary key ID
    const primaryKeyId = getNextRecordId(tableId);

    const recordData: Record<string, any> = {
      ...inputData,
      id: primaryKeyId
    };

    const newRecord: DatabaseRecord = {
      id: primaryKeyId,
      tableId,
      projectId,
      data: recordData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    records.push(newRecord);
    saveDataToFile();
    mysqlUpsertRecord(newRecord);
    res.status(201).json(newRecord);
  });

  app.put('/api/projects/:projectId/tables/:tableId/records/:recordId', (req, res) => {
    const { projectId, tableId, recordId } = req.params;
    const inputData = req.body || {};

    const record = records.find(
      r => r.projectId === projectId && r.tableId === tableId && String(r.id) === String(recordId)
    );
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const table = tables.find(t => t.id === tableId && t.projectId === projectId);
    if (table) {
      const selectError = validateSelectFieldValues(table, inputData);
      if (selectError) {
        return res.status(400).json({ error: selectError });
      }
    }

    // Preserve primary key
    record.data = {
      ...record.data,
      ...inputData,
      id: record.id
    };
    record.updatedAt = new Date().toISOString();

    saveDataToFile();
    mysqlUpsertRecord(record);
    res.json(record);
  });

  app.delete('/api/projects/:projectId/tables/:tableId/records/:recordId', (req, res) => {
    const { projectId, tableId, recordId } = req.params;
    records = records.filter(
      r => !(r.projectId === projectId && r.tableId === tableId && String(r.id) === String(recordId))
    );
    saveDataToFile();
    mysqlDeleteRecord(tableId, recordId);
    res.json({ success: true, message: 'Record deleted' });
  });


  // -------------------------------------------------------------
  // EXTERNAL HEADLESS REST API (v1) - Accessible from anywhere!
  // -------------------------------------------------------------

  // -------------------------------------------------------------
  // EXTERNAL HEADLESS REST API (v1)
  // Industry-Standard Authentication:
  // - Primary & Safest: Header "Authorization: Bearer <TOKEN>" or "X-API-Key: <TOKEN>"
  // - Legacy: URL Path /api/v1/:token/:tableSlug
  // -------------------------------------------------------------

  const authenticateToken = (req: any, res: any, next: any) => {
    let token: string | undefined;

    // 1. Primary & Safest: Authorization: Bearer <TOKEN> (Encrypted over HTTPS, never logged in proxy/access logs)
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    // 2. Custom Safe Header: X-API-Key or X-Token
    if (!token && req.headers['x-api-key']) {
      token = String(req.headers['x-api-key']).trim();
    }
    if (!token && req.headers['x-token']) {
      token = String(req.headers['x-token']).trim();
    }

    // 3. Fallback: Path token starting with sb_live_ or sb_tbl_ (e.g. /api/v1/sb_live_xxx/... or /api/v1/sb_tbl_xxx/...)
    if (!token && req.params.token && (String(req.params.token).startsWith('sb_live_') || String(req.params.token).startsWith('sb_tbl_'))) {
      token = String(req.params.token).trim();
    }
    if (!token && req.params.param1 && (String(req.params.param1).startsWith('sb_live_') || String(req.params.param1).startsWith('sb_tbl_'))) {
      token = String(req.params.param1).trim();
    }

    // 4. Fallback: Query parameter (?token= or ?api_key=)
    if (!token && (req.query.token || req.query.api_key)) {
      token = String(req.query.token || req.query.api_key).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: API Token tidak ditemukan.',
        hint: 'Kirim token aman via Header "Authorization: Bearer <API_TOKEN>" atau "X-API-Key: <API_TOKEN>". Hindari menaruh token di URL agar tidak terekam log jaringan WiFi / proxy.'
      });
    }

    const proj = projects.find(p => p.token === token);
    const tableWithToken = tables.find(t => t.token === token);

    if (!proj && !tableWithToken) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: API Token tidak valid atau telah dicabut (di-refresh).'
      });
    }

    if (proj) {
      req.project = proj;
      req.isMasterToken = true;
    } else if (tableWithToken) {
      const parentProj = projects.find(p => p.id === tableWithToken.projectId);
      if (!parentProj) {
        return res.status(404).json({ success: false, error: 'Database induk tabel tidak ditemukan' });
      }
      req.project = parentProj;
      req.scopedTable = tableWithToken;
      req.isTableToken = true;
    }

    next();
  };

  // Helper to extract tableSlug and targetId cleanly from either Header-based or URL-token route
  const resolveTarget = (req: any) => {
    let tableSlug = req.params.tableSlug;
    let id = req.params.id || req.body?.id || req.query?.id;

    if (!tableSlug && req.params.param1) {
      if (String(req.params.param1).startsWith('sb_live_') || String(req.params.param1).startsWith('sb_tbl_')) {
        tableSlug = req.params.param2;
        if (!id && req.params.param3) id = req.params.param3;
      } else {
        tableSlug = req.params.param1;
        if (!id && req.params.param2) id = req.params.param2;
      }
    }

    return {
      tableSlug: tableSlug ? String(tableSlug).trim() : '',
      id: id !== undefined && id !== null ? String(id).trim() : ''
    };
  };

  // 1. GET Project & Schema Info
  const handleGetSchema = (req: any, res: any) => {
    const proj = req.project;
    let projTables = tables.filter(t => t.projectId === proj.id);

    // If accessed with table-scoped token, limit schema visibility to only that table
    if (req.scopedTable) {
      projTables = projTables.filter(t => t.id === req.scopedTable.id);
    }

    res.json({
      success: true,
      database: {
        id: proj.id,
        name: proj.name,
        description: proj.description,
        totalTables: projTables.length,
        tokenScope: req.scopedTable ? `Tabel Khusus: ${req.scopedTable.name}` : 'Master Database Token',
        security: {
          recommendedAuth: 'Header "Authorization: Bearer <API_TOKEN>" (Paling Aman)',
          alternativeAuth: 'Header "X-API-Key: <API_TOKEN>"'
        },
        tables: projTables.map(t => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          primaryKey: t.primaryKey || 'id',
          cleanEndpoint: `/api/v1/${t.slug}`,
          legacyEndpoint: `/api/v1/${t.token || proj.token}/${t.slug}`,
          hasDedicatedToken: !!t.token,
          fields: t.fields,
          totalRecords: records.filter(r => r.tableId === t.id).length
        }))
      }
    });
  };

  // 2 & 3. GET Table Records (List or Single by ID)
  const handleGetTableOrItem = (req: any, res: any) => {
    const proj = req.project;
    const { tableSlug, id } = resolveTarget(req);

    if (!tableSlug) {
      return res.status(400).json({ success: false, error: 'Nama tabel (slug) wajib disertakan' });
    }

    const table = tables.find(t => t.projectId === proj.id && t.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({
        success: false,
        error: `Tabel "${tableSlug}" tidak ditemukan di database "${proj.name}"`
      });
    }

    // Verify scoped table permission if table-specific token is used
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan mengakses tabel "${tableSlug}".`
      });
    }

    // If ID is provided, return single record
    if (id) {
      const record = records.find(r => r.tableId === table.id && String(r.id) === String(id));
      if (!record) {
        return res.status(404).json({
          success: false,
          error: `Record dengan primary key #${id} tidak ditemukan di tabel "${tableSlug}"`
        });
      }

      let filteredData: Record<string, any> = { ...record.data };
      if (Array.isArray(table.apiVisibleFields) && table.apiVisibleFields.length > 0) {
        const allowed = new Set(['id', ...table.apiVisibleFields]);
        const cleaned: Record<string, any> = {};
        Object.keys(filteredData).forEach(k => {
          if (allowed.has(k)) {
            cleaned[k] = filteredData[k];
          }
        });
        filteredData = cleaned;
      }

      return res.json({
        success: true,
        table: table.slug,
        data: {
          ...filteredData,
          _created_at: record.createdAt,
          _updated_at: record.updatedAt
        }
      });
    }

    // Otherwise list all records with filtering/search/sorting/pagination
    let tableRecords = records.filter(r => r.tableId === table.id);

    const { search, limit, offset, sort, order, ...fieldFilters } = req.query;

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      const searchable = Array.isArray(table.apiSearchableFields) && table.apiSearchableFields.length > 0
        ? table.apiSearchableFields
        : null;

      tableRecords = tableRecords.filter(r => {
        if (String(r.id).toLowerCase().includes(q)) return true;
        if (searchable) {
          return searchable.some((fieldKey: string) => {
            const val = r.data[fieldKey];
            return String(val || '').toLowerCase().includes(q);
          });
        } else {
          return Object.values(r.data).some(v => String(v || '').toLowerCase().includes(q));
        }
      });
    }

    Object.entries(fieldFilters).forEach(([filterKey, filterVal]) => {
      if (filterVal !== undefined) {
        tableRecords = tableRecords.filter(r => {
          const val = r.data[filterKey];
          return String(val).toLowerCase() === String(filterVal).toLowerCase();
        });
      }
    });

    if (sort && typeof sort === 'string') {
      tableRecords.sort((a, b) => {
        const valA = sort === 'id' ? a.id : a.data[sort];
        const valB = sort === 'id' ? b.id : b.data[sort];
        if (valA === valB) return 0;
        const result = valA > valB ? 1 : -1;
        return order === 'desc' ? -result : result;
      });
    } else {
      tableRecords.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    }

    const total = tableRecords.length;

    const numLimit = limit ? parseInt(String(limit), 10) : undefined;
    const numOffset = offset ? parseInt(String(offset), 10) : 0;
    if (numLimit && !isNaN(numLimit)) {
      tableRecords = tableRecords.slice(numOffset, numOffset + numLimit);
    }

    const data = tableRecords.map(r => {
      let itemData = { ...r.data };
      if (Array.isArray(table.apiVisibleFields) && table.apiVisibleFields.length > 0) {
        const allowed = new Set(['id', ...table.apiVisibleFields]);
        const cleaned: Record<string, any> = {};
        Object.keys(itemData).forEach(k => {
          if (allowed.has(k)) {
            cleaned[k] = itemData[k];
          }
        });
        itemData = cleaned;
      }
      return {
        ...itemData,
        _created_at: r.createdAt,
        _updated_at: r.updatedAt
      };
    });

    res.json({
      success: true,
      table: table.slug,
      primaryKey: table.primaryKey || 'id',
      total,
      count: data.length,
      data
    });
  };

  // 4. POST Create Record
  const handlePostRecord = (req: any, res: any) => {
    const proj = req.project;
    const { tableSlug } = resolveTarget(req);

    if (!tableSlug) {
      return res.status(400).json({ success: false, error: 'Nama tabel (slug) wajib disertakan' });
    }

    let payload = req.body || {};
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Format JSON body tidak valid' });
      }
    }

    const table = tables.find(t => t.projectId === proj.id && t.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({ success: false, error: `Tabel "${tableSlug}" tidak ditemukan` });
    }

    // Verify scoped table permission if table-specific token is used
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan membuat data di tabel "${tableSlug}".`
      });
    }

    // Check required fields
    const missingFields: string[] = [];
    table.fields.forEach(f => {
      if (f.required && !f.isPrimaryKey && f.key !== 'id' && (payload[f.key] === undefined || payload[f.key] === null || payload[f.key] === '')) {
        missingFields.push(f.key);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Kolom wajib diisi belum lengkap: ${missingFields.join(', ')}`
      });
    }

    // Validate select fields options
    const selectError = validateSelectFieldValues(table, payload);
    if (selectError) {
      return res.status(400).json({
        success: false,
        error: selectError
      });
    }

    const primaryKeyId = getNextRecordId(table.id);

    const recordData: Record<string, any> = {
      ...payload,
      id: primaryKeyId
    };

    const newRecord: DatabaseRecord = {
      id: primaryKeyId,
      tableId: table.id,
      projectId: proj.id,
      data: recordData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    records.push(newRecord);
    saveDataToFile();
    mysqlUpsertRecord(newRecord);

    res.status(201).json({
      success: true,
      message: `Record dengan Primary Key #${primaryKeyId} berhasil dibuat di tabel "${table.slug}"`,
      data: {
        id: primaryKeyId,
        ...recordData,
        _created_at: newRecord.createdAt
      }
    });
  };

  // 5. PUT Update Record
  const handlePutRecord = (req: any, res: any) => {
    const proj = req.project;
    const { tableSlug, id: targetId } = resolveTarget(req);

    if (!tableSlug) {
      return res.status(400).json({ success: false, error: 'Nama tabel (slug) wajib disertakan' });
    }

    let payload = req.body || {};
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Format JSON body tidak valid' });
      }
    }

    const table = tables.find(t => t.projectId === proj.id && t.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({ success: false, error: `Tabel "${tableSlug}" tidak ditemukan` });
    }

    // Verify scoped table permission if table-specific token is used
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan mengubah data di tabel "${tableSlug}".`
      });
    }

    if (!targetId) {
      return res.status(400).json({
        success: false,
        error: `Parameter ID primary key wajib disertakan. Contoh: PUT /api/v1/${table.slug}/1 atau sertakan {"id": 1} di request body.`
      });
    }

    const record = records.find(r => r.tableId === table.id && String(r.id) === String(targetId));
    if (!record) {
      return res.status(404).json({
        success: false,
        error: `Record dengan primary key #${targetId} tidak ditemukan di tabel "${tableSlug}"`
      });
    }

    // Validate select fields options
    const selectError = validateSelectFieldValues(table, payload);
    if (selectError) {
      return res.status(400).json({
        success: false,
        error: selectError
      });
    }

    record.data = {
      ...record.data,
      ...payload,
      id: record.id
    };
    record.updatedAt = new Date().toISOString();

    saveDataToFile();
    mysqlUpsertRecord(record);

    res.json({
      success: true,
      message: `Record #${record.id} berhasil diperbarui di tabel "${table.slug}"`,
      data: {
        id: record.id,
        ...record.data,
        _updated_at: record.updatedAt
      }
    });
  };

  // 6. DELETE Remove Record
  const handleDeleteRecord = (req: any, res: any) => {
    const proj = req.project;
    const { tableSlug, id: targetId } = resolveTarget(req);

    if (!tableSlug) {
      return res.status(400).json({ success: false, error: 'Nama tabel (slug) wajib disertakan' });
    }

    const table = tables.find(t => t.projectId === proj.id && t.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({ success: false, error: `Tabel "${tableSlug}" tidak ditemukan` });
    }

    // Verify scoped table permission if table-specific token is used
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan menghapus data di tabel "${tableSlug}".`
      });
    }

    if (!targetId) {
      return res.status(400).json({
        success: false,
        error: `Parameter ID primary key wajib disertakan. Contoh: DELETE /api/v1/${table.slug}/1 atau sertakan ?id=1 di URL.`
      });
    }

    const index = records.findIndex(r => r.tableId === table.id && String(r.id) === String(targetId));
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `Record dengan primary key #${targetId} tidak ditemukan di tabel "${tableSlug}"`
      });
    }

    const deleted = records.splice(index, 1)[0];
    saveDataToFile();
    mysqlDeleteRecord(table.id, targetId);

    res.json({
      success: true,
      message: `Record #${targetId} berhasil dihapus dari tabel "${table.slug}"`,
      deletedRecord: {
        id: deleted.id,
        ...deleted.data
      }
    });
  };

  // Register Schema Routes
  app.get('/api/v1/schema', authenticateToken, handleGetSchema);
  app.get('/api/v1/:param1/schema', authenticateToken, handleGetSchema);

  // Register Table & Record Routes (Supports clean Header routes & legacy URL routes seamlessly)
  app.get('/api/v1/:param1', authenticateToken, handleGetTableOrItem);
  app.get('/api/v1/:param1/:param2', authenticateToken, handleGetTableOrItem);
  app.get('/api/v1/:param1/:param2/:param3', authenticateToken, handleGetTableOrItem);

  app.post('/api/v1/:param1', authenticateToken, handlePostRecord);
  app.post('/api/v1/:param1/:param2', authenticateToken, handlePostRecord);
  app.post('/api/v1/:param1/:param2/:param3', authenticateToken, handlePostRecord);

  app.put('/api/v1/:param1', authenticateToken, handlePutRecord);
  app.put('/api/v1/:param1/:param2', authenticateToken, handlePutRecord);
  app.put('/api/v1/:param1/:param2/:param3', authenticateToken, handlePutRecord);

  app.delete('/api/v1/:param1', authenticateToken, handleDeleteRecord);
  app.delete('/api/v1/:param1/:param2', authenticateToken, handleDeleteRecord);
  app.delete('/api/v1/:param1/:param2/:param3', authenticateToken, handleDeleteRecord);


  // Determine if running in production mode or if compiled dist folder exists
  const isProduction = process.env.NODE_ENV === 'production';
  const cwdDistPath = path.resolve(process.cwd(), 'dist');
  const dirnameDistPath = path.resolve(__dirname, 'dist');
  const distPath = fs.existsSync(cwdDistPath) ? cwdDistPath : dirnameDistPath;
  const indexHtmlExists = fs.existsSync(path.join(distPath, 'index.html'));

  if (isProduction || indexHtmlExists) {
    console.log(`[Server] Serving production static assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('[Server] Development mode active. Mounting Vite dev middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`[Visual Database Engine & API] Server running on port ${PORT}`);
  });
}

startServer();
