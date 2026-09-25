import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Trash2,
  Search,
  Check,
  Mail,
  Calendar,
  AlertCircle,
  RefreshCw,
  Plus,
  AlertTriangle
} from 'lucide-react';
import { SafeUser, UserRole, Language } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface UserManagementViewProps {
  currentUser: SafeUser;
  language: Language;
  onOpenRegisterModal?: () => void;
}

export function UserManagementView({ currentUser, language, onOpenRegisterModal }: UserManagementViewProps) {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('dataforge_token');
      const res = await fetch('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4500);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const token = localStorage.getItem('dataforge_token');
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
        showMsg(`Hak akses berhasil diubah menjadi ${newRole.toUpperCase()}.`);
      } else {
        showMsg(data.error || 'Gagal mengubah role pengguna.', 'error');
      }
    } catch (err: any) {
      showMsg(err.message, 'error');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('dataforge_token');
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isActive: !currentStatus } : u)));
        showMsg(`Status pengguna berhasil diubah menjadi ${!currentStatus ? 'Aktif' : 'Nonaktif'}.`);
      } else {
        showMsg(data.error || 'Gagal mengubah status.', 'error');
      }
    } catch (err: any) {
      showMsg(err.message, 'error');
    }
  };

  const handleManualVerify = async (userId: string) => {
    try {
      const token = localStorage.getItem('dataforge_token');
      const res = await fetch(`/api/users/${userId}/verify-manual`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isVerified: true } : u)));
        showMsg('Akun pengguna berhasil diverifikasi secara manual.');
      } else {
        showMsg(data.error || 'Gagal memverifikasi pengguna.', 'error');
      }
    } catch (err: any) {
      showMsg(err.message, 'error');
    }
  };

  const promptDeleteUser = (targetUser: SafeUser) => {
    const superCount = users.filter(u => u.role === 'superadmin').length;
    if (targetUser.role === 'superadmin' && superCount <= 1) {
      showMsg('Tidak dapat menghapus satu-satunya akun Superadmin utama.', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Hapus Akun Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun "${targetUser.name}" (${targetUser.email}) dengan hak akses ${targetUser.role.toUpperCase()}? Data akun dan sesi login pengguna ini akan dihapus permanen.`,
      confirmText: 'Ya, Hapus Akun',
      cancelText: 'Batalkan',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('dataforge_token');
          const res = await fetch(`/api/users/${targetUser.id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setUsers(prev => prev.filter(u => u.id !== targetUser.id));
            showMsg(data.message || `Akun "${targetUser.name}" berhasil dihapus.`);
          } else {
            showMsg(data.error || 'Gagal menghapus pengguna.', 'error');
          }
        } catch (err: any) {
          showMsg(err.message || 'Terjadi kesalahan jaringan.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const superadminsCount = users.filter(u => u.role === 'superadmin').length;
  const adminsCount = users.filter(u => u.role === 'admin').length;
  const regularUsersCount = users.filter(u => u.role === 'user').length;
  const verifiedCount = users.filter(u => u.isVerified).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 text-white rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">Manajemen Pengguna & Hak Akses (RBAC)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Level Akses: {currentUser.role.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Kelola hak akses berstandar industri: Superadmin (Skema teknis & Server Gmail), Admin (Kelola Pengguna), dan User (Akses Data Aplikasi).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>

            {onOpenRegisterModal && (
              <button
                onClick={onOpenRegisterModal}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pengguna</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Total Pengguna</span>
            <span className="text-lg font-bold text-white">{users.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/50">
            <span className="text-[10px] text-indigo-300 block font-medium">Superadmin</span>
            <span className="text-lg font-bold text-indigo-400">{superadminsCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50">
            <span className="text-[10px] text-emerald-300 block font-medium">Admin & User</span>
            <span className="text-lg font-bold text-emerald-400">{adminsCount + regularUsersCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Terverifikasi Email</span>
            <span className="text-lg font-bold text-emerald-400">{verifiedCount} / {users.length}</span>
          </div>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-fadeIn ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
          <span className="flex-1">{message.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau email pengguna..."
            className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(['all', 'superadmin', 'admin', 'user'] as const).map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                roleFilter === role
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {role === 'all' ? 'Semua' : role.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Hak Akses (Role)</th>
                <th className="py-3.5 px-4">Verifikasi Email</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4 text-center">Tindakan / Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Memuat daftar pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ada pengguna yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isSelf = u.id === currentUser.id;
                  const isSuperadminTarget = u.role === 'superadmin';
                  const isLastSuperadmin = isSuperadminTarget && superadminsCount <= 1;

                  // Superadmin can edit any role. Admin can edit role for user and other non-superadmins.
                  const canEditRole =
                    currentUser.role === 'superadmin' ||
                    (currentUser.role === 'admin' && !isSuperadminTarget);

                  // Superadmin can delete anyone except self & last superadmin.
                  // Admin can delete users and other admins, but cannot delete superadmins.
                  const canDelete =
                    !isSelf &&
                    !isLastSuperadmin &&
                    (currentUser.role === 'superadmin' || (currentUser.role === 'admin' && !isSuperadminTarget));

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs shrink-0 ${
                            u.role === 'superadmin'
                              ? 'bg-gradient-to-tr from-indigo-600 to-violet-600'
                              : u.role === 'admin'
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                              : 'bg-gradient-to-tr from-slate-600 to-slate-500'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span className="truncate">{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block truncate">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Selector */}
                      <td className="py-3.5 px-4">
                        {canEditRole && !isSelf ? (
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {currentUser.role === 'superadmin' && (
                              <option value="superadmin">Superadmin</option>
                            )}
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            u.role === 'superadmin'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              : u.role === 'admin'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {u.role === 'superadmin' && <ShieldAlert className="w-3 h-3 text-indigo-600" />}
                            {u.role === 'admin' && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                            {u.role === 'user' && <Shield className="w-3 h-3 text-slate-400" />}
                            <span>{u.role.toUpperCase()}</span>
                          </span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4">
                        {u.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                            <span>Terverifikasi</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              Menunggu
                            </span>
                            <button
                              onClick={() => handleManualVerify(u.id)}
                              className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 rounded text-[10px] font-bold transition-colors"
                              title="Verifikasi langsung tanpa kode email"
                            >
                              Verifikasi
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(u.id, u.isActive)}
                          disabled={isSelf}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          } ${isSelf ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`}
                          title={isSelf ? 'Anda tidak dapat menonaktifkan akun sendiri' : 'Klik untuk mengubah status aktif'}
                        >
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        {isSelf ? (
                          <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            Akun Anda
                          </span>
                        ) : isLastSuperadmin ? (
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg" title="Superadmin utama tidak dapat dihapus">
                            Superadmin Utama
                          </span>
                        ) : canDelete ? (
                          <button
                            onClick={() => promptDeleteUser(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 rounded-lg text-[11px] font-bold transition-all shadow-2xs"
                            title={`Hapus akun ${u.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg" title="Hanya Superadmin yang dapat menghapus akun ini">
                            Akses Dibatasi
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
      />
    </div>
  );
}
