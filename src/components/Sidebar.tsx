import React, { useState, useEffect } from 'react';
import { DatabaseProject, UserMode, Language, ThemeMode, ActiveNav, MySQLStatus, SafeUser } from '../types';
import {
  Database,
  Terminal,
  BookOpen,
  Plus,
  Moon,
  Sun,
  Globe,
  Trash2,
  Layers,
  Code2,
  FolderOpen,
  Server,
  FileCode,
  CheckCircle2,
  Users,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Shield,
  LogIn,
  LogOut
} from 'lucide-react';
import { translations } from '../translations';

interface SidebarProps {
  projects: DatabaseProject[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  activeNav: ActiveNav;
  setActiveNav: (nav: ActiveNav) => void;
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  dbStatus?: MySQLStatus | null;
  currentUser: SafeUser | null;
  onOpenAuthModal: () => void;
  onOpenProfile?: () => void;
  onLogout: () => void;
}

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  activeNav,
  setActiveNav,
  userMode,
  setUserMode,
  language,
  setLanguage,
  theme,
  toggleTheme,
  dbStatus,
  currentUser,
  onOpenAuthModal,
  onOpenProfile,
  onLogout
}: SidebarProps) {
  const t = translations[language];
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const isMysqlOnline = dbStatus?.connected && dbStatus?.engine === 'mysql';
  const isSuperadmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser?.role === 'admin' || isSuperadmin;

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen select-none shrink-0 z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-md">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              DataForge <span className="text-[10px] font-mono px-1 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold">API</span>
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Online Database & REST Studio
            </span>
          </div>
        </div>
      </div>

      {/* User Auth Profile Card */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        {currentUser ? (
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-2">
            <div
              onClick={onOpenProfile}
              className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
              title="Lihat & Edit Profil Akun"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs shrink-0 ${
                currentUser.role === 'superadmin'
                  ? 'bg-gradient-to-tr from-indigo-600 to-violet-600'
                  : currentUser.role === 'admin'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                  : 'bg-gradient-to-tr from-slate-600 to-slate-500'
              }`}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate block">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={onOpenProfile}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider hover:opacity-80 transition-opacity ${
                  currentUser.role === 'superadmin'
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    : currentUser.role === 'admin'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {currentUser.role === 'superadmin' && <ShieldAlert className="w-2.5 h-2.5" />}
                {currentUser.role === 'admin' && <ShieldCheck className="w-2.5 h-2.5" />}
                {currentUser.role === 'user' && <Shield className="w-2.5 h-2.5" />}
                <span>{currentUser.role}</span>
              </button>

              <button
                onClick={onLogout}
                className="text-[10px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold flex items-center gap-1 transition-colors"
                title="Keluar dari akun Anda"
              >
                <LogOut className="w-3 h-3" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk / Daftar Akun</span>
          </button>
        )}
      </div>


      {/* Main Navigation Links */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-1">
        <button
          onClick={() => setActiveNav('tables')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
            activeNav === 'tables'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t.tables}</span>
        </button>

        <button
          onClick={() => setActiveNav('sandbox')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
            activeNav === 'sandbox'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-500" />
          <span>{t.apiSandbox}</span>
        </button>

        <button
          onClick={() => setActiveNav('docs')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
            activeNav === 'docs'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <span>{t.apiDocs}</span>
        </button>

        {/* Level Admin & Superadmin: Kelola Pengguna */}
        {isAdmin && (
          <button
            onClick={() => setActiveNav('users')}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
              activeNav === 'users'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Kelola Pengguna</span>
          </button>
        )}

        {/* Level Superadmin Only: Gmail SMTP & Skema Teknis */}
        {isSuperadmin && (
          <>
            <button
              onClick={() => setActiveNav('mail-settings')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
                activeNav === 'mail-settings'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Mail className="w-4 h-4 text-rose-500" />
              <span>Server Send Mail</span>
            </button>

            <button
              onClick={() => setActiveNav('db-online')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                activeNav === 'db-online'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-emerald-500" />
                <span>Koneksi DB Online</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${isMysqlOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
            </button>

            <button
              onClick={() => setActiveNav('mysql-schema')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
                activeNav === 'mysql-schema'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-4 h-4 text-amber-500" />
              <span>Skema MySQL (DDL)</span>
            </button>
          </>
        )}
      </div>

      {/* Database Projects Section */}
      <div className="p-3 flex-1 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>{t.databases}</span>
          <button
            onClick={onNewProject}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
            title={t.newDatabase}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          {projects.map(proj => {
            const isCurrent = proj.id === activeProjectId;
            return (
              <div
                key={proj.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
                onClick={() => {
                  onSelectProject(proj.id);
                  setActiveNav('tables');
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    proj.color === 'emerald' ? 'bg-emerald-500' :
                    proj.color === 'amber' ? 'bg-amber-500' :
                    proj.color === 'rose' ? 'bg-rose-500' :
                    proj.color === 'violet' ? 'bg-violet-500' : 'bg-indigo-500'
                  }`} />
                  <span className="truncate">{proj.name}</span>
                </div>

                {projects.length > 1 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteProject(proj.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity"
                    title={t.deleteDatabase}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Settings & Preferences */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
        {/* Mode Selector */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-500 font-medium">Mode:</span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-[11px] font-bold">
            <button
              onClick={() => setUserMode('simple')}
              className={`px-2 py-0.5 rounded transition-colors ${
                userMode === 'simple' ? 'bg-white dark:bg-slate-900 shadow-2xs text-slate-900 dark:text-slate-100' : 'text-slate-500'
              }`}
            >
              Biasa
            </button>
            <button
              onClick={() => setUserMode('developer')}
              className={`px-2 py-0.5 rounded transition-colors ${
                userMode === 'developer' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-500'
              }`}
            >
              API
            </button>
          </div>
        </div>

        {/* Theme & Language Toggles */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
            className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 rounded-md"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language.toUpperCase()}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title={t.themeToggle}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

        {/* Maudigi Branding */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400 font-medium">
          Developed by <span className="text-indigo-600 dark:text-indigo-400 font-bold">Maudigi.com</span>
        </div>
      </div>
    </aside>
  );
}
