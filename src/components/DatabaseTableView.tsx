import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DatabaseProject, DatabaseTable, DatabaseRecord, UserMode } from '../types';
import {
  Plus,
  Search,
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
  Settings,
  LayoutGrid,
  Play,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  SlidersHorizontal,
  FolderTree
} from 'lucide-react';
import { Language, translations } from '../translations';
import { RecordDetailModal } from './RecordDetailModal';
import { RefreshTokenModal } from './RefreshTokenModal';
import { ConfirmModal } from './ConfirmModal';

interface DatabaseTableViewProps {
  project: DatabaseProject;
  tables: DatabaseTable[];
  activeTableId: string;
  onSelectTable: (tableId: string) => void;
  records?: DatabaseRecord[];
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
  onOpenTableSchema: (table?: DatabaseTable | null) => void;
  onOpenRecordForm: (record?: DatabaseRecord | null) => void;
}

export function DatabaseTableView({
  project,
  tables,
  activeTableId,
  onSelectTable,
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
  onTableTokenRefreshed,
  onOpenTableSchema,
  onOpenRecordForm
}: DatabaseTableViewProps) {
  const t = translations[language];

  // Modals state
  const [inspectingRecord, setInspectingRecord] = useState<DatabaseRecord | null>(null);
  const [isRefreshTokenOpen, setIsRefreshTokenOpen] = useState(false);

  // Server-side paginated data state
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Field-specific filtering state (e.g. { status: 'Aktif', kategori: 'Elektronik' })
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>('');
  const [filterInputVal, setFilterInputVal] = useState<string>('');

  // Layout mode: 'cards' or 'table'
  const [viewStyle, setViewStyle] = useState<'table' | 'cards'>('table');

  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  // Quick inline add state
  const [quickAddData, setQuickAddData] = useState<Record<string, any>>({});
  const [isQuickAdding, setIsQuickAdding] = useState(false);

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

  const activeTable = tables.find(tbl => tbl.id === activeTableId) || tables[0] || null;

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination & filters when active table changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setDebouncedSearch('');
    setFieldFilters({});
    setIsFilterOpen(false);
    setSelectedFilterKey('');
    setFilterInputVal('');
  }, [activeTableId]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('dataforge_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch paginated records from server
  const fetchTableRecords = useCallback(async () => {
    if (!project?.id || !activeTable?.id) return;
    try {
      setIsLoadingRecords(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        sort: sortColumn,
        order: sortDirection
      });

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      // Add field-specific filters e.g. status=Aktif, kategori=Elektronik
      Object.entries(fieldFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          params.append(k, String(v).trim());
        }
      });

      const res = await fetch(
        `/api/projects/${project.id}/tables/${activeTable.id}/records?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setRecords(data.records);
          if (data.pagination) {
            setTotalRecords(Number(data.pagination.total) || 0);
            setTotalPages(Math.max(1, Number(data.pagination.totalPages) || 1));
          } else {
            setTotalRecords(data.records.length);
            setTotalPages(Math.max(1, Math.ceil(data.records.length / pageSize)));
          }
        } else if (Array.isArray(data)) {
          setRecords(data);
          setTotalRecords(data.length);
          setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
        }
      }
    } catch (err) {
      console.error('[Table View] Failed to fetch paginated records:', err);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [project?.id, activeTable?.id, currentPage, pageSize, debouncedSearch, sortColumn, sortDirection, fieldFilters, getAuthHeaders]);

  useEffect(() => {
    fetchTableRecords();
  }, [fetchTableRecords]);

  // Handle Field Filter Application
  const handleApplyFieldFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFilterKey || !filterInputVal.trim()) return;
    setFieldFilters(prev => ({
      ...prev,
      [selectedFilterKey]: filterInputVal.trim()
    }));
    setFilterInputVal('');
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handleRemoveFieldFilter = (fieldKey: string) => {
    setFieldFilters(prev => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setFieldFilters({});
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target);
      setJumpPageInput('');
    }
  };

  const promptDeleteRecord = (record: DatabaseRecord) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Konfirmasi Hapus Rekaman Data',
      message: `Apakah Anda yakin ingin menghapus rekaman data #${record.id} ini? Tindakan ini akan menghapus baris data secara permanen.`,
      confirmText: 'Ya, Hapus Data',
      cancelText: 'Batalkan',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await onDeleteRecord(record.id);
          await fetchTableRecords();
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
        message: `Database minimal harus memiliki 1 tabel aktif. Jika ingin menghapus tabel "${table.name}", silakan buat tabel baru terlebih dahulu.`,
        confirmText: 'Saya Mengerti',
        variant: 'info',
        onConfirm: () => {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    setConfirmModalState({
      isOpen: true,
      title: `Konfirmasi Hapus Tabel "${table.name}"`,
      message: `Apakah Anda yakin ingin menghapus tabel "${table.name}" (slug: /${table.slug})? Tindakan ini akan menghapus seluruh struktur dan data di dalamnya secara permanen.`,
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

  const handleExportCsv = async () => {
    if (!activeTable) return;
    try {
      setIsExportingCsv(true);
      // Fetch up to 500 records from server for fast CSV export
      const res = await fetch(
        `/api/projects/${project.id}/tables/${activeTable.id}/records?limit=500&sort=${sortColumn}&order=${sortDirection}`,
        { headers: getAuthHeaders() }
      );
      const resJson = await res.json();
      const exportList: DatabaseRecord[] = resJson.records || resJson || [];

      if (exportList.length === 0) return;

      const headers = activeTable.fields.map(f => f.key);
      const rows = exportList.map(r =>
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
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTable) return;
    try {
      setIsQuickAdding(true);
      await onAddRecord(quickAddData);
      setQuickAddData({});
      await fetchTableRecords();
    } catch (err) {
      console.error('Quick add failed:', err);
    } finally {
      setIsQuickAdding(false);
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const apiEndpointUrl = activeTable ? `${baseUrl}/api/v1/${activeTable.slug}` : '';

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalRecords > 0 ? (safeCurrentPage - 1) * pageSize : 0;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);

  return (
    <div className="space-y-4 max-w-full animate-fadeIn">
      {/* Top Header Card */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                Visual Database Engine
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {tables.length} {language === 'id' ? 'Tabel' : 'Tables'} · {totalRecords.toLocaleString('id-ID')} {language === 'id' ? 'Baris di Tabel Aktif' : 'Rows in Active Table'}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {project.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {project.description || (language === 'id' ? 'Kelola tabel, kolom, dan jutaan baris data secara terpaginasi dengan performa tinggi.' : 'Manage tables, columns, and millions of rows with high-performance server pagination.')}
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

        {/* Developer Info Bar */}
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1" title="Tabel ini menggunakan token khusus">
                    <span>🔑 Token Khusus Tabel</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1" title="Tabel ini mewarisi Token Master">
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
                  title="Refresh token"
                >
                  <RotateCw className="w-3 h-3 text-amber-500" />
                  <span>Refresh Token</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Navigation Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1.5 shrink-0">
            {tables.map(tbl => {
              const isActive = activeTable?.id === tbl.id;
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
                </button>
              );
            })}

            <button
              onClick={() => onOpenTableSchema(null)}
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
                onClick={() => onOpenTableSchema(activeTable)}
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

      {/* Main Table Toolbar */}
      {activeTable && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onOpenRecordForm(null)}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t.newRecord}</span>
              </button>

              <button
                onClick={() => onOpenTableSchema(activeTable)}
                className="px-3 py-2.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Atur kolom dan skema tabel"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.columns || 'Struktur Kolom'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={isExportingCsv || totalRecords === 0}
                className="px-3 py-2.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Unduh data dalam format CSV"
              >
                {isExportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={fetchTableRecords}
                disabled={isLoadingRecords}
                className="p-2 sm:px-3 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Segarkan Data Tabel"
              >
                <RotateCw className={`w-3.5 h-3.5 text-indigo-500 ${isLoadingRecords ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* View Switcher: Table vs Cards */}
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

            {/* Search and Field Filter Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Field Filter Button & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterOpen(prev => !prev);
                    if (!selectedFilterKey && activeTable.fields.length > 0) {
                      const defaultField = activeTable.fields.find(f => !f.isPrimaryKey && f.key !== 'id') || activeTable.fields[0];
                      setSelectedFilterKey(defaultField?.key || '');
                    }
                  }}
                  className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                    Object.keys(fieldFilters).length > 0
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Filter Data Berdasarkan Nilai Kolom Tertentu"
                >
                  <Filter className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Filter Kolom</span>
                  {Object.keys(fieldFilters).length > 0 && (
                    <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-extrabold">
                      {Object.keys(fieldFilters).length}
                    </span>
                  )}
                </button>

                {/* Filter Popover Dropdown */}
                {isFilterOpen && (
                  <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 sm:w-80 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 animate-fadeIn space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Filter Nilai Kolom</span>
                      </span>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <form onSubmit={handleApplyFieldFilter} className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">
                          Pilih Kolom:
                        </label>
                        <select
                          value={selectedFilterKey}
                          onChange={e => {
                            setSelectedFilterKey(e.target.value);
                            setFilterInputVal('');
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Pilih Kolom Target --</option>
                          {activeTable.fields.map(f => (
                            <option key={f.key} value={f.key}>
                              {f.label} ({f.key}) [{f.type}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedFilterKey && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">
                            Nilai Target yang Dicari:
                          </label>
                          {(() => {
                            const targetField = activeTable.fields.find(f => f.key === selectedFilterKey);
                            if (targetField?.type === 'select' && targetField.options && targetField.options.length > 0) {
                              return (
                                <select
                                  value={filterInputVal}
                                  onChange={e => setFilterInputVal(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="">-- Pilih Opsi Nilai --</option>
                                  {targetField.options.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              );
                            }
                            if (targetField?.type === 'boolean') {
                              return (
                                <select
                                  value={filterInputVal}
                                  onChange={e => setFilterInputVal(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="">-- Pilih Nilai Boolean --</option>
                                  <option value="true">True (Ya / Aktif)</option>
                                  <option value="false">False (Tidak / Nonaktif)</option>
                                </select>
                              );
                            }
                            return (
                              <input
                                type={targetField?.type === 'number' ? 'number' : 'text'}
                                value={filterInputVal}
                                onChange={e => setFilterInputVal(e.target.value)}
                                placeholder={`Masukkan nilai tepat (misal: ABC)`}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                            );
                          })()}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={!selectedFilterKey || !filterInputVal.trim()}
                          className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                        >
                          <Filter className="w-3.5 h-3.5" />
                          <span>Terapkan Filter</span>
                        </button>
                        {Object.keys(fieldFilters).length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Search Input (Server-side debounced) */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.searchRecords}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {isLoadingRecords && (
                  <Loader2 className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                )}
              </div>
            </div>
          </div>

          {/* Active Field Filters Strip */}
          {Object.keys(fieldFilters).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 bg-indigo-50/60 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 animate-fadeIn">
              <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Filter Aktif:
              </span>
              {Object.entries(fieldFilters).map(([fKey, fVal]) => {
                const fieldObj = activeTable.fields.find(f => f.key === fKey);
                const fieldLabel = fieldObj ? fieldObj.label : fKey;
                return (
                  <span
                    key={fKey}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg shadow-2xs"
                  >
                    <span>
                      {fieldLabel}: <strong className="text-slate-900 dark:text-slate-100 font-mono">"{fVal}"</strong>
                    </span>
                    <button
                      onClick={() => handleRemoveFieldFilter(fKey)}
                      className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:text-rose-600 rounded-full transition-colors"
                      title="Hapus Filter Ini"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <button
                onClick={handleClearAllFilters}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-bold ml-auto shrink-0"
              >
                Hapus Semua Filter
              </button>
            </div>
          )}
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
            <div className="flex items-center gap-2">
              {isLoadingRecords && (
                <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  <Loader2 className="w-3 h-3 animate-spin" /> Memuat...
                </span>
              )}
              <span className="text-[11px]">
                {totalRecords > 0 ? (
                  <>
                    Halaman <span className="font-bold text-slate-700 dark:text-slate-200">{safeCurrentPage}</span> dari <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages}</span> ({totalRecords.toLocaleString('id-ID')} total baris)
                  </>
                ) : (
                  language === 'id' ? '0 baris data' : '0 rows'
                )}
              </span>
            </div>
          </div>

          {/* VIEW STYLE 1: MOBILE NATIVE CARDS VIEW */}
          {viewStyle === 'cards' ? (
            <div className="p-3 sm:p-4 space-y-3">
              {records.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-500 dark:text-slate-400">
                  <TableIcon className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">{t.emptyTableTitle}</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{t.emptyTableDesc}</p>
                </div>
              ) : (
                records.map(record => (
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
                          onClick={() => onOpenRecordForm(record)}
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
            /* VIEW STYLE 2: FULL SPREADSHEET TABLE GRID */
            <div className="w-full max-w-full overflow-x-auto min-h-[300px] [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch]">
              <table className="w-full text-left border-collapse text-xs min-w-max">
                <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                  <tr>
                    {/* Primary Key Column (# ID) */}
                    <th
                      onClick={() => handleSort('id')}
                      className="py-3 px-4 w-24 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <Key className="w-3 h-3 text-amber-500" />
                        <span># ID</span>
                        {sortColumn === 'id' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>

                    {/* Dynamic Fields Columns */}
                    {activeTable.fields
                      .filter(f => !f.isPrimaryKey && f.key !== 'id')
                      .map(field => (
                        <th
                          key={field.key}
                          onClick={() => handleSort(field.key)}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{field.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">({field.key})</span>
                            {sortColumn === field.key ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </div>
                        </th>
                      ))}

                    {/* Actions Header */}
                    <th className="py-3 px-4 text-right w-36">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {records.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeTable.fields.length + 1}
                        className="py-12 px-4 text-center text-slate-500 dark:text-slate-400"
                      >
                        <TableIcon className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                        <p className="font-bold text-slate-800 dark:text-slate-200">{t.emptyTableTitle}</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{t.emptyTableDesc}</p>
                      </td>
                    </tr>
                  ) : (
                    records.map(record => (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Primary Key Cell */}
                        <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded text-[11px] select-all">
                              #{record.id}
                            </span>
                            <button
                              type="button"
                              onClick={e => handleCopyId(record.id, e)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Salin ID"
                            >
                              {copiedId === record.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
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
                              onClick={() => onOpenRecordForm(record)}
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

          {/* High-Performance Table Pagination Toolbar */}
          <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            {/* Left: Range Info & Page Size Selector */}
            <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>Menampilkan</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {totalRecords > 0 ? startIndex + 1 : 0} - {endIndex}
                </span>
                <span>dari</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {totalRecords.toLocaleString('id-ID')}
                </span>
                <span>data</span>
              </div>

              <div className="flex items-center gap-1.5 pl-2 sm:border-l border-slate-200 dark:border-slate-800">
                <span>Per halaman:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation Buttons & Page Jump Input */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1 || isLoadingRecords}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1 || isLoadingRecords}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1 px-1">
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxVisible = 5;
                    if (totalPages <= maxVisible) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      let start = Math.max(2, safeCurrentPage - 1);
                      let end = Math.min(totalPages - 1, safeCurrentPage + 1);

                      if (safeCurrentPage <= 3) {
                        end = 4;
                      } else if (safeCurrentPage >= totalPages - 2) {
                        start = totalPages - 3;
                      }

                      if (start > 2) pages.push('...');
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (end < totalPages - 1) pages.push('...');
                      pages.push(totalPages);
                    }

                    return pages.map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 select-none">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setCurrentPage(Number(p))}
                          disabled={isLoadingRecords}
                          className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-colors ${
                            safeCurrentPage === p
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages || isLoadingRecords}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages || isLoadingRecords}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              {/* Jump to Page input for large tables */}
              {totalPages > 5 && (
                <form onSubmit={handlePageJump} className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">Ke:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder="Hal"
                    value={jumpPageInput}
                    onChange={e => setJumpPageInput(e.target.value)}
                    className="w-12 px-1.5 py-1 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white rounded-md text-[11px] font-semibold transition-colors"
                  >
                    Buka
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick Inline Add Form at Bottom of Table */}
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
              const rec = inspectingRecord;
              setInspectingRecord(null);
              onOpenRecordForm(rec);
            }
          }}
        />
      )}

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
