import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Key,
  LogOut,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  Fingerprint,
  Copy,
  CheckCheck,
  Lock,
  Globe,
  Database
} from 'lucide-react';
import { SafeUser, Language } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SafeUser;
  onProfileUpdated: (updatedUser: SafeUser) => void;
  onRequestLogout: () => void;
  language: Language;
}

type TabType = 'profile' | 'security' | 'access';

export function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  onRequestLogout,
  language
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [name, setName] = useState(currentUser.name);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Avatar color themes
  const [avatarTheme, setAvatarTheme] = useState<'indigo' | 'emerald' | 'amber' | 'rose' | 'purple'>('indigo');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleCopyUid = () => {
    navigator.clipboard.writeText(currentUser.id);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const getPasswordStrength = (pwd: string): { label: string; percent: number; color: string } => {
    if (!pwd) return { label: 'Belum diisi', percent: 0, color: 'bg-slate-200 dark:bg-slate-700' };
    if (pwd.length < 6) return { label: 'Minimal 6 karakter', percent: 25, color: 'bg-rose-500' };
    let score = 50;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 20;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 15;

    if (score < 60) return { label: 'Cukup', percent: score, color: 'bg-amber-500' };
    if (score < 85) return { label: 'Kuat', percent: score, color: 'bg-emerald-500' };
    return { label: 'Sangat Kuat', percent: 100, color: 'bg-emerald-600' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword && newPassword.length < 6) {
      setError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (newPassword && !oldPassword) {
      setError('Masukkan kata sandi saat ini untuk menyetujui perubahan kata sandi.');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('dataforge_token');

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Gagal memperbarui profil.');
        return;
      }

      setSuccess(data.message || 'Profil berhasil diperbarui.');
      onProfileUpdated(data.user);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case 'superadmin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xs inline-flex items-center gap-1 tracking-wide whitespace-nowrap">
            <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> SUPERADMIN
          </span>
        );
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs inline-flex items-center gap-1 tracking-wide whitespace-nowrap">
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> ADMINISTRATOR
          </span>
        );
      case 'user':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1 whitespace-nowrap">
            <Shield className="w-3 h-3 text-indigo-500" /> PENGGUNA
          </span>
        );
    }
  };

  const getAvatarGradient = () => {
    switch (avatarTheme) {
      case 'emerald':
        return 'from-emerald-500 via-teal-500 to-cyan-500';
      case 'amber':
        return 'from-amber-500 via-orange-500 to-rose-500';
      case 'rose':
        return 'from-rose-500 via-pink-500 to-purple-500';
      case 'purple':
        return 'from-purple-600 via-violet-600 to-indigo-600';
      case 'indigo':
      default:
        return 'from-indigo-600 via-violet-600 to-blue-500';
    }
  };

  const pwdStrength = getPasswordStrength(newPassword);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-scaleUp text-slate-900 dark:text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header: Clean & Spacious */}
        <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr ${getAvatarGradient()} text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md ring-2 ring-white dark:ring-slate-800`}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 truncate tracking-tight">
                  {currentUser.name}
                </h3>
                {getRoleBadge()}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                {currentUser.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Responsive Segmented Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-3 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Profil</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'security'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Keamanan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('access')}
              className={`py-2 px-1.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'access'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Sesi & Akses</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Notifications */}
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-2.5 text-xs font-semibold text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-start gap-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          {/* TAB 1: INFORMASI PROFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Clean Native Info Card */}
              <div className="p-4 bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3.5">
                {/* Dedicated Copyable UID Row (Spacious & Clean) */}
                <div className="space-y-1.5 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                    <Fingerprint className="w-3.5 h-3.5 text-indigo-500" /> ID Pengguna (UID)
                  </span>
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-xl">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate select-all">
                      {currentUser.id}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUid}
                      className="shrink-0 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUid ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUid ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" /> Status Email Akun
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Terverifikasi & Aktif
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Tanggal Registrasi
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(currentUser.createdAt).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Form Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nama Lengkap Anda..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                </div>
              </div>

              {/* Tema Aksen Avatar */}
              <div className="pt-1 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Warna Aksen Profil
                </label>
                <div className="flex items-center gap-3">
                  {(['indigo', 'emerald', 'amber', 'rose', 'purple'] as const).map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarTheme(color)}
                      className={`w-8 h-8 rounded-full transition-all cursor-pointer ${
                        color === 'indigo'
                          ? 'bg-gradient-to-tr from-indigo-600 to-blue-500'
                          : color === 'emerald'
                          ? 'bg-gradient-to-tr from-emerald-500 to-teal-500'
                          : color === 'amber'
                          ? 'bg-gradient-to-tr from-amber-500 to-rose-500'
                          : color === 'rose'
                          ? 'bg-gradient-to-tr from-rose-500 to-pink-500'
                          : 'bg-gradient-to-tr from-purple-600 to-violet-600'
                      } ${
                        avatarTheme === color
                          ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 scale-110 shadow-sm'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={`Pilih tema ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KEAMANAN & KATA SANDI */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Masukkan kata sandi saat ini untuk menyetujui pembaruan kata sandi baru akun Anda.
                </div>
              </div>

              {/* Sandi Saat Ini */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi Saat Ini
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Masukkan sandi saat ini..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sandi Baru */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Kekuatan Sandi:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{pwdStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                        style={{ width: `${pwdStrength.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Konfirmasi Sandi Baru */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {confirmPassword && confirmPassword === newPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SESI & HAK AKSES */}
          {activeTab === 'access' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-500" /> Sesi Perangkat Aktif
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-400">Protokol Keamanan</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">JWT (HMAC SHA-256)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Masa Berlaku Sesi</span>
                  <span className="font-semibold">7 Hari (Auto-Refresh)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Status Akun</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Aktif & Beroperasi</span>
                </div>
              </div>

              {/* Matriks Hak Akses Berdasarkan Role */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-500" /> Hak Akses Role ({currentUser.role.toUpperCase()})
                </div>
                <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Kelola Database & Tabel Proyek
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Akses REST API & Token Endpoint
                  </li>
                  {currentUser.role === 'superadmin' && (
                    <>
                      <li className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
                        <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Kelola Pengguna & Superadmin
                      </li>
                      <li className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
                        <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Konfigurasi SMTP Failover Pool
                      </li>
                      <li className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
                        <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Koneksi Online Database MySQL
                      </li>
                    </>
                  )}
                  {currentUser.role === 'admin' && (
                    <li className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Kelola Pengguna Biasa & Reset Sandi
                    </li>
                  )}
                </ul>
              </div>

              {/* Danger Zone: Log out */}
              <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-rose-900 dark:text-rose-200">Keluar dari Sesi Ini</div>
                  <div className="text-[11px] text-rose-700/80 dark:text-rose-300/70">
                    Menghapus token autentikasi lokal dari browser
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestLogout();
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer Actions - Clean Responsive Buttons */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestLogout();
            }}
            className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar Akun</span>
            <span className="sm:hidden">Keluar</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
