import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Database,
  Layers,
  Terminal,
  Server,
  HelpCircle,
  ExternalLink,
  Table,
  Key,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Language } from '../types';

interface MysqlSchemaViewProps {
  language: Language;
  onNavigateToConnection: () => void;
}

export function MysqlSchemaView({ language, onNavigateToConnection }: MysqlSchemaViewProps) {
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'tables' | 'guide'>('sql');

  useEffect(() => {
    fetch('/api/db/schema-sql')
      .then(res => res.text())
      .then(text => {
        setSchemaSql(text);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch schema SQL:', err);
        setLoading(false);
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([schemaSql], { type: 'text/sql' });
    element.href = URL.createObjectURL(file);
    element.download = 'dataforge_schema.mysql.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 text-white rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">Struktur Skema Database MySQL (DDL)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  MySQL 5.7+ / 8.0+ / 8.4+ & MariaDB
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Skema tabel resmi yang dapat langsung Anda jalankan di phpMyAdmin, MySQL Workbench, DBeaver, VPS CLI, atau Cloud MySQL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Semua SQL'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Unduh .SQL</span>
            </button>

            <button
              onClick={onNavigateToConnection}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Server className="w-4 h-4" />
              <span>Sambungkan DB Online</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'sql'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Skrip SQL Lengkap</span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'tables'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Relasi & Struktur Tabel</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'guide'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Panduan Cara Menjalankan</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Full SQL Script Box */}
      {activeTab === 'sql' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
              </div>
              <span className="text-xs font-mono text-slate-300 ml-2">schema.mysql.sql</span>
            </div>

            <button
              onClick={handleCopy}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin SQL'}</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 max-h-[600px] overflow-y-auto font-mono text-xs text-indigo-100/90 leading-relaxed selection:bg-indigo-500 selection:text-white">
            {loading ? (
              <div className="py-12 text-center text-slate-500">Memuat skrip SQL...</div>
            ) : (
              <pre className="whitespace-pre-wrap">{schemaSql}</pre>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Visual ERD & Table Definitions */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Table 1: df_projects */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Database className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono">df_projects</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 mb-3">
                Menyimpan daftar project database beserta Master API Access Token.
              </p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold">
                  <span className="flex items-center gap-1"><Key className="w-3 h-3 text-amber-500" /> id</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(64) PK</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>name</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(255)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>description</span>
                  <span className="text-[10px] text-slate-400">TEXT</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold">
                  <span>token</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(128) UNIQUE</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>created_at</span>
                  <span className="text-[10px] text-slate-400">DATETIME</span>
                </div>
              </div>
            </div>

            {/* Table 2: df_tables */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Table className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono">df_tables</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 mb-3">
                Menyimpan struktur tabel, daftar kolom schema (JSON), dan token terisolasi tabel.
              </p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold">
                  <span className="flex items-center gap-1"><Key className="w-3 h-3 text-amber-500" /> id</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(64) PK</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
                  <span>project_id</span>
                  <span className="text-[10px] text-slate-400">FK -&gt; df_projects</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>slug</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(128)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>token</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(128) NULL</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>fields</span>
                  <span className="text-[10px] text-slate-400">LONGTEXT (JSON)</span>
                </div>
              </div>
            </div>

            {/* Table 3: df_records */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Layers className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono">df_records</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 mb-3">
                Menyimpan data baris/records yang dapat di-CRUD melalui REST API endpoints.
              </p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold">
                  <span className="flex items-center gap-1"><Key className="w-3 h-3 text-amber-500" /> table_id, id</span>
                  <span className="text-[10px] text-slate-400">COMPOSITE PK</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                  <span>table_id</span>
                  <span className="text-[10px] text-slate-400">FK -&gt; df_tables</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
                  <span>project_id</span>
                  <span className="text-[10px] text-slate-400">FK -&gt; df_projects</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>data</span>
                  <span className="text-[10px] text-slate-400">LONGTEXT (JSON)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>updated_at</span>
                  <span className="text-[10px] text-slate-400">DATETIME</span>
                </div>
              </div>
            </div>

            {/* Table 4: df_smtp_accounts */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Server className="w-4 h-4 text-cyan-600" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono">df_smtp_accounts</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 mb-3">
                Menyimpan pool akun SMTP Gmail multi-failover yang persisten di cloud database.
              </p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-bold">
                  <span className="flex items-center gap-1"><Key className="w-3 h-3 text-amber-500" /> id</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(64) PK</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>gmail_user</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(255)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>gmail_app_password</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(255)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>order_num, is_active</span>
                  <span className="text-[10px] text-slate-400">INT / TINYINT</span>
                </div>
              </div>
            </div>

            {/* Table 5: df_users */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono">df_users</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 mb-3">
                Pengguna & hak akses RBAC (superadmin, admin, user) dan status verifikasi email.
              </p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold">
                  <span className="flex items-center gap-1"><Key className="w-3 h-3 text-amber-500" /> id</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(64) PK</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>email</span>
                  <span className="text-[10px] text-slate-400">VARCHAR(255) UNIQUE</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>role</span>
                  <span className="text-[10px] text-slate-400">ENUM</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span>is_verified, is_active</span>
                  <span className="text-[10px] text-slate-400">TINYINT(1)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Execution Guide */}
      {activeTab === 'guide' && (
        <div className="space-y-4 text-xs">
          {/* phpMyAdmin Guide */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">1</span>
              Cara Menjalankan di phpMyAdmin (XAMPP / cPanel / Hosting)
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
              <li>Buka phpMyAdmin di browser Anda (misal: <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">http://localhost/phpmyadmin</code>).</li>
              <li>Klik menu tab <strong>"Import"</strong> di bagian atas.</li>
              <li>Pilih file <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">schema.mysql.sql</code> yang telah Anda unduh, lalu klik tombol <strong>"Go / Kirim"</strong>.</li>
              <li>Atau klik tab <strong>"SQL"</strong>, tempelkan skrip yang telah Anda salin dengan tombol "Salin Semua SQL", lalu klik <strong>"Go"</strong>.</li>
              <li>Database <code className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded font-mono font-bold">dataforge_db</code> beserta seluruh tabel dan seed data awal akan langsung terbuat sempurna.</li>
            </ol>
          </div>

          {/* MySQL CLI Guide */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">2</span>
              Cara Menjalankan via Terminal / MySQL CLI (VPS / Linux / Windows)
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Jalankan perintah berikut di command line terminal Anda:
            </p>
            <div className="bg-slate-950 text-indigo-200 p-3.5 rounded-xl font-mono text-xs overflow-x-auto">
              # Import langsung ke server MySQL Anda:<br />
              mysql -u root -p &lt; database/schema.mysql.sql<br /><br />
              # Atau jika menggunakan host remote:<br />
              mysql -h db.domainanda.com -u nama_user -p dataforge_db &lt; database/schema.mysql.sql
            </div>
          </div>

          {/* Cloud MySQL Guide */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">3</span>
              Penyedia Cloud Database MySQL Gratis / Siap Pakai
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Jika Anda belum memiliki server MySQL online sendiri, Anda dapat menggunakan layanan cloud gratis yang langsung memberikan host, port, user, dan SSL gratis:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">TiDB Cloud (Serverless)</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Free 5GB MySQL-compatible database dengan SSL aktif otomatis.</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">Aiven Cloud MySQL</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Managed MySQL gratis dengan performa tinggi dan backup otomatis.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
