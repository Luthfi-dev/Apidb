import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Lock,
  Download,
  Copy,
  Check,
  Globe,
  Layers,
  FileCode,
  ShieldCheck,
  Unplug,
  KeyRound,
  Terminal,
  Info
} from 'lucide-react';
import { MySQLStatus, Language, EnvDbConfigInfo } from '../types';
import { DatabaseExplorerModal } from './DatabaseExplorerModal';

interface OnlineDatabaseViewProps {
  language: Language;
  onNavigateToSchema: () => void;
  onDataSynced?: () => void;
}

export function OnlineDatabaseView({ language, onNavigateToSchema, onDataSynced }: OnlineDatabaseViewProps) {
  const [status, setStatus] = useState<MySQLStatus | null>(null);
  const [envConfig, setEnvConfig] = useState<EnvDbConfigInfo | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Testing & Connection states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);

  // Fetch current status and config from server
  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }

      const cfgRes = await fetch('/api/db/config');
      if (cfgRes.ok) {
        const cfg: EnvDbConfigInfo = await cfgRes.json();
        setEnvConfig(cfg);
      }
    } catch (err) {
      console.error('Failed to load DB status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setConnectMessage(null);

    try {
      const res = await fetch('/api/db/test-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || 'Gagal melakukan tes koneksi dari .env' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReconnect = async () => {
    setIsConnecting(true);
    setConnectMessage(null);

    try {
      const res = await fetch('/api/db/reconnect-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (data.success) {
        setConnectMessage({ type: 'success', text: data.message || 'Berhasil terhubung ke database online MySQL dari konfigurasi .env!' });
        await fetchStatus();
        if (onDataSynced) onDataSynced();
      } else {
        setConnectMessage({ type: 'error', text: data.error || data.message || 'Gagal menghubungkan ke MySQL' });
      }
    } catch (err: any) {
      setConnectMessage({ type: 'error', text: err.message || 'Terjadi kesalahan jaringan' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Putuskan koneksi ke MySQL online dan beralih kembali ke penyimpanan lokal data.json?')) return;
    setIsConnecting(true);
    try {
      const res = await fetch('/api/db/disconnect', { method: 'POST' });
      if (res.ok) {
        setConnectMessage({ type: 'success', text: 'Koneksi MySQL diputus. Sistem kembali ke mode berkas lokal.' });
        await fetchStatus();
        if (onDataSynced) onDataSynced();
      }
    } catch (err: any) {
      alert('Gagal memutuskan koneksi: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncPush = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/db/sync-to-mysql', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Berhasil sinkronisasi ke MySQL: ${data.projectsCount} Database, ${data.tablesCount} Tabel, ${data.recordsCount} Record.`);
        await fetchStatus();
      } else {
        alert('Gagal sinkronisasi: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error saat sinkronisasi: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncPull = async () => {
    if (!confirm('Tarik data dari MySQL online? Data di memori lokal akan disesuaikan dengan isi MySQL.')) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/db/sync-from-mysql', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Berhasil memuat dari MySQL: ${data.projectsCount} Database, ${data.tablesCount} Tabel, ${data.recordsCount} Record.`);
        await fetchStatus();
        if (onDataSynced) onDataSynced();
      } else {
        alert('Gagal memuat dari MySQL: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error saat memuat dari MySQL: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const envTemplateCode = `# ====================================================================
# Konfigurasi Database Online MySQL (DataForge API Studio)
# Simpan variabel ini di berkas .env pada root direktori aplikasi
# ====================================================================

# Opsi 1: Menggunakan Parameter Terpisah
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=dataforge_db
DB_SSL=false

# Opsi 2: Menggunakan Connection URI (PlanetScale, TiDB Cloud, Aiven, dll)
# DATABASE_URL=mysql://username:password@host.example.com:3306/dataforge_db?sslmode=require`;

  const copyEnvTemplate = () => {
    navigator.clipboard.writeText(envTemplateCode);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const isConnected = Boolean(status?.connected && status?.engine === 'mysql');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">Koneksi Database Online (Environment .env)</h2>
                {isConnected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    MySQL Online Terhubung
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Mode Lokal (data.json)
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Read-Only dari .env
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Kredensial database online dibaca secara <strong>otomatis dan aman dari Environment Variables (<code className="text-cyan-300 font-mono">.env</code>)</strong> server. Superadmin hanya dapat membaca status dan melakukan uji koneksi tanpa risiko input kredensial bocor ke UI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsExplorerOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Lihat Isi DB</span>
            </button>
            <button
              onClick={onNavigateToSchema}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Struktur SQL Database</span>
            </button>
            <button
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs border border-slate-700 transition-all shadow-sm"
              title="Perbarui Status"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <DatabaseExplorerModal isOpen={isExplorerOpen} onClose={() => setIsExplorerOpen(false)} language={language} />

      {/* Alert Messages */}
      {connectMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-xs ${
            connectMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {connectMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{connectMessage.text}</span>
        </div>
      )}

      {/* Grid: Read-Only Env Config vs Live Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Read-Only Environment Variables Config */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                    Konfigurasi Terdeteksi dari Environment (.env)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nilai diambil langsung oleh Node.js dari process.env
                  </p>
                </div>
              </div>

              {envConfig?.isConfiguredInEnv ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  Tersedia di .env
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  Belum Lengkap di .env
                </span>
              )}
            </div>

            {/* Read-Only Parameters Display */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              {envConfig?.uri ? (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>DATABASE_URL / MYSQL_URL (Connection URI)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">Aktif</span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 break-all">
                    {envConfig.uri}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      DB_HOST / MYSQL_HOST
                    </label>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{envConfig?.host || 'localhost'}</span>
                      {envConfig?.envVariablesDetected.hasDbHost ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="text-[10px] text-slate-400">bawaan</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      DB_PORT / MYSQL_PORT
                    </label>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{envConfig?.port || 3306}</span>
                      {envConfig?.envVariablesDetected.hasDbPort ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="text-[10px] text-slate-400">bawaan</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      DB_USER / MYSQL_USER
                    </label>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{envConfig?.user || '(kosong)'}</span>
                      {envConfig?.envVariablesDetected.hasDbUser && (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      DB_PASSWORD / MYSQL_PASSWORD
                    </label>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{envConfig?.hasPassword ? '••••••••••••' : '(tidak diatur)'}</span>
                      {envConfig?.hasPassword ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="text-[10px] text-amber-500">kosong</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      DB_NAME / MYSQL_DATABASE
                    </label>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{envConfig?.database || 'dataforge_db'}</span>
                      {envConfig?.envVariablesDetected.hasDbName && (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      DB_SSL / MYSQL_SSL
                    </label>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{envConfig?.ssl ? 'Aktif (TLS/SSL)' : 'Non-SSL'}</span>
                      <span className="text-[10px] text-slate-400">{envConfig?.ssl ? 'true' : 'false'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Kredensial dilindungi oleh sistem dan tidak dapat diubah dari form input demi keamanan.</span>
              </div>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {testResult.success
                      ? `Koneksi MySQL Sukses (${testResult.latencyMs} ms)`
                      : 'Koneksi MySQL Gagal'}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {testResult.success
                      ? 'Server database MySQL online berhasil merespons kueri ping.'
                      : testResult.error}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || isConnecting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                <span>Uji Koneksi dari ENV</span>
              </button>

              <button
                onClick={handleReconnect}
                disabled={isConnecting || isTesting}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                <span>{isConnected ? 'Sinkronkan Ulang dari ENV' : 'Hubungkan ke Database Online'}</span>
              </button>

              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  disabled={isConnecting}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 rounded-xl text-xs font-bold transition-all border border-rose-200 dark:border-rose-800 flex items-center gap-1.5"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  <span>Putuskan</span>
                </button>
              )}
            </div>
          </div>

          {/* Sync Controls (Push / Pull) */}
          {isConnected && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Sinkronisasi Data Manual</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data otomatis tersinkronisasi saat ada mutasi (Insert/Update/Delete). Anda juga dapat melakukan sinkronisasi penuh manual di bawah ini:
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  onClick={handleSyncPush}
                  disabled={isSyncing}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Unggah Semua Data Lokal ke MySQL</span>
                </button>
                <button
                  onClick={handleSyncPull}
                  disabled={isSyncing}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tarik Data Terbaru dari MySQL</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Live Status, Metrics, and ENV Setup Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Status & Health Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Status Engine & Metrik Database</span>
            </h3>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Status Mesin</span>
                <span className={`font-bold flex items-center gap-1.5 ${isConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isConnected ? 'MySQL Online Aktif' : 'Penyimpanan Berkas Lokal (data.json)'}
                </span>
              </div>

              {isConnected && (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Latensi Respons</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {status?.latencyMs !== undefined ? `${status.latencyMs} ms` : '-'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Total Tabel Terdaftar</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {status?.tablesCount ?? 0} tabel
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Total Records Tersimpan</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {status?.recordsCount ?? 0} records
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Terakhir Terhubung</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                      {status?.lastConnectedAt ? new Date(status.lastConnectedAt).toLocaleTimeString('id-ID') : 'Baru saja'}
                    </span>
                  </div>
                </>
              )}

              {status?.error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                  <div className="font-bold flex items-center gap-1 mb-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pesan Galat Terakhir:
                  </div>
                  <div className="font-mono text-[11px] leading-relaxed">{status.error}</div>
                </div>
              )}
            </div>
          </div>

          {/* Setup Guide for .env */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-600" />
                <span>Format Variabel Lingkungan (.env)</span>
              </h3>
              <button
                onClick={copyEnvTemplate}
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors flex items-center gap-1"
              >
                {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEnv ? 'Tersalin' : 'Salin .env'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Tambahkan variabel berikut ke file <code className="text-indigo-600 dark:text-indigo-400 font-mono">.env</code> Anda pada server / hosting:
            </p>

            <pre className="p-3.5 bg-slate-950 text-slate-200 rounded-xl font-mono text-[10px] sm:text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{envTemplateCode}
            </pre>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Setelah mengubah file <code className="font-bold font-mono">.env</code>, klik tombol <strong>"Sinkronkan Ulang dari ENV"</strong> atau mulai ulang server untuk menerapkan konfigurasi baru.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
