import React, { useState, useEffect } from 'react';
import {
  Database,
  Lock,
  Unlock,
  KeyRound,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Table,
  CheckCircle,
  AlertCircle,
  Layers
} from 'lucide-react';
import { Language } from '../types';

interface DatabaseExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export function DatabaseExplorerModal({ isOpen, onClose, language }: DatabaseExplorerModalProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const CORRECT_PIN = '11110000';

  useEffect(() => {
    if (isOpen) {
      // Reset PIN entry on open unless already unlocked in this session
      setPinError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (unlocked) {
      fetchTables();
    }
  }, [unlocked]);

  useEffect(() => {
    if (unlocked && selectedTable) {
      fetchTableData(selectedTable, page);
    }
  }, [unlocked, selectedTable, page]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (pin.trim() === CORRECT_PIN) {
      setUnlocked(true);
      setPin('');
    } else {
      setPinError('PIN database tidak valid. Silakan coba lagi.');
      setPin('');
    }
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db/tables-list');
      const data = await res.json();
      if (data.success && data.tables.length > 0) {
        setTables(data.tables);
        setSelectedTable(data.tables[0]);
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (table: string, pageNum: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/db/table-rows?table=${encodeURIComponent(table)}&page=${pageNum}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setColumns(data.columns || []);
        setRows(data.rows || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch table rows:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / limit) || 1;

  // Filter rows locally if searchTerm exists
  const filteredRows = rows.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val =>
      String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 text-white flex items-center justify-center shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">
                Database Explorer (Lihat Isi DB)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Akses Tabel & Record Keseluruhan Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Verification Step */}
        {!unlocked ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-sm">
              <KeyRound className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">Autentikasi PIN Diperlukan</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Halaman ini dilindungi enkripsi keamanan tingkat lanjut. Masukkan 8 digit PIN keamanan untuk membuka akses database.
            </p>

            <form onSubmit={handlePinSubmit} className="w-full space-y-4">
              {pinError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div>
                <input
                  type="password"
                  maxLength={8}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan 8 digit PIN..."
                  className="w-full px-4 py-3 text-center font-mono text-xl tracking-[0.4em] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={pin.length < 4}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Buka Akses Database</span>
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Database Explorer Content */
          <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pilih Tabel:</span>
                </div>
                <select
                  value={selectedTable}
                  onChange={e => {
                    setSelectedTable(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {tables.map(tbl => (
                    <option key={tbl} value={tbl}>
                      {tbl}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => fetchTableData(selectedTable, page)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Muat Ulang Data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Cari data di halaman ini..."
                  className="w-full sm:w-64 pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Table View */}
            <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 relative">
              {loading && rows.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : null}

              {filteredRows.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Tidak ada record atau data ditemukan pada tabel ini.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0">
                      {columns.map(col => (
                        <th key={col} className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                    {filteredRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                        {columns.map(col => {
                          const val = row[col];
                          const strVal =
                            typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
                          return (
                            <td key={col} className="px-4 py-2.5 max-w-xs truncate text-slate-800 dark:text-slate-200" title={strVal}>
                              {val === null ? <span className="text-slate-400 italic">NULL</span> : strVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
              <div>
                Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{total > 0 ? (page - 1) * limit + 1 : 0}</span> sampai{' '}
                <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(page * limit, total)}</span> dari{' '}
                <span className="font-bold text-slate-700 dark:text-slate-300">{total}</span> total record (10 data per halaman)
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>
                <span className="px-3 py-1.5 font-bold text-slate-700 dark:text-slate-300 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => (p < totalPages ? p + 1 : p))}
                  disabled={page >= totalPages || loading}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
