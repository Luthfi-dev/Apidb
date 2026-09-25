import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  loadSmtpAccountsFromMySQL,
  mysqlUpsertSmtpAccount,
  mysqlDeleteSmtpAccount,
  syncAllSmtpAccountsToMySQL,
  isMySQLConnected
} from './mysqlService';

function generateId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'acc-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
}

export interface GmailSmtpAccountInternal {
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

export interface MailPoolConfigInternal {
  service: 'gmail';
  accounts: GmailSmtpAccountInternal[];
}

const SETTINGS_FILE = path.resolve(process.cwd(), 'mail-config.json');

// In-memory transporter cache to avoid recreating connection pools repeatedly
const transporterCache = new Map<string, any>();

let currentMailConfig: MailPoolConfigInternal = {
  service: 'gmail',
  accounts: []
};

// Mask email for safe public display
function maskEmail(email: string): string {
  if (!email) return '';
  return email.replace(/^(.)(.*)(@.*)$/, (_m, a, b, c) => `${a}${'*'.repeat(Math.max(2, b.length))}${c}`);
}

// Load mail config strictly from mail-config.json (with automatic migration if needed)
export function loadMailConfig(): MailPoolConfigInternal {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);

      // Handle legacy single-account format migration if present
      if (parsed.gmailUser && (!parsed.accounts || !Array.isArray(parsed.accounts))) {
        const legacyAcc: GmailSmtpAccountInternal = {
          id: generateId(),
          name: 'Gmail Utama',
          gmailUser: parsed.gmailUser || '',
          gmailAppPassword: parsed.gmailAppPassword || '',
          fromName: parsed.fromName || 'DataForge API Studio',
          host: parsed.host || 'smtp.gmail.com',
          port: parsed.port || 465,
          secure: parsed.secure ?? true,
          isActive: true,
          order: 1,
          successCount: 0,
          failCount: 0
        };
        currentMailConfig = {
          service: 'gmail',
          accounts: [legacyAcc]
        };
        saveMailConfig(currentMailConfig);
      } else if (Array.isArray(parsed.accounts)) {
        currentMailConfig = {
          service: 'gmail',
          accounts: parsed.accounts
        };
      }
    }
  } catch (err) {
    console.warn('[MailService] Gagal membaca mail-config.json:', err);
  }
  return currentMailConfig;
}

// Save mail config to mail-config.json AND sync to Online MySQL Database
export function saveMailConfig(cfg: MailPoolConfigInternal): MailPoolConfigInternal {
  currentMailConfig = cfg;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentMailConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('[MailService] Gagal menyimpan mail-config.json:', err);
  }

  // Sync to MySQL in background if connected
  if (isMySQLConnected()) {
    syncAllSmtpAccountsToMySQL(currentMailConfig.accounts).catch(err => {
      console.error('[MailService] Gagal sinkronisasi SMTP ke MySQL:', err);
    });
  }

  return currentMailConfig;
}

// Synchronize between MySQL and mail-config.json (on server startup or online DB connect)
export async function syncMailConfigWithMySQL(): Promise<void> {
  if (!isMySQLConnected()) return;

  try {
    const mysqlAccounts = await loadSmtpAccountsFromMySQL();
    if (mysqlAccounts.length > 0) {
      // MySQL has SMTP accounts, sync to local JSON & memory
      currentMailConfig = {
        service: 'gmail',
        accounts: mysqlAccounts
      };
      try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentMailConfig, null, 2), 'utf-8');
      } catch (_) {}
      console.log(`[MailService] Berhasil memuat & sinkronkan ${mysqlAccounts.length} akun SMTP dari database online MySQL.`);
    } else {
      // Online DB is empty for SMTP, push local JSON accounts to MySQL
      const localCfg = loadMailConfig();
      if (localCfg.accounts.length > 0) {
        await syncAllSmtpAccountsToMySQL(localCfg.accounts);
        console.log(`[MailService] Berhasil mengunggah ${localCfg.accounts.length} akun SMTP lokal ke tabel df_smtp_accounts MySQL.`);
      }
    }
  } catch (err) {
    console.error('[MailService] Gagal sinkronisasi SMTP dengan MySQL:', err);
  }
}

// Return sanitized config (passwords hidden) for client UI
export function getSafeMailConfig() {
  const cfg = loadMailConfig();
  const safeAccounts = cfg.accounts.map(acc => ({
    id: acc.id,
    name: acc.name,
    gmailUser: acc.gmailUser,
    fromName: acc.fromName,
    host: acc.host,
    port: acc.port,
    secure: acc.secure,
    isActive: acc.isActive,
    order: acc.order,
    hasPassword: Boolean(acc.gmailAppPassword && acc.gmailAppPassword.trim().length > 0),
    maskedUser: maskEmail(acc.gmailUser),
    lastTestedAt: acc.lastTestedAt,
    lastStatus: acc.lastStatus || 'untested',
    lastErrorMessage: acc.lastErrorMessage,
    successCount: acc.successCount || 0,
    failCount: acc.failCount || 0
  }));

  // Sort by order ascending
  safeAccounts.sort((a, b) => a.order - b.order);

  return {
    service: 'gmail' as const,
    storageFile: 'mail-config.json',
    storageTable: 'df_smtp_accounts',
    isMySQLSynced: isMySQLConnected(),
    accounts: safeAccounts
  };
}

// Get or create cached transporter for an account
function getTransporterForAccount(acc: GmailSmtpAccountInternal): any {
  if (!acc.gmailUser || !acc.gmailAppPassword) {
    return null;
  }

  const cleanPassword = acc.gmailAppPassword.replace(/\s+/g, '');
  const cacheKey = `${acc.id}:${acc.gmailUser}:${cleanPassword}:${acc.host}:${acc.port}:${acc.secure}`;

  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey)!;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: acc.host || 'smtp.gmail.com',
    port: acc.port || 465,
    secure: acc.secure ?? true,
    auth: {
      user: acc.gmailUser,
      pass: cleanPassword
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  transporterCache.set(cacheKey, transporter);
  return transporter;
}

// Invalidate cache for an account
export function invalidateTransporterCache(accountId?: string) {
  if (accountId) {
    for (const key of transporterCache.keys()) {
      if (key.startsWith(accountId)) {
        transporterCache.delete(key);
      }
    }
  } else {
    transporterCache.clear();
  }
}

// Add a new SMTP account
export function addSmtpAccount(data: {
  name: string;
  gmailUser: string;
  gmailAppPassword: string;
  fromName?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  isActive?: boolean;
}): GmailSmtpAccountInternal {
  const cfg = loadMailConfig();
  const nextOrder = cfg.accounts.length > 0 ? Math.max(...cfg.accounts.map(a => a.order)) + 1 : 1;

  const newAccount: GmailSmtpAccountInternal = {
    id: generateId(),
    name: data.name || `Gmail Akun ${nextOrder}`,
    gmailUser: data.gmailUser.trim().toLowerCase(),
    gmailAppPassword: data.gmailAppPassword.trim(),
    fromName: data.fromName || 'DataForge API Studio',
    host: data.host || 'smtp.gmail.com',
    port: data.port || 465,
    secure: data.secure ?? true,
    isActive: data.isActive ?? true,
    order: nextOrder,
    successCount: 0,
    failCount: 0,
    lastStatus: 'untested'
  };

  cfg.accounts.push(newAccount);
  saveMailConfig(cfg);
  mysqlUpsertSmtpAccount(newAccount);

  return newAccount;
}

// Update existing SMTP account
export function updateSmtpAccount(
  id: string,
  data: Partial<{
    name: string;
    gmailUser: string;
    gmailAppPassword: string;
    fromName: string;
    host: string;
    port: number;
    secure: boolean;
    isActive: boolean;
    order: number;
  }>
): GmailSmtpAccountInternal | null {
  const cfg = loadMailConfig();
  const idx = cfg.accounts.findIndex(a => a.id === id);
  if (idx === -1) return null;

  const current = cfg.accounts[idx];
  const updated: GmailSmtpAccountInternal = {
    ...current,
    ...data,
    gmailUser: data.gmailUser !== undefined ? data.gmailUser.trim().toLowerCase() : current.gmailUser,
    gmailAppPassword: data.gmailAppPassword !== undefined && data.gmailAppPassword.trim() !== ''
      ? data.gmailAppPassword.trim()
      : current.gmailAppPassword
  };

  cfg.accounts[idx] = updated;
  invalidateTransporterCache(id);
  saveMailConfig(cfg);
  mysqlUpsertSmtpAccount(updated);

  return updated;
}

// Delete an SMTP account
export function deleteSmtpAccount(id: string): boolean {
  const cfg = loadMailConfig();
  const beforeCount = cfg.accounts.length;
  cfg.accounts = cfg.accounts.filter(a => a.id !== id);
  if (cfg.accounts.length < beforeCount) {
    // Re-index order
    cfg.accounts.forEach((acc, i) => {
      acc.order = i + 1;
    });
    invalidateTransporterCache(id);
    saveMailConfig(cfg);
    mysqlDeleteSmtpAccount(id);
    return true;
  }
  return false;
}

// Reorder accounts
export function reorderSmtpAccounts(ids: string[]): boolean {
  const cfg = loadMailConfig();
  const newAccounts: GmailSmtpAccountInternal[] = [];
  ids.forEach((id, index) => {
    const acc = cfg.accounts.find(a => a.id === id);
    if (acc) {
      acc.order = index + 1;
      newAccounts.push(acc);
    }
  });

  // Include any remaining accounts not in list
  cfg.accounts.forEach(acc => {
    if (!newAccounts.some(a => a.id === acc.id)) {
      acc.order = newAccounts.length + 1;
      newAccounts.push(acc);
    }
  });

  cfg.accounts = newAccounts;
  saveMailConfig(cfg);
  syncAllSmtpAccountsToMySQL(newAccounts);
  return true;
}

// Test a single SMTP account
export async function testSingleSmtpAccount(
  accountId: string,
  testEmail?: string
): Promise<{ success: boolean; message: string; accountName: string; error?: string }> {
  const cfg = loadMailConfig();
  const acc = cfg.accounts.find(a => a.id === accountId);
  if (!acc) {
    return { success: false, message: 'Akun SMTP tidak ditemukan.', accountName: '' };
  }

  if (!acc.gmailUser || !acc.gmailAppPassword) {
    return {
      success: false,
      message: 'Kredensial Gmail akun ini belum lengkap (Email & App Password 16-karakter diperlukan).',
      accountName: acc.name
    };
  }

  const transporter = getTransporterForAccount(acc);
  if (!transporter) {
    return { success: false, message: 'Gagal membuat koneksi SMTP transporter.', accountName: acc.name };
  }

  try {
    await transporter.verify();

    if (testEmail) {
      await transporter.sendMail({
        from: `"${acc.fromName || 'DataForge API Studio'}" <${acc.gmailUser}>`,
        to: testEmail,
        subject: `[Uji Coba ${acc.name}] Verifikasi SMTP Server DataForge`,
        text: `Halo,\n\nIni adalah email uji coba dari akun ${acc.name} (${acc.gmailUser}).\nKoneksi Gmail SMTP akun ini berfungsi normal!\n\nWaktu: ${new Date().toLocaleString('id-ID')}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4f46e5; margin: 0;">DataForge API Studio</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Uji Coba Failover Pool SMTP</p>
            </div>
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
              <h4 style="color: #065f46; margin: 0 0 4px 0; font-size: 14px;">Koneksi Berhasil: ${acc.name}</h4>
              <p style="color: #047857; margin: 0; font-size: 12px;">Akun ${acc.gmailUser} siap mengirimkan email verifikasi.</p>
            </div>
            <p style="color: #475569; font-size: 12px;">Waktu: <strong>${new Date().toLocaleString('id-ID')}</strong></p>
          </div>
        `
      });
    }

    // Update account stats
    acc.lastTestedAt = new Date().toISOString();
    acc.lastStatus = 'success';
    acc.lastErrorMessage = undefined;
    acc.successCount = (acc.successCount || 0) + 1;
    saveMailConfig(cfg);
    mysqlUpsertSmtpAccount(acc);

    return {
      success: true,
      accountName: acc.name,
      message: `Akun "${acc.name}" (${acc.gmailUser}) sukses terverifikasi ${testEmail ? `dan email uji coba terkirim ke ${testEmail}` : ''}!`
    };
  } catch (err: any) {
    acc.lastTestedAt = new Date().toISOString();
    acc.lastStatus = 'failed';
    acc.lastErrorMessage = err.message;
    acc.failCount = (acc.failCount || 0) + 1;
    saveMailConfig(cfg);
    mysqlUpsertSmtpAccount(acc);

    return {
      success: false,
      accountName: acc.name,
      message: `Gagal verifikasi "${acc.name}": ${err.message}`,
      error: err.message
    };
  }
}

// Send email with automatic failover (Try Account 1 -> If fail -> Try Account 2 -> ...)
export async function sendEmailWithFailover(options: {
  toEmail: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ sent: boolean; simulated: boolean; accountUsed?: string; attempts: Array<{ accountName: string; success: boolean; error?: string }> }> {
  const cfg = loadMailConfig();
  const activeAccounts = cfg.accounts
    .filter(a => a.isActive && a.gmailUser && a.gmailAppPassword)
    .sort((a, b) => a.order - b.order);

  const attempts: Array<{ accountName: string; success: boolean; error?: string }> = [];

  if (activeAccounts.length === 0) {
    console.log(`[MailService Failover] Tidak ada akun Gmail SMTP aktif. Mode simulasi untuk: ${options.toEmail}`);
    return { sent: false, simulated: true, attempts };
  }

  // Iterate sequentially through SMTP accounts in pool
  for (const acc of activeAccounts) {
    try {
      console.log(`[MailService Failover] Mencoba kirim via akun: "${acc.name}" (${acc.gmailUser})...`);
      const transporter = getTransporterForAccount(acc);
      if (!transporter) {
        throw new Error('Transporter tidak dapat diinisialisasi');
      }

      await transporter.sendMail({
        from: `"${acc.fromName || 'DataForge API Studio'}" <${acc.gmailUser}>`,
        to: options.toEmail,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      // Update success metrics
      acc.lastTestedAt = new Date().toISOString();
      acc.lastStatus = 'success';
      acc.lastErrorMessage = undefined;
      acc.successCount = (acc.successCount || 0) + 1;
      saveMailConfig(cfg);
      mysqlUpsertSmtpAccount(acc);

      console.log(`[MailService Failover] Berhasil kirim email ke ${options.toEmail} menggunakan akun: "${acc.name}"`);
      attempts.push({ accountName: acc.name, success: true });

      return {
        sent: true,
        simulated: false,
        accountUsed: `${acc.name} (${acc.gmailUser})`,
        attempts
      };
    } catch (err: any) {
      console.warn(`[MailService Failover] Akun "${acc.name}" (${acc.gmailUser}) gagal kirim: ${err.message}. Beralih ke akun berikutnya...`);
      acc.lastTestedAt = new Date().toISOString();
      acc.lastStatus = 'failed';
      acc.lastErrorMessage = err.message;
      acc.failCount = (acc.failCount || 0) + 1;
      mysqlUpsertSmtpAccount(acc);
      attempts.push({ accountName: acc.name, success: false, error: err.message });
      // Continue to next account in pool
    }
  }

  // If all accounts fail, save stats and return simulated
  saveMailConfig(cfg);
  console.error(`[MailService Failover] Seluruh ${activeAccounts.length} akun Gmail SMTP gagal mengirim email.`);
  return {
    sent: false,
    simulated: true,
    attempts
  };
}

// Send verification email to newly registered user using Failover Pool
export async function sendVerificationEmail(
  toEmail: string,
  toName: string,
  code: string,
  token: string,
  appUrl: string
): Promise<{ sent: boolean; simulated: boolean; accountUsed?: string; error?: string }> {
  const verifyLink = `${appUrl || 'http://localhost:3000'}?verify_token=${token}`;

  const subject = `${code} adalah Kode Verifikasi Akun DataForge API Studio Anda`;
  const text = `Halo ${toName},\n\nTerima kasih telah mendaftar di DataForge API Studio.\n\nKode Verifikasi Anda adalah:\n${code}\n\nAtau buka tautan verifikasi berikut:\n${verifyLink}\n\nKode ini berlaku selama 24 jam.\n\nSalam,\nTim DataForge`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 16px;">
      <div style="background-color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #4f46e5, #10b981); border-radius: 12px; line-height: 48px; color: #ffffff; font-weight: bold; font-size: 20px;">
            DF
          </div>
          <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px; font-weight: 700;">Verifikasi Email Anda</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Satu langkah lagi untuk mengaktifkan akun DataForge API Studio Anda</p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Halo <strong>${toName}</strong>,<br />
          Terima kasih telah bergabung. Gunakan kode verifikasi di bawah ini untuk memverifikasi akun Anda:
        </p>

        <div style="text-align: center; margin: 28px 0; padding: 20px; background-color: #f1f5f9; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5;">
            ${code}
          </span>
          <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">Berlaku selama 24 jam</p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${verifyLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
            Verifikasi Otomatis (1-Klik)
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
          Jika Anda tidak merasa mendaftar di DataForge API Studio, Anda dapat mengabaikan email ini dengan aman.
        </p>
      </div>
    </div>
  `;

  const result = await sendEmailWithFailover({ toEmail, subject, text, html });
  if (result.simulated) {
    console.log(`[MailService] Kode OTP untuk ${toEmail}: [${code}] (Token: ${token})`);
  }
  return {
    sent: result.sent,
    simulated: result.simulated,
    accountUsed: result.accountUsed,
    error: !result.sent ? 'Semua akun SMTP gagal atau belum aktif' : undefined
  };
}

// Send password reset email to user requesting reset
export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  code: string,
  token: string,
  appUrl: string
): Promise<{ sent: boolean; simulated: boolean; accountUsed?: string; error?: string }> {
  const resetLink = `${appUrl || 'http://localhost:3000'}?reset_token=${token}&email=${encodeURIComponent(toEmail)}`;

  const subject = `[${code}] Permintaan Reset Kata Sandi DataForge API Studio`;
  const text = `Halo ${toName},\n\nKami menerima permintaan untuk mengatur ulang kata sandi akun DataForge Anda.\n\nKode Reset Kata Sandi Anda adalah:\n${code}\n\nAtau gunakan tautan reset langsung:\n${resetLink}\n\nKode ini berlaku selama 30 menit. Jika Anda tidak meminta reset kata sandi, abaikan pesan ini.\n\nSalam,\nTim DataForge`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 16px;">
      <div style="background-color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 12px; line-height: 48px; color: #ffffff; font-weight: bold; font-size: 20px;">
            🔑
          </div>
          <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px; font-weight: 700;">Atur Ulang Kata Sandi</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Permintaan pemulihan akses akun DataForge API Studio</p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Halo <strong>${toName}</strong>,<br />
          Kami menerima permintaan untuk mereset kata sandi akun Anda. Gunakan kode 6-digit berikut atau klik tombol di bawah untuk memasukkan kata sandi baru:
        </p>

        <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: #fffbeb; border-radius: 12px; border: 1px dashed #fcd34d;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #d97706;">
            ${code}
          </span>
          <p style="color: #92400e; font-size: 12px; margin: 8px 0 0 0;">Berlaku selama 30 menit</p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
            Atur Ulang Sandi Sekarang
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
          Jika Anda tidak meminta perubahan kata sandi ini, akun Anda tetap aman dan Anda dapat mengabaikan email ini.
        </p>
      </div>
    </div>
  `;

  const result = await sendEmailWithFailover({ toEmail, subject, text, html });
  if (result.simulated) {
    console.log(`[MailService] Kode Reset Sandi untuk ${toEmail}: [${code}] (Token: ${token})`);
  }
  return {
    sent: result.sent,
    simulated: result.simulated,
    accountUsed: result.accountUsed,
    error: !result.sent ? 'Semua akun SMTP gagal atau belum aktif' : undefined
  };
}
