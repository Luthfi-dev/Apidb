import React, { useState, useEffect } from 'react';
import { DatabaseTable, DatabaseRecord } from '../types';
import { X, Check, Copy, Key, Hash, FileText } from 'lucide-react';
import { Language, translations } from '../translations';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: Record<string, any>) => Promise<void>;
  table: DatabaseTable;
  editingRecord: DatabaseRecord | null;
  language: Language;
}

export function RecordModal({
  isOpen,
  onClose,
  onSave,
  table,
  editingRecord,
  language
}: RecordModalProps) {
  const t = translations[language];
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [copiedId, setCopiedId] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize form data when modal opens
  useEffect(() => {
    if (editingRecord) {
      setFormData({ ...editingRecord.data });
    } else {
      const initial: Record<string, any> = {};
      table.fields.forEach(field => {
        if (!field.isPrimaryKey && field.key !== 'id') {
          if (field.defaultValue !== undefined) {
            initial[field.key] = field.defaultValue;
          } else if (field.type === 'select' && field.options && field.options.length > 0) {
            initial[field.key] = field.options[0];
          } else if (field.type === 'boolean') {
            initial[field.key] = false;
          } else if (field.type === 'date') {
            initial[field.key] = new Date().toISOString().split('T')[0];
          } else {
            initial[field.key] = '';
          }
        }
      });
      setFormData(initial);
    }
    setErrorMessage('');
  }, [editingRecord, table, isOpen]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (!editingRecord) return;
    navigator.clipboard.writeText(String(editingRecord.id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validate required fields
    for (const field of table.fields) {
      if (field.required && !field.isPrimaryKey && field.key !== 'id') {
        const val = formData[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          setErrorMessage(
            language === 'id'
              ? `Kolom "${field.label}" wajib diisi!`
              : `Field "${field.label}" is required!`
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  // Editable fields (excluding the primary key which is auto-generated)
  const editableFields = table.fields.filter(f => !f.isPrimaryKey && f.key !== 'id');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {editingRecord
                  ? language === 'id'
                    ? `Edit Baris Data (${table.name})`
                    : `Edit Row (${table.name})`
                  : language === 'id'
                  ? `Tambah Data Baru (${table.name})`
                  : `Add New Record (${table.name})`}
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                Tabel API: <code className="font-mono text-emerald-600 dark:text-emerald-400">{table.slug}</code>
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

        {/* Primary Key Status Banner */}
        {editingRecord ? (
          <div className="px-4 sm:px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 shrink-0">
                Primary Key:
              </span>
              <code className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/30 select-all truncate">
                #{editingRecord.id}
              </code>
            </div>

            <button
              type="button"
              onClick={handleCopyId}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs shrink-0"
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
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-2 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {language === 'id'
                ? 'Primary Key #ID otomatis (MySQL AUTO_INCREMENT)'
                : 'Primary Key #ID will be auto-generated (AUTO_INCREMENT)'}
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl">
              {errorMessage}
            </div>
          )}

          {editableFields.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              Tabel ini belum memiliki kolom tambahan selain ID. Silakan tambahkan kolom terlebih dahulu.
            </p>
          ) : (
            <div className="space-y-3.5">
              {editableFields.map(field => {
                const value = formData[field.key] !== undefined ? formData[field.key] : '';

                return (
                  <div key={field.key} className="space-y-1">
                    <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{field.label}</span>
                        {field.required && <span className="text-rose-500 font-bold shrink-0">*</span>}
                        <code className="text-[10px] text-slate-400 font-normal font-mono truncate hidden sm:inline">({field.key})</code>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-normal shrink-0">{field.type}</span>
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={value}
                        onChange={e => handleChange(field.key, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      >
                        {!value && <option value="">-- Pilih {field.label} --</option>}
                        {field.options && field.options.length > 0 ? (
                          field.options.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            (Belum ada opsi didefinisikan)
                          </option>
                        )}
                      </select>
                    ) : field.type === 'multiline' ? (
                      <textarea
                        rows={3}
                        value={value}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={`Isi ${field.label}...`}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    ) : field.type === 'boolean' ? (
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={e => handleChange(field.key, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {Boolean(value) ? 'Aktif / Benar (True)' : 'Nonaktif / Salah (False)'}
                        </span>
                      </label>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                        value={value}
                        onChange={e => {
                          const val = field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                          handleChange(field.key, val);
                        }}
                        placeholder={`Masukkan ${field.label}...`}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              {submitting ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
