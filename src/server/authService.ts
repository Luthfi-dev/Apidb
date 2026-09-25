import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { sendVerificationEmail, sendPasswordResetEmail } from './mailService';
import { isMySQLConnected, findUserByEmailFromMySQL, mysqlUpsertUser, loadUsersFromMySQL } from './mysqlService';

export type UserRole = 'superadmin' | 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isVerified: boolean;
  verificationCode?: string;
  verificationToken?: string;
  verificationExpiresAt?: string;
  lastOtpSentAt?: string;
  // Password reset fields
  resetPasswordCode?: string;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: string;
  lastResetSentAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<
  User,
  'passwordHash' | 'verificationCode' | 'verificationToken' | 'resetPasswordCode' | 'resetPasswordToken'
>;

const JWT_SECRET = process.env.JWT_SECRET || 'dataforge_jwt_secret_dev_2026_xyz';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

let users: User[] = [];

// Seed default accounts requested by user (password 123456)
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('123456', 10);

const SEED_USERS: User[] = [
  {
    id: 'usr-superadmin',
    name: 'Super Administrator',
    email: 'superadmin@dataforge.io',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'superadmin',
    isVerified: true,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'usr-admin',
    name: 'Administrator Data',
    email: 'admin@dataforge.io',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'admin',
    isVerified: true,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'usr-user',
    name: 'Pengguna Biasa',
    email: 'user@dataforge.io',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'user',
    isVerified: true,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function toSafeUser(user: User): SafeUser {
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

export function generateJwtToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyJwtToken(token: string): { userId: string; email: string; role: UserRole; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    return null;
  }
}

// In-memory getter and setter for integration with server.ts & mysqlService.ts
export function getAllUsers(): User[] {
  if (users.length === 0) {
    users = [...SEED_USERS];
  }
  return users;
}

export function setAllUsers(loadedUsers: User[]): void {
  if (!loadedUsers || loadedUsers.length === 0) {
    users = [...SEED_USERS];
  } else {
    // Ensure superadmin & admin seeded accounts exist
    const hasSuper = loadedUsers.some(u => u.role === 'superadmin');
    if (!hasSuper) {
      users = [SEED_USERS[0], ...loadedUsers];
    } else {
      users = [...loadedUsers];
    }
  }
}

// Register new user (Email verification required, strict duplicate & cooldown check)
export async function registerUser(
  name: string,
  email: string,
  password: string,
  appUrl: string = 'http://localhost:3000'
): Promise<{ success: boolean; user?: SafeUser; verificationRequired?: boolean; simulatedCode?: string; cooldownRemaining?: number; message?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName) return { success: false, message: 'Nama lengkap wajib diisi.' };
  if (!cleanEmail || !cleanEmail.includes('@')) return { success: false, message: 'Format alamat email tidak valid.' };
  if (!password || password.length < 6) return { success: false, message: 'Password minimal 6 karakter.' };

  const all = getAllUsers();
  const existing = all.find(u => u.email === cleanEmail);

  if (existing) {
    if (existing.isVerified) {
      return {
        success: false,
        message: 'Alamat email ini sudah terdaftar dan aktif. Silakan masuk menggunakan password Anda.'
      };
    }

    // If user exists but is not verified, check 60s cooldown before resending OTP
    if (existing.lastOtpSentAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(existing.lastOtpSentAt).getTime()) / 1000);
      if (elapsedSeconds < 60) {
        return {
          success: false,
          cooldownRemaining: 60 - elapsedSeconds,
          message: `Email belum diverifikasi. Mohon tunggu ${60 - elapsedSeconds} detik sebelum meminta kode OTP baru.`
        };
      }
    }

    // Refresh password & generate new OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = `vtok_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    existing.name = cleanName;
    existing.passwordHash = await bcrypt.hash(password, 10);
    existing.verificationCode = code;
    existing.verificationToken = token;
    existing.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    existing.lastOtpSentAt = new Date().toISOString();
    existing.updatedAt = new Date().toISOString();

    const mailResult = await sendVerificationEmail(cleanEmail, cleanName, code, token, appUrl);
    return {
      success: true,
      user: toSafeUser(existing),
      verificationRequired: true,
      simulatedCode: mailResult.simulated ? code : undefined,
      message: mailResult.sent
        ? `Kode verifikasi telah dikirimkan ke ${cleanEmail}. Periksa kotak masuk atau spam email Anda.`
        : `Pendaftaran berhasil. Silakan masukkan kode verifikasi 6 digit untuk mengaktifkan akun Anda.`
    };
  }

  // 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token = `vtok_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const nowStr = new Date().toISOString();

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser: User = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role: 'user', // Default role for public registration
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

  // Send verification email via Gmail SMTP
  const mailResult = await sendVerificationEmail(cleanEmail, cleanName, code, token, appUrl);

  return {
    success: true,
    user: toSafeUser(newUser),
    verificationRequired: true,
    simulatedCode: mailResult.simulated ? code : undefined,
    message: mailResult.sent
      ? `Kode verifikasi telah dikirim ke ${cleanEmail}. Periksa kotak masuk atau spam email Anda.`
      : `Pendaftaran berhasil. Silakan masukkan kode verifikasi 6-digit untuk mengaktifkan akun.`
  };
}

// Verify email with 6-digit code or token
export async function verifyUserEmail(
  identifier: { email?: string; code?: string; token?: string }
): Promise<{ success: boolean; user?: SafeUser; jwtToken?: string; message: string }> {
  const all = getAllUsers();
  let user: User | undefined;

  if (identifier.token) {
    user = all.find(u => u.verificationToken === identifier.token);
  } else if (identifier.email && identifier.code) {
    const cleanEmail = identifier.email.trim().toLowerCase();
    const cleanCode = identifier.code.trim();
    user = all.find(u => u.email === cleanEmail && u.verificationCode === cleanCode);
  }

  if (!user) {
    return { success: false, message: 'Kode verifikasi salah atau sudah kadaluarsa.' };
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationToken = undefined;
  user.verificationExpiresAt = undefined;
  user.updatedAt = new Date().toISOString();

  const token = generateJwtToken(user);

  return {
    success: true,
    user: toSafeUser(user),
    jwtToken: token,
    message: 'Email berhasil diverifikasi! Akun Anda kini aktif.'
  };
}

// Resend verification code with strict 60 seconds (1 minute) cooldown
export async function resendVerificationCode(
  email: string,
  appUrl: string = 'http://localhost:3000'
): Promise<{ success: boolean; simulatedCode?: string; cooldownRemaining?: number; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const all = getAllUsers();
  const user = all.find(u => u.email === cleanEmail);

  if (!user) {
    return { success: false, message: 'Akun dengan alamat email ini tidak ditemukan.' };
  }

  if (user.isVerified) {
    return { success: false, message: 'Akun ini sudah terverifikasi sebelumnya. Silakan langsung login.' };
  }

  // 60-second rate limiting cooldown
  if (user.lastOtpSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(user.lastOtpSentAt).getTime()) / 1000);
    if (elapsedSeconds < 60) {
      const waitSeconds = 60 - elapsedSeconds;
      return {
        success: false,
        cooldownRemaining: waitSeconds,
        message: `Mohon tunggu ${waitSeconds} detik lagi sebelum meminta pengiriman ulang kode OTP.`
      };
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token = `vtok_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  user.verificationCode = code;
  user.verificationToken = token;
  user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  user.lastOtpSentAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();

  const mailResult = await sendVerificationEmail(user.email, user.name, code, token, appUrl);

  return {
    success: true,
    simulatedCode: mailResult.simulated ? code : undefined,
    message: mailResult.sent
      ? `Kode verifikasi baru berhasil dikirim ke ${cleanEmail}.`
      : `Kode verifikasi baru berhasil dibuat: ${code}`
  };
}

// Update User Profile (Name and/or Password)
export async function updateUserProfile(
  userId: string,
  name?: string,
  oldPassword?: string,
  newPassword?: string
): Promise<{ success: boolean; user?: SafeUser; message: string }> {
  const all = getAllUsers();
  const user = all.find(u => u.id === userId);

  if (!user) {
    return { success: false, message: 'Pengguna tidak ditemukan.' };
  }

  if (name && name.trim()) {
    user.name = name.trim();
  }

  if (newPassword) {
    if (!oldPassword) {
      return { success: false, message: 'Kata sandi saat ini wajib diisi untuk mengubah sandi baru.' };
    }
    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) {
      return { success: false, message: 'Kata sandi saat ini tidak sesuai.' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  user.updatedAt = new Date().toISOString();
  return {
    success: true,
    user: toSafeUser(user),
    message: 'Profil akun berhasil diperbarui.'
  };
}

// Login
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: SafeUser; jwtToken?: string; unverified?: boolean; email?: string; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  
  let user: User | undefined;

  // Live lookup from online MySQL database first
  if (isMySQLConnected()) {
    try {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser) {
        user = mysqlUser;
        // Keep in-memory cache synchronized
        const all = getAllUsers();
        const idx = all.findIndex(u => u.id === mysqlUser.id || u.email.toLowerCase() === cleanEmail);
        if (idx !== -1) {
          all[idx] = mysqlUser;
        } else {
          all.push(mysqlUser);
        }
      }
    } catch (err) {
      console.warn('[AuthService] Gagal membaca user langsung dari MySQL:', err);
    }
  }

  if (!user) {
    const all = getAllUsers();
    user = all.find(u => u.email === cleanEmail);
  }

  if (!user) {
    return { success: false, message: 'Email atau kata sandi yang Anda masukkan salah.' };
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { success: false, message: 'Email atau kata sandi yang Anda masukkan salah.' };
  }

  if (!user.isActive) {
    return { success: false, message: 'Akun Anda dinonaktifkan oleh administrator. Hubungi pengelola sistem.' };
  }

  if (!user.isVerified) {
    return {
      success: false,
      unverified: true,
      email: user.email,
      message: 'Email Anda belum diverifikasi. Masukkan kode 6 digit verifikasi Anda.'
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

// Request Password Reset (Forgot Password)
export async function requestPasswordReset(
  email: string,
  appUrl: string = 'http://localhost:3000'
): Promise<{ success: boolean; message: string; simulatedCode?: string; cooldownRemaining?: number }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Silakan masukkan alamat email yang valid.' };
  }

  let user: User | undefined;
  if (isMySQLConnected()) {
    try {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser) user = mysqlUser;
    } catch (_) {}
  }

  if (!user) {
    const all = getAllUsers();
    user = all.find(u => u.email === cleanEmail);
  }

  if (!user) {
    // For security & user privacy, don't explicitly reveal if email is not found, but give helpful advice
    return {
      success: false,
      message: 'Akun dengan alamat email tersebut tidak ditemukan dalam sistem.'
    };
  }

  if (!user.isActive) {
    return {
      success: false,
      message: 'Akun Anda dinonaktifkan oleh administrator. Silakan hubungi pengelola sistem.'
    };
  }

  // 60-second cooldown rate limit check
  if (user.lastResetSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(user.lastResetSentAt).getTime()) / 1000);
    if (elapsedSeconds < 60) {
      const waitSeconds = 60 - elapsedSeconds;
      return {
        success: false,
        cooldownRemaining: waitSeconds,
        message: `Mohon tunggu ${waitSeconds} detik sebelum meminta pengiriman ulang kode reset sandi.`
      };
    }
  }

  // Generate 6-digit OTP code and secure reset token
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token = `rst_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes validity
  const nowStr = new Date().toISOString();

  user.resetPasswordCode = code;
  user.resetPasswordToken = token;
  user.resetPasswordExpiresAt = expiresAt;
  user.lastResetSentAt = nowStr;
  user.updatedAt = nowStr;

  const all = getAllUsers();
  const idx = all.findIndex(u => u.id === user!.id || u.email.toLowerCase() === cleanEmail);
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
    simulatedCode: mailResult.simulated ? code : undefined,
    message: mailResult.sent
      ? `Kode verifikasi reset kata sandi telah dikirim ke ${user.email}. Periksa kotak masuk atau folder spam Anda.`
      : `Kode verifikasi reset kata sandi berhasil dibuat: ${code}`
  };
}

// Reset Password with 6-digit Code or Token
export async function resetPasswordWithCodeOrToken(options: {
  email?: string;
  code?: string;
  token?: string;
  newPassword: string;
}): Promise<{ success: boolean; user?: SafeUser; jwtToken?: string; message: string }> {
  const { email, code, token, newPassword } = options;

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
  }

  if (isMySQLConnected()) {
    try {
      const mysqlUsers = await loadUsersFromMySQL();
      if (mysqlUsers.length > 0) {
        setAllUsers(mysqlUsers);
      }
    } catch (err) {
      console.warn('[AuthService] Gagal load users dari MySQL:', err);
    }
  }

  const refreshedAll = getAllUsers();
  let user: User | undefined;

  if (token) {
    user = refreshedAll.find(u => u.resetPasswordToken === token);
  } else if (email && code) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    user = refreshedAll.find(u => u.email.trim().toLowerCase() === cleanEmail && String(u.resetPasswordCode || '').trim() === cleanCode);
    if (!user && isMySQLConnected()) {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser && String(mysqlUser.resetPasswordCode || '').trim() === cleanCode) {
        user = mysqlUser;
      }
    }
  }

  if (!user) {
    return { success: false, message: 'Kode OTP atau tautan reset sandi tidak valid atau telah kedaluwarsa.' };
  }

  // Check expiration (30 mins)
  if (user.resetPasswordExpiresAt) {
    const expiresAt = new Date(user.resetPasswordExpiresAt).getTime();
    if (Date.now() > expiresAt) {
      return { success: false, message: 'Kode verifikasi reset kata sandi telah kedaluwarsa. Silakan minta kode baru.' };
    }
  }

  // Update password hash and clear reset tokens
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetPasswordCode = undefined;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;
  user.isVerified = true; // Successfully resetting password also confirms email ownership
  user.updatedAt = new Date().toISOString();

  if (isMySQLConnected()) {
    await mysqlUpsertUser(user);
  }

  const jwtToken = generateJwtToken(user);

  return {
    success: true,
    user: toSafeUser(user),
    jwtToken,
    message: 'Kata sandi berhasil diatur ulang! Anda telah otomatis masuk ke sistem.'
  };
}

// Verify Reset OTP Code before allowing new password input
export async function verifyResetCode(options: {
  email?: string;
  code?: string;
  token?: string;
}): Promise<{ success: boolean; message: string }> {
  const { email, code, token } = options;

  if (isMySQLConnected()) {
    try {
      const mysqlUsers = await loadUsersFromMySQL();
      if (mysqlUsers.length > 0) {
        setAllUsers(mysqlUsers);
      }
    } catch (err) {
      console.warn('[AuthService] Gagal load users dari MySQL:', err);
    }
  }

  const refreshedAll = getAllUsers();
  let user: User | undefined;

  if (token) {
    user = refreshedAll.find(u => u.resetPasswordToken === token);
  } else if (email && code) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    user = refreshedAll.find(u => u.email.trim().toLowerCase() === cleanEmail && String(u.resetPasswordCode || '').trim() === cleanCode);
    if (!user && isMySQLConnected()) {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser && String(mysqlUser.resetPasswordCode || '').trim() === cleanCode) {
        user = mysqlUser;
      }
    }
  }

  if (!user) {
    return { success: false, message: 'Kode OTP reset kata sandi tidak valid.' };
  }

  if (user.resetPasswordExpiresAt) {
    const expiresAt = new Date(user.resetPasswordExpiresAt).getTime();
    if (Date.now() > expiresAt) {
      return { success: false, message: 'Kode verifikasi reset kata sandi telah kedaluwarsa. Silakan minta kode baru.' };
    }
  }

  return { success: true, message: 'Kode OTP valid. Silakan masukkan kata sandi baru.' };
}

