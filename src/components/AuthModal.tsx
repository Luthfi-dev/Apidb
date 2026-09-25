import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  KeyRound,
  Sparkles,
  ArrowLeft,
  Check
} from 'lucide-react';
import { SafeUser, Language } from '../types';

export type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: SafeUser, token: string) => void;
  language: Language;
  initialMode?: AuthMode;
  initialEmail?: string;
  initialToken?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  language,
  initialMode = 'login',
  initialEmail = '',
  initialToken = ''
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState(initialToken);
  const [resetStep, setResetStep] = useState<'verify_otp' | 'new_password'>(initialToken ? 'new_password' : 'verify_otp');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  // OTP 60-second cooldown timer
  const [cooldown, setCooldown] = useState<number>(0);

  const clearAll = () => {
    setName('');
    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setResetToken('');
    setError(null);
    setSuccessMsg(null);
    setSimulatedCode(null);
    setResetStep('verify_otp');
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialEmail) setEmail(initialEmail);
      else setEmail('');
      if (initialToken) {
        setResetToken(initialToken);
        setResetStep('new_password');
      } else {
        setResetToken('');
        setResetStep('verify_otp');
      }
      setName('');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setError(null);
      setSuccessMsg(null);
      setSimulatedCode(null);
    }
  }, [isOpen, initialMode, initialEmail, initialToken]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const resetFormState = () => {
    setError(null);
    setSuccessMsg(null);
    setSimulatedCode(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.unverified) {
          setError(data.message);
          setMode('verify');
          setCooldown(60);
          return;
        }
        setError(data.message || 'Email atau kata sandi yang Anda masukkan salah.');
        return;
      }

      localStorage.setItem('dataforge_token', data.jwtToken);
      onAuthSuccess(data.user, data.jwtToken);
      clearAll();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
          setMode('verify');
        }
        setError(data.message || 'Pendaftaran akun gagal. Silakan coba kembali.');
        return;
      }

      setSuccessMsg(data.message || 'Pendaftaran berhasil. Silakan masukkan 6 digit kode verifikasi.');
      if (data.simulatedCode) {
        setSimulatedCode(data.simulatedCode);
        setVerificationCode(data.simulatedCode);
      }
      setCooldown(60);
      setMode('verify');
    } catch (err: any) {
      setError(err.message || 'Terjadi gangguan jaringan saat memproses pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Kode verifikasi yang dimasukkan tidak valid atau sudah kadaluarsa.');
        return;
      }

      if (data.jwtToken && data.user) {
        localStorage.setItem('dataforge_token', data.jwtToken);
        onAuthSuccess(data.user, data.jwtToken);
      }
      setSuccessMsg('Verifikasi akun berhasil! Selamat datang.');
      setTimeout(() => {
        clearAll();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Gagal memverifikasi kode OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === 'reset' ? '/api/auth/forgot-password' : '/api/auth/resend-code';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message);
        setCooldown(60);
        if (data.simulatedCode) {
          setSimulatedCode(data.simulatedCode);
          setVerificationCode(data.simulatedCode);
        }
      } else {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
        }
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim ulang kode.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    if (!email) {
      setError('Masukkan alamat email Anda.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
          setMode('reset');
        }
        setError(data.message || 'Gagal memproses permintaan reset password.');
        return;
      }

      setSuccessMsg(data.message || 'Kode reset kata sandi telah dikirim ke email Anda.');
      if (data.simulatedCode) {
        setSimulatedCode(data.simulatedCode);
        setVerificationCode(data.simulatedCode);
      }
      setCooldown(60);
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    if (!verificationCode || verificationCode.length < 6) {
      setError('Masukkan 6 digit kode verifikasi OTP yang valid.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode, token: resetToken || undefined })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Kode OTP tidak valid atau sudah kedaluwarsa.');
        return;
      }

      setSuccessMsg('Kode OTP benar! Silakan masukkan kata sandi baru Anda.');
      setResetStep('new_password');
    } catch (err: any) {
      setError(err.message || 'Gagal memverifikasi kode OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (newPassword.length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak sesuai.');
      return;
    }

    if (!resetToken && (!verificationCode || verificationCode.length < 6)) {
      setError('Masukkan 6 digit kode verifikasi OTP yang dikirim ke email Anda.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          code: verificationCode || undefined,
          token: resetToken || undefined,
          newPassword
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Gagal mengatur ulang kata sandi.');
        return;
      }

      setSuccessMsg('Kata sandi berhasil diperbarui! Sedang menyiapkan sesi...');
      if (data.jwtToken && data.user) {
        localStorage.setItem('dataforge_token', data.jwtToken);
        setTimeout(() => {
          onAuthSuccess(data.user, data.jwtToken);
          clearAll();
          onClose();
        }, 1200);
      } else {
        setTimeout(() => {
          clearAll();
          setMode('login');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
        {/* Modal Header */}
        <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 text-white flex items-center justify-center shadow-md">
              {mode === 'forgot' || mode === 'reset' ? (
                <KeyRound className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">
                {mode === 'login' && 'Masuk ke Akun'}
                {mode === 'register' && 'Daftar Akun Baru'}
                {mode === 'verify' && 'Verifikasi Email Akun'}
                {mode === 'forgot' && 'Lupa Kata Sandi'}
                {mode === 'reset' && 'Atur Ulang Kata Sandi'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">DataForge API Studio</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearAll();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error / Success Alerts */}
        <div className="px-5 pt-3 space-y-2">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 pt-3">
          {/* 1. LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nama@domain.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      resetFormState();
                      setMode('forgot');
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{loading ? 'Memverifikasi Kredensial...' : 'Masuk ke Aplikasi'}</span>
              </button>

              <div className="text-center pt-2 text-xs text-slate-500">
                Belum memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setMode('register');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Daftar Sekarang
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nama Lengkap Anda"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nama@domain.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi (Min 6 Karakter)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Buat kata sandi aman..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{loading ? 'Memproses Pendaftaran...' : 'Daftar & Kirim Kode Verifikasi'}</span>
              </button>

              <div className="text-center pt-2 text-xs text-slate-500">
                Sudah memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setMode('login');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Masuk di Sini
                </button>
              </div>
            </form>
          )}

          {/* 3. VERIFY EMAIL */}
          {mode === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Kami telah mengirimkan 6 digit kode verifikasi ke:
                <strong className="block text-indigo-700 dark:text-indigo-300 font-bold mt-0.5">{email}</strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Masukkan 6 Digit Kode OTP
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length < 6}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>Verifikasi & Masuk Akun</span>
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {cooldown > 0 && <Clock className="w-3.5 h-3.5" />}
                  <span>{cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Ulang Kode OTP'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setMode('login');
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Kembali ke Login
                </button>
              </div>
            </form>
          )}

          {/* 4. FORGOT PASSWORD (Request OTP) */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-2xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Pemulihan Kata Sandi
                </div>
                Masukkan alamat email akun Anda. Kami akan mengirimkan 6 digit kode verifikasi untuk mereset kata sandi.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email Terdaftar
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nama@domain.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{loading ? 'Mengirim Kode Reset...' : 'Kirim Kode Reset Kata Sandi'}</span>
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setMode('login');
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Login
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setMode('reset');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Sudah punya kode?
                </button>
              </div>
            </form>
          )}

          {/* 5. RESET PASSWORD (2-Step: 1. Verify OTP -> 2. New Password) */}
          {mode === 'reset' && (
            <div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between text-xs mb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Akun Target</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{email || 'Akun Anda'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setMode('forgot');
                  }}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Ganti Email
                </button>
              </div>

              {resetStep === 'verify_otp' && !resetToken ? (
                <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Masukkan 6 Digit Kode Reset (OTP)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || verificationCode.length < 6}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{loading ? 'Memverifikasi Kode OTP...' : 'Verifikasi Kode OTP'}</span>
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading || cooldown > 0 || !email}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {cooldown > 0 && <Clock className="w-3.5 h-3.5" />}
                      <span>{cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Ulang OTP'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetFormState();
                        setMode('login');
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Kembali ke Login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Kode OTP terverifikasi. Silakan masukkan kata sandi baru Anda.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kata Sandi Baru (Min. 6 Karakter)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Masukkan sandi baru..."
                        className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ulangi Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang sandi baru..."
                        className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {confirmPassword && confirmPassword === newPassword && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{loading ? 'Menyimpan Kata Sandi Baru...' : 'Simpan & Masuk Otomatis'}</span>
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setResetStep('verify_otp')}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Kembali ke Masukkan OTP
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetFormState();
                        setMode('login');
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Kembali ke Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
