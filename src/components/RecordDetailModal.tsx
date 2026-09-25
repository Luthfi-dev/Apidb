import React, { useState } from 'react';
import { DatabaseTable, DatabaseRecord } from '../types';
import { X, Copy, Check, Terminal, Database, Key, Edit3, Globe, Code2 } from 'lucide-react';
import { Language, translations } from '../translations';

interface RecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DatabaseRecord | null;
  table: DatabaseTable;
  token: string;
  language: Language;
  onEdit: () => void;
}

export function RecordDetailModal({
  isOpen,
  onClose,
  record,
  table,
  token,
  language,
  onEdit
}: RecordDetailModalProps) {
  const t = translations[language];
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [viewTab, setViewTab] = useState<'structured' | 'json' | 'curl'>('structured');

  if (!isOpen || !record) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(String(record.id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const getUrl = `${baseUrl}/api/v1/${token}/${table.slug}/${record.id}`;

  const jsonObject = {
    id: record.id,
    ...record.data,
    _created_at: record.createdAt,
    _updated_at: record.updatedAt
  };
  const jsonString = JSON.stringify(jsonObject, null, 2);

  const curlCommand = `curl -X GET "${getUrl}" \\
  -H "Accept: application/json"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {language === 'id' ? 'Detail Record Data (GET)' : 'Record Data Inspector (GET)'}
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                Tabel: <code className="font-mono text-emerald-600 dark:text-emerald-400">{table.name} ({table.slug})</code>
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

        {/* Primary Key Callout Banner */}
        <div className="px-4 sm:px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 shrink-0">
              Primary Key:
            </span>
            <code className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/30 select-all shadow-2xs">
              #{record.id}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyId}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin ID</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Data</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-4 sm:px-6 pt-2 flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setViewTab('structured')}
            className={`px-3 py-1.5 font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              viewTab === 'structured'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Tabel Data</span>
          </button>
          <button
            onClick={() => setViewTab('json')}
            className={`px-3 py-1.5 font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              viewTab === 'json'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON (API)</span>
          </button>
          <button
            onClick={() => setViewTab('curl')}
            className={`px-3 py-1.5 font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              viewTab === 'curl'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>cURL Command</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {viewTab === 'structured' ? (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 sm:px-4 w-2/5">Kolom</th>
                    <th className="py-2.5 px-3 sm:px-4 w-3/5">Nilai Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="bg-amber-50/30 dark:bg-amber-950/10">
                    <td className="py-2.5 px-3 sm:px-4 font-mono font-bold text-amber-800 dark:text-amber-300">
                      id (Primary Key)
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      #{record.id}
                    </td>
                  </tr>

                  {table.fields
                    .filter(f => !f.isPrimaryKey && f.key !== 'id')
                    .map(f => {
                      const val = record.data[f.key];
                      return (
                        <tr key={f.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 sm:px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                              {f.label}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block truncate">
                              {f.key} · {f.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-900 dark:text-slate-100 break-words">
                            {val !== undefined && val !== null && String(val) !== '' ? (
                              typeof val === 'boolean' ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${val ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                  {val ? 'TRUE' : 'FALSE'}
                                </span>
                              ) : (
                                String(val)
                              )
                            ) : (
                              <span className="text-slate-400 italic">null / kosong</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  <tr className="bg-slate-50/40 dark:bg-slate-950/20 text-slate-500">
                    <td className="py-2 px-3 sm:px-4 font-mono text-[10px]">_created_at</td>
                    <td className="py-2 px-3 sm:px-4 font-mono text-[10px] break-all">{record.createdAt}</td>
                  </tr>
                  <tr className="bg-slate-50/40 dark:bg-slate-950/20 text-slate-500">
                    <td className="py-2 px-3 sm:px-4 font-mono text-[10px]">_updated_at</td>
                    <td className="py-2 px-3 sm:px-4 font-mono text-[10px] break-all">{record.updatedAt}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : viewTab === 'json' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Output JSON Format REST API:</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold flex items-center gap-1 transition-colors text-xs"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin JSON</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3.5 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 max-h-72">
                {jsonString}
              </pre>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Perintah cURL:</span>
                <button
                  type="button"
                  onClick={handleCopyCurl}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors text-xs shadow-xs"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin cURL</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3.5 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 whitespace-pre-wrap break-all">
                {curlCommand}
              </pre>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <span className="font-bold block">Akses Eksternal:</span>
                <p>
                  URL ini dapat diakses secara publik oleh frontend React, Flutter, Android, iOS, maupun backend server dengan menyertakan token API.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
          <span className="font-mono text-slate-400 text-[10px] sm:text-[11px] truncate max-w-[200px] sm:max-w-md">
            {getUrl}
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors shrink-0"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
