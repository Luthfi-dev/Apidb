import React, { useState, useEffect } from 'react';
import { DatabaseProject, DatabaseTable } from '../types';
import {
  Terminal,
  Send,
  RefreshCw,
  Code2,
  Key,
  Copy,
  Check,
  Sparkles,
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  Lock,
  WifiOff
} from 'lucide-react';
import { Language, translations } from '../translations';

interface ApiSandboxViewProps {
  project: DatabaseProject;
  tables: DatabaseTable[];
  activeTable: DatabaseTable | null;
  language: Language;
  onDataModified?: () => void;
}

export function ApiSandboxView({
  project,
  tables,
  activeTable,
  language,
  onDataModified
}: ApiSandboxViewProps) {
  const t = translations[language];

  const [selectedTableSlug, setSelectedTableSlug] = useState<string>('');
  const [authMode, setAuthMode] = useState<'header' | 'url'>('header');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [recordIdParam, setRecordIdParam] = useState<string>('');
  const [requestBody, setRequestBody] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);

  useEffect(() => {
    if (activeTable) {
      setSelectedTableSlug(activeTable.slug);
    } else if (tables.length > 0) {
      setSelectedTableSlug(tables[0].slug);
    }
  }, [activeTable, tables]);

  const generateSampleBody = (method: 'POST' | 'PUT', tableSlug: string) => {
    const table = tables.find(tbl => tbl.slug === tableSlug);
    if (!table) return '';

    const sample: Record<string, any> = {};
    table.fields.forEach(f => {
      if (!f.isPrimaryKey && f.key !== 'id') {
        if (f.type === 'number') {
          if (f.key.includes('harga') || f.key.includes('bayar')) sample[f.key] = 250000;
          else if (f.key.includes('stok')) sample[f.key] = 10;
          else sample[f.key] = 100;
        } else if (f.type === 'boolean') {
          sample[f.key] = true;
        } else if (f.type === 'date') {
          sample[f.key] = new Date().toISOString().split('T')[0];
        } else if (f.type === 'email') {
          sample[f.key] = 'pengguna@domain.com';
        } else if (f.type === 'select' && f.options && f.options.length > 0) {
          sample[f.key] = f.options[0];
        } else {
          sample[f.key] = method === 'PUT' ? `Update ${f.label}` : `Baru ${f.label}`;
        }
      }
    });
    return JSON.stringify(sample, null, 2);
  };

  useEffect(() => {
    if (httpMethod === 'POST') {
      setRequestBody(generateSampleBody('POST', selectedTableSlug));
    } else if (httpMethod === 'PUT') {
      if (!recordIdParam.trim()) setRecordIdParam('1');
      setRequestBody(generateSampleBody('PUT', selectedTableSlug));
    } else if (httpMethod === 'DELETE') {
      if (!recordIdParam.trim()) setRecordIdParam('1');
      setRequestBody('');
    } else {
      setRequestBody('');
    }
  }, [httpMethod, selectedTableSlug]);

  const currentTable = tables.find(t => t.slug === selectedTableSlug) || tables[0];
  const activeToken = currentTable?.token || project.token;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  let targetPath = '';
  if (authMode === 'header') {
    targetPath = `/api/v1/${selectedTableSlug}`;
    if (httpMethod !== 'POST' && recordIdParam.trim()) {
      targetPath += `/${recordIdParam.trim()}`;
    }
  } else {
    targetPath = `/api/v1/${activeToken}/${selectedTableSlug}`;
    if (httpMethod !== 'POST' && recordIdParam.trim()) {
      targetPath += `/${recordIdParam.trim()}`;
    }
  }

  const fullUrl = `${baseUrl}${targetPath}`;

  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseData(null);

    if ((httpMethod === 'PUT' || httpMethod === 'DELETE') && !recordIdParam.trim()) {
      alert('Mohon masukkan ID record yang ingin diproses!');
      setIsLoading(false);
      return;
    }

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json'
      };

      if (authMode === 'header') {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const options: RequestInit = {
        method: httpMethod,
        headers
      };

      if (httpMethod === 'POST' || httpMethod === 'PUT') {
        let parsedBody: any = {};
        if (requestBody.trim()) {
          try {
            parsedBody = JSON.parse(requestBody);
          } catch (e: any) {
            alert('Request Body bukan format JSON yang valid!');
            setIsLoading(false);
            return;
          }
        }
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(parsedBody);
      }

      const startTime = performance.now();
      const res = await fetch(fullUrl, options);
      const duration = Math.round(performance.now() - startTime);

      setResponseStatus(res.status);
      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = { message: 'Respon diterima' };
      }

      setResponseData({
        _latency: `${duration}ms`,
        _status: res.status,
        _auth: authMode === 'header' ? 'Authorization: Bearer <TOKEN> (Paling Aman)' : 'URL Path Token (Legacy)',
        ...json
      });

      if (['POST', 'PUT', 'DELETE'].includes(httpMethod) && res.ok && onDataModified) {
        onDataModified();
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({
        error: err.message || 'Gagal mengirim request ke server'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (!responseData) return;
    navigator.clipboard.writeText(JSON.stringify(responseData, null, 2));
    setCopiedRes(true);
    setTimeout(() => setCopiedRes(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyHeader = () => {
    navigator.clipboard.writeText(`Authorization: Bearer ${project.token}`);
    setCopiedHeader(true);
    setTimeout(() => setCopiedHeader(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                Interactive API Console
              </span>
              <span className="text-xs text-slate-300 font-mono">Real-Time Database Sync</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Bearer Auth Enabled
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold">Live REST API Sandbox: {project.name}</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Kirim permintaan GET, POST, PUT, dan DELETE secara langsung ke database ini. Tersedia opsi pengiriman token via <strong>HTTP Header (Paling Aman)</strong> atau via URL Path (Legacy).
            </p>
          </div>
        </div>
      </div>

      {/* Main Request & Response Workbench */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Request Setup Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-950/60">
          {/* Header Row: Title & Auth Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Konfigurasi Request HTTP</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono lowercase">v1 rest api</span>
            </div>

            {/* Auth Mode Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setAuthMode('header')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  authMode === 'header'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Header Bearer (Aman)</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('url')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  authMode === 'url'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>URL Path (Legacy)</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Method */}
            <select
              value={httpMethod}
              onChange={e => setHttpMethod(e.target.value as any)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                httpMethod === 'GET'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                  : httpMethod === 'POST'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                  : httpMethod === 'PUT'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              <option value="GET">GET (Ambil)</option>
              <option value="POST">POST (Tambah)</option>
              <option value="PUT">PUT (Update)</option>
              <option value="DELETE">DELETE (Hapus)</option>
            </select>

            {/* Table */}
            <select
              value={selectedTableSlug}
              onChange={e => setSelectedTableSlug(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1 min-w-0"
            >
              {tables.map(tbl => (
                <option key={tbl.id} value={tbl.slug}>
                  Tabel: {tbl.name} (/{tbl.slug})
                </option>
              ))}
            </select>

            {/* ID Input */}
            {httpMethod !== 'POST' && (
              <div className="w-full sm:w-40">
                <input
                  type="text"
                  value={recordIdParam}
                  onChange={e => setRecordIdParam(e.target.value)}
                  placeholder={httpMethod === 'GET' ? 'ID (opsional)' : 'ID Record (#1)'}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSendRequest}
              disabled={isLoading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Kirim Request</span>
            </button>
          </div>

          {/* POST Auto-increment info */}
          {httpMethod === 'POST' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
              <Key className="w-3.5 h-3.5 shrink-0" />
              <span>Primary Key (#ID) akan di-generate otomatis oleh database secara incremental layaknya MySQL.</span>
            </div>
          )}

          {/* Endpoint URL & Header Previews */}
          <div className="space-y-1.5 pt-1 text-xs text-slate-500">
            {/* URL */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="font-semibold shrink-0">Target URL:</span>
                <code className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 truncate flex-1 min-w-0">
                  {fullUrl}
                </code>
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-1 hover:text-indigo-600 text-slate-400 shrink-0"
                title="Salin URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Header (when authMode === header) */}
            {authMode === 'header' && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    HTTP Header:
                  </span>
                  <code className="font-mono text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50 truncate flex-1 min-w-0">
                    Authorization: Bearer {project.token}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyHeader}
                  className="p-1 hover:text-emerald-600 text-slate-400 shrink-0"
                  title="Salin Header"
                >
                  {copiedHeader ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Body Editor & Response Preview Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Request Body Column */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-indigo-500" />
                <span>
                  {httpMethod === 'POST' || httpMethod === 'PUT' ? 'Request Body (JSON):' : 'Request Payload:'}
                </span>
              </label>

              {(httpMethod === 'POST' || httpMethod === 'PUT') && (
                <button
                  type="button"
                  onClick={() => setRequestBody(generateSampleBody(httpMethod, selectedTableSlug))}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Reset Format Contoh</span>
                </button>
              )}
            </div>

            {httpMethod === 'POST' || httpMethod === 'PUT' ? (
              <textarea
                rows={12}
                value={requestBody}
                onChange={e => setRequestBody(e.target.value)}
                className="w-full p-4 font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                placeholder='{\n  "nama": "Contoh Data"\n}'
              />
            ) : (
              <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-400 text-xs flex flex-col items-center justify-center min-h-[220px]">
                <Terminal className="w-8 h-8 mb-2 opacity-30 text-indigo-500" />
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {httpMethod === 'GET' ? 'Metode GET tidak membutuhkan Request Body' : 'Metode DELETE tidak membutuhkan Request Body'}
                </span>
                <span className="text-[11px] mt-1 text-slate-400 max-w-xs">
                  {httpMethod === 'GET'
                    ? 'Permintaan GET mengambil data langsung dari parameter URL tabel dan ID.'
                    : 'Permintaan DELETE menghapus data berdasarkan parameter ID yang ditentukan di URL.'}
                </span>
              </div>
            )}
          </div>

          {/* Response Column */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Response Server Output:
                </span>
                {responseStatus !== null && (
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    HTTP {responseStatus}
                  </span>
                )}
              </div>

              {responseData && (
                <button
                  type="button"
                  onClick={handleCopyResponse}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedRes ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRes ? t.copied : 'Salin JSON'}</span>
                </button>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 min-h-[220px] max-h-[340px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Mengirimkan request ke REST API...</span>
                </div>
              ) : responseData ? (
                <pre className="whitespace-pre-wrap break-all text-emerald-400">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              ) : (
                <div className="py-16 text-center text-slate-500">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-600" />
                  <p className="font-semibold text-slate-400">Belum ada request yang dikirim</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tekan tombol "Kirim Request" di atas untuk menguji respon API secara langsung.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
