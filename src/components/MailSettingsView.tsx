import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  HelpCircle,
  ExternalLink,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  ArrowUp,
  ArrowDown,
  Power,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { GmailSmtpAccount, Language, SafeUser } from '../types';

interface MailSettingsViewProps {
  currentUser: SafeUser;
  language: Language;
}

export function MailSettingsView({ currentUser, language }: MailSettingsViewProps) {
  const [accounts, setAccounts] = useState<GmailSmtpAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<{
    storageFile: string;
    storageTable: string;
    isMySQLSynced: boolean;
  }>({
    storageFile: 'mail-config.json',
    storageTable: 'df_smtp_accounts',
    isMySQLSynced: false
  });

  // Modal / Form state for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    gmailUser: '',
    gmailAppPassword: '',
    fromName: 'DataForge API Studio',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Testing states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testingPool, setTestingPool] = useState(false);
  const [testEmail, setTestEmail] = useState(currentUser.email || '');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [poolTestResult, setPoolTestResult] = useState<{
    success: boolean;
    message: string;
    accountUsed?: string;
    attempts?: Array<{ accountName: string; success: boolean; error?: string }>;
  } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/mail/config');
      const data = await res.json();
      if (data && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      }
      if (data) {
        setStorageInfo({
          storageFile: data.storageFile || 'mail-config.json',
          storageTable: data.storageTable || 'df_smtp_accounts',
          isMySQLSynced: Boolean(data.isMySQLSynced)
        });
      }
    } catch (err) {
      console.error('Failed to load mail config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 6000);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: `Gmail Akun ${accounts.length + 1}`,
      gmailUser: '',
      gmailAppPassword: '',
      fromName: 'DataForge API Studio',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      isActive: true
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc: GmailSmtpAccount) => {
    setEditingId(acc.id);
    setFormData({
      name: acc.name,
      gmailUser: acc.gmailUser,
      gmailAppPassword: '', // keep blank unless user wants to change
      fromName: acc.fromName || 'DataForge API Studio',
      host: acc.host || 'smtp.gmail.com',
      port: acc.port || 465,
      secure: acc.secure ?? true,
      isActive: acc.isActive
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const url = editingId ? `/api/mail/accounts/${editingId}` : '/api/mail/accounts';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        showStatus(data.error || 'Gagal menyimpan akun SMTP.', 'error');
        return;
      }

      setIsModalOpen(false);
      await fetchConfig();
      showStatus(editingId ? 'Akun Gmail SMTP berhasil diperbarui!' : 'Akun Gmail SMTP baru berhasil ditambahkan!');
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Hapus akun SMTP "${name}" dari antrean failover?`)) return;

    try {
      const res = await fetch(`/api/mail/accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchConfig();
        showStatus(`Akun "${name}" berhasil dihapus.`);
      } else {
        showStatus(data.error || 'Gagal menghapus akun.', 'error');
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  };

  const handleToggleActive = async (acc: GmailSmtpAccount) => {
    try {
      const res = await fetch(`/api/mail/accounts/${acc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !acc.isActive })
      });
      if (res.ok) {
        await fetchConfig();
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  };

  const handleMovePriority = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= accounts.length) return;

    const newAccounts = [...accounts];
    const [moved] = newAccounts.splice(index, 1);
    newAccounts.splice(targetIndex, 0, moved);

    const ids = newAccounts.map(a => a.id);
    try {
      const res = await fetch('/api/mail/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        await fetchConfig();
      }
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  };

  const handleTestSingle = async (acc: GmailSmtpAccount) => {
    if (!testEmail) {
      showStatus('Masukkan alamat email penerima uji coba terlebih dahulu.', 'error');
      return;
    }
    setTestingId(acc.id);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/mail/accounts/${acc.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });
      const data = await res.json();
      if (data.success) {
        showStatus(data.message, 'success');
      } else {
        showStatus(data.message || 'Pengujian akun SMTP gagal.', 'error');
      }
      await fetchConfig();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleTestPool = async () => {
    if (!testEmail) {
      showStatus('Masukkan alamat email penerima uji coba.', 'error');
      return;
    }
    setTestingPool(true);
    setPoolTestResult(null);

    try {
      const res = await fetch('/api/mail/test-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });
      const data = await res.json();
      setPoolTestResult(data);
      if (data.success) {
        showStatus(`Pengujian failover sukses: terkirim via ${data.accountUsed}!`);
      } else {
        showStatus(data.message, 'error');
      }
      await fetchConfig();
    } catch (err: any) {
      showStatus(err.message, 'error');
      setPoolTestResult({ success: false, message: err.message });
    } finally {
      setTestingPool(false);
    }
  };

  const activeCount = accounts.filter(a => a.isActive).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 text-white rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">Server Send Mail (Gmail Multi-SMTP Failover)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Hanya Superadmin
                </span>
                {activeCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {activeCount} Akun Siap
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-400/30">
                    Belum Ada Akun Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Kelola beberapa akun Gmail SMTP sekaligus dengan sistem <strong>Failover Otomatis</strong>: jika pengiriman melalui Akun 1 gagal (kuota habis, rate limit, atau gangguan), sistem akan otomatis mencoba Akun 2, Akun 3, dan seterusnya secara berurutan.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun Gmail</span>
          </button>
        </div>
      </div>

      {/* Storage & Persistence Transparency Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-500/30 p-4 sm:p-5 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5 border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-white">Penyimpanan Aman & Jaminan Tidak Hilang Saat Build</h4>
                {storageInfo.isMySQLSynced ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Sinkron DB Online (Tabel {storageInfo.storageTable})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1">
                    File Server ({storageInfo.storageFile})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Setiap akun SMTP yang Anda tambahkan disimpan dengan aman di file server <code className="text-cyan-300 font-mono px-1 py-0.5 bg-slate-800 rounded">{storageInfo.storageFile}</code> dan <strong>otomatis tersinkronisasi ke tabel database MySQL online <code className="text-emerald-300 font-mono px-1 py-0.5 bg-slate-800 rounded">{storageInfo.storageTable}</code></strong>. Konfigurasi SMTP Anda tetap persisten dan tidak akan hilang saat build ulang atau restart server.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Global Live Failover Tester Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-emerald-600" />
              <span>Uji Coba Pengiriman Antrean Failover Pool</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Kirim email uji coba untuk menguji rantai failover dari Akun 1 ke akun cadangan berikutnya.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="Masukkan email penerima uji coba..."
            className="w-full sm:flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleTestPool}
            disabled={testingPool || accounts.length === 0}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            {testingPool ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{testingPool ? 'Menguji Failover...' : 'Uji Kirim Pool'}</span>
          </button>
        </div>

        {poolTestResult && (
          <div
            className={`p-3.5 rounded-xl text-xs space-y-2 ${
              poolTestResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {poolTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              <span>{poolTestResult.message}</span>
            </div>

            {poolTestResult.attempts && poolTestResult.attempts.length > 0 && (
              <div className="pl-6 space-y-1 text-[11px]">
                <span className="font-semibold block text-slate-600 dark:text-slate-400">Riwayat Eksekusi Antrean:</span>
                {poolTestResult.attempts.map((att, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">#{i + 1}</span>
                    <span className="font-medium">{att.accountName}:</span>
                    {att.success ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">SUKSES TERKIRIM</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">GAGAL ({att.error}) &rarr; Beralih ke cadangan</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-SMTP Accounts List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Daftar Akun Gmail SMTP & Antrean Prioritas
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {accounts.length} Akun Terdaftar
          </span>
        </div>

        {accounts.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Akun Gmail SMTP</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Tambahkan akun Gmail SMTP pertama Anda agar sistem dapat mengirimkan email kode verifikasi bagi pendaftar baru.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Akun Gmail Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {accounts.map((acc, index) => {
              const isFirst = index === 0;
              const isLast = index === accounts.length - 1;
              const isTesting = testingId === acc.id;

              return (
                <div
                  key={acc.id}
                  className={`p-4 sm:p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    !acc.isActive ? 'opacity-60 bg-slate-50/50 dark:bg-slate-950/30' : 'hover:bg-slate-50/50 dark:hover:bg-slate-850/40'
                  }`}
                >
                  {/* Left Info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Priority Badge */}
                    <div className="flex flex-col items-center justify-center">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold shadow-2xs ${
                        index === 0
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        #{index + 1}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 font-bold">
                        {index === 0 ? 'Utama' : `Cadangan ${index}`}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                          {acc.name}
                        </span>

                        {acc.isActive ? (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            Non-aktif
                          </span>
                        )}

                        {acc.lastStatus === 'success' && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Terverifikasi
                          </span>
                        )}
                        {acc.lastStatus === 'failed' && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            Error Terakhir
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {acc.gmailUser}
                        </span>
                        <span>•</span>
                        <span>Pengirim: <strong>{acc.fromName}</strong></span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{acc.host}:{acc.port}</span>
                      </div>

                      {/* Stats & Error message */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5 flex-wrap">
                        <span>Sukses: <strong className="text-emerald-600">{acc.successCount || 0}</strong></span>
                        <span>Gagal: <strong className="text-rose-500">{acc.failCount || 0}</strong></span>
                        {acc.lastTestedAt && (
                          <span>Uji Terakhir: {new Date(acc.lastTestedAt).toLocaleTimeString('id-ID')}</span>
                        )}
                      </div>

                      {acc.lastErrorMessage && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                          Log error: {acc.lastErrorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    {/* Priority Reordering */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
                      <button
                        onClick={() => handleMovePriority(index, 'up')}
                        disabled={isFirst}
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 transition-colors"
                        title="Naikkan Prioritas (Jadikan Lebih Utama)"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMovePriority(index, 'down')}
                        disabled={isLast}
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 transition-colors"
                        title="Turunkan Prioritas"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Toggle Active */}
                    <button
                      onClick={() => handleToggleActive(acc)}
                      className={`p-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
                        acc.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                      title={acc.isActive ? 'Non-aktifkan akun ini' : 'Aktifkan akun ini'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    {/* Test Single */}
                    <button
                      onClick={() => handleTestSingle(acc)}
                      disabled={isTesting || !acc.isActive}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                      title="Test kirim email dari akun ini saja"
                    >
                      {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Uji Akun</span>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEditModal(acc)}
                      className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Kredensial"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteAccount(acc.id, acc.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Hapus Akun"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guide: How to get Gmail App Password & Sender Avatar Branding */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: App Password Guide */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>Cara Kerja Failover Multi-SMTP & Sandi Aplikasi</span>
          </h4>
          <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              <strong>Prinsip Failover:</strong> Sistem selalu mendahulukan <strong>Akun #1</strong>. Jika kuota Google habis (500 email/hari) atau timeout, server otomatis mengirim via <strong>Akun #2</strong>, dst.
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 pt-1">
              <li>
                Buka Akun Google di{' '}
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5"
                >
                  myaccount.google.com/security <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Aktifkan <strong>Verifikasi 2 Langkah</strong> pada akun Gmail Anda.</li>
              <li>
                Buka menu <strong>"Sandi Aplikasi"</strong> di{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5"
                >
                  myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Salin 16 karakter sandi aplikasi ke form akun di atas.</li>
            </ol>
          </div>
        </div>

        {/* Card 2: Sender Profile Picture & Icon Branding Guide */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/40 dark:to-slate-900/60 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50 p-5 space-y-3 text-xs">
          <h4 className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Cara Menyamakan Foto Profil Pengirim Jadi Icon Aplikasi</span>
          </h4>
          <div className="space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              <strong>Mengapa muncul foto akun Gmail?</strong> Aplikasi Gmail (Android/iOS/Web) menampilkan foto profil pengirim berdasarkan <strong>Foto Profil Akun Google</strong> dari alamat email SMTP tersebut.
            </p>
            <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
              <strong className="text-slate-900 dark:text-slate-100 block">Langkah agar foto pengirim menjadi Icon Aplikasi:</strong>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-600 dark:text-slate-300">
                <li>
                  Buka profil Google email SMTP di{' '}
                  <a
                    href="https://myaccount.google.com/personal-info"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5"
                  >
                    myaccount.google.com/personal-info <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </li>
                <li>Klik pada <strong>Foto Profil Akun Google</strong> lalu unggah gambar/logo Icon Aplikasi.</li>
                <li>Atur <em>Nama Pengirim</em> pada form SMTP di atas (contoh: <code>DataForge API Studio</code>).</li>
              </ol>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              Setelah foto profil Google diganti dengan icon aplikasi, semua email yang dikirim lewat akun tersebut otomatis menampilkan icon aplikasi di kontak dan inbox Gmail penerima!
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Tambah / Edit Akun Gmail SMTP */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {editingId ? 'Edit Akun Gmail SMTP' : 'Tambah Akun Gmail SMTP Baru'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Kredensial disimpan terenkripsi di server (bukan di .env)
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama / Label Akun
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Gmail Utama (Admin), Gmail Cadangan 1"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alamat Gmail Pengirim
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.gmailUser}
                    onChange={e => setFormData({ ...formData, gmailUser: e.target.value })}
                    placeholder="akunanda@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pengirim (Display)
                  </label>
                  <input
                    type="text"
                    value={formData.fromName}
                    onChange={e => setFormData({ ...formData, fromName: e.target.value })}
                    placeholder="DataForge API Studio"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google App Password (16 Karakter)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingId}
                    value={formData.gmailAppPassword}
                    onChange={e => setFormData({ ...formData, gmailAppPassword: e.target.value })}
                    placeholder={editingId ? '•••••••••••••••• (Kosongkan jika tidak ingin diubah)' : '16-karakter sandi aplikasi'}
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Bukan password login akun Google biasa, melainkan 16-karakter sandi aplikasi dari myaccount.google.com/apppasswords.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Host SMTP
                  </label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={e => setFormData({ ...formData, host: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={e => setFormData({ ...formData, port: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="account-active"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="account-active" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  Aktifkan akun ini dalam antrean pengiriman email
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{saving ? 'Menyimpan...' : 'Simpan Akun SMTP'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
