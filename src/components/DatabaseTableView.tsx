import React, { useState, useMemo } from 'react';
import { DatabaseProject, DatabaseTable, DatabaseRecord, UserMode } from '../types';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  Eye,
  Edit,
  Trash2,
  Table as TableIcon,
  Key,
  Globe,
  Code2,
  Terminal,
  Settings,
  ChevronDown,
  LayoutGrid,
  ListFilter,
  Play,
  RotateCw,
  ShieldAlert
} from 'lucide-react';
import { Language, translations } from '../translations';
import { RecordModal } from './RecordModal';
import { RecordDetailModal } from './RecordDetailModal';
import { TableSchemaModal } from './TableSchemaModal';
import { RefreshTokenModal } from './RefreshTokenModal';
import { ConfirmModal } from './ConfirmModal';

interface DatabaseTableViewProps {
  project: DatabaseProject;
  tables: DatabaseTable[];
  activeTableId: string;
  onSelectTable: (tableId: string) => void;
  records: DatabaseRecord[];
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;
  language: Language;
  onAddRecord: (data: Record<string, any>) => Promise<void>;
  onUpdateRecord: (recordId: number | string, data: Record<string, any>) => Promise<void>;
  onDeleteRecord: (recordId: number | string) => Promise<void>;
  onCreateTable: (data: any) => Promise<void>;
  onUpdateTable: (tableId: string, data: any) => Promise<void>;
  onDeleteTable: (tableId: string) => Promise<void>;
  onOpenPlayground: () => void;
  onProjectTokenRefreshed?: (project: DatabaseProject) => void;
  onTableTokenRefreshed?: (table: DatabaseTable) => void;
}

export function DatabaseTableView({
  project,
  tables,
  activeTableId,
  onSelectTable,
  records,
  userMode,
  setUserMode,
  language,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
  onOpenPlayground,
  onProjectTokenRefreshed,
  onTableTokenRefreshed
}: DatabaseTableViewProps) {
  const t = translations[language];

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DatabaseRecord | null>(null);
  const [inspectingRecord, setInspectingRecord] = useState<DatabaseRecord | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTableSchema, setEditingTableSchema] = useState<DatabaseTable | null>(null);
  const [isRefreshTokenOpen, setIsRefreshTokenOpen] = useState(false);

  // Professional Confirmation Modal State
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'logout';
    loading?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const promptDeleteRecord = (record: DatabaseRecord) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Konfirmasi Hapus Rekaman Data',
      message: `Apakah Anda yakin ingin menghapus rekaman data #${record.id} ini? Tindakan ini akan menghapus data baris tersebut secara permanen.`,
      confirmText: 'Ya, Hapus Data',
      cancelText: 'Batalkan',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await onDeleteRecord(record.id);
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const promptDeleteTable = (table: DatabaseTable) => {
    if (tables.length <= 1) {
      setConfirmModalState({
        isOpen: true,
        title: 'Tidak Dapat Menghapus Tabel Terakhir',
        message: `Database minimal harus memiliki 1 tabel aktif. Jika ingin menghapus tabel "${table.name}", silakan buat tabel baru terlebih dahulu atau ubah nama/kolom tabel ini lewat tombol Struktur Kolom.`,
        confirmText: 'Saya Mengerti',
        variant: 'info',
        onConfirm: () => {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    const tableRecordsCount = records.filter(r => r.tableId === table.id).length;

    setConfirmModalState({
      isOpen: true,
      title: `Konfirmasi Hapus Tabel "${table.name}"`,
      message: `Apakah Anda yakin ingin menghapus tabel "${table.name}" (slug: /${table.slug})? Tindakan ini akan menghapus skema kolom dan seluruh ${tableRecordsCount} baris data di dalamnya secara permanen.`,
      confirmText: 'Ya, Hapus Tabel Sekarang',
      cancelText: 'Batalkan',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await onDeleteTable(table.id);
        } catch (err) {
          console.error('Failed to delete table:', err);
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Layout mode: 'cards' or 'table'
  // On mobile screen, 'cards' is the best default, but users can toggle to 'table'
  const [viewStyle, setViewStyle] = useState<'table' | 'cards'>('table');

  // Search, filter, and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  // Quick inline add state
  const [quickAddData, setQuickAddData] = useState<Record<string, any>>({});
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const activeTable = tables.find(tbl => tbl.id === activeTableId) || tables[0] || null;

  // Filter & sort records for active table
  const filteredRecords = useMemo(() => {
    if (!activeTable) return [];
    let list = records.filter(r => r.tableId === activeTable.id);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => {
        if (String(r.id).toLowerCase().includes(q)) return true;
        return Object.values(r.data).some(v => String(v || '').toLowerCase().includes(q));
      });
    }

    list.sort((a, b) => {
      const valA = sortColumn === 'id' ? a.id : a.data[sortColumn];
      const valB = sortColumn === 'id' ? b.id : b.data[sortColumn];
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (valA === valB) return 0;
      const res = valA > valB ? 1 : -1;
      return sortDirection === 'desc' ? -res : res;
    });

    return list;
  }, [records, activeTable, searchQuery, sortColumn, sortDirection]);

  const handleCopyId = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeToken = activeTable?.token || project.token;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(activeToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyEndpoint = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleExportCsv = () => {
    if (!activeTable || filteredRecords.length === 0) return;
    const headers = activeTable.fields.map(f => f.key);
    const rows = filteredRecords.map(r =>
      headers.map(h => {
        const val = h === 'id' ? r.id : r.data[h];
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTable.slug}_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTable) return;
    try {
      setIsQuickAdding(true);
      await onAddRecord(quickAddData);
      setQuickAddData({});
    } catch (err) {
      console.error('Quick add failed:', err);
    } finally {
      setIsQuickAdding(false);
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const apiEndpointUrl = activeTable ? `${baseUrl}/api/v1/${activeTable.slug}` : '';
  const legacyEndpointUrl = activeTable ? `${baseUrl}/api/v1/${project.token}/${activeTable.slug}` : '';

  return (
    <div className="space-y-4 max-w-full overflow-hidden animate-fadeIn">
      {/* Top Header Card */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                Visual Database
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {tables.length} {language === 'id' ? 'Tabel' : 'Tables'} · {records.length} {language === 'id' ? 'Total Baris' : 'Total Rows'}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {project.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {project.description || (language === 'id' ? 'Kelola tabel, kolom, dan baris data dengan mudah layaknya spreadsheet modern.' : 'Manage tables, columns, and rows easily like a modern spreadsheet.')}
            </p>
          </div>

          {/* Mode Switcher & API Sandbox Trigger */}
          <div className="flex items-center gap-2 pt-2 md:pt-0 self-start md:self-center shrink-0">
            <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center text-xs font-semibold">
              <button
                onClick={() => setUserMode('simple')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  userMode === 'simple'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title={t.modeSimpleTooltip}
              >
                <span>{t.modeSimple}</span>
              </button>
              <button
                onClick={() => setUserMode('developer')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  userMode === 'developer'
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title={t.modeDeveloperTooltip}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{t.modeDeveloper}</span>
              </button>
            </div>

            <button
              onClick={onOpenPlayground}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span className="hidden sm:inline">Uji API</span>
            </button>
          </div>
        </div>

        {/* Developer Info Bar (Contained, no overflow on mobile) */}
        {userMode === 'developer' && activeTable && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                  Clean Endpoint:
                </span>
                <code className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded truncate flex-1 min-w-0">
                  {apiEndpointUrl}
                </code>
                <button
                  onClick={() => handleCopyEndpoint(apiEndpointUrl)}
                  className="p-1 text-slate-500 hover:text-emerald-600 rounded shrink-0"
                  title="Salin URL Endpoint"
                >
                  {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <span>🔒 Header Bearer Auth</span>
                </span>

                {activeTable?.token ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1" title="Tabel ini menggunakan token khusus yang diisolasi">
                    <span>🔑 Token Khusus Tabel</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1" title="Tabel ini mewarisi Token Master Database">
                    <span>🌐 Token Master</span>
                  </span>
                )}

                <button
                  onClick={handleCopyToken}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Salin API Token untuk Header"
                >
                  {copiedToken ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedToken ? t.copiedToken : 'Salin Token'}</span>
                </button>

                <button
                  onClick={() => setIsRefreshTokenOpen(true)}
                  className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Refresh token jika bocor atau ingin diganti"
                >
                  <RotateCw className="w-3 h-3 text-amber-500" />
                  <span>Refresh Token</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Navigation Tabs (Horizontal Scrollable Strip, No Wrap Overlap) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1.5 shrink-0">
            {tables.map(tbl => {
              const isActive = activeTable?.id === tbl.id;
              const count = records.filter(r => r.tableId === tbl.id).length;
              return (
                <button
                  key={tbl.id}
                  onClick={() => onSelectTable(tbl.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{tbl.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => {
                setEditingTableSchema(null);
                setIsTableModalOpen(true);
              }}
              className="px-3 py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.newTable}</span>
            </button>
          </div>

          {/* Active Table Settings Button */}
          {activeTable && (
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <button
                onClick={() => {
                  setEditingTableSchema(activeTable);
                  setIsTableModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap"
                title="Atur kolom dan skema tabel"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Struktur Kolom</span>
              </button>

              {tables.length > 1 && (
                <button
                  onClick={() => promptDeleteTable(activeTable)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                  title={t.deleteTable}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Main Table Toolbar (Responsive Flex Stack) */}
      {activeTable && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setIsRecordModalOpen(true);
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t.newRecord}</span>
              </button>

              <button
                onClick={() => {
                  setEditingTableSchema(activeTable);
                  setIsTableModalOpen(true);
                }}
                className="px-3 py-2.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Atur kolom dan skema tabel"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.columns || 'Struktur Kolom'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3 py-2.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Unduh data dalam format CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              {/* High-visibility Delete Table Button */}
              <button
                onClick={() => promptDeleteTable(activeTable)}
                className="px-3 py-2.5 sm:py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Hapus tabel aktif beserta data di dalamnya"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Hapus Tabel</span>
              </button>

              {/* View Switcher: Table vs Cards (Very useful on mobile!) */}
              <div className="flex items-center p-0.5 bg-slate-200 dark:bg-slate-800 rounded-xl ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setViewStyle('table')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewStyle === 'table'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Tampilan Tabel Spreadsheet"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewStyle('cards')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewStyle === 'cards'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Tampilan Kartu Mobile"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Input (Full width on mobile) */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchRecords}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet / Database Table Card */}
      {activeTable ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden max-w-full">
          {/* Table Info Bar */}
          <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Primary Key: <code className="font-mono text-amber-700 dark:text-amber-400">id</code> (AUTO_INCREMENT)
              </span>
            </div>
            <span className="text-[11px]">
              {filteredRecords.length} {language === 'id' ? 'baris data' : 'rows'}
            </span>
          </div>

          {/* VIEW STYLE 1: MOBILE NATIVE CARDS VIEW (Immune to Horizontal Overflow) */}
          {viewStyle === 'cards' ? (
            <div className="p-3 sm:p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-500 dark:text-slate-400">
                  <TableIcon className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">{t.emptyTableTitle}</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{t.emptyTableDesc}</p>
                </div>
              ) : (
                filteredRecords.map(record => (
                  <div
                    key={record.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-2.5"
                  >
                    {/* Top Row: Primary Key + Action Buttons */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded-md select-all">
                          #{record.id}
                        </span>
                        <button
                          type="button"
                          onClick={e => handleCopyId(record.id, e)}
                          className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                          title="Salin ID"
                        >
                          {copiedId === record.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setInspectingRecord(record)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-indigo-500" />
                          <span>GET</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord(record);
                            setIsRecordModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDeleteRecord(record)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </div>

                    {/* Field Data Key-Values Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {activeTable.fields
                        .filter(f => !f.isPrimaryKey && f.key !== 'id')
                        .map(field => {
                          const val = record.data[field.key];
                          return (
                            <div key={field.key} className="space-y-0.5 min-w-0">
                              <span className="text-[10px] font-semibold text-slate-400 block truncate">
                                {field.label}:
                              </span>
                              <div className="text-slate-800 dark:text-slate-200 font-medium truncate">
                                {val !== undefined && val !== null && String(val) !== '' ? (
                                  field.type === 'boolean' ? (
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      val ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {val ? 'TRUE' : 'FALSE'}
                                    </span>
                                  ) : field.type === 'number' && (field.key.includes('harga') || field.key.includes('bayar')) ? (
                                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                                      Rp {Number(val).toLocaleString('id-ID')}
                                    </span>
                                  ) : (
                                    <span>{String(val)}</span>
                                  )
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">-</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* VIEW STYLE 2: FULL SPREADSHEET TABLE GRID (Horizontally Scrollable) */
            <div className="w-full max-w-full overflow-x-auto min-h-[300px] touch-pan-x">
              <table className="w-full text-left border-collapse text-xs min-w-max">
                <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                  <tr>
                    {/* Primary Key Column (# ID) */}
                    <th
                      onClick={() => {
                        if (sortColumn === 'id') {
                          setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setSortColumn('id');
                          setSortDirection('asc');
                        }
                      }}
                      className="py-3 px-4 font-mono w-24 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <Key className="w-3 h-3 text-amber-500" />
                        <span># ID (PK)</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </div>
                    </th>

                    {/* Dynamic Column Headers */}
                    {activeTable.fields
                      .filter(f => !f.isPrimaryKey && f.key !== 'id')
                      .map(field => (
                        <th
                          key={field.key}
                          onClick={() => {
                            if (sortColumn === field.key) {
                              setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
                            } else {
                              setSortColumn(field.key);
                              setSortDirection('asc');
                            }
                          }}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 select-none whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{field.label}</span>
                            <span className="font-mono text-[10px] text-slate-400 font-normal">
                              ({field.type})
                            </span>
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          </div>
                        </th>
                      ))}

                    {/* Actions Header */}
                    <th className="py-3 px-4 text-right w-36 whitespace-nowrap">
                      {t.action}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeTable.fields.length + 1}
                        className="py-12 px-4 text-center text-slate-500 dark:text-slate-400"
                      >
                        <TableIcon className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                        <p className="font-bold text-slate-800 dark:text-slate-200">{t.emptyTableTitle}</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{t.emptyTableDesc}</p>
                        <button
                          onClick={() => {
                            setEditingRecord(null);
                            setIsRecordModalOpen(true);
                          }}
                          className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{t.newRecord}</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Primary Key Cell */}
                        <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => setInspectingRecord(record)}
                              className="cursor-pointer bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/20 px-2 py-0.5 rounded-md hover:ring-1 hover:ring-amber-500 transition-all select-all shadow-2xs text-[11px]"
                              title="Klik untuk melihat detail & API response"
                            >
                              #{record.id}
                            </span>

                            <button
                              type="button"
                              onClick={e => handleCopyId(record.id, e)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                              title="Salin ID Primary Key"
                            >
                              {copiedId === record.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Field Value Cells */}
                        {activeTable.fields
                          .filter(f => !f.isPrimaryKey && f.key !== 'id')
                          .map(field => {
                            const val = record.data[field.key];
                            return (
                              <td key={field.key} className="py-3 px-4 whitespace-nowrap text-slate-800 dark:text-slate-200">
                                {val !== undefined && val !== null && String(val) !== '' ? (
                                  field.type === 'select' ? (
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                      {String(val)}
                                    </span>
                                  ) : field.type === 'boolean' ? (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      val ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                      {val ? 'TRUE' : 'FALSE'}
                                    </span>
                                  ) : field.type === 'number' && (field.key.includes('harga') || field.key.includes('bayar')) ? (
                                    <span className="font-mono font-medium">
                                      Rp {Number(val).toLocaleString('id-ID')}
                                    </span>
                                  ) : (
                                    <span>{String(val)}</span>
                                  )
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">-</span>
                                )}
                              </td>
                            );
                          })}

                        {/* Actions Cell */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* GET / Inspect Button */}
                            <button
                              type="button"
                              onClick={() => setInspectingRecord(record)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Lihat Data & API Response (GET)"
                            >
                              <Eye className="w-3 h-3 text-indigo-500" />
                              <span>GET</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecord(record);
                                setIsRecordModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                              title="Edit Record"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => promptDeleteRecord(record)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Hapus Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Inline Add Form at Bottom of Table (Visible on Desktop / Tablet) */}
          <form
            onSubmit={handleQuickAddSubmit}
            className="hidden sm:flex p-3 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex-wrap items-center gap-2 text-xs"
          >
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold shrink-0">
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>Input Cepat:</span>
            </div>

            {activeTable.fields
              .filter(f => !f.isPrimaryKey && f.key !== 'id')
              .slice(0, 3)
              .map(field => (
                <input
                  key={field.key}
                  type={field.type === 'number' ? 'number' : 'text'}
                  placeholder={`${field.label}...`}
                  value={quickAddData[field.key] || ''}
                  onChange={e =>
                    setQuickAddData(prev => ({
                      ...prev,
                      [field.key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
                    }))
                  }
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-44"
                />
              ))}

            <button
              type="submit"
              disabled={isQuickAdding}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              {isQuickAdding ? '...' : '+ Simpan Baris'}
            </button>
          </form>
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-slate-500">Belum ada tabel yang dipilih atau dibuat.</p>
        </div>
      )}

      {/* Record Add/Edit Modal */}
      {activeTable && (
        <RecordModal
          isOpen={isRecordModalOpen}
          onClose={() => {
            setIsRecordModalOpen(false);
            setEditingRecord(null);
          }}
          table={activeTable}
          editingRecord={editingRecord}
          language={language}
          onSave={async (formData) => {
            if (editingRecord) {
              await onUpdateRecord(editingRecord.id, formData);
            } else {
              await onAddRecord(formData);
            }
          }}
        />
      )}

      {/* Record Inspect / GET Modal */}
      {activeTable && (
        <RecordDetailModal
          isOpen={!!inspectingRecord}
          onClose={() => setInspectingRecord(null)}
          record={inspectingRecord}
          table={activeTable}
          token={activeToken}
          language={language}
          onEdit={() => {
            if (inspectingRecord) {
              setEditingRecord(inspectingRecord);
              setInspectingRecord(null);
              setIsRecordModalOpen(true);
            }
          }}
        />
      )}

      {/* Table Schema Modal */}
      <TableSchemaModal
        isOpen={isTableModalOpen}
        onClose={() => {
          setIsTableModalOpen(false);
          setEditingTableSchema(null);
        }}
        editingTable={editingTableSchema}
        language={language}
        onDeleteTable={promptDeleteTable}
        onSave={async (tableData) => {
          if (editingTableSchema) {
            await onUpdateTable(editingTableSchema.id, tableData);
          } else {
            await onCreateTable(tableData);
          }
        }}
      />

      {/* Refresh Token Modal */}
      <RefreshTokenModal
        isOpen={isRefreshTokenOpen}
        onClose={() => setIsRefreshTokenOpen(false)}
        project={project}
        tables={tables}
        activeTableId={activeTable?.id}
        language={language}
        onProjectTokenRefreshed={(updatedProj) => {
          if (onProjectTokenRefreshed) onProjectTokenRefreshed(updatedProj);
        }}
        onTableTokenRefreshed={(updatedTbl) => {
          if (onTableTokenRefreshed) onTableTokenRefreshed(updatedTbl);
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        cancelText={confirmModalState.cancelText}
        variant={confirmModalState.variant || 'danger'}
        loading={confirmModalState.loading}
      />
    </div>
  );
}

