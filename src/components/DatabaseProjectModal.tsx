import React, { useState } from 'react';
import { DatabaseProject } from '../types';
import { X, Database, Layers } from 'lucide-react';
import { Language, translations } from '../translations';

interface DatabaseProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: {
    name: string;
    description: string;
    color: string;
    icon: string;
  }) => Promise<void>;
  editingProject?: DatabaseProject | null;
  language: Language;
}

export function DatabaseProjectModal({
  isOpen,
  onClose,
  onSave,
  editingProject,
  language
}: DatabaseProjectModalProps) {
  const t = translations[language];
  const [name, setName] = useState(editingProject?.name || '');
  const [description, setDescription] = useState(editingProject?.description || '');
  const [color, setColor] = useState(editingProject?.color || 'indigo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(language === 'id' ? 'Nama database harus diisi' : 'Database name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSave({
        name: name.trim(),
        description: description.trim(),
        color,
        icon: 'Database'
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan database');
    } finally {
      setSubmitting(false);
    }
  };

  const colors = [
    { id: 'indigo', bg: 'bg-indigo-500' },
    { id: 'emerald', bg: 'bg-emerald-500' },
    { id: 'violet', bg: 'bg-violet-500' },
    { id: 'amber', bg: 'bg-amber-500' },
    { id: 'rose', bg: 'bg-rose-500' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {editingProject ? 'Edit Database' : t.newDatabase}
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                {language === 'id' ? 'Ruang database untuk tabel & akses REST API' : 'Database workspace for tables & REST APIs'}
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.databaseName} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Database Sekolah, Toko Online..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.databaseDescription} (Opsional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Deskripsi singkat mengenai isi data ini..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.selectColor}
            </label>
            <div className="flex items-center gap-3 pt-1">
              {colors.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-7 h-7 rounded-full ${c.bg} transition-transform ${
                    color === c.id ? 'ring-3 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
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
