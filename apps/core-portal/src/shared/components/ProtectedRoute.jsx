import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { getAppLoginPath } from '../utils/authHelper';

/**
 * Mapping akses modul aplikasi berdasarkan Role / Permission.
 * Super Admin & Admin Yayasan memiliki bypass penuh ke semua modul.
 */
const MODULE_ROLE_RULES = {
  core: ['super_admin', 'admin_yayasan', 'developer'],
  kepegawaian: ['super_admin', 'admin_yayasan', 'hrd', 'kepegawaian', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staff_payroll', 'staf'],
  akademik: [
    'super_admin',
    'admin_yayasan',
    'admin_satuan',
    'admin_satuan_pendidikan',
    'kepala_sekolah',
    'waka_kurikulum',
    'guru',
    'wali_kelas',
    'guru_bk',
    'pelatih_ekskul',
    'guru_tamu',
    'tu'
  ],
  alquran: [
    'super_admin',
    'admin_yayasan',
    'admin_satuan',
    'admin_satuan_pendidikan',
    'kepala_sekolah',
    'guru',
    'wali_kelas',
    'musyrif',
    'guru_tahfidz',
    'tu'
  ],
  al_quran: [
    'super_admin',
    'admin_yayasan',
    'admin_satuan',
    'admin_satuan_pendidikan',
    'kepala_sekolah',
    'guru',
    'wali_kelas',
    'musyrif',
    'guru_tahfidz',
    'tu'
  ],
  keuangan: ['super_admin', 'admin_yayasan', 'keuangan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  kesiswaan: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'wali_kelas', 'pelatih_ekskul', 'tu'],
  sarpras: ['super_admin', 'admin_yayasan', 'sarpras_manager', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staf'],
  perpustakaan: ['super_admin', 'admin_yayasan', 'pustakawan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'guru', 'tu', 'staf'],
  kantin: ['super_admin', 'admin_yayasan', 'keuangan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'staf', 'tu'],
  dapur: ['super_admin', 'admin_yayasan', 'sarpras_manager', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'staf', 'tu'],
  cbt: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'tu'],
  bk: ['super_admin', 'admin_yayasan', 'guru_bk', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'wali_kelas'],
  alumni: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staf'],
  ppdb: ['super_admin', 'admin_yayasan', 'panitia_ppdb', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  portal_ortu: ['super_admin', 'admin_yayasan', 'wali_santri', 'admin_satuan', 'admin_satuan_pendidikan', 'tu'],
  portal_siswa: ['super_admin', 'admin_yayasan', 'siswa', 'guru', 'wali_kelas', 'admin_satuan', 'admin_satuan_pendidikan', 'tu'],
  manajemen: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'hrd', 'kepegawaian', 'keuangan', 'sarpras_manager'],
  'website-utama': ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'panitia_ppdb', 'tu']
};

export default function ProtectedRoute({
  redirectTo,
  requiredRoles = null,
  requiredPermissions = null,
  module = null
}) {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  // 1. Tentukan halaman login tujuan jika belum terotentikasi
  const loginPath = redirectTo || getAppLoginPath(location.pathname);

  if (!isAuthenticated || !user) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  // 2. Kumpulkan seluruh role user saat ini
  const userRoleNames = Array.isArray(user.roles)
    ? user.roles.map((r) => r.role_name).filter(Boolean)
    : (user.account_type ? [user.account_type] : []);

  const isSuperOrYayasan =
    user.account_type === 'super_admin' ||
    userRoleNames.includes('super_admin') ||
    userRoleNames.includes('admin_yayasan');

  // Super Admin & Admin Yayasan memiliki izin akses universal
  if (isSuperOrYayasan) {
    return <Outlet />;
  }

  // 3. Tentukan nama modul dari prop atau path URL jika belum didefinisikan
  let targetModule = module;
  if (!targetModule) {
    const segments = location.pathname.split('/').filter(Boolean);
    targetModule = segments[0] || 'core';
  }

  // Normalisasi nama modul untuk alias
  const normalizedModule = targetModule.replace(/-/g, '_');

  // 4. Validasi hak akses berbasis modul
  // Cek jika modul eksplisit ada di user.modules
  const userModules = Array.isArray(user.modules) ? user.modules : [];
  const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];

  let hasModuleAccess = false;

  if (userModules.includes(targetModule) || userModules.includes(normalizedModule)) {
    hasModuleAccess = true;
  } else if (userPermissions.some((p) => typeof p === 'string' && (p.startsWith(`${targetModule}.`) || p.startsWith(`${normalizedModule}.`)))) {
    hasModuleAccess = true;
  } else if (MODULE_ROLE_RULES[targetModule] || MODULE_ROLE_RULES[normalizedModule]) {
    const allowedRoles = MODULE_ROLE_RULES[targetModule] || MODULE_ROLE_RULES[normalizedModule];
    hasModuleAccess = userRoleNames.some((r) => allowedRoles.includes(r));
  } else {
    hasModuleAccess = true;
  }

  let isAuthorized = hasModuleAccess;

  // 5. Validasi hak akses berbasis role spesifik (jika diberikan di route)
  if (isAuthorized && requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = userRoleNames.some((r) => requiredRoles.includes(r));
    if (!hasRequiredRole) {
      isAuthorized = false;
    }
  }

  // 6. Validasi hak akses berbasis permission spesifik (jika diberikan di route)
  if (isAuthorized && requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some((p) => userPermissions.includes(p));
    if (!hasRequiredPermission) {
      isAuthorized = false;
    }
  }

  // 7. Jika tidak memiliki hak akses, tampilkan Tampilan Akses Ditolak (403 Forbidden) yang elegan
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700/80 rounded-3xl max-w-md w-full p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              Akses Ditolak (403 Forbidden)
            </span>
            <h2 className="text-xl font-black text-white">Bukan Hak Akses Anda</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Akun Anda (<span className="text-white font-semibold">{user.full_name || user.username}</span>) dengan peran{' '}
              <span className="text-teal-400 font-semibold font-mono">[{userRoleNames.join(', ') || 'user'}]</span> tidak memiliki otorisasi untuk mengakses modul/halaman{' '}
              <span className="text-amber-400 font-semibold">"{targetModule.toUpperCase()}"</span>.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              to="/"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Home className="w-4 h-4" />
              <span>Kembali ke Menu Utama / Launcher</span>
            </Link>

            <button
              onClick={() => logout(getAppLoginPath(location.pathname))}
              className="w-full py-2.5 bg-slate-700/70 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 border border-slate-600/60"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Ganti Akun / Keluar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
