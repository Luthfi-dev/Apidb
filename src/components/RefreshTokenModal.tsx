import React, { useState } from 'react';
import {
  ShieldAlert,
  RotateCw,
  Copy,
  Check,
  X,
  AlertTriangle,
  Key,
  Table as TableIcon,
  Database,
  ArrowRight,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { DatabaseProject, DatabaseTable, Language } from '../types';

interface RefreshTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DatabaseProject;
  tables: DatabaseTable[];
  activeTableId?: string;
  language: Language;
  onProjectTokenRefreshed: (updatedProject: DatabaseProject) => void;
  onTableTokenRefreshed: (updatedTable: DatabaseTable) => void;
}

export function RefreshTokenModal({
  isOpen,
  onClose,
  project,
  tables,
  activeTableId,
  language,
  onProjectTokenRefreshed,
  onTableTokenRefreshed
}: RefreshTokenModalProps) {
  const [targetScope, setTargetScope] = useState<'project' | 'table'>('table');
  const [selectedTableId, setSelectedTableId] = useState<string>(activeTableId || tables[0]?.id || '');
  const [isRotating, setIsRotating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success state after rotation
  const [rotationResult, setRotationResult] = useState<{
    scope: 'project' | 'table';
    targetName: string;
    oldToken: string;
    newToken: string;
  } | null>(null);

  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);

  if (!isOpen) return null;

  const currentTable = tables.find(t => t.id === selectedTableId) || tables[0];

  const handleCopy = (text: string, type: 'token' | 'header') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedHeader(true);
      setTimeout(() => setCopiedHeader(false), 2000);
    }
  };

  const handleRefreshProjectToken = async () => {
    try {
      setIsRotating(true);
      setErrorMessage(null);

      const res = await fetch(`/api/projects/${project.id}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal merefresh token database');
      }

      onProjectTokenRefreshed(data.project);

      setRotationResult({
        scope: 'project',
        targetName: project.name,
        oldToken: data.oldToken,
        newToken: data.token
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan');
    } finally {
      setIsRotating(false);
    }
  };

  const handleRefreshTableToken = async () => {
    if (!currentTable) return;
    try {
      setIsRotating(true);
      setErrorMessage(null);

      const res = await fetch(`/api/projects/${project.id}/tables/${currentTable.id}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal merefresh token tabel');
      }

      onTableTokenRefreshed(data.table);

      setRotationResult({
        scope: 'table',
        targetName: `Tabel "${currentTable.name}"`,
        oldToken: data.oldToken || project.token,
        newToken: data.token
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan');
    } finally {
      setIsRotating(false);
    }
  };

  const handleRevokeTableToken = async () => {
    if (!currentTable) return;
    try {
      setIsRotating(true);
      setErrorMessage(null);

      const res = await fetch(`/api/projects/${project.id}/tables/${currentTable.id}/token`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mencabut token tabel');
      }

      onTableTokenRefreshed(data.table);

      setRotationResult({
        scope: 'table',
        targetName: `Tabel "${currentTable.name}"`,
        oldToken: currentTable.token || '',
        newToken: project.token
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan');
    } finally {
      setIsRotating(false);
    }
  };

  const resetAndClose = () => {
    setRotationResult(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-red-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/30 shadow-xs">
              <RotateCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Refresh & Rotasi Token API</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                  Solusi Token Bocor
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ganti token yang bocor ke token baru tanpa mengganggu integritas data
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Screen after rotation */}
          {rotationResult ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 sm:p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Token Baru Berhasil Dibuat!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Token lama untuk <strong className="font-semibold">{rotationResult.targetName}</strong> telah resmi dicabut seketika. Request dengan token lama akan langsung ditolak (403 Forbidden).
                </p>
              </div>

              {/* Token Comparison Card */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                {rotationResult.oldToken && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                      <span>Token Lama (Sudah Tidak Berlaku):</span>
                      <span className="text-rose-500 font-bold">⛔ REVOKED</span>
                    </div>
                    <code className="block font-mono text-[11px] text-slate-400 line-through bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 break-all select-all">
                      {rotationResult.oldToken}
                    </code>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <span>Token Baru Anda (Aktif):</span>
                    <span className="text-emerald-500 flex items-center gap-1 font-bold">
                      <Check className="w-3 h-3" /> AKTIF SEKARANG
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-300 dark:border-emerald-700">
                    <code className="font-mono text-xs text-emerald-600 dark:text-emerald-300 break-all flex-1 px-1 font-semibold select-all">
                      {rotationResult.newToken}
                    </code>
                    <button
                      onClick={() => handleCopy(rotationResult.newToken, 'token')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken ? 'Disalin!' : 'Salin Token'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 mb-1 font-medium">
                    Gunakan di HTTP Header klien Anda:
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 text-emerald-400 font-mono text-[11px] px-3 py-2 rounded-xl">
                    <span className="truncate mr-2">
                      Authorization: Bearer {rotationResult.newToken}
                    </span>
                    <button
                      onClick={() => handleCopy(`Authorization: Bearer ${rotationResult.newToken}`, 'header')}
                      className="text-slate-400 hover:text-white shrink-0 p-1"
                      title="Salin Header Lengkap"
                    >
                      {copiedHeader ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={resetAndClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Scope Selection Cards */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Lingkup Token yang Ingin Di-Refresh:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Table Specific Token */}
                  <div
                    onClick={() => setTargetScope('table')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      targetScope === 'table'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <TableIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Token Khusus Tabel
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                        Paling Disarankan
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Refresh token hanya untuk tabel data yang bocor. Tabel lain tetap aman dan tidak terputus.
                    </p>
                  </div>

                  {/* Option 2: Entire Project Database Token */}
                  <div
                    onClick={() => setTargetScope('project')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      targetScope === 'project'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Token Master Database
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Mengganti token induk database <strong>{project.name}</strong>. Semua tabel yang mewarisi token ini akan berubah.
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Detail Selector */}
              {targetScope === 'table' ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Pilih Tabel Data yang Ingin Diubah Tokennya:
                    </label>
                    <select
                      value={selectedTableId}
                      onChange={e => setSelectedTableId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      {tables.map(tbl => (
                        <option key={tbl.id} value={tbl.id}>
                          {tbl.name} (/{tbl.slug}) {tbl.token ? '— [Memiliki Token Khusus]' : '— [Mewarisi Token Master]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentTable && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Status Token Tabel:</span>
                        {currentTable.token ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Token Khusus Terpasang
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Mewarisi Master Token
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        Token Aktif: <strong className="text-indigo-600 dark:text-indigo-400">{currentTable.token || project.token}</strong>
                      </div>

                      {currentTable.token && (
                        <button
                          type="button"
                          onClick={handleRevokeTableToken}
                          disabled={isRotating}
                          className="text-[11px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold flex items-center gap-1 transition-colors pt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Token Khusus (Kembali Gunakan Token Master Database)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Database Target:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{project.name}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    Token Master Saat Ini: <strong className="text-indigo-600 dark:text-indigo-400">{project.token}</strong>
                  </div>
                </div>
              )}

              {/* Leak Advisory Warning Box */}
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-2">
                <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block">Apa yang terjadi saat token di-refresh?</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800/90 dark:text-amber-300/80">
                      <li>Token lama langsung <strong>dihapus & dinonaktifkan seketika</strong>.</li>
                      <li>Jika token lama pernah bocor di publik atau log WiFi, orang lain yang menyimpannya tidak akan bisa lagi membaca atau menulis data Anda.</li>
                      <li>Klien/aplikasi yang sah harus diperbarui ke token baru yang digenerate.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={isRotating}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={targetScope === 'table' ? handleRefreshTableToken : handleRefreshProjectToken}
                  disabled={isRotating}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <RotateCw className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} />
                  <span>
                    {isRotating
                      ? 'Membuat Token Baru...'
                      : targetScope === 'table'
                      ? `Refresh Token Tabel "${currentTable?.name || ''}"`
                      : 'Refresh Token Master Database'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
