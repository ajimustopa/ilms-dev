/**
 * Helper untuk menentukan URL halaman login aplikasi berdasarkan path URL saat ini.
 * Memastikan ketika user logout dari aplikasi manapun (misal Akademik, Kepegawaian, Keuangan, Kantin, dll),
 * user diarahkan kembali ke halaman login aplikasi terkait, bukan langsung ke core login.
 */
export const getAppLoginPath = (pathname = '') => {
  const path = typeof pathname === 'string' && pathname ? pathname : (typeof window !== 'undefined' ? window.location.pathname : '');
  
  if (path.startsWith('/akademik')) return '/akademik/login';
  if (path.startsWith('/kepegawaian')) return '/kepegawaian/login';
  if (path.startsWith('/keuangan')) return '/keuangan/login';
  if (path.startsWith('/alquran')) return '/alquran/login';
  if (path.startsWith('/kantin')) return '/kantin/login';
  if (path.startsWith('/sarpras')) return '/sarpras/login';
  if (path.startsWith('/dapur')) return '/dapur/login';
  if (path.startsWith('/perpustakaan')) return '/perpustakaan/login';
  if (path.startsWith('/manajemen')) return '/manajemen/login';
  if (path.startsWith('/core')) return '/core/login';
  if (path.startsWith('/website-utama')) return '/core/login';
  
  return '/core/login';
};
