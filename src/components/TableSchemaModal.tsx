import React, { useState, useEffect, useRef } from 'react';
import { DatabaseTable, TableField, FieldType } from '../types';
import { X, Plus, Trash2, Key, Table as TableIcon, Check, AlertCircle, Globe, Sparkles } from 'lucide-react';
import { Language, translations } from '../translations';

interface TableSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tableData: {
    name: string;
    slug: string;
    description: string;
    fields: TableField[];
    apiVisibleFields?: string[];
    apiSearchableFields?: string[];
  }) => Promise<void>;
  editingTable: DatabaseTable | null;
  language: Language;
  onDeleteTable?: (table: DatabaseTable) => void;
}

export function TableSchemaModal({
  isOpen,
  onClose,
  onSave,
  editingTable,
  language,
  onDeleteTable
}: TableSchemaModalProps) {
  const t = translations[language];

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<TableField[]>([]);
  const [apiVisibleFields, setApiVisibleFields] = useState<string[]>([]);
  const [apiSearchableFields, setApiSearchableFields] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Refs and state for auto-focus and auto-scroll on adding new field
  const fieldInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const fieldsContainerRef = useRef<HTMLDivElement | null>(null);
  const [recentlyAddedIndex, setRecentlyAddedIndex] = useState<number | null>(null);
  const [optionsRawInputs, setOptionsRawInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    const rawMap: Record<number, string> = {};
    if (editingTable) {
      setName(editingTable.name);
      setSlug(editingTable.slug);
      setDescription(editingTable.description || '');
      setFields([...editingTable.fields]);
      setApiVisibleFields(editingTable.apiVisibleFields || []);
      setApiSearchableFields(editingTable.apiSearchableFields || []);
      editingTable.fields.forEach((f, i) => {
        if (f.type === 'select' && f.options) {
          rawMap[i] = f.options.join(', ');
        }
      });
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setFields([
        {
          key: 'id',
          label: 'ID (Primary Key)',
          type: 'number',
          required: true,
          isPrimaryKey: true
        }
      ]);
      setApiVisibleFields([]);
      setApiSearchableFields([]);
    }
    setOptionsRawInputs(rawMap);
    setErrorMessage('');
    setRecentlyAddedIndex(null);
  }, [editingTable, isOpen]);

  // Effect to auto-focus and scroll to newly added field
  useEffect(() => {
    if (recentlyAddedIndex !== null) {
      const timer = setTimeout(() => {
        const el = fieldInputRefs.current[recentlyAddedIndex];
        if (el) {
          el.focus();
          el.select();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (fieldsContainerRef.current) {
          fieldsContainerRef.current.scrollTop = fieldsContainerRef.current.scrollHeight;
        }
      }, 50);

      const clearTimer = setTimeout(() => {
        setRecentlyAddedIndex(null);
      }, 2500);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [recentlyAddedIndex, fields.length]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingTable) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleAddField = () => {
    const newIndex = fields.length;
    const newKey = `kolom_${newIndex}`;
    setFields(prev => [
      ...prev,
      {
        key: newKey,
        label: `Kolom Baru ${newIndex}`,
        type: 'text',
        required: false
      }
    ]);
    setRecentlyAddedIndex(newIndex);
  };

  const handleRemoveField = (index: number) => {
    const field = fields[index];
    if (field.isPrimaryKey || field.key === 'id') {
      alert(language === 'id' ? 'Primary key ID tidak dapat dihapus!' : 'Primary key ID cannot be deleted!');
      return;
    }
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof TableField, value: any) => {
    setFields(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };

      if (key === 'label' && !copy[index].isPrimaryKey) {
        const genKey = String(value)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        if (genKey) {
          copy[index].key = genKey;
        }
      }

      if (key === 'type' && value === 'select') {
        if (!copy[index].options || copy[index].options.length === 0) {
          copy[index].options = ['Opsi 1', 'Opsi 2'];
          setOptionsRawInputs(r => ({ ...r, [index]: 'Opsi 1, Opsi 2' }));
        }
      }

      return copy;
    });
  };

  const handleOptionsInputChange = (idx: number, rawVal: string) => {
    setOptionsRawInputs(prev => ({ ...prev, [idx]: rawVal }));
    const opts = rawVal
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    handleFieldChange(idx, 'options', opts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage(language === 'id' ? 'Nama tabel wajib diisi!' : 'Table name is required!');
      return;
    }
    if (!slug.trim()) {
      setErrorMessage(language === 'id' ? 'Slug API tabel wajib diisi!' : 'Table API slug is required!');
      return;
    }

    // Validate select fields options
    for (const f of fields) {
      if (f.type === 'select' && (!f.options || f.options.filter(o => o.trim()).length === 0)) {
        setErrorMessage(
          language === 'id'
            ? `Kolom "${f.label}" bertipe Pilihan (Select) wajib memiliki minimal 1 opsi pilihan (pisahkan dengan koma)!`
            : `Select field "${f.label}" must have at least 1 option defined!`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      await onSave({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        fields,
        apiVisibleFields: apiVisibleFields.length === fields.length ? [] : apiVisibleFields,
        apiSearchableFields: apiSearchableFields.length === fields.length ? [] : apiSearchableFields
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan tabel');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <TableIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {editingTable
                  ? language === 'id' ? `Struktur Tabel & Pengaturan API (${editingTable.name})` : `Table Schema & API Settings (${editingTable.name})`
                  : language === 'id' ? 'Buat Tabel Database Baru' : 'Create New Table'}
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                {language === 'id' ? 'Kelola kolom, tipe data, visibilitas API & pencarian' : 'Manage columns, data types, API visibility & search'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Table Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Tabel <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Contoh: Data Siswa, Produk, Pesanan"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Slug Endpoint API <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-400">/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="siswa"
                  className="w-full pl-6 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi Singkat (Opsional)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Keterangan isi dan tujuan tabel ini..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Fields Schema Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Daftar Kolom Data ({fields.length})</span>
              </span>
              <button
                type="button"
                onClick={handleAddField}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:shadow-indigo-500/20 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kolom</span>
              </button>
            </div>

            <div
              ref={fieldsContainerRef}
              className="space-y-2.5 max-h-[320px] sm:max-h-[360px] overflow-y-auto pr-1 scroll-smooth"
            >
              {fields.map((field, idx) => {
                const isPk = field.isPrimaryKey || field.key === 'id';
                const isNewlyAdded = recentlyAddedIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all duration-300 ${
                      isPk
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30'
                        : isNewlyAdded
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/50 shadow-md scale-[1.01]'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isPk ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded text-[10px] font-bold font-mono flex items-center gap-1">
                            <Key className="w-3 h-3 text-amber-600" />
                            <span>PRIMARY KEY #ID (AUTO_INCREMENT)</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Kolom #{idx + 1}
                            </span>
                            {isNewlyAdded && (
                              <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full animate-bounce flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>{language === 'id' ? 'Aktif Baru' : 'New'}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {!isPk && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Hapus Kolom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Nama Tampilan</label>
                        <input
                          ref={el => { fieldInputRefs.current[idx] = el; }}
                          type="text"
                          disabled={isPk}
                          value={field.label}
                          onChange={e => handleFieldChange(idx, 'label', e.target.value)}
                          placeholder="Label kolom..."
                          className={`w-full bg-white dark:bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition-all ${
                            isNewlyAdded
                              ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-900/30 font-semibold'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Key API (JSON)</label>
                        <input
                          type="text"
                          disabled={isPk}
                          value={field.key}
                          onChange={e => handleFieldChange(idx, 'key', e.target.value)}
                          placeholder="field_key..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Tipe Data</label>
                        <select
                          disabled={isPk}
                          value={field.type}
                          onChange={e => handleFieldChange(idx, 'type', e.target.value as FieldType)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        >
                          <option value="text">Teks (String)</option>
                          <option value="number">Angka (Number)</option>
                          <option value="select">Pilihan (Select)</option>
                          <option value="boolean">Boolean (True/False)</option>
                          <option value="date">Tanggal (Date)</option>
                          <option value="email">Email</option>
                          <option value="multiline">Paragraf / Catatan</option>
                        </select>
                      </div>
                    </div>

                    {/* Options configuration for select fields */}
                    {field.type === 'select' && (
                      <div className="mt-2.5 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 space-y-1.5 bg-indigo-50/40 dark:bg-indigo-950/20 p-2.5 rounded-lg">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <span>Opsi Pilihan (Pisahkan dengan Koma)</span>
                            <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {field.options && field.options.length > 0
                              ? `${field.options.length} Opsi Tersedia`
                              : 'Belum Ada Opsi'}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={
                            optionsRawInputs[idx] !== undefined
                              ? optionsRawInputs[idx]
                              : (field.options || []).join(', ')
                          }
                          onChange={e => handleOptionsInputChange(idx, e.target.value)}
                          placeholder="Contoh: Laki-laki, Perempuan, Lainnya (atau: Aktif, Non-Aktif, Pending)"
                          className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-mono"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            Daftar Opsi Resmi API:
                          </span>
                          {field.options && field.options.length > 0 ? (
                            field.options.map((opt, oIdx) => (
                              <span
                                key={oIdx}
                                className="px-2 py-0.5 bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white border border-indigo-700 rounded-md text-[10px] font-mono font-bold shadow-2xs"
                              >
                                {opt}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] italic text-rose-600 dark:text-rose-400 font-semibold">
                              ⚠️ Wajib masukkan opsi dipisah koma (misal: A, B, C)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bottom Add Field Button for easy access without scrolling up */}
              <button
                type="button"
                onClick={handleAddField}
                className="w-full py-2.5 px-4 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-2 border-dashed border-indigo-300 dark:border-indigo-700/80 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:border-indigo-500 hover:shadow-xs active:scale-[0.99] group mt-3"
              >
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>{language === 'id' ? '+ Tambah Kolom Baru Di Sini' : '+ Add New Column Here'}</span>
              </button>
            </div>
          </div>

          {/* API Visibility & Searchability Settings */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                <Globe className="w-4 h-4 text-indigo-500" />
                <span>Pengaturan Akses Field via REST API</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih field mana saja yang boleh terlihat saat <code className="text-indigo-600 dark:text-indigo-400 font-mono">GET API</code> dan field mana saja yang bisa digunakan untuk <code className="text-indigo-600 dark:text-indigo-400 font-mono">Pencarian (Search)</code>. Jika tidak dipilih (atau dicentang semua), defaultnya semua field akan aktif.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700/60 space-y-2 max-h-56 overflow-y-auto">
              <div className="hidden sm:grid sm:grid-cols-3 gap-2 pb-1 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span>Nama Kolom</span>
                <span className="text-center">Akses Tampil (GET)</span>
                <span className="text-center">Akses Cari (Search)</span>
              </div>
              {fields.map((f, idx) => {
                const isVisible = apiVisibleFields.length === 0 || apiVisibleFields.includes(f.key);
                const isSearchable = apiSearchableFields.length === 0 || apiSearchableFields.includes(f.key);

                return (
                  <div key={idx} className="flex flex-col sm:grid sm:grid-cols-3 gap-2 py-2 sm:py-1.5 border-b sm:border-b-0 border-slate-200/60 dark:border-slate-700/40 text-xs last:border-0">
                    <div className="font-mono text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5" title={f.key}>
                      <span className="font-bold">{f.label}</span>
                      <span className="text-[10px] text-slate-400">({f.key})</span>
                    </div>

                    <div className="flex sm:justify-center">
                      <label className="inline-flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 sm:bg-transparent sm:dark:bg-transparent px-2.5 py-1.5 sm:p-0 rounded-lg border sm:border-0 border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-full sm:w-auto">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={e => {
                            let current = apiVisibleFields.length === 0 ? fields.map(x => x.key) : [...apiVisibleFields];
                            if (e.target.checked) {
                              if (!current.includes(f.key)) current.push(f.key);
                            } else {
                              current = current.filter(k => k !== f.key);
                            }
                            if (current.length === fields.length) {
                              setApiVisibleFields([]);
                            } else {
                              setApiVisibleFields(current);
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <span className="font-medium text-[11px]">
                          {language === 'id' ? 'Tampil di GET API' : 'Visible in GET'}
                        </span>
                      </label>
                    </div>

                    <div className="flex sm:justify-center">
                      <label className="inline-flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 sm:bg-transparent sm:dark:bg-transparent px-2.5 py-1.5 sm:p-0 rounded-lg border sm:border-0 border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-full sm:w-auto">
                        <input
                          type="checkbox"
                          checked={isSearchable}
                          onChange={e => {
                            let current = apiSearchableFields.length === 0 ? fields.map(x => x.key) : [...apiSearchableFields];
                            if (e.target.checked) {
                              if (!current.includes(f.key)) current.push(f.key);
                            } else {
                              current = current.filter(k => k !== f.key);
                            }
                            if (current.length === fields.length) {
                              setApiSearchableFields([]);
                            } else {
                              setApiSearchableFields(current);
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <span className="font-medium text-[11px]">
                          {language === 'id' ? 'Dapat Dicari (Search)' : 'Searchable'}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danger Zone: Delete Table */}
          {editingTable && onDeleteTable && (
            <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Zona Bahaya: Hapus Tabel Ini</span>
                </span>
                <p className="text-[11px] text-rose-600/90 dark:text-rose-400/80 leading-relaxed">
                  Menghapus tabel "{editingTable.name}" beserta seluruh kolom dan data baris di dalamnya secara permanen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteTable(editingTable);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Tabel Ini</span>
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              {submitting ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
