import React from 'react';
import { ServerCrash, ShieldAlert, WifiOff } from 'lucide-react';
import { MySQLStatus } from '../types';

interface DatabaseOutageModalProps {
  isOpen: boolean;
  dbStatus: MySQLStatus | null;
}

export function DatabaseOutageModal({
  isOpen,
  dbStatus
}: DatabaseOutageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/60 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col my-auto animate-scaleUp text-slate-900 dark:text-slate-100">
        {/* Top Warning Banner */}
        <div className="p-6 pb-5 bg-gradient-to-b from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900 border-b border-rose-100 dark:border-rose-900/40 text-center relative">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-3 shadow-inner ring-8 ring-rose-500/5">
            <ServerCrash className="w-8 h-8 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900 mb-2 tracking-wide uppercase">
            <WifiOff className="w-3.5 h-3.5" /> Gangguan Sistem
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Aplikasi Sedang Ada Kendala
          </h3>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 rounded-2xl text-slate-700 dark:text-slate-300 leading-relaxed text-center space-y-3">
            <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-rose-200/50 dark:border-rose-900/40 text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Aplikasi sedang ada kendala. Coba lagi nanti atau hubungi bagian administrator.</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Sistem sedang melakukan pemulihan otomatis di latar belakang. Mohon menunggu beberapa saat.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-center">
          <span className="text-[11px] text-slate-400 font-medium">
            DataForge Enterprise Core Protection
          </span>
        </div>
      </div>
    </div>
  );
}
