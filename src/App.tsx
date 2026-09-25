import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  DatabaseProject,
  DatabaseTable,
  DatabaseRecord,
  UserMode,
  Language,
  ThemeMode,
  ActiveNav,
  MySQLStatus,
  SafeUser
} from './types';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { DatabaseTableView } from './components/DatabaseTableView';
import { ConfirmModal } from './components/ConfirmModal';
import { DatabaseOutageModal } from './components/DatabaseOutageModal';
import { translations } from './translations';
import { Loader2, Plus, Database, Sparkles } from 'lucide-react';

// Code Splitting via React.lazy
const ApiDocsView = lazy(() => import('./components/ApiDocsView').then(m => ({ default: m.ApiDocsView })));
const ApiSandboxView = lazy(() => import('./components/ApiSandboxView').then(m => ({ default: m.ApiSandboxView })));
const OnlineDatabaseView = lazy(() => import('./components/OnlineDatabaseView').then(m => ({ default: m.OnlineDatabaseView })));
const MysqlSchemaView = lazy(() => import('./components/MysqlSchemaView').then(m => ({ default: m.MysqlSchemaView })));
const UserManagementView = lazy(() => import('./components/UserManagementView').then(m => ({ default: m.UserManagementView })));
const MailSettingsView = lazy(() => import('./components/MailSettingsView').then(m => ({ default: m.MailSettingsView })));
const LandingPageView = lazy(() => import('./components/LandingPageView').then(m => ({ default: m.LandingPageView })));
const ApiPlaygroundModal = lazy(() => import('./components/ApiPlaygroundModal').then(m => ({ default: m.ApiPlaygroundModal })));
const DatabaseProjectModal = lazy(() => import('./components/DatabaseProjectModal').then(m => ({ default: m.DatabaseProjectModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const ProfileModal = lazy(() => import('./components/ProfileModal').then(m => ({ default: m.ProfileModal })));

const ComponentLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    <span className="text-xs font-semibold">Memuat Komponen Tampilan...</span>
  </div>
);

export function App() {
  const [projects, setProjects] = useState<DatabaseProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [activeTableId, setActiveTableId] = useState<string>('');
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [dbStatus, setDbStatus] = useState<MySQLStatus | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
  const [authModalEmail, setAuthModalEmail] = useState<string>('');
  const [authModalToken, setAuthModalToken] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Confirmation Modal State
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

  // Navigation and views
  const [activeNav, setActiveNav] = useState<ActiveNav>('tables');
  const [userMode, setUserMode] = useState<UserMode>('simple');
  const [language, setLanguage] = useState<Language>('id');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dataforge_theme') || localStorage.getItem('spillbase_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper for auth header
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('dataforge_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Sync theme with <html> and <body> classes and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('dataforge_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Check current user session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('dataforge_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              setCurrentUser(data.user);
              setLoading(false);
              return;
            }
          }
        } catch (_) {}
      }
      // If unauthenticated or token expired, do not open modal automatically; display landing page
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Strict page and menu access guard based on current user role
  useEffect(() => {
    if (!currentUser) {
      if (['users', 'mail-settings', 'db-online', 'mysql-schema'].includes(activeNav)) {
        setActiveNav('tables');
      }
    } else if (currentUser.role === 'user') {
      if (['users', 'mail-settings', 'db-online', 'mysql-schema'].includes(activeNav)) {
        setActiveNav('tables');
      }
    } else if (currentUser.role === 'admin') {
      if (['mail-settings', 'db-online', 'mysql-schema'].includes(activeNav)) {
        setActiveNav('tables');
      }
    }
  }, [currentUser, activeNav]);

  // Handle URL email verification link or reset password link if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const verifyToken = urlParams.get('verify_token');
      const resetToken = urlParams.get('reset_token');
      const emailParam = urlParams.get('email');

      if (resetToken) {
        setAuthModalToken(resetToken);
        if (emailParam) setAuthModalEmail(emailParam);
        setAuthModalMode('reset');
        setIsAuthModalOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (verifyToken) {
        fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: verifyToken })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.user && data.jwtToken) {
              localStorage.setItem('dataforge_token', data.jwtToken);
              setCurrentUser(data.user);
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handlePromptLogout = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Konfirmasi Keluar Sesi',
      message: `Apakah Anda yakin ingin mengakhiri sesi dan keluar dari akun ${currentUser?.email || ''}?`,
      confirmText: 'Ya, Keluar Akun',
      cancelText: 'Tetap di Sini',
      variant: 'logout',
      onConfirm: () => {
        localStorage.removeItem('dataforge_token');
        setCurrentUser(null);
        setProjects([]);
        setTables([]);
        setRecords([]);
        setActiveProjectId('');
        setActiveTableId('');
        setIsProfileModalOpen(false);
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        setIsAuthModalOpen(true);
        setAuthModalMode('login');
      }
    });
  };

  const handleAuthSuccess = (user: SafeUser, token: string) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  // Fetch DB Status
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (_) {}
  };

  const handleRetryDbConnection = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/db/reconnect', { method: 'POST' });
      const data = await res.json();
      await fetchDbStatus();
      if (data.success) {
        if (currentUser) {
          fetchProjects();
        }
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  };

  useEffect(() => {
    fetchDbStatus();
    // Periodically poll DB status every 12 seconds to ensure uninterrupted online DB connection
    const interval = setInterval(fetchDbStatus, 12000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Projects whenever currentUser changes
  useEffect(() => {
    fetchProjects();
  }, [currentUser]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects', {
        headers: getAuthHeaders()
      });
      const data: DatabaseProject[] = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        if (data.length > 0) {
          setActiveProjectId(prev => (data.some(p => p.id === prev) ? prev : data[0].id));
        } else {
          setActiveProjectId('');
          setTables([]);
          setRecords([]);
        }
      }
    } catch (err) {
      console.error('Failed to load databases:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Tables when active Project changes
  useEffect(() => {
    if (!activeProjectId) {
      setTables([]);
      setRecords([]);
      return;
    }
    fetchTables(activeProjectId);
  }, [activeProjectId]);

  const fetchTables = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tables`, {
        headers: getAuthHeaders()
      });
      const data: DatabaseTable[] = await res.json();
      setTables(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setActiveTableId(data[0].id);
      } else {
        setActiveTableId('');
        setRecords([]);
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  };

  // Fetch Records when active Table changes
  useEffect(() => {
    if (!activeProjectId || !activeTableId) return;
    fetchRecords(activeProjectId, activeTableId);
  }, [activeProjectId, activeTableId]);

  const fetchRecords = async (projectId: string, tableId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tables/${tableId}/records`, {
        headers: getAuthHeaders()
      });
      const data: DatabaseRecord[] = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load records:', err);
    }
  };

  // -------------------------------------------------------------
  // CRUD Handlers
  // -------------------------------------------------------------

  // Record CRUD
  const handleAddRecord = async (formData: Record<string, any>) => {
    if (!activeProjectId || !activeTableId) return;
    const res = await fetch(`/api/projects/${activeProjectId}/tables/${activeTableId}/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(formData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menambah data');
    }
    const newRecord: DatabaseRecord = await res.json();
    setRecords(prev => [...prev, newRecord]);
  };

  const handleUpdateRecord = async (recordId: number | string, formData: Record<string, any>) => {
    if (!activeProjectId || !activeTableId) return;
    const res = await fetch(`/api/projects/${activeProjectId}/tables/${activeTableId}/records/${recordId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(formData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mengubah data');
    }
    const updated: DatabaseRecord = await res.json();
    setRecords(prev => prev.map(r => (String(r.id) === String(recordId) ? updated : r)));
  };

  const handleDeleteRecord = async (recordId: number | string) => {
    if (!activeProjectId || !activeTableId) return;
    const res = await fetch(`/api/projects/${activeProjectId}/tables/${activeTableId}/records/${recordId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Gagal menghapus data');
    setRecords(prev => prev.filter(r => String(r.id) !== String(recordId)));
  };

  // Table CRUD
  const handleCreateTable = async (tableData: any) => {
    if (!activeProjectId) return;
    const res = await fetch(`/api/projects/${activeProjectId}/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(tableData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal membuat tabel');
    }
    const createdTable: DatabaseTable = await res.json();
    setTables(prev => [...prev, createdTable]);
    setActiveTableId(createdTable.id);
  };

  const handleUpdateTable = async (tableId: string, tableData: any) => {
    if (!activeProjectId) return;
    const res = await fetch(`/api/projects/${activeProjectId}/tables/${tableId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(tableData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mengubah struktur tabel');
    }
    const updated: DatabaseTable = await res.json();
    setTables(prev => prev.map(t => (t.id === tableId ? updated : t)));
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!activeProjectId) return;
    const res = await fetch(`/api/projects/${activeProjectId}/tables/${tableId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Gagal menghapus tabel');
    const remaining = tables.filter(t => t.id !== tableId);
    setTables(remaining);
    if (remaining.length > 0) {
      setActiveTableId(remaining[0].id);
    } else {
      setActiveTableId('');
      setRecords([]);
    }
  };

  // Database / Project CRUD
  const handleCreateProject = async (projectData: any) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(projectData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal membuat database');
    }
    const created: DatabaseProject = await res.json();
    setProjects(prev => [created, ...prev]);
    setActiveProjectId(created.id);
    setActiveNav('tables');
  };

  const handleDeleteProject = (projectId: string) => {
    const target = projects.find(p => p.id === projectId);
    setConfirmModalState({
      isOpen: true,
      title: 'Konfirmasi Hapus Database',
      message: `Apakah Anda yakin ingin menghapus database "${target?.name || 'ini'}" secara permanen? Seluruh tabel, struktur kolom, dan semua baris data di dalamnya akan terhapus dan tidak dapat dipulihkan.`,
      confirmText: 'Ya, Hapus Database',
      cancelText: 'Batalkan',
      variant: 'danger',
      onConfirm: async () => {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Gagal menghapus database');
        const remaining = projects.filter(p => p.id !== projectId);
        setProjects(remaining);
        if (remaining.length > 0) {
          setActiveProjectId(remaining[0].id);
        } else {
          setActiveProjectId('');
          setTables([]);
          setRecords([]);
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleProjectTokenRefreshed = (updatedProject: DatabaseProject) => {
    setProjects(prev => prev.map(p => (p.id === updatedProject.id ? updatedProject : p)));
  };

  const handleTableTokenRefreshed = (updatedTable: DatabaseTable) => {
    setTables(prev => prev.map(t => (t.id === updatedTable.id ? updatedTable : t)));
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;
  const activeTable = tables.find(t => t.id === activeTableId) || tables[0] || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs font-semibold text-slate-400">Memuat Sesi Aplikasi...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased font-sans">
        <LandingPageView
          language={language}
          onOpenLogin={() => {
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          onOpenRegister={() => {
            setAuthModalMode('register');
            setIsAuthModalOpen(true);
          }}
        />

        {/* Authentication & Verification Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authModalMode}
          initialEmail={authModalEmail}
          initialToken={authModalToken}
          language={language}
        />

        {/* Global Confirmation Modal */}
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased font-sans transition-colors duration-150">
      {/* Mobile Top Navigation */}
      <MobileNav
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onNewProject={() => setIsProjectModalOpen(true)}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        userMode={userMode}
        setUserMode={setUserMode}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        onOpenAuthModal={() => {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handlePromptLogout}
      />

      {/* Desktop Left Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onNewProject={() => setIsProjectModalOpen(true)}
          onDeleteProject={handleDeleteProject}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          userMode={userMode}
          setUserMode={setUserMode}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
          dbStatus={dbStatus}
          currentUser={currentUser}
          onOpenAuthModal={() => {
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onLogout={handlePromptLogout}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 max-w-full overflow-x-hidden overflow-y-auto p-3 sm:p-6 lg:p-8 pb-28 md:pb-8">
        <Suspense fallback={<ComponentLoader />}>
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-xs font-semibold">Memuat Data & Schema...</span>
            </div>
          ) : activeNav === 'users' && (currentUser?.role === 'admin' || currentUser?.role === 'superadmin') ? (
            <UserManagementView
              currentUser={currentUser}
              language={language}
              onOpenRegisterModal={() => {
                setAuthModalMode('register');
                setIsAuthModalOpen(true);
              }}
            />
          ) : activeNav === 'mail-settings' && currentUser?.role === 'superadmin' ? (
            <MailSettingsView
              currentUser={currentUser}
              language={language}
            />
          ) : activeNav === 'db-online' && currentUser?.role === 'superadmin' ? (
            <OnlineDatabaseView
              language={language}
              onNavigateToSchema={() => setActiveNav('mysql-schema')}
              onDataSynced={() => {
                fetchProjects();
                fetchDbStatus();
                if (activeProjectId && activeTableId) {
                  fetchRecords(activeProjectId, activeTableId);
                }
              }}
            />
          ) : activeNav === 'mysql-schema' && currentUser?.role === 'superadmin' ? (
            <MysqlSchemaView
              language={language}
              onNavigateToConnection={() => setActiveNav('db-online')}
            />
          ) : !activeProject ? (
            <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md mb-4">
                <Database className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Workspace Database Anda Masih Bersih
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                Anda belum memiliki database aktif. Buat database baru dari awal untuk mulai membuat tabel, mengelola rekaman data, dan menghasilkan REST API instan.
              </p>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Database Pertama Anda</span>
              </button>
            </div>
          ) : activeNav === 'tables' ? (
            <DatabaseTableView
              project={activeProject}
              tables={tables}
              activeTableId={activeTableId}
              onSelectTable={setActiveTableId}
              records={records}
              userMode={userMode}
              setUserMode={setUserMode}
              language={language}
              onAddRecord={handleAddRecord}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleDeleteRecord}
              onCreateTable={handleCreateTable}
              onUpdateTable={handleUpdateTable}
              onDeleteTable={handleDeleteTable}
              onOpenPlayground={() => setIsPlaygroundOpen(true)}
              onProjectTokenRefreshed={handleProjectTokenRefreshed}
              onTableTokenRefreshed={handleTableTokenRefreshed}
            />
          ) : activeNav === 'sandbox' ? (
            <ApiSandboxView
              project={activeProject}
              tables={tables}
              activeTable={activeTable}
              language={language}
              onDataModified={() => {
                if (activeProjectId && activeTableId) {
                  fetchRecords(activeProjectId, activeTableId);
                }
              }}
            />
          ) : (
            <ApiDocsView
              project={activeProject}
              tables={tables}
              language={language}
              onOpenPlayground={() => setIsPlaygroundOpen(true)}
              onProjectTokenRefreshed={handleProjectTokenRefreshed}
              onTableTokenRefreshed={handleTableTokenRefreshed}
            />
          )}
        </Suspense>
      </main>

      {/* Lazy Modals wrapped in Suspense */}
      <Suspense fallback={null}>
        {/* Project / Database Modal */}
        {isProjectModalOpen && (
          <DatabaseProjectModal
            isOpen={isProjectModalOpen}
            onClose={() => setIsProjectModalOpen(false)}
            language={language}
            onSave={handleCreateProject}
          />
        )}

        {/* Live API Playground Modal */}
        {isPlaygroundOpen && activeProject && (
          <ApiPlaygroundModal
            isOpen={isPlaygroundOpen}
            onClose={() => setIsPlaygroundOpen(false)}
            project={activeProject}
            tables={tables}
            activeTable={activeTable}
            language={language}
            onDataModified={() => {
              if (activeProjectId && activeTableId) {
                fetchRecords(activeProjectId, activeTableId);
              }
            }}
          />
        )}

        {/* Authentication & Verification Modal */}
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={handleAuthSuccess}
            initialMode={authModalMode}
            initialEmail={authModalEmail}
            initialToken={authModalToken}
            language={language}
          />
        )}

        {/* User Profile Modal */}
        {isProfileModalOpen && currentUser && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            currentUser={currentUser}
            onProfileUpdated={(updated) => setCurrentUser(updated)}
            onRequestLogout={handlePromptLogout}
            language={language}
          />
        )}
      </Suspense>

      {/* Global Confirmation Modal */}
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

      {/* Online Database Outage / Disconnected Modal */}
      <DatabaseOutageModal
        isOpen={Boolean(dbStatus && dbStatus.connected === false)}
        dbStatus={dbStatus}
      />
    </div>
  );
}
export default App;
