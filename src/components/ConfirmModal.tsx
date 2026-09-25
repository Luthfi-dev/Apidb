import React from 'react';
import { AlertTriangle, Trash2, Info, LogOut, RefreshCw, X, ShieldAlert } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'logout';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'logout':
        return <LogOut className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const getBadgeStyle = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/60';
      case 'logout':
        return 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900/60';
      case 'info':
      default:
        return 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900/60';
    }
  };

  const getConfirmButtonStyle = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20';
      case 'logout':
        return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20';
      case 'info':
      default:
        return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${getBadgeStyle()}`}>
            {getIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 ${getConfirmButtonStyle()}`}
          >
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
