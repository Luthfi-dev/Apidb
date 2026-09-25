// server.ts
import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import fs3 from "fs";
import path3 from "path";
import { fileURLToPath } from "url";

// src/server/mysqlService.ts
import mysql from "mysql2/promise";
import fs2 from "fs";
import path2 from "path";

// src/server/authService.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// src/server/mailService.ts
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
function generateId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "acc-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
}
var SETTINGS_FILE = path.resolve(process.cwd(), "mail-config.json");
var transporterCache = /* @__PURE__ */ new Map();
var currentMailConfig = {
  service: "gmail",
  accounts: []
};
function maskEmail(email) {
  if (!email) return "";
  return email.replace(/^(.)(.*)(@.*)$/, (_m, a, b, c) => `${a}${"*".repeat(Math.max(2, b.length))}${c}`);
}
function loadMailConfig() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.gmailUser && (!parsed.accounts || !Array.isArray(parsed.accounts))) {
        const legacyAcc = {
          id: generateId(),
          name: "Gmail Utama",
          gmailUser: parsed.gmailUser || "",
          gmailAppPassword: parsed.gmailAppPassword || "",
          fromName: parsed.fromName || "DataForge API Studio",
          host: parsed.host || "smtp.gmail.com",
          port: parsed.port || 465,
          secure: parsed.secure ?? true,
          isActive: true,
          order: 1,
          successCount: 0,
          failCount: 0
        };
        currentMailConfig = {
          service: "gmail",
          accounts: [legacyAcc]
        };
        saveMailConfig(currentMailConfig);
      } else if (Array.isArray(parsed.accounts)) {
        currentMailConfig = {
          service: "gmail",
          accounts: parsed.accounts
        };
      }
    }
  } catch (err) {
    console.warn("[MailService] Gagal membaca mail-config.json:", err);
  }
  return currentMailConfig;
}
function saveMailConfig(cfg) {
  currentMailConfig = cfg;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentMailConfig, null, 2), "utf-8");
  } catch (err) {
    console.error("[MailService] Gagal menyimpan mail-config.json:", err);
  }
  if (isMySQLConnected()) {
    syncAllSmtpAccountsToMySQL(currentMailConfig.accounts).catch((err) => {
      console.error("[MailService] Gagal sinkronisasi SMTP ke MySQL:", err);
    });
  }
  return currentMailConfig;
}
async function syncMailConfigWithMySQL() {
  if (!isMySQLConnected()) return;
  try {
    const mysqlAccounts = await loadSmtpAccountsFromMySQL();
    if (mysqlAccounts.length > 0) {
      currentMailConfig = {
        service: "gmail",
        accounts: mysqlAccounts
      };
      try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentMailConfig, null, 2), "utf-8");
      } catch (_) {
      }
      console.log(`[MailService] Berhasil memuat & sinkronkan ${mysqlAccounts.length} akun SMTP dari database online MySQL.`);
    } else {
      const localCfg = loadMailConfig();
      if (localCfg.accounts.length > 0) {
        await syncAllSmtpAccountsToMySQL(localCfg.accounts);
        console.log(`[MailService] Berhasil mengunggah ${localCfg.accounts.length} akun SMTP lokal ke tabel df_smtp_accounts MySQL.`);
      }
    }
  } catch (err) {
    console.error("[MailService] Gagal sinkronisasi SMTP dengan MySQL:", err);
  }
}
function getSafeMailConfig() {
  const cfg = loadMailConfig();
  const safeAccounts = cfg.accounts.map((acc) => ({
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
    lastStatus: acc.lastStatus || "untested",
    lastErrorMessage: acc.lastErrorMessage,
    successCount: acc.successCount || 0,
    failCount: acc.failCount || 0
  }));
  safeAccounts.sort((a, b) => a.order - b.order);
  return {
    service: "gmail",
    storageFile: "mail-config.json",
    storageTable: "df_smtp_accounts",
    isMySQLSynced: isMySQLConnected(),
    accounts: safeAccounts
  };
}
function getTransporterForAccount(acc) {
  if (!acc.gmailUser || !acc.gmailAppPassword) {
    return null;
  }
  const cleanPassword = acc.gmailAppPassword.replace(/\s+/g, "");
  const cacheKey = `${acc.id}:${acc.gmailUser}:${cleanPassword}:${acc.host}:${acc.port}:${acc.secure}`;
  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey);
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: acc.host || "smtp.gmail.com",
    port: acc.port || 465,
    secure: acc.secure ?? true,
    auth: {
      user: acc.gmailUser,
      pass: cleanPassword
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 1e4,
    greetingTimeout: 1e4,
    socketTimeout: 15e3
  });
  transporterCache.set(cacheKey, transporter);
  return transporter;
}
function invalidateTransporterCache(accountId) {
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
function addSmtpAccount(data) {
  const cfg = loadMailConfig();
  const nextOrder = cfg.accounts.length > 0 ? Math.max(...cfg.accounts.map((a) => a.order)) + 1 : 1;
  const newAccount = {
    id: generateId(),
    name: data.name || `Gmail Akun ${nextOrder}`,
    gmailUser: data.gmailUser.trim().toLowerCase(),
    gmailAppPassword: data.gmailAppPassword.trim(),
    fromName: data.fromName || "DataForge API Studio",
    host: data.host || "smtp.gmail.com",
    port: data.port || 465,
    secure: data.secure ?? true,
    isActive: data.isActive ?? true,
    order: nextOrder,
    successCount: 0,
    failCount: 0,
    lastStatus: "untested"
  };
  cfg.accounts.push(newAccount);
  saveMailConfig(cfg);
  mysqlUpsertSmtpAccount(newAccount);
  return newAccount;
}
function updateSmtpAccount(id, data) {
  const cfg = loadMailConfig();
  const idx = cfg.accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const current = cfg.accounts[idx];
  const updated = {
    ...current,
    ...data,
    gmailUser: data.gmailUser !== void 0 ? data.gmailUser.trim().toLowerCase() : current.gmailUser,
    gmailAppPassword: data.gmailAppPassword !== void 0 && data.gmailAppPassword.trim() !== "" ? data.gmailAppPassword.trim() : current.gmailAppPassword
  };
  cfg.accounts[idx] = updated;
  invalidateTransporterCache(id);
  saveMailConfig(cfg);
  mysqlUpsertSmtpAccount(updated);
  return updated;
}
function deleteSmtpAccount(id) {
  const cfg = loadMailConfig();
  const beforeCount = cfg.accounts.length;
  cfg.accounts = cfg.accounts.filter((a) => a.id !== id);
  if (cfg.accounts.length < beforeCount) {
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
function reorderSmtpAccounts(ids) {
  const cfg = loadMailConfig();
  const newAccounts = [];
  ids.forEach((id, index) => {
    const acc = cfg.accounts.find((a) => a.id === id);
    if (acc) {
      acc.order = index + 1;
      newAccounts.push(acc);
    }
  });
  cfg.accounts.forEach((acc) => {
    if (!newAccounts.some((a) => a.id === acc.id)) {
      acc.order = newAccounts.length + 1;
      newAccounts.push(acc);
    }
  });
  cfg.accounts = newAccounts;
  saveMailConfig(cfg);
  syncAllSmtpAccountsToMySQL(newAccounts);
  return true;
}
async function testSingleSmtpAccount(accountId, testEmail) {
  const cfg = loadMailConfig();
  const acc = cfg.accounts.find((a) => a.id === accountId);
  if (!acc) {
    return { success: false, message: "Akun SMTP tidak ditemukan.", accountName: "" };
  }
  if (!acc.gmailUser || !acc.gmailAppPassword) {
    return {
      success: false,
      message: "Kredensial Gmail akun ini belum lengkap (Email & App Password 16-karakter diperlukan).",
      accountName: acc.name
    };
  }
  const transporter = getTransporterForAccount(acc);
  if (!transporter) {
    return { success: false, message: "Gagal membuat koneksi SMTP transporter.", accountName: acc.name };
  }
  try {
    await transporter.verify();
    if (testEmail) {
      await transporter.sendMail({
        from: `"${acc.fromName || "DataForge API Studio"}" <${acc.gmailUser}>`,
        to: testEmail,
        subject: `[Uji Coba ${acc.name}] Verifikasi SMTP Server DataForge`,
        text: `Halo,

Ini adalah email uji coba dari akun ${acc.name} (${acc.gmailUser}).
Koneksi Gmail SMTP akun ini berfungsi normal!

Waktu: ${(/* @__PURE__ */ new Date()).toLocaleString("id-ID")}`,
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
            <p style="color: #475569; font-size: 12px;">Waktu: <strong>${(/* @__PURE__ */ new Date()).toLocaleString("id-ID")}</strong></p>
          </div>
        `
      });
    }
    acc.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
    acc.lastStatus = "success";
    acc.lastErrorMessage = void 0;
    acc.successCount = (acc.successCount || 0) + 1;
    saveMailConfig(cfg);
    mysqlUpsertSmtpAccount(acc);
    return {
      success: true,
      accountName: acc.name,
      message: `Akun "${acc.name}" (${acc.gmailUser}) sukses terverifikasi ${testEmail ? `dan email uji coba terkirim ke ${testEmail}` : ""}!`
    };
  } catch (err) {
    acc.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
    acc.lastStatus = "failed";
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
async function sendEmailWithFailover(options) {
  const cfg = loadMailConfig();
  const activeAccounts = cfg.accounts.filter((a) => a.isActive && a.gmailUser && a.gmailAppPassword).sort((a, b) => a.order - b.order);
  const attempts = [];
  if (activeAccounts.length === 0) {
    console.log(`[MailService Failover] Tidak ada akun Gmail SMTP aktif. Mode simulasi untuk: ${options.toEmail}`);
    return { sent: false, simulated: true, attempts };
  }
  for (const acc of activeAccounts) {
    try {
      console.log(`[MailService Failover] Mencoba kirim via akun: "${acc.name}" (${acc.gmailUser})...`);
      const transporter = getTransporterForAccount(acc);
      if (!transporter) {
        throw new Error("Transporter tidak dapat diinisialisasi");
      }
      await transporter.sendMail({
        from: `"${acc.fromName || "DataForge API Studio"}" <${acc.gmailUser}>`,
        to: options.toEmail,
        subject: options.subject,
        text: options.text,
        html: options.html
      });
      acc.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
      acc.lastStatus = "success";
      acc.lastErrorMessage = void 0;
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
    } catch (err) {
      console.warn(`[MailService Failover] Akun "${acc.name}" (${acc.gmailUser}) gagal kirim: ${err.message}. Beralih ke akun berikutnya...`);
      acc.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
      acc.lastStatus = "failed";
      acc.lastErrorMessage = err.message;
      acc.failCount = (acc.failCount || 0) + 1;
      mysqlUpsertSmtpAccount(acc);
      attempts.push({ accountName: acc.name, success: false, error: err.message });
    }
  }
  saveMailConfig(cfg);
  console.error(`[MailService Failover] Seluruh ${activeAccounts.length} akun Gmail SMTP gagal mengirim email.`);
  return {
    sent: false,
    simulated: true,
    attempts
  };
}
async function sendVerificationEmail(toEmail, toName, code, token, appUrl) {
  const verifyLink = `${appUrl || "http://localhost:3000"}?verify_token=${token}`;
  const subject = `${code} adalah Kode Verifikasi Akun DataForge API Studio Anda`;
  const text = `Halo ${toName},

Terima kasih telah mendaftar di DataForge API Studio.

Kode Verifikasi Anda adalah:
${code}

Atau buka tautan verifikasi berikut:
${verifyLink}

Kode ini berlaku selama 24 jam.

Salam,
Tim DataForge`;
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
    error: !result.sent ? "Semua akun SMTP gagal atau belum aktif" : void 0
  };
}
async function sendPasswordResetEmail(toEmail, toName, code, token, appUrl) {
  const resetLink = `${appUrl || "http://localhost:3000"}?reset_token=${token}&email=${encodeURIComponent(toEmail)}`;
  const subject = `[${code}] Permintaan Reset Kata Sandi DataForge API Studio`;
  const text = `Halo ${toName},

Kami menerima permintaan untuk mengatur ulang kata sandi akun DataForge Anda.

Kode Reset Kata Sandi Anda adalah:
${code}

Atau gunakan tautan reset langsung:
${resetLink}

Kode ini berlaku selama 30 menit. Jika Anda tidak meminta reset kata sandi, abaikan pesan ini.

Salam,
Tim DataForge`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 16px;">
      <div style="background-color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 12px; line-height: 48px; color: #ffffff; font-weight: bold; font-size: 20px;">
            \u{1F511}
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
    error: !result.sent ? "Semua akun SMTP gagal atau belum aktif" : void 0
  };
}

// src/server/authService.ts
var JWT_SECRET = process.env.JWT_SECRET || "dataforge_jwt_secret_dev_2026_xyz";
var JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
var users = [];
var DEFAULT_PASSWORD_HASH = bcrypt.hashSync("123456", 10);
var SEED_USERS = [
  {
    id: "usr-superadmin",
    name: "Super Administrator",
    email: "superadmin@dataforge.io",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "superadmin",
    isVerified: true,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date("2026-01-01T00:00:00Z")).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "usr-admin",
    name: "Administrator Data",
    email: "admin@dataforge.io",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "admin",
    isVerified: true,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date("2026-01-01T00:00:00Z")).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "usr-user",
    name: "Pengguna Biasa",
    email: "user@dataforge.io",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "user",
    isVerified: true,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date("2026-01-01T00:00:00Z")).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
function toSafeUser(user) {
  const {
    passwordHash,
    verificationCode,
    verificationToken,
    resetPasswordCode,
    resetPasswordToken,
    ...safe
  } = user;
  return safe;
}
function generateJwtToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
function verifyJwtToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
function getAllUsers() {
  if (users.length === 0) {
    users = [...SEED_USERS];
  }
  return users;
}
function setAllUsers(loadedUsers) {
  if (!loadedUsers || loadedUsers.length === 0) {
    users = [...SEED_USERS];
  } else {
    const hasSuper = loadedUsers.some((u) => u.role === "superadmin");
    if (!hasSuper) {
      users = [SEED_USERS[0], ...loadedUsers];
    } else {
      users = [...loadedUsers];
    }
  }
}
async function registerUser(name, email, password, appUrl = "http://localhost:3000") {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  if (!cleanName) return { success: false, message: "Nama lengkap wajib diisi." };
  if (!cleanEmail || !cleanEmail.includes("@")) return { success: false, message: "Format alamat email tidak valid." };
  if (!password || password.length < 6) return { success: false, message: "Password minimal 6 karakter." };
  const all = getAllUsers();
  const existing = all.find((u) => u.email === cleanEmail);
  if (existing) {
    if (existing.isVerified) {
      return {
        success: false,
        message: "Alamat email ini sudah terdaftar dan aktif. Silakan masuk menggunakan password Anda."
      };
    }
    if (existing.lastOtpSentAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(existing.lastOtpSentAt).getTime()) / 1e3);
      if (elapsedSeconds < 60) {
        return {
          success: false,
          cooldownRemaining: 60 - elapsedSeconds,
          message: `Email belum diverifikasi. Mohon tunggu ${60 - elapsedSeconds} detik sebelum meminta kode OTP baru.`
        };
      }
    }
    const code2 = Math.floor(1e5 + Math.random() * 9e5).toString();
    const token2 = `vtok_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    existing.name = cleanName;
    existing.passwordHash = await bcrypt.hash(password, 10);
    existing.verificationCode = code2;
    existing.verificationToken = token2;
    existing.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
    existing.lastOtpSentAt = (/* @__PURE__ */ new Date()).toISOString();
    existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const mailResult2 = await sendVerificationEmail(cleanEmail, cleanName, code2, token2, appUrl);
    return {
      success: true,
      user: toSafeUser(existing),
      verificationRequired: true,
      simulatedCode: mailResult2.simulated ? code2 : void 0,
      message: mailResult2.sent ? `Kode verifikasi telah dikirimkan ke ${cleanEmail}. Periksa kotak masuk atau spam email Anda.` : `Pendaftaran berhasil. Silakan masukkan kode verifikasi 6 digit untuk mengaktifkan akun Anda.`
    };
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const token = `vtok_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
  const nowStr = (/* @__PURE__ */ new Date()).toISOString();
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role: "user",
    // Default role for public registration
    isVerified: false,
    verificationCode: code,
    verificationToken: token,
    verificationExpiresAt: expiresAt,
    lastOtpSentAt: nowStr,
    isActive: true,
    createdAt: nowStr,
    updatedAt: nowStr
  };
  users.push(newUser);
  const mailResult = await sendVerificationEmail(cleanEmail, cleanName, code, token, appUrl);
  return {
    success: true,
    user: toSafeUser(newUser),
    verificationRequired: true,
    simulatedCode: mailResult.simulated ? code : void 0,
    message: mailResult.sent ? `Kode verifikasi telah dikirim ke ${cleanEmail}. Periksa kotak masuk atau spam email Anda.` : `Pendaftaran berhasil. Silakan masukkan kode verifikasi 6-digit untuk mengaktifkan akun.`
  };
}
async function verifyUserEmail(identifier) {
  const all = getAllUsers();
  let user;
  if (identifier.token) {
    user = all.find((u) => u.verificationToken === identifier.token);
  } else if (identifier.email && identifier.code) {
    const cleanEmail = identifier.email.trim().toLowerCase();
    const cleanCode = identifier.code.trim();
    user = all.find((u) => u.email === cleanEmail && u.verificationCode === cleanCode);
  }
  if (!user) {
    return { success: false, message: "Kode verifikasi salah atau sudah kadaluarsa." };
  }
  user.isVerified = true;
  user.verificationCode = void 0;
  user.verificationToken = void 0;
  user.verificationExpiresAt = void 0;
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const token = generateJwtToken(user);
  return {
    success: true,
    user: toSafeUser(user),
    jwtToken: token,
    message: "Email berhasil diverifikasi! Akun Anda kini aktif."
  };
}
async function resendVerificationCode(email, appUrl = "http://localhost:3000") {
  const cleanEmail = email.trim().toLowerCase();
  const all = getAllUsers();
  const user = all.find((u) => u.email === cleanEmail);
  if (!user) {
    return { success: false, message: "Akun dengan alamat email ini tidak ditemukan." };
  }
  if (user.isVerified) {
    return { success: false, message: "Akun ini sudah terverifikasi sebelumnya. Silakan langsung login." };
  }
  if (user.lastOtpSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(user.lastOtpSentAt).getTime()) / 1e3);
    if (elapsedSeconds < 60) {
      const waitSeconds = 60 - elapsedSeconds;
      return {
        success: false,
        cooldownRemaining: waitSeconds,
        message: `Mohon tunggu ${waitSeconds} detik lagi sebelum meminta pengiriman ulang kode OTP.`
      };
    }
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const token = `vtok_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  user.verificationCode = code;
  user.verificationToken = token;
  user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
  user.lastOtpSentAt = (/* @__PURE__ */ new Date()).toISOString();
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const mailResult = await sendVerificationEmail(user.email, user.name, code, token, appUrl);
  return {
    success: true,
    simulatedCode: mailResult.simulated ? code : void 0,
    message: mailResult.sent ? `Kode verifikasi baru berhasil dikirim ke ${cleanEmail}.` : `Kode verifikasi baru berhasil dibuat: ${code}`
  };
}
async function updateUserProfile(userId, name, oldPassword, newPassword) {
  const all = getAllUsers();
  const user = all.find((u) => u.id === userId);
  if (!user) {
    return { success: false, message: "Pengguna tidak ditemukan." };
  }
  if (name && name.trim()) {
    user.name = name.trim();
  }
  if (newPassword) {
    if (!oldPassword) {
      return { success: false, message: "Kata sandi saat ini wajib diisi untuk mengubah sandi baru." };
    }
    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) {
      return { success: false, message: "Kata sandi saat ini tidak sesuai." };
    }
    if (newPassword.length < 6) {
      return { success: false, message: "Kata sandi baru minimal 6 karakter." };
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
  }
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return {
    success: true,
    user: toSafeUser(user),
    message: "Profil akun berhasil diperbarui."
  };
}
async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  let user;
  if (isMySQLConnected()) {
    try {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser) {
        user = mysqlUser;
        const all = getAllUsers();
        const idx = all.findIndex((u) => u.id === mysqlUser.id || u.email.toLowerCase() === cleanEmail);
        if (idx !== -1) {
          all[idx] = mysqlUser;
        } else {
          all.push(mysqlUser);
        }
      }
    } catch (err) {
      console.warn("[AuthService] Gagal membaca user langsung dari MySQL:", err);
    }
  }
  if (!user) {
    const all = getAllUsers();
    user = all.find((u) => u.email === cleanEmail);
  }
  if (!user) {
    return { success: false, message: "Email atau kata sandi yang Anda masukkan salah." };
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { success: false, message: "Email atau kata sandi yang Anda masukkan salah." };
  }
  if (!user.isActive) {
    return { success: false, message: "Akun Anda dinonaktifkan oleh administrator. Hubungi pengelola sistem." };
  }
  if (!user.isVerified) {
    return {
      success: false,
      unverified: true,
      email: user.email,
      message: "Email Anda belum diverifikasi. Masukkan kode 6 digit verifikasi Anda."
    };
  }
  const jwtToken = generateJwtToken(user);
  return {
    success: true,
    user: toSafeUser(user),
    jwtToken,
    message: `Selamat datang kembali, ${user.name}!`
  };
}
async function requestPasswordReset(email, appUrl = "http://localhost:3000") {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, message: "Silakan masukkan alamat email yang valid." };
  }
  let user;
  if (isMySQLConnected()) {
    try {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser) user = mysqlUser;
    } catch (_) {
    }
  }
  if (!user) {
    const all2 = getAllUsers();
    user = all2.find((u) => u.email === cleanEmail);
  }
  if (!user) {
    return {
      success: false,
      message: "Akun dengan alamat email tersebut tidak ditemukan dalam sistem."
    };
  }
  if (!user.isActive) {
    return {
      success: false,
      message: "Akun Anda dinonaktifkan oleh administrator. Silakan hubungi pengelola sistem."
    };
  }
  if (user.lastResetSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(user.lastResetSentAt).getTime()) / 1e3);
    if (elapsedSeconds < 60) {
      const waitSeconds = 60 - elapsedSeconds;
      return {
        success: false,
        cooldownRemaining: waitSeconds,
        message: `Mohon tunggu ${waitSeconds} detik sebelum meminta pengiriman ulang kode reset sandi.`
      };
    }
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const token = `rst_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
  const nowStr = (/* @__PURE__ */ new Date()).toISOString();
  user.resetPasswordCode = code;
  user.resetPasswordToken = token;
  user.resetPasswordExpiresAt = expiresAt;
  user.lastResetSentAt = nowStr;
  user.updatedAt = nowStr;
  const all = getAllUsers();
  const idx = all.findIndex((u) => u.id === user.id || u.email.toLowerCase() === cleanEmail);
  if (idx !== -1) {
    all[idx] = user;
  } else {
    all.push(user);
  }
  if (isMySQLConnected()) {
    await mysqlUpsertUser(user);
  }
  const mailResult = await sendPasswordResetEmail(user.email, user.name, code, token, appUrl);
  return {
    success: true,
    simulatedCode: mailResult.simulated ? code : void 0,
    message: mailResult.sent ? `Kode verifikasi reset kata sandi telah dikirim ke ${user.email}. Periksa kotak masuk atau folder spam Anda.` : `Kode verifikasi reset kata sandi berhasil dibuat: ${code}`
  };
}
async function resetPasswordWithCodeOrToken(options) {
  const { email, code, token, newPassword } = options;
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: "Kata sandi baru minimal 6 karakter." };
  }
  if (isMySQLConnected()) {
    try {
      const mysqlUsers = await loadUsersFromMySQL();
      if (mysqlUsers.length > 0) {
        setAllUsers(mysqlUsers);
      }
    } catch (err) {
      console.warn("[AuthService] Gagal load users dari MySQL:", err);
    }
  }
  const refreshedAll = getAllUsers();
  let user;
  if (token) {
    user = refreshedAll.find((u) => u.resetPasswordToken === token);
  } else if (email && code) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    user = refreshedAll.find((u) => u.email.trim().toLowerCase() === cleanEmail && String(u.resetPasswordCode || "").trim() === cleanCode);
    if (!user && isMySQLConnected()) {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser && String(mysqlUser.resetPasswordCode || "").trim() === cleanCode) {
        user = mysqlUser;
      }
    }
  }
  if (!user) {
    return { success: false, message: "Kode OTP atau tautan reset sandi tidak valid atau telah kedaluwarsa." };
  }
  if (user.resetPasswordExpiresAt) {
    const expiresAt = new Date(user.resetPasswordExpiresAt).getTime();
    if (Date.now() > expiresAt) {
      return { success: false, message: "Kode verifikasi reset kata sandi telah kedaluwarsa. Silakan minta kode baru." };
    }
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetPasswordCode = void 0;
  user.resetPasswordToken = void 0;
  user.resetPasswordExpiresAt = void 0;
  user.isVerified = true;
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (isMySQLConnected()) {
    await mysqlUpsertUser(user);
  }
  const jwtToken = generateJwtToken(user);
  return {
    success: true,
    user: toSafeUser(user),
    jwtToken,
    message: "Kata sandi berhasil diatur ulang! Anda telah otomatis masuk ke sistem."
  };
}
async function verifyResetCode(options) {
  const { email, code, token } = options;
  if (isMySQLConnected()) {
    try {
      const mysqlUsers = await loadUsersFromMySQL();
      if (mysqlUsers.length > 0) {
        setAllUsers(mysqlUsers);
      }
    } catch (err) {
      console.warn("[AuthService] Gagal load users dari MySQL:", err);
    }
  }
  const refreshedAll = getAllUsers();
  let user;
  if (token) {
    user = refreshedAll.find((u) => u.resetPasswordToken === token);
  } else if (email && code) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    user = refreshedAll.find((u) => u.email.trim().toLowerCase() === cleanEmail && String(u.resetPasswordCode || "").trim() === cleanCode);
    if (!user && isMySQLConnected()) {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser && String(mysqlUser.resetPasswordCode || "").trim() === cleanCode) {
        user = mysqlUser;
      }
    }
  }
  if (!user) {
    return { success: false, message: "Kode OTP reset kata sandi tidak valid." };
  }
  if (user.resetPasswordExpiresAt) {
    const expiresAt = new Date(user.resetPasswordExpiresAt).getTime();
    if (Date.now() > expiresAt) {
      return { success: false, message: "Kode verifikasi reset kata sandi telah kedaluwarsa. Silakan minta kode baru." };
    }
  }
  return { success: true, message: "Kode OTP valid. Silakan masukkan kata sandi baru." };
}

// src/server/telegramService.ts
import fetch from "node-fetch";
var TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
var TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
var lastAlertTimestamp = 0;
var ALERT_COOLDOWN_MS = 3 * 60 * 1e3;
async function sendTelegramAlert(errorMessage, contextInfo) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("[TelegramService] TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diatur di .env. Notifikasi Telegram dilewati.");
      return;
    }
    const now = Date.now();
    if (now - lastAlertTimestamp < ALERT_COOLDOWN_MS) {
      return;
    }
    lastAlertTimestamp = now;
    const text = `\u{1F6A8} *DATAFORGE SYSTEM ALERT*

\u26A0\uFE0F *Gangguan Koneksi Database Online*
\u{1F552} Waktu: ${(/* @__PURE__ */ new Date()).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
\u274C Error Detail:
\`\`\`
${errorMessage}
\`\`\`
` + (contextInfo ? `\u2139\uFE0F Konteks: ${contextInfo}
` : "") + `
\u{1F504} _Sistem otomatis mencoba menghubungkan ulang ke database online..._`;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown"
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[TelegramService] Gagal mengirim alert ke Telegram:", errText);
    }
  } catch (err) {
    console.error("[TelegramService] Error memanggil Telegram Bot API:", err);
  }
}

// src/server/mysqlService.ts
var SCHEMA_FILE = path2.resolve(process.cwd(), "database/schema.mysql.sql");
var currentPool = null;
var lastError = void 0;
var lastConnectedAt = void 0;
function getEnvDbConfig() {
  const uri = (process.env.DATABASE_URL || process.env.MYSQL_URL || "").trim();
  const host = (process.env.DB_HOST || process.env.MYSQL_HOST || "").trim();
  const portStr = (process.env.DB_PORT || process.env.MYSQL_PORT || "").trim();
  const port = portStr ? parseInt(portStr, 10) : 3306;
  const user = (process.env.DB_USER || process.env.MYSQL_USER || "").trim();
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "";
  const database = (process.env.DB_NAME || process.env.MYSQL_DATABASE || "").trim();
  const ssl = process.env.DB_SSL === "true" || process.env.MYSQL_SSL === "true" || false;
  const isConfigured = Boolean(uri.length > 0 || host.length > 0 && user.length > 0 && database.length > 0);
  return {
    enabled: isConfigured,
    host: host || (uri ? "" : "localhost"),
    port: isNaN(port) ? 3306 : port,
    user: user || "",
    password,
    database: database || "",
    ssl,
    uri
  };
}
function getSafeDbConfig() {
  const envCfg = getEnvDbConfig();
  const rawUri = envCfg.uri || "";
  const maskedUri = rawUri ? rawUri.replace(/:([^@]+)@/, ":\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022@") : "";
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
function parseConnectionOptions(cfg) {
  if (cfg.uri && (cfg.uri.startsWith("mysql://") || cfg.uri.startsWith("mysql2://"))) {
    const url = new URL(cfg.uri);
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, "") || "dataforge_db",
      ssl: cfg.ssl ? { rejectUnauthorized: false } : void 0,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8e3
    };
  }
  return {
    host: cfg.host || "localhost",
    port: cfg.port || 3306,
    user: cfg.user || "root",
    password: cfg.password || "",
    database: cfg.database || "dataforge_db",
    ssl: cfg.ssl ? { rejectUnauthorized: false } : void 0,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 8e3
  };
}
async function testConnection(cfg) {
  const startTime = Date.now();
  let tempPool = null;
  try {
    const opts = parseConnectionOptions(cfg);
    tempPool = mysql.createPool({ ...opts, connectionLimit: 1 });
    await tempPool.query("SELECT 1 + 1 AS pingResult");
    const latencyMs = Date.now() - startTime;
    return { success: true, latencyMs };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  } finally {
    if (tempPool) {
      try {
        await tempPool.end();
      } catch (_) {
      }
    }
  }
}
async function testEnvConnection() {
  const cfg = getEnvDbConfig();
  if (!cfg.enabled) {
    return {
      success: false,
      error: "Variabel lingkungan Database belum diatur di .env (DB_HOST, DB_USER, DB_NAME, DB_PASSWORD atau DATABASE_URL)."
    };
  }
  return testConnection(cfg);
}
async function addColumnIfNotExists(pool, table, column, colDef) {
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
      [table, column]
    );
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${colDef}`);
    }
  } catch (err) {
  }
}
async function initMySQLTables(pool) {
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_settings\` (
      \`key\` VARCHAR(64) NOT NULL,
      \`value\` LONGTEXT NOT NULL,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
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
  await addColumnIfNotExists(pool, "df_users", "reset_password_code", "VARCHAR(32) NULL");
  await addColumnIfNotExists(pool, "df_users", "reset_password_token", "VARCHAR(128) NULL");
  await addColumnIfNotExists(pool, "df_users", "reset_password_expires_at", "DATETIME NULL");
  await addColumnIfNotExists(pool, "df_users", "last_otp_sent_at", "DATETIME NULL");
  await addColumnIfNotExists(pool, "df_users", "last_reset_sent_at", "DATETIME NULL");
  const [userCountRows] = await pool.query("SELECT COUNT(*) AS total FROM df_users");
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
async function connectMySQL(cfg) {
  const finalConfig = cfg || getEnvDbConfig();
  try {
    if (currentPool) {
      try {
        await currentPool.end();
      } catch (_) {
      }
      currentPool = null;
    }
    const opts = parseConnectionOptions(finalConfig);
    currentPool = mysql.createPool(opts);
    await currentPool.query("SELECT 1 AS ready");
    await initMySQLTables(currentPool);
    lastError = void 0;
    lastConnectedAt = (/* @__PURE__ */ new Date()).toISOString();
    const targetDesc = finalConfig.uri ? `Cloud URI (${finalConfig.uri.split("@")[1] || "remote"})` : `${finalConfig.database} @ ${finalConfig.host}:${finalConfig.port}`;
    return {
      success: true,
      message: `Berhasil terhubung ke database online MySQL (${targetDesc})!`
    };
  } catch (err) {
    lastError = err.message || String(err);
    if (currentPool) {
      try {
        await currentPool.end();
      } catch (_) {
      }
      currentPool = null;
    }
    await sendTelegramAlert(lastError || "Unknown connection error", "Gangguan Koneksi Database MySQL Online");
    return {
      success: false,
      message: "Gagal menghubungkan ke database MySQL online dari variabel lingkungan (.env)",
      error: lastError
    };
  }
}
var autoReconnectTimer = null;
function startAutoReconnectLoop() {
  if (autoReconnectTimer) return;
  autoReconnectTimer = setInterval(async () => {
    const cfg = getEnvDbConfig();
    if (cfg.enabled && !currentPool) {
      console.log("[MySQL] Auto-reconnect: Mencoba menghubungkan ulang ke database online...");
      const res = await connectMySQL(cfg);
      if (res.success) {
        console.log("[MySQL] Auto-reconnect: Berhasil terhubung kembali ke database online!");
      }
    }
  }, 1e4);
}
async function disconnectMySQL() {
  if (currentPool) {
    try {
      await currentPool.end();
    } catch (_) {
    }
    currentPool = null;
  }
  lastError = void 0;
  return { success: true };
}
function isMySQLConnected() {
  return currentPool !== null;
}
async function getMySQLStatus() {
  const envCfg = getEnvDbConfig();
  if (!currentPool) {
    return {
      engine: "local",
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
    await currentPool.query("SELECT 1");
    const latencyMs = Date.now() - start;
    const [tableRows] = await currentPool.query("SELECT COUNT(*) AS total FROM df_tables");
    const [recordRows] = await currentPool.query("SELECT COUNT(*) AS total FROM df_records");
    return {
      engine: "mysql",
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
  } catch (err) {
    lastError = err.message || String(err);
    return {
      engine: "mysql",
      connected: false,
      host: envCfg.host,
      port: envCfg.port,
      database: envCfg.database,
      user: envCfg.user,
      error: lastError
    };
  }
}
async function loadDataFromMySQL() {
  if (!currentPool) {
    throw new Error("MySQL connection pool tidak aktif");
  }
  const [projRows] = await currentPool.query("SELECT * FROM df_projects ORDER BY created_at ASC");
  const [tblRows] = await currentPool.query("SELECT * FROM df_tables ORDER BY created_at ASC");
  const [recRows] = await currentPool.query("SELECT * FROM df_records ORDER BY created_at ASC");
  const loadedProjects = projRows.map((r) => ({
    id: r.id,
    ownerId: r.owner_id || void 0,
    ownerEmail: r.owner_email || void 0,
    name: r.name,
    description: r.description || "",
    token: r.token,
    color: r.color || "indigo",
    icon: r.icon || "Database",
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : void 0
  }));
  const loadedTables = tblRows.map((r) => {
    let fields = [];
    try {
      fields = typeof r.fields === "string" ? JSON.parse(r.fields) : r.fields;
    } catch (_) {
      fields = [];
    }
    return {
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      slug: r.slug,
      description: r.description || "",
      token: r.token || void 0,
      primaryKey: r.primary_key || "id",
      fields,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    };
  });
  const loadedRecords = recRows.map((r) => {
    let data = {};
    try {
      data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    } catch (_) {
      data = {};
    }
    return {
      id: isNaN(Number(r.id)) ? r.id : Number(r.id),
      tableId: r.table_id,
      projectId: r.project_id,
      data,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    };
  });
  return {
    projects: loadedProjects,
    tables: loadedTables,
    records: loadedRecords
  };
}
async function syncAllToMySQL(projects2, tables2, records2) {
  if (!currentPool) {
    throw new Error("MySQL connection pool tidak aktif");
  }
  await initMySQLTables(currentPool);
  const conn = await currentPool.getConnection();
  try {
    await conn.beginTransaction();
    for (const p of projects2) {
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
        [p.id, p.ownerId || null, p.ownerEmail || null, p.name, p.description, p.token, p.color || "indigo", p.icon || "Database", new Date(p.createdAt), new Date(p.updatedAt || p.createdAt)]
      );
    }
    for (const t of tables2) {
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
        [t.id, t.projectId, t.name, t.slug, t.description || "", t.primaryKey || "id", t.token || null, JSON.stringify(t.fields), new Date(t.createdAt), new Date(t.updatedAt)]
      );
    }
    for (const r of records2) {
      const rec = r;
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
      projectsCount: projects2.length,
      tablesCount: tables2.length,
      recordsCount: records2.length
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
async function mysqlUpsertProject(p) {
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
      [p.id, p.ownerId || null, p.ownerEmail || null, p.name, p.description, p.token, p.color || "indigo", p.icon || "Database", new Date(p.createdAt), new Date(p.updatedAt || p.createdAt)]
    );
  } catch (err) {
    console.error("[MySQL] Error upserting project:", err);
  }
}
async function mysqlDeleteProject(projectId) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_projects WHERE id = ?", [projectId]);
    await currentPool.query("DELETE FROM df_tables WHERE project_id = ?", [projectId]);
    await currentPool.query("DELETE FROM df_records WHERE project_id = ?", [projectId]);
  } catch (err) {
    console.error("[MySQL] Error deleting project:", err);
  }
}
async function mysqlUpsertTable(t) {
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
      [t.id, t.projectId, t.name, t.slug, t.description || "", t.primaryKey || "id", t.token || null, JSON.stringify(t.fields), new Date(t.createdAt), new Date(t.updatedAt)]
    );
  } catch (err) {
    console.error("[MySQL] Error upserting table:", err);
  }
}
async function mysqlDeleteTable(tableId) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_tables WHERE id = ?", [tableId]);
    await currentPool.query("DELETE FROM df_records WHERE table_id = ?", [tableId]);
  } catch (err) {
    console.error("[MySQL] Error deleting table:", err);
  }
}
async function mysqlUpsertRecord(r) {
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
    console.error("[MySQL] Error upserting record:", err);
  }
}
async function mysqlDeleteRecord(tableId, recordId) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_records WHERE table_id = ? AND id = ?", [tableId, String(recordId)]);
  } catch (err) {
    console.error("[MySQL] Error deleting record:", err);
  }
}
async function loadUsersFromMySQL() {
  if (!currentPool) return [];
  try {
    const [rows] = await currentPool.query("SELECT * FROM df_users ORDER BY created_at ASC");
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role,
      isVerified: Boolean(r.is_verified),
      verificationCode: r.verification_code || void 0,
      verificationToken: r.verification_token || void 0,
      verificationExpiresAt: r.verification_expires_at ? new Date(r.verification_expires_at).toISOString() : void 0,
      resetPasswordCode: r.reset_password_code || void 0,
      resetPasswordToken: r.reset_password_token || void 0,
      resetPasswordExpiresAt: r.reset_password_expires_at ? new Date(r.reset_password_expires_at).toISOString() : void 0,
      lastOtpSentAt: r.last_otp_sent_at ? new Date(r.last_otp_sent_at).toISOString() : void 0,
      lastResetSentAt: r.last_reset_sent_at ? new Date(r.last_reset_sent_at).toISOString() : void 0,
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));
  } catch (err) {
    console.error("[MySQL] Error loading users:", err);
    return [];
  }
}
async function findUserByEmailFromMySQL(email) {
  if (!currentPool) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const [rows] = await currentPool.query("SELECT * FROM df_users WHERE LOWER(email) = ? LIMIT 1", [cleanEmail]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role,
      isVerified: Boolean(r.is_verified),
      verificationCode: r.verification_code || void 0,
      verificationToken: r.verification_token || void 0,
      verificationExpiresAt: r.verification_expires_at ? new Date(r.verification_expires_at).toISOString() : void 0,
      resetPasswordCode: r.reset_password_code || void 0,
      resetPasswordToken: r.reset_password_token || void 0,
      resetPasswordExpiresAt: r.reset_password_expires_at ? new Date(r.reset_password_expires_at).toISOString() : void 0,
      lastOtpSentAt: r.last_otp_sent_at ? new Date(r.last_otp_sent_at).toISOString() : void 0,
      lastResetSentAt: r.last_reset_sent_at ? new Date(r.last_reset_sent_at).toISOString() : void 0,
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  } catch (err) {
    console.error("[MySQL] Error finding user by email:", err);
    return null;
  }
}
async function mysqlUpsertUser(u) {
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
    console.error("[MySQL] Error upserting user:", err);
  }
}
async function mysqlDeleteUser(userId) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_users WHERE id = ?", [userId]);
  } catch (err) {
    console.error("[MySQL] Error deleting user:", err);
  }
}
async function syncAllUsersToMySQL(users2) {
  if (!currentPool) return;
  for (const u of users2) {
    await mysqlUpsertUser(u);
  }
}
async function loadSmtpAccountsFromMySQL() {
  if (!currentPool) return [];
  try {
    const [rows] = await currentPool.query("SELECT * FROM df_smtp_accounts ORDER BY order_num ASC, created_at ASC");
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      gmailUser: r.gmail_user,
      gmailAppPassword: r.gmail_app_password,
      fromName: r.from_name || "DataForge API Studio",
      host: r.host || "smtp.gmail.com",
      port: r.port || 465,
      secure: Boolean(r.secure),
      isActive: Boolean(r.is_active),
      order: r.order_num || 1,
      lastTestedAt: r.last_tested_at ? new Date(r.last_tested_at).toISOString() : void 0,
      lastStatus: r.last_status || "untested",
      lastErrorMessage: r.last_error_message || void 0,
      successCount: r.success_count || 0,
      failCount: r.fail_count || 0
    }));
  } catch (err) {
    console.error("[MySQL] Error loading SMTP accounts:", err);
    return [];
  }
}
async function mysqlUpsertSmtpAccount(acc) {
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
        acc.fromName || "DataForge API Studio",
        acc.host || "smtp.gmail.com",
        acc.port || 465,
        acc.secure ? 1 : 0,
        acc.isActive ? 1 : 0,
        acc.order || 1,
        acc.lastTestedAt ? new Date(acc.lastTestedAt) : null,
        acc.lastStatus || "untested",
        acc.lastErrorMessage || null,
        acc.successCount || 0,
        acc.failCount || 0
      ]
    );
  } catch (err) {
    console.error("[MySQL] Error upserting SMTP account:", err);
  }
}
async function mysqlDeleteSmtpAccount(id) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_smtp_accounts WHERE id = ?", [id]);
  } catch (err) {
    console.error("[MySQL] Error deleting SMTP account:", err);
  }
}
async function syncAllSmtpAccountsToMySQL(accounts) {
  if (!currentPool) return;
  for (const acc of accounts) {
    await mysqlUpsertSmtpAccount(acc);
  }
}
function getSchemaSQLContent() {
  try {
    if (fs2.existsSync(SCHEMA_FILE)) {
      return fs2.readFileSync(SCHEMA_FILE, "utf-8");
    }
  } catch (err) {
    console.error("[MySQL] Gagal membaca schema.mysql.sql:", err);
  }
  return "-- Schema file not found";
}
async function getDatabaseTablesList() {
  if (!currentPool) {
    return ["df_users", "df_projects", "df_tables", "df_records", "df_smtp_accounts"];
  }
  try {
    const [rows] = await currentPool.query("SHOW TABLES");
    return rows.map((r) => Object.values(r)[0]);
  } catch (err) {
    return [];
  }
}
async function getTableDataPaginated(tableName, page = 1, limit = 10) {
  const offset = Math.max(0, (page - 1) * limit);
  if (!currentPool) {
    return { columns: [], rows: [], total: 0 };
  }
  try {
    const [countRows] = await currentPool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
    const total = countRows[0]?.total || 0;
    const [rows] = await currentPool.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [Number(limit), Number(offset)]);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, total };
  } catch (err) {
    console.error("[MySQL] Error querying table data:", err);
    return { columns: [], rows: [], total: 0 };
  }
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
var DATA_FILE = path3.resolve(process.cwd(), "data.json");
var projects = [];
var tables = [];
var records = [];
var nextIdCounters = {};
function getNextRecordId(tableId) {
  if (!nextIdCounters[tableId]) {
    const tableRecords = records.filter((r) => r.tableId === tableId);
    let maxId = 0;
    for (const r of tableRecords) {
      const num = typeof r.id === "number" ? r.id : parseInt(String(r.id), 10);
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
  const proj1Id = "proj-sekolah";
  const proj2Id = "proj-toko";
  const defaultProjects = [
    {
      id: proj1Id,
      name: "Database Sistem Sekolah",
      description: "Pusat data siswa, guru, dan administrasi akademik sekolah dengan akses REST API",
      token: "sb_live_sekolah_9823471029384721",
      color: "indigo",
      icon: "GraduationCap",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: proj2Id,
      name: "Database Toko Online & Produk",
      description: "Katalog produk e-commerce, stok gudang, dan riwayat transaksi pesanan",
      token: "sb_live_toko_4918237491029384",
      color: "emerald",
      icon: "Store",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  const defaultTables = [
    {
      id: "tbl-siswa",
      projectId: proj1Id,
      name: "Data Siswa",
      slug: "siswa",
      description: "Daftar biodata siswa aktif dan status akademik",
      primaryKey: "id",
      fields: [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        { key: "nis", label: "NIS", type: "text", required: true },
        { key: "nama", label: "Nama Siswa", type: "text", required: true },
        { key: "kelas", label: "Kelas", type: "select", required: true, options: ["X RPL 1", "XI RPL 1", "XII RPL 1", "XII TKJ 2"] },
        { key: "jurusan", label: "Jurusan", type: "text", required: false },
        { key: "email", label: "Email", type: "email", required: false },
        { key: "status", label: "Status", type: "select", required: true, options: ["Aktif", "Lulus", "Cuti"] }
      ],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "tbl-guru",
      projectId: proj1Id,
      name: "Data Guru",
      slug: "guru",
      description: "Tenaga pengajar dan pengampu mata pelajaran",
      primaryKey: "id",
      fields: [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        { key: "nip", label: "NIP", type: "text", required: true },
        { key: "nama", label: "Nama Guru", type: "text", required: true },
        { key: "mata_pelajaran", label: "Mata Pelajaran", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: false },
        { key: "status", label: "Status", type: "select", required: true, options: ["Aktif", "Cuti"] }
      ],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "tbl-produk",
      projectId: proj2Id,
      name: "Katalog Produk",
      slug: "produk",
      description: "Master data barang dan stok ketersediaan",
      primaryKey: "id",
      fields: [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        { key: "sku", label: "Kode SKU", type: "text", required: true },
        { key: "nama_produk", label: "Nama Produk", type: "text", required: true },
        { key: "kategori", label: "Kategori", type: "select", required: true, options: ["Elektronik", "Pakaian", "Aksesoris", "Buku"] },
        { key: "harga", label: "Harga (Rp)", type: "number", required: true },
        { key: "stok", label: "Stok Barang", type: "number", required: true },
        { key: "status", label: "Status Stok", type: "select", required: true, options: ["Tersedia", "Habis", "Preorder"] }
      ],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "tbl-pesanan",
      projectId: proj2Id,
      name: "Data Pesanan",
      slug: "pesanan",
      description: "Catatan order masuk dari aplikasi luar atau web",
      primaryKey: "id",
      fields: [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        { key: "nomor_resi", label: "No. Pesanan", type: "text", required: true },
        { key: "pelanggan", label: "Nama Pelanggan", type: "text", required: true },
        { key: "total_bayar", label: "Total Bayar (Rp)", type: "number", required: true },
        { key: "metode", label: "Metode Bayar", type: "select", required: true, options: ["Transfer Bank", "QRIS", "COD", "E-Wallet"] },
        { key: "status", label: "Status Pesanan", type: "select", required: true, options: ["Dibayar", "Diproses", "Dikirim", "Selesai"] }
      ],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  const defaultRecords = [
    // Siswa records
    {
      id: 1,
      tableId: "tbl-siswa",
      projectId: proj1Id,
      data: { id: 1, nis: "202401", nama: "Ahmad Faisal", kelas: "XII RPL 1", jurusan: "Rekayasa Perangkat Lunak", email: "ahmad@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 2,
      tableId: "tbl-siswa",
      projectId: proj1Id,
      data: { id: 2, nis: "202402", nama: "Siti Rahmawati", kelas: "XII RPL 1", jurusan: "Rekayasa Perangkat Lunak", email: "siti@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 3,
      tableId: "tbl-siswa",
      projectId: proj1Id,
      data: { id: 3, nis: "202403", nama: "Budi Kurniawan", kelas: "XII TKJ 2", jurusan: "Teknik Komputer Jaringan", email: "budi@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 4,
      tableId: "tbl-siswa",
      projectId: proj1Id,
      data: { id: 4, nis: "202404", nama: "Dewi Lestari", kelas: "XI RPL 1", jurusan: "Rekayasa Perangkat Lunak", email: "dewi@sekolah.sch.id", status: "Cuti" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    // Guru records
    {
      id: 1,
      tableId: "tbl-guru",
      projectId: proj1Id,
      data: { id: 1, nip: "198501012010", nama: "Ir. Bambang Sugiarto, M.Kom", mata_pelajaran: "Pemrograman Web & REST API", email: "bambang@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 2,
      tableId: "tbl-guru",
      projectId: proj1Id,
      data: { id: 2, nip: "199003152015", nama: "Nurul Hidayah, S.Pd", mata_pelajaran: "Basis Data & SQL", email: "nurul@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    // Produk records
    {
      id: 1,
      tableId: "tbl-produk",
      projectId: proj2Id,
      data: { id: 1, sku: "PRD-001", nama_produk: 'Laptop Pro Creator 15"', kategori: "Elektronik", harga: 165e5, stok: 14, status: "Tersedia" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 2,
      tableId: "tbl-produk",
      projectId: proj2Id,
      data: { id: 2, sku: "PRD-002", nama_produk: "Mouse Wireless Ergonomic", kategori: "Aksesoris", harga: 35e4, stok: 48, status: "Tersedia" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 3,
      tableId: "tbl-produk",
      projectId: proj2Id,
      data: { id: 3, sku: "PRD-003", nama_produk: "Keyboard Mechanical RGB", kategori: "Elektronik", harga: 85e4, stok: 0, status: "Habis" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    // Pesanan records
    {
      id: 1,
      tableId: "tbl-pesanan",
      projectId: proj2Id,
      data: { id: 1, nomor_resi: "INV-2026-0091", pelanggan: "Hendro Wijaya", total_bayar: 1685e4, metode: "Transfer Bank", status: "Dikirim" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 2,
      tableId: "tbl-pesanan",
      projectId: proj2Id,
      data: { id: 2, nomor_resi: "INV-2026-0092", pelanggan: "Anisa Putri", total_bayar: 35e4, metode: "QRIS", status: "Selesai" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  projects = defaultProjects;
  tables = defaultTables;
  records = defaultRecords;
  nextIdCounters = {
    "tbl-siswa": 5,
    "tbl-guru": 3,
    "tbl-produk": 4,
    "tbl-pesanan": 3
  };
  saveDataToFile();
}
function loadDataFromFile() {
  try {
    if (fs3.existsSync(DATA_FILE)) {
      const content = fs3.readFileSync(DATA_FILE, "utf-8");
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
    console.error("[Database] Error reading data.json, re-seeding:", err);
  }
  seedDefaultDatabase();
}
function saveDataToFile() {
  try {
    const data = {
      projects,
      tables,
      records,
      users: getAllUsers(),
      nextIdCounters
    };
    fs3.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Database] Failed to write data.json:", err);
  }
}
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  loadDataFromFile();
  const envDbConfig = getEnvDbConfig();
  if (envDbConfig.enabled) {
    console.log("[MySQL] Membaca konfigurasi dari Environment Variables (.env). Menghubungkan ke online database...");
    try {
      const res = await connectMySQL(envDbConfig);
      if (res.success) {
        console.log("[MySQL] Berhasil terhubung ke database online!");
        try {
          const mysqlData = await loadDataFromMySQL();
          if (mysqlData.projects.length > 0) {
            projects = mysqlData.projects;
            tables = mysqlData.tables;
            records = mysqlData.records;
            console.log(`[MySQL] Memuat ${projects.length} project, ${tables.length} tabel, ${records.length} records dari MySQL.`);
          } else {
            console.log("[MySQL] Database MySQL kosong. Mengunggah data lokal ke MySQL...");
            await syncAllToMySQL(projects, tables, records);
          }
          const mysqlUsers = await loadUsersFromMySQL();
          if (mysqlUsers.length > 0) {
            setAllUsers(mysqlUsers);
            console.log(`[MySQL] Memuat ${mysqlUsers.length} pengguna dari MySQL.`);
          } else {
            console.log("[MySQL] Mengunggah akun pengguna ke MySQL...");
            await syncAllUsersToMySQL(getAllUsers());
          }
          await syncMailConfigWithMySQL();
        } catch (syncErr) {
          console.error("[MySQL] Gagal inisialisasi data dari MySQL:", syncErr);
        }
      } else {
        console.error("[MySQL] Belum dapat terhubung ke MySQL online dari .env:", res.error);
      }
    } catch (err) {
      console.error("[MySQL] Gagal inisialisasi koneksi:", err);
    }
  } else {
    console.log("[Database] Tidak ada konfigurasi MySQL di .env. Menggunakan mode penyimpanan lokal (data.json).");
  }
  startAutoReconnectLoop();
  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });
  app.get("/api/db/status", async (req, res) => {
    try {
      const status = await getMySQLStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/db/config", (req, res) => {
    res.json(getSafeDbConfig());
  });
  app.post("/api/db/test-env", async (req, res) => {
    try {
      const result = await testEnvConnection();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/test", async (req, res) => {
    try {
      const result = await testEnvConnection();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post(["/api/db/reconnect-env", "/api/db/reconnect"], async (req, res) => {
    try {
      const envCfg = getEnvDbConfig();
      if (!envCfg.enabled) {
        return res.status(400).json({
          success: false,
          error: "Variabel lingkungan database belum diatur di file .env atau hosting environment."
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
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/connect", async (req, res) => {
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
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/disconnect", async (req, res) => {
    try {
      const result = await disconnectMySQL();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/sync-to-mysql", async (req, res) => {
    try {
      const result = await syncAllToMySQL(projects, tables, records);
      await syncMailConfigWithMySQL();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/sync-from-mysql", async (req, res) => {
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
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/db/schema-sql", (req, res) => {
    res.type("text/plain").send(getSchemaSQLContent());
  });
  app.get("/api/db/tables-list", async (req, res) => {
    try {
      const tablesList = await getDatabaseTablesList();
      res.json({ success: true, tables: tablesList });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message, tables: [] });
    }
  });
  app.get("/api/db/table-rows", async (req, res) => {
    try {
      const tableName = String(req.query.table || "");
      const page = parseInt(String(req.query.page || "1"), 10) || 1;
      const limit = parseInt(String(req.query.limit || "10"), 10) || 10;
      const data = await getTableDataPaginated(tableName, page, limit);
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message, columns: [], rows: [], total: 0 });
    }
  });
  const getAuthUserFromRequest = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return verifyJwtToken(parts[1]);
    }
    return null;
  };
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body || {};
      const appUrl = `${req.protocol}://${req.get("host")}`;
      const result = await registerUser(name, email, password, appUrl);
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const created = all.find((u) => u.id === result.user.id);
        if (created) {
          mysqlUpsertUser(created);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const result = await loginUser(email, password);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { email, code, token } = req.body || {};
      const result = await verifyUserEmail({ email, code, token });
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find((u) => u.id === result.user.id);
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { email } = req.body || {};
      const appUrl = `${req.protocol}://${req.get("host")}`;
      const result = await resendVerificationCode(email, appUrl);
      if (result.success) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find((u) => u.email === (email || "").toLowerCase().trim());
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body || {};
      const appUrl = `${req.protocol}://${req.get("host")}`;
      const result = await requestPasswordReset(email, appUrl);
      if (result.success) {
        saveDataToFile();
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code, token } = req.body || {};
      const result = await verifyResetCode({ email, code, token });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, token, newPassword } = req.body || {};
      const result = await resetPasswordWithCodeOrToken({ email, code, token, newPassword });
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find((u) => u.id === result.user.id);
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.get("/api/auth/verify-reset-token", (req, res) => {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ valid: false, message: "Token tidak disediakan." });
    }
    const user = getAllUsers().find((u) => u.resetPasswordToken === token);
    if (!user) {
      return res.status(404).json({ valid: false, message: "Token reset kata sandi tidak ditemukan atau sudah digunakan." });
    }
    if (user.resetPasswordExpiresAt && Date.now() > new Date(user.resetPasswordExpiresAt).getTime()) {
      return res.status(410).json({ valid: false, message: "Token reset kata sandi telah kedaluwarsa." });
    }
    res.json({
      valid: true,
      email: user.email,
      name: user.name
    });
  });
  app.get("/api/auth/me", (req, res) => {
    const payload = getAuthUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }
    const user = getAllUsers().find((u) => u.id === payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      user: toSafeUser(user)
    });
  });
  app.put("/api/auth/profile", async (req, res) => {
    try {
      const payload = getAuthUserFromRequest(req);
      if (!payload) {
        return res.status(401).json({ success: false, message: "Sesi Anda telah berakhir. Silakan login kembali." });
      }
      const { name, oldPassword, newPassword } = req.body || {};
      const result = await updateUserProfile(payload.userId, name, oldPassword, newPassword);
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find((u) => u.id === payload.userId);
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
  });
  app.get("/api/users", (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (authUser && authUser.role !== "superadmin" && authUser.role !== "admin") {
      return res.status(403).json({ error: "Akses ditolak: Hanya Admin dan Superadmin yang dapat mengelola pengguna." });
    }
    const safeUsers = getAllUsers().map(toSafeUser);
    res.json(safeUsers);
  });
  app.put("/api/users/:id/role", (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !["superadmin", "admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Role tidak valid" });
    }
    if (authUser && authUser.role !== "superadmin") {
      if (role === "superadmin") {
        return res.status(403).json({ error: "Hanya Superadmin yang dapat menunjuk Superadmin lain." });
      }
      if (authUser.role !== "admin") {
        return res.status(403).json({ error: "Akses ditolak." });
      }
    }
    const all = getAllUsers();
    const user = all.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    user.role = role;
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertUser(user);
    res.json({ success: true, user: toSafeUser(user) });
  });
  app.put("/api/users/:id/status", (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const all = getAllUsers();
    const user = all.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    user.isActive = Boolean(isActive);
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertUser(user);
    res.json({ success: true, user: toSafeUser(user) });
  });
  app.post("/api/users/:id/verify-manual", (req, res) => {
    const { id } = req.params;
    const all = getAllUsers();
    const user = all.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    user.isVerified = true;
    user.verificationCode = void 0;
    user.verificationToken = void 0;
    user.verificationExpiresAt = void 0;
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertUser(user);
    res.json({ success: true, message: `Akun ${user.name} berhasil diverifikasi manual.`, user: toSafeUser(user) });
  });
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUserFromRequest(req);
      const all = getAllUsers();
      const targetUser = all.find((u) => u.id === id);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: "Pengguna tidak ditemukan." });
      }
      if (authUser) {
        if (authUser.userId === id) {
          return res.status(400).json({ success: false, error: "Anda tidak dapat menghapus akun Anda sendiri saat sedang login." });
        }
        if (authUser.role === "admin" && targetUser.role === "superadmin") {
          return res.status(403).json({ success: false, error: "Admin tidak memiliki izin untuk menghapus akun Superadmin." });
        }
        if (authUser.role === "user") {
          return res.status(403).json({ success: false, error: "User biasa tidak memiliki izin untuk mengelola atau menghapus akun." });
        }
      }
      if (targetUser.role === "superadmin") {
        const superCount = all.filter((u) => u.role === "superadmin").length;
        if (superCount <= 1) {
          return res.status(400).json({ success: false, error: "Tidak dapat menghapus satu-satunya akun Superadmin utama." });
        }
      }
      const filtered = all.filter((u) => u.id !== id);
      setAllUsers(filtered);
      saveDataToFile();
      await mysqlDeleteUser(id);
      console.log(`[Users] Akun pengguna "${targetUser.name}" (${targetUser.email}, ${targetUser.role}) berhasil dihapus.`);
      res.json({ success: true, message: `Akun pengguna "${targetUser.name}" (${targetUser.email}) berhasil dihapus.` });
    } catch (err) {
      console.error("[Users] Gagal menghapus pengguna:", err);
      res.status(500).json({ success: false, error: err.message || "Gagal menghapus pengguna." });
    }
  });
  app.get("/api/mail/config", (req, res) => {
    res.json(getSafeMailConfig());
  });
  app.post("/api/mail/accounts", (req, res) => {
    try {
      const { name, gmailUser, gmailAppPassword, fromName, host, port, secure, isActive } = req.body || {};
      if (!gmailUser || !gmailAppPassword) {
        return res.status(400).json({ error: "Alamat Gmail dan Sandi Aplikasi (16-karakter) wajib diisi." });
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
      res.json({ success: true, message: "Akun Gmail SMTP berhasil ditambahkan.", account: acc, config: getSafeMailConfig() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.put("/api/mail/accounts/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, gmailUser, gmailAppPassword, fromName, host, port, secure, isActive, order } = req.body || {};
      const updated = updateSmtpAccount(id, {
        name,
        gmailUser,
        gmailAppPassword,
        fromName,
        host,
        port: port ? parseInt(port, 10) : void 0,
        secure,
        isActive,
        order
      });
      if (!updated) {
        return res.status(404).json({ error: "Akun SMTP tidak ditemukan." });
      }
      res.json({ success: true, message: "Akun Gmail SMTP berhasil diperbarui.", config: getSafeMailConfig() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.delete("/api/mail/accounts/:id", (req, res) => {
    try {
      const { id } = req.params;
      const deleted = deleteSmtpAccount(id);
      if (!deleted) {
        return res.status(404).json({ error: "Akun SMTP tidak ditemukan." });
      }
      res.json({ success: true, message: "Akun Gmail SMTP berhasil dihapus.", config: getSafeMailConfig() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/mail/reorder", (req, res) => {
    try {
      const { ids } = req.body || {};
      if (Array.isArray(ids)) {
        reorderSmtpAccounts(ids);
      }
      res.json({ success: true, config: getSafeMailConfig() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/mail/accounts/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const { testEmail } = req.body || {};
      const result = await testSingleSmtpAccount(id, testEmail);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/mail/test-all", async (req, res) => {
    try {
      const { testEmail } = req.body || {};
      if (!testEmail) {
        return res.status(400).json({ error: "Email penerima uji coba wajib diisi." });
      }
      const subject = `[Uji Failover Pool] Tes Kirim Server DataForge (${(/* @__PURE__ */ new Date()).toLocaleTimeString("id-ID")})`;
      const text = `Halo,

Ini adalah pengujian failover multi-akun SMTP Gmail DataForge API Studio.
Email berhasil dikirim!

Waktu: ${(/* @__PURE__ */ new Date()).toLocaleString("id-ID")}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h3 style="color: #4f46e5; margin-top: 0;">Pengujian Failover Pool Berhasil!</h3>
          <p style="color: #334155; font-size: 13px;">Email ini dikirimkan melalui pengujian pool multi-SMTP Gmail.</p>
          <p style="color: #64748b; font-size: 11px;">Waktu: ${(/* @__PURE__ */ new Date()).toLocaleString("id-ID")}</p>
        </div>
      `;
      const result = await sendEmailWithFailover({ toEmail: testEmail, subject, text, html });
      res.json({
        success: result.sent,
        accountUsed: result.accountUsed,
        attempts: result.attempts,
        message: result.sent ? `Sukses terkirim menggunakan ${result.accountUsed}!` : "Gagal mengirim email: Seluruh akun SMTP dalam pool mengalami kegagalan."
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.get("/api/projects", (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.json([]);
    }
    if (authUser.role === "superadmin" || authUser.role === "admin") {
      return res.json(projects);
    }
    const userProjects = projects.filter((p) => p.ownerId === authUser.userId);
    res.json(userProjects);
  });
  app.post("/api/projects", (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const { name, description, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Nama database wajib diisi" });
    }
    const newProject = {
      id: `proj-${Date.now()}`,
      ownerId: authUser ? authUser.userId : "usr-superadmin",
      ownerEmail: authUser ? authUser.email : "superadmin@dataforge.io",
      name: name.trim(),
      description: description ? description.trim() : "",
      token: `sb_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      color: color || "indigo",
      icon: icon || "Database",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    projects.unshift(newProject);
    saveDataToFile();
    mysqlUpsertProject(newProject);
    res.json(newProject);
  });
  app.put("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    const { name, description, color, icon } = req.body;
    const project = projects.find((p) => p.id === id);
    if (!project) return res.status(404).json({ error: "Database not found" });
    if (name) project.name = name.trim();
    if (description !== void 0) project.description = description.trim();
    if (color) project.color = color;
    if (icon) project.icon = icon;
    project.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertProject(project);
    res.json(project);
  });
  app.delete("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    projects = projects.filter((p) => p.id !== id);
    const removedTableIds = tables.filter((t) => t.projectId === id).map((t) => t.id);
    tables = tables.filter((t) => t.projectId !== id);
    records = records.filter((r) => !removedTableIds.includes(r.tableId));
    saveDataToFile();
    mysqlDeleteProject(id);
    res.json({ success: true, message: "Database and its tables deleted" });
  });
  const handleRefreshProjectToken = (req, res) => {
    const { id } = req.params;
    const project = projects.find((p) => p.id === id);
    if (!project) return res.status(404).json({ error: "Database tidak ditemukan" });
    const oldToken = project.token;
    project.token = `sb_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    project.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
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
  app.post("/api/projects/:id/regenerate-token", handleRefreshProjectToken);
  app.post("/api/projects/:id/refresh-token", handleRefreshProjectToken);
  app.get("/api/projects/:projectId/tables", (req, res) => {
    const { projectId } = req.params;
    const projectTables = tables.filter((t) => t.projectId === projectId);
    res.json(projectTables);
  });
  app.post("/api/projects/:projectId/tables", (req, res) => {
    const { projectId } = req.params;
    const { name, slug, description, fields, apiVisibleFields, apiSearchableFields } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Table name is required" });
    }
    const cleanSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "");
    const exists = tables.some((t) => t.projectId === projectId && t.slug === cleanSlug);
    if (exists) {
      return res.status(400).json({ error: `Table with slug "${cleanSlug}" already exists in this database` });
    }
    let tableFields = Array.isArray(fields) && fields.length > 0 ? fields : [];
    if (!tableFields.some((f) => f.key === "id" || f.isPrimaryKey)) {
      tableFields = [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        ...tableFields
      ];
    } else {
      tableFields = tableFields.map((f) => f.key === "id" ? { ...f, isPrimaryKey: true, required: true } : f);
    }
    const newTable = {
      id: `tbl-${Date.now()}`,
      projectId,
      name: name.trim(),
      slug: cleanSlug,
      description: description ? description.trim() : "",
      primaryKey: "id",
      fields: tableFields,
      apiVisibleFields: Array.isArray(apiVisibleFields) ? apiVisibleFields : [],
      apiSearchableFields: Array.isArray(apiSearchableFields) ? apiSearchableFields : [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    tables.push(newTable);
    saveDataToFile();
    mysqlUpsertTable(newTable);
    res.json(newTable);
  });
  app.put("/api/projects/:projectId/tables/:tableId", (req, res) => {
    const { projectId, tableId } = req.params;
    const { name, slug, description, fields, apiVisibleFields, apiSearchableFields } = req.body;
    const table = tables.find((t) => t.id === tableId && t.projectId === projectId);
    if (!table) return res.status(404).json({ error: "Table not found" });
    if (name) table.name = name.trim();
    if (description !== void 0) table.description = description.trim();
    if (slug) {
      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
      const collision = tables.some((t) => t.projectId === projectId && t.id !== tableId && t.slug === cleanSlug);
      if (collision) return res.status(400).json({ error: "Table slug already in use" });
      table.slug = cleanSlug;
    }
    if (Array.isArray(fields)) {
      let updatedFields = [...fields];
      if (!updatedFields.some((f) => f.key === "id" || f.isPrimaryKey)) {
        updatedFields.unshift({ key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true });
      }
      table.fields = updatedFields;
    }
    if (apiVisibleFields !== void 0) {
      table.apiVisibleFields = Array.isArray(apiVisibleFields) ? apiVisibleFields : [];
    }
    if (apiSearchableFields !== void 0) {
      table.apiSearchableFields = Array.isArray(apiSearchableFields) ? apiSearchableFields : [];
    }
    table.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertTable(table);
    res.json(table);
  });
  app.delete("/api/projects/:projectId/tables/:tableId", (req, res) => {
    const { projectId, tableId } = req.params;
    tables = tables.filter((t) => !(t.id === tableId && t.projectId === projectId));
    records = records.filter((r) => r.tableId !== tableId);
    saveDataToFile();
    mysqlDeleteTable(tableId);
    res.json({ success: true, message: "Table and its records deleted" });
  });
  app.post("/api/projects/:projectId/tables/:tableId/refresh-token", (req, res) => {
    const { projectId, tableId } = req.params;
    const table = tables.find((t) => t.id === tableId && t.projectId === projectId);
    if (!table) return res.status(404).json({ error: "Tabel tidak ditemukan" });
    const oldToken = table.token;
    table.token = `sb_tbl_${table.slug}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    table.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
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
  app.delete("/api/projects/:projectId/tables/:tableId/token", (req, res) => {
    const { projectId, tableId } = req.params;
    const table = tables.find((t) => t.id === tableId && t.projectId === projectId);
    if (!table) return res.status(404).json({ error: "Tabel tidak ditemukan" });
    delete table.token;
    table.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertTable(table);
    res.json({
      success: true,
      message: `Token khusus tabel "${table.name}" dicabut. Tabel kini kembali menggunakan Token Master Database.`,
      table
    });
  });
  function validateSelectFieldValues(table, payload) {
    if (!table || !table.fields) return null;
    for (const field of table.fields) {
      if (field.type === "select" && Array.isArray(field.options) && field.options.length > 0) {
        const val = payload[field.key];
        if (val !== void 0 && val !== null && String(val).trim() !== "") {
          const strVal = String(val).trim();
          const exists = field.options.some((opt) => String(opt).trim() === strVal);
          if (!exists) {
            const allowedOpts = field.options.map((o) => `'${o}'`).join(", ");
            return `Nilai '${strVal}' pada kolom '${field.label}' (${field.key}) tidak valid (harus sama persis termasuk huruf besar/kecil). Opsi yang diperbolehkan hanya: [${allowedOpts}]`;
          }
        }
      }
    }
    return null;
  }
  app.get("/api/projects/:projectId/tables/:tableId/records", (req, res) => {
    const { projectId, tableId } = req.params;
    const { search, sort, order } = req.query;
    let tableRecords = records.filter((r) => r.projectId === projectId && r.tableId === tableId);
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      tableRecords = tableRecords.filter((r) => {
        if (String(r.id).toLowerCase().includes(q)) return true;
        return Object.values(r.data).some((val) => String(val || "").toLowerCase().includes(q));
      });
    }
    if (sort && typeof sort === "string") {
      tableRecords.sort((a, b) => {
        const valA = sort === "id" ? a.id : a.data[sort];
        const valB = sort === "id" ? b.id : b.data[sort];
        if (valA === valB) return 0;
        const result = valA > valB ? 1 : -1;
        return order === "desc" ? -result : result;
      });
    } else {
      tableRecords.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    }
    res.json(tableRecords);
  });
  app.post("/api/projects/:projectId/tables/:tableId/records", (req, res) => {
    const { projectId, tableId } = req.params;
    const inputData = req.body || {};
    const table = tables.find((t) => t.id === tableId && t.projectId === projectId);
    if (!table) return res.status(404).json({ error: "Table not found" });
    const selectError = validateSelectFieldValues(table, inputData);
    if (selectError) {
      return res.status(400).json({ error: selectError });
    }
    const primaryKeyId = getNextRecordId(tableId);
    const recordData = {
      ...inputData,
      id: primaryKeyId
    };
    const newRecord = {
      id: primaryKeyId,
      tableId,
      projectId,
      data: recordData,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    records.push(newRecord);
    saveDataToFile();
    mysqlUpsertRecord(newRecord);
    res.status(201).json(newRecord);
  });
  app.put("/api/projects/:projectId/tables/:tableId/records/:recordId", (req, res) => {
    const { projectId, tableId, recordId } = req.params;
    const inputData = req.body || {};
    const record = records.find(
      (r) => r.projectId === projectId && r.tableId === tableId && String(r.id) === String(recordId)
    );
    if (!record) return res.status(404).json({ error: "Record not found" });
    const table = tables.find((t) => t.id === tableId && t.projectId === projectId);
    if (table) {
      const selectError = validateSelectFieldValues(table, inputData);
      if (selectError) {
        return res.status(400).json({ error: selectError });
      }
    }
    record.data = {
      ...record.data,
      ...inputData,
      id: record.id
    };
    record.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertRecord(record);
    res.json(record);
  });
  app.delete("/api/projects/:projectId/tables/:tableId/records/:recordId", (req, res) => {
    const { projectId, tableId, recordId } = req.params;
    records = records.filter(
      (r) => !(r.projectId === projectId && r.tableId === tableId && String(r.id) === String(recordId))
    );
    saveDataToFile();
    mysqlDeleteRecord(tableId, recordId);
    res.json({ success: true, message: "Record deleted" });
  });
  const authenticateToken = (req, res, next) => {
    let token;
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      if (authHeader.startsWith("Bearer ") || authHeader.startsWith("bearer ")) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }
    if (!token && req.headers["x-api-key"]) {
      token = String(req.headers["x-api-key"]).trim();
    }
    if (!token && req.headers["x-token"]) {
      token = String(req.headers["x-token"]).trim();
    }
    if (!token && req.params.token && (String(req.params.token).startsWith("sb_live_") || String(req.params.token).startsWith("sb_tbl_"))) {
      token = String(req.params.token).trim();
    }
    if (!token && req.params.param1 && (String(req.params.param1).startsWith("sb_live_") || String(req.params.param1).startsWith("sb_tbl_"))) {
      token = String(req.params.param1).trim();
    }
    if (!token && (req.query.token || req.query.api_key)) {
      token = String(req.query.token || req.query.api_key).trim();
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: API Token tidak ditemukan.",
        hint: 'Kirim token aman via Header "Authorization: Bearer <API_TOKEN>" atau "X-API-Key: <API_TOKEN>". Hindari menaruh token di URL agar tidak terekam log jaringan WiFi / proxy.'
      });
    }
    const proj = projects.find((p) => p.token === token);
    const tableWithToken = tables.find((t) => t.token === token);
    if (!proj && !tableWithToken) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: API Token tidak valid atau telah dicabut (di-refresh)."
      });
    }
    if (proj) {
      req.project = proj;
      req.isMasterToken = true;
    } else if (tableWithToken) {
      const parentProj = projects.find((p) => p.id === tableWithToken.projectId);
      if (!parentProj) {
        return res.status(404).json({ success: false, error: "Database induk tabel tidak ditemukan" });
      }
      req.project = parentProj;
      req.scopedTable = tableWithToken;
      req.isTableToken = true;
    }
    next();
  };
  const resolveTarget = (req) => {
    let tableSlug = req.params.tableSlug;
    let id = req.params.id || req.body?.id || req.query?.id;
    if (!tableSlug && req.params.param1) {
      if (String(req.params.param1).startsWith("sb_live_") || String(req.params.param1).startsWith("sb_tbl_")) {
        tableSlug = req.params.param2;
        if (!id && req.params.param3) id = req.params.param3;
      } else {
        tableSlug = req.params.param1;
        if (!id && req.params.param2) id = req.params.param2;
      }
    }
    return {
      tableSlug: tableSlug ? String(tableSlug).trim() : "",
      id: id !== void 0 && id !== null ? String(id).trim() : ""
    };
  };
  const handleGetSchema = (req, res) => {
    const proj = req.project;
    let projTables = tables.filter((t) => t.projectId === proj.id);
    if (req.scopedTable) {
      projTables = projTables.filter((t) => t.id === req.scopedTable.id);
    }
    res.json({
      success: true,
      database: {
        id: proj.id,
        name: proj.name,
        description: proj.description,
        totalTables: projTables.length,
        tokenScope: req.scopedTable ? `Tabel Khusus: ${req.scopedTable.name}` : "Master Database Token",
        security: {
          recommendedAuth: 'Header "Authorization: Bearer <API_TOKEN>" (Paling Aman)',
          alternativeAuth: 'Header "X-API-Key: <API_TOKEN>"'
        },
        tables: projTables.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          primaryKey: t.primaryKey || "id",
          cleanEndpoint: `/api/v1/${t.slug}`,
          legacyEndpoint: `/api/v1/${t.token || proj.token}/${t.slug}`,
          hasDedicatedToken: !!t.token,
          fields: t.fields,
          totalRecords: records.filter((r) => r.tableId === t.id).length
        }))
      }
    });
  };
  const handleGetTableOrItem = (req, res) => {
    const proj = req.project;
    const { tableSlug, id } = resolveTarget(req);
    if (!tableSlug) {
      return res.status(400).json({ success: false, error: "Nama tabel (slug) wajib disertakan" });
    }
    const table = tables.find((t) => t.projectId === proj.id && t.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({
        success: false,
        error: `Tabel "${tableSlug}" tidak ditemukan di database "${proj.name}"`
      });
    }
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan mengakses tabel "${tableSlug}".`
      });
    }
    if (id) {
      const record = records.find((r) => r.tableId === table.id && String(r.id) === String(id));
      if (!record) {
        return res.status(404).json({
          success: false,
          error: `Record dengan primary key #${id} tidak ditemukan di tabel "${tableSlug}"`
        });
      }
      let filteredData = { ...record.data };
      if (Array.isArray(table.apiVisibleFields) && table.apiVisibleFields.length > 0) {
        const allowed = /* @__PURE__ */ new Set(["id", ...table.apiVisibleFields]);
        const cleaned = {};
        Object.keys(filteredData).forEach((k) => {
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
    let tableRecords = records.filter((r) => r.tableId === table.id);
    const { search, limit, offset, sort, order, ...fieldFilters } = req.query;
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      const searchable = Array.isArray(table.apiSearchableFields) && table.apiSearchableFields.length > 0 ? table.apiSearchableFields : null;
      tableRecords = tableRecords.filter((r) => {
        if (String(r.id).toLowerCase().includes(q)) return true;
        if (searchable) {
          return searchable.some((fieldKey) => {
            const val = r.data[fieldKey];
            return String(val || "").toLowerCase().includes(q);
          });
        } else {
          return Object.values(r.data).some((v) => String(v || "").toLowerCase().includes(q));
        }
      });
    }
    Object.entries(fieldFilters).forEach(([filterKey, filterVal]) => {
      if (filterVal !== void 0) {
        tableRecords = tableRecords.filter((r) => {
          const val = r.data[filterKey];
          return String(val).toLowerCase() === String(filterVal).toLowerCase();
        });
      }
    });
    if (sort && typeof sort === "string") {
      tableRecords.sort((a, b) => {
        const valA = sort === "id" ? a.id : a.data[sort];
        const valB = sort === "id" ? b.id : b.data[sort];
        if (valA === valB) return 0;
        const result = valA > valB ? 1 : -1;
        return order === "desc" ? -result : result;
      });
    } else {
      tableRecords.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    }
    const total = tableRecords.length;
    const numLimit = limit ? parseInt(String(limit), 10) : void 0;
    const numOffset = offset ? parseInt(String(offset), 10) : 0;
    if (numLimit && !isNaN(numLimit)) {
      tableRecords = tableRecords.slice(numOffset, numOffset + numLimit);
    }
    const data = tableRecords.map((r) => {
      let itemData = { ...r.data };
      if (Array.isArray(table.apiVisibleFields) && table.apiVisibleFields.length > 0) {
        const allowed = /* @__PURE__ */ new Set(["id", ...table.apiVisibleFields]);
        const cleaned = {};
        Object.keys(itemData).forEach((k) => {
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
      primaryKey: table.primaryKey || "id",
      total,
      count: data.length,
      data
    });
  };
  const handlePostRecord = (req, res) => {
    const proj = req.project;
    const { tableSlug } = resolveTarget(req);
    if (!tableSlug) {
      return res.status(400).json({ success: false, error: "Nama tabel (slug) wajib disertakan" });
    }
    let payload = req.body || {};
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({ success: false, error: "Format JSON body tidak valid" });
      }
    }
    const table = tables.find((t) => t.projectId === proj.id && t.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({ success: false, error: `Tabel "${tableSlug}" tidak ditemukan` });
    }
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan membuat data di tabel "${tableSlug}".`
      });
    }
    const missingFields = [];
    table.fields.forEach((f) => {
      if (f.required && !f.isPrimaryKey && f.key !== "id" && (payload[f.key] === void 0 || payload[f.key] === null || payload[f.key] === "")) {
        missingFields.push(f.key);
      }
    });
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Kolom wajib diisi belum lengkap: ${missingFields.join(", ")}`
      });
    }
    const selectError = validateSelectFieldValues(table, payload);
    if (selectError) {
      return res.status(400).json({
        success: false,
        error: selectError
      });
    }
    const primaryKeyId = getNextRecordId(table.id);
    const recordData = {
      ...payload,
      id: primaryKeyId
    };
    const newRecord = {
      id: primaryKeyId,
      tableId: table.id,
      projectId: proj.id,
      data: recordData,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
  const handlePutRecord = (req, res) => {
    const proj = req.project;
    const { tableSlug, id: targetId } = resolveTarget(req);
    if (!tableSlug) {
      return res.status(400).json({ success: false, error: "Nama tabel (slug) wajib disertakan" });
    }
    let payload = req.body || {};
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({ success: false, error: "Format JSON body tidak valid" });
      }
    }
    const table = tables.find((t) => t.projectId === proj.id && t.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({ success: false, error: `Tabel "${tableSlug}" tidak ditemukan` });
    }
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
    const record = records.find((r) => r.tableId === table.id && String(r.id) === String(targetId));
    if (!record) {
      return res.status(404).json({
        success: false,
        error: `Record dengan primary key #${targetId} tidak ditemukan di tabel "${tableSlug}"`
      });
    }
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
    record.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
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
  const handleDeleteRecord = (req, res) => {
    const proj = req.project;
    const { tableSlug, id: targetId } = resolveTarget(req);
    if (!tableSlug) {
      return res.status(400).json({ success: false, error: "Nama tabel (slug) wajib disertakan" });
    }
    const table = tables.find((t) => t.projectId === proj.id && t.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({ success: false, error: `Tabel "${tableSlug}" tidak ditemukan` });
    }
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
    const index = records.findIndex((r) => r.tableId === table.id && String(r.id) === String(targetId));
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
  app.get("/api/v1/schema", authenticateToken, handleGetSchema);
  app.get("/api/v1/:param1/schema", authenticateToken, handleGetSchema);
  app.get("/api/v1/:param1", authenticateToken, handleGetTableOrItem);
  app.get("/api/v1/:param1/:param2", authenticateToken, handleGetTableOrItem);
  app.get("/api/v1/:param1/:param2/:param3", authenticateToken, handleGetTableOrItem);
  app.post("/api/v1/:param1", authenticateToken, handlePostRecord);
  app.post("/api/v1/:param1/:param2", authenticateToken, handlePostRecord);
  app.post("/api/v1/:param1/:param2/:param3", authenticateToken, handlePostRecord);
  app.put("/api/v1/:param1", authenticateToken, handlePutRecord);
  app.put("/api/v1/:param1/:param2", authenticateToken, handlePutRecord);
  app.put("/api/v1/:param1/:param2/:param3", authenticateToken, handlePutRecord);
  app.delete("/api/v1/:param1", authenticateToken, handleDeleteRecord);
  app.delete("/api/v1/:param1/:param2", authenticateToken, handleDeleteRecord);
  app.delete("/api/v1/:param1/:param2/:param3", authenticateToken, handleDeleteRecord);
  const isProduction = process.env.NODE_ENV === "production";
  const cwdDistPath = path3.resolve(process.cwd(), "dist");
  const dirnameDistPath = path3.resolve(__dirname, "dist");
  const distPath = fs3.existsSync(cwdDistPath) ? cwdDistPath : dirnameDistPath;
  const indexHtmlExists = fs3.existsSync(path3.join(distPath, "index.html"));
  if (isProduction || indexHtmlExists) {
    console.log(`[Server] Serving production static assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, error: "API route not found" });
      }
      res.sendFile(path3.join(distPath, "index.html"));
    });
  } else {
    console.log("[Server] Development mode active. Mounting Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => {
    console.log(`[Visual Database Engine & API] Server running on port ${PORT}`);
  });
}
startServer();
