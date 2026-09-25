import React, { useState, useEffect } from 'react';
import { DatabaseProject, DatabaseTable } from '../types';
import {
  X,
  Play,
  Copy,
  Check,
  Terminal,
  Send,
  RefreshCw,
  Code2,
  Key,
  Info,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Lock,
  Search,
  Filter,
  FileText,
  FileCode,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react';
import { Language, translations } from '../translations';

interface ApiPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DatabaseProject;
  tables: DatabaseTable[];
  activeTable: DatabaseTable | null;
  language: Language;
  onDataModified?: () => void;
}

export function ApiPlaygroundModal({
  isOpen,
  onClose,
  project,
  tables,
  activeTable,
  language,
  onDataModified
}: ApiPlaygroundModalProps) {
  const t = translations[language];

  const [selectedTableSlug, setSelectedTableSlug] = useState<string>('');
  const [authMode, setAuthMode] = useState<'header' | 'url'>('header');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [recordIdParam, setRecordIdParam] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [requestBody, setRequestBody] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);

  // Sync selected table on open
  useEffect(() => {
    if (activeTable) {
      setSelectedTableSlug(activeTable.slug);
    } else if (tables.length > 0) {
      setSelectedTableSlug(tables[0].slug);
    }
  }, [activeTable, tables, isOpen]);

  // Generate sample request body and handle default ID
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

  if (!isOpen) return null;

  const currentTable = tables.find(t => t.slug === selectedTableSlug) || tables[0];
  const activeToken = currentTable?.token || project.token;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Determine actual target endpoint URL based on Auth Mode and Method
  let targetPath = '';
  if (authMode === 'header') {
    targetPath = `/api/v1/${selectedTableSlug}`;
    if (httpMethod !== 'POST' && recordIdParam.trim()) {
      targetPath += `/${recordIdParam.trim()}`;
    }
  } else {
    // Legacy URL Path Token
    targetPath = `/api/v1/${activeToken}/${selectedTableSlug}`;
    if (httpMethod !== 'POST' && recordIdParam.trim()) {
      targetPath += `/${recordIdParam.trim()}`;
    }
  }

  if (httpMethod === 'GET' && searchQuery.trim() && !recordIdParam.trim()) {
    targetPath += `?search=${encodeURIComponent(searchQuery.trim())}`;
  }

  const fullUrl = `${baseUrl}${targetPath}`;

  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseData(null);

    // Validation for PUT/DELETE
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
            alert('Request Body bukan format JSON yang valid! Silakan periksa tanda kurung atau koma.');
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
        _auth: authMode === 'header' ? 'Authorization: Bearer <TOKEN>' : 'URL Path Token',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Live REST API Playground & Sandbox
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                Database: <span className="font-semibold text-slate-800 dark:text-slate-200">{project.name}</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playground Interactive Body */}
        <div className="p-3.5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Quick Scenario Preset Strip */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Pilih Skenario Pengujian Cepat:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => {
                  setHttpMethod('GET');
                  setRecordIdParam('');
                  setSearchQuery('');
                }}
                className={`px-2.5 py-1.5 rounded-lg border font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  httpMethod === 'GET' && !recordIdParam && !searchQuery
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ambil Semua Data</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHttpMethod('GET');
                  setRecordIdParam('1');
                  setSearchQuery('');
                }}
                className={`px-2.5 py-1.5 rounded-lg border font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  httpMethod === 'GET' && recordIdParam === '1'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Get 1 Data (#1)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHttpMethod('GET');
                  setRecordIdParam('');
                  setSearchQuery('a');
                }}
                className={`px-2.5 py-1.5 rounded-lg border font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  httpMethod === 'GET' && searchQuery !== ''
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Cari Data (?search=)</span>
              </button>

              <button
                type="button"
                onClick={() => setHttpMethod('POST')}
                className={`px-2.5 py-1.5 rounded-lg border font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  httpMethod === 'POST'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah (POST)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHttpMethod('PUT');
                  setRecordIdParam('1');
                }}
                className={`px-2.5 py-1.5 rounded-lg border font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  httpMethod === 'PUT'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit (PUT)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHttpMethod('DELETE');
                  setRecordIdParam('1');
                }}
                className={`px-2.5 py-1.5 rounded-lg border font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  httpMethod === 'DELETE'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus (DELETE)</span>
              </button>
            </div>
          </div>

          {/* Security & Auth Mode Selector */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Metode Autentikasi Token:</span>
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setAuthMode('header')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                    authMode === 'header'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Header Bearer (Aman)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('url')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    authMode === 'url'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>URL Path (Legacy)</span>
                </button>
              </div>
            </div>

            {/* Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              {/* Method Selector */}
              <select
                value={httpMethod}
                onChange={e => setHttpMethod(e.target.value as any)}
                className={`sm:col-span-3 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  httpMethod === 'GET'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                    : httpMethod === 'POST'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                    : httpMethod === 'PUT'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                <option value="GET">GET (Ambil / Search)</option>
                <option value="POST">POST (Tambah)</option>
                <option value="PUT">PUT (Update)</option>
                <option value="DELETE">DELETE (Hapus)</option>
              </select>

              {/* Table Selector */}
              <select
                value={selectedTableSlug}
                onChange={e => setSelectedTableSlug(e.target.value)}
                className="sm:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 min-w-0"
              >
                {tables.map(tbl => (
                  <option key={tbl.id} value={tbl.slug}>
                    Tabel: {tbl.name} (/{tbl.slug})
                  </option>
                ))}
              </select>

              {/* Dynamic Inputs for GET, PUT, DELETE */}
              {httpMethod === 'GET' ? (
                <>
                  <input
                    type="text"
                    value={recordIdParam}
                    onChange={e => {
                      setRecordIdParam(e.target.value);
                      if (e.target.value) setSearchQuery('');
                    }}
                    placeholder="ID (#1)"
                    className="sm:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    title="Isi ID untuk get 1 data spesifik"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      if (e.target.value) setRecordIdParam('');
                    }}
                    placeholder="?search="
                    className="sm:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono text-cyan-600 dark:text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    title="Isi kata kunci pencarian"
                  />
                </>
              ) : httpMethod !== 'POST' ? (
                <input
                  type="text"
                  value={recordIdParam}
                  onChange={e => setRecordIdParam(e.target.value)}
                  placeholder="ID Record (#1)"
                  className="sm:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : null}
            </div>

            {/* Send Request Button */}
            <button
              type="button"
              onClick={handleSendRequest}
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Kirim Request REST API</span>
            </button>

            {/* Note for POST: AUTO_INCREMENT ID badge */}
            {httpMethod === 'POST' && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                <Key className="w-3.5 h-3.5 shrink-0" />
                <span>Primary Key (#ID) dibuat otomatis oleh sistem secara incremental.</span>
              </div>
            )}

            {/* Header / URL Inspector */}
            <div className="pt-1 space-y-1.5 text-xs text-slate-500">
              {/* Endpoint URL */}
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="font-semibold shrink-0">URL Endpoint:</span>
                  <code className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 truncate flex-1 min-w-0">
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

              {/* Header preview when Header Auth is active */}
              {authMode === 'header' && (
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Header:</span>
                    <code className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50 truncate flex-1 min-w-0">
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

          {/* Request Body (For POST & PUT) */}
          {(httpMethod === 'POST' || httpMethod === 'PUT') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Request Body (JSON):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setRequestBody(generateSampleBody(httpMethod, selectedTableSlug))}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Reset Contoh Data</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={requestBody}
                onChange={e => setRequestBody(e.target.value)}
                className="w-full p-3 font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                placeholder='{\n  "field": "value"\n}'
              />
            </div>
          )}

          {/* Response Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hasil Response Server:
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
                  {copiedRes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRes ? 'Disalin' : 'Salin Response'}</span>
                </button>
              )}
            </div>

            <div className="p-4 font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl min-h-36 max-h-64 overflow-y-auto">
              {responseData ? (
                <pre className="whitespace-pre-wrap break-all leading-relaxed">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-28 text-slate-600 gap-2">
                  <Play className="w-6 h-6 text-slate-700" />
                  <span className="text-[11px]">Klik "Kirim Request REST API" untuk menguji endpoint...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
