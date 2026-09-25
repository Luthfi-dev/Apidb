import React, { useState } from 'react';
import { DatabaseProject, UserMode, Language, ThemeMode, ActiveNav, SafeUser } from '../types';
import {
  Layers,
  Terminal,
  BookOpen,
  Database,
  Plus,
  Moon,
  Sun,
  X,
  ChevronDown,
  Server,
  FileCode,
  Users,
  Mail,
  User as UserIcon,
  ShieldCheck,
  ShieldAlert,
  LogIn
} from 'lucide-react';
import { translations } from '../translations';

interface MobileNavProps {
  projects: DatabaseProject[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  activeNav: ActiveNav;
  setActiveNav: (nav: ActiveNav) => void;
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  currentUser?: SafeUser | null;
  onOpenAuthModal?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export function MobileNav({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  activeNav,
  setActiveNav,
  userMode,
  setUserMode,
  language,
  setLanguage,
  theme,
  toggleTheme,
  currentUser,
  onOpenAuthModal,
  onOpenProfile,
  onLogout
}: MobileNavProps) {
  const t = translations[language];
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const isSuperadmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser?.role === 'admin' || isSuperadmin;

  return (
    <>
      {/* Mobile Top Header (Clean, Compact, No Overlap) */}
      <header className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Database Title & Switcher Trigger */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 text-left min-w-0 flex-1 mr-2 p-1 rounded-xl active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block">
                {activeProject?.name || 'DataForge API'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              {language === 'id' ? 'Ketuk ganti DB' : 'Switch DB'}
            </span>
          </div>
        </button>

        {/* Right Controls: Auth, Mode Toggle & Theme */}
        <div className="flex items-center gap-1.5 shrink-0">
          {currentUser ? (
            <button
              onClick={onOpenProfile}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs ${
                currentUser.role === 'superadmin'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : currentUser.role === 'admin'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
              title="Buka Profil"
            >
              <span>{currentUser.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
            >
              <LogIn className="w-3 h-3" />
              <span>Masuk</span>
            </button>
          )}


          <button
            onClick={() => setUserMode(userMode === 'simple' ? 'developer' : 'simple')}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
              userMode === 'developer'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            title="Ganti Mode Tampilan"
          >
            {userMode === 'developer' ? 'API' : 'Biasa'}
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Database Switcher Bottom Sheet) */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-fadeIn"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-5 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                  Pilih Database
                </span>
                <span className="text-[11px] text-slate-400">
                  {projects.length} database terdaftar
                </span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl active:bg-slate-100 dark:active:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
              {projects.map(proj => {
                const isSelected = proj.id === activeProjectId;
                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj.id);
                      setIsDrawerOpen(false);
                      setActiveNav('tables');
                    }}
                    className={`w-full p-3.5 rounded-2xl text-xs text-left font-semibold flex items-center justify-between transition-colors border ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${
                        proj.color === 'emerald' ? 'bg-emerald-500' :
                        proj.color === 'amber' ? 'bg-amber-500' :
                        proj.color === 'rose' ? 'bg-rose-500' :
                        proj.color === 'violet' ? 'bg-violet-500' : 'bg-indigo-500'
                      }`} />
                      <div className="min-w-0">
                        <span className="font-bold block truncate">{proj.name}</span>
                        {proj.description && (
                          <span className="text-[10px] text-slate-400 block truncate font-normal">
                            {proj.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setIsDrawerOpen(false);
                onNewProject();
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newDatabase}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Elevated, Touch-friendly, Safe Area) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 flex items-center justify-around shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setActiveNav('tables')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-colors min-h-[44px] ${
            activeNav === 'tables'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[9px]">{t.tables}</span>
        </button>

        <button
          onClick={() => setActiveNav('sandbox')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-colors min-h-[44px] ${
            activeNav === 'sandbox'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-500" />
          <span className="text-[9px]">Sandbox</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveNav('users')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-colors min-h-[44px] ${
              activeNav === 'users'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px]">Users</span>
          </button>
        )}

        {isSuperadmin && (
          <button
            onClick={() => setActiveNav('mail-settings')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-colors min-h-[44px] ${
              activeNav === 'mail-settings'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4 text-rose-500" />
            <span className="text-[9px]">Gmail</span>
          </button>
        )}

        {isSuperadmin && (
          <button
            onClick={() => setActiveNav('db-online')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-colors min-h-[44px] ${
              activeNav === 'db-online'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px]">DB</span>
          </button>
        )}

        <button
          onClick={() => setActiveNav('docs')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-colors min-h-[44px] ${
            activeNav === 'docs'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <span className="text-[9px]">Docs</span>
        </button>
      </nav>
    </>
  );
}
