/**
 * Migration: seed_standard_roles_and_app_permissions
 * Menambahkan Role Standar Lengkap dan Permission View/Manage untuk 14 Modul Aplikasi Sekolah
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambahkan role standar jika belum ada
  const standardRoles = [
    { name: 'hrd', description: 'Pengelola Kepegawaian & SDM Yayasan', is_system_role: true },
    { name: 'keuangan', description: 'Pengelola Keuangan, Kas & Pembayaran SPP', is_system_role: true },
    { name: 'tu', description: 'Tata Usaha Satuan Pendidikan', is_system_role: true },
    { name: 'guru', description: 'Pendidik / Tenaga Pengajar Mata Pelajaran', is_system_role: true },
    { name: 'wali_kelas', description: 'Wali Kelas & Manajemen Rapor Siswa', is_system_role: true },
    { name: 'guru_bk', description: 'Guru Bimbingan & Konseling', is_system_role: true },
    { name: 'sarpras_manager', description: 'Pengelola Sarana, Prasarana & Aset', is_system_role: true },
    { name: 'pustakawan', description: 'Pengelola Perpustakaan & Sirkulasi Buku', is_system_role: true },
    { name: 'panitia_ppdb', description: 'Panitia Penerimaan Peserta Didik Baru', is_system_role: true },
    { name: 'staf', description: 'Staf Umum & Karyawan Satuan Pendidikan', is_system_role: true }
  ];

  for (const r of standardRoles) {
    const exists = await knex('roles').where({ name: r.name }).first();
    if (!exists) {
      await knex('roles').insert({
        ...r,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }

  // 2. Daftar 14 Aplikasi / Modul Ekosistem Sekolah
  const appModules = [
    { module: 'core', name: 'Core Service' },
    { module: 'kepegawaian', name: 'Kepegawaian & SDM' },
    { module: 'akademik', name: 'Akademik & Kurikulum' },
    { module: 'keuangan', name: 'Keuangan & SPP' },
    { module: 'kesiswaan', name: 'Kesiswaan & Ekskul' },
    { module: 'sarpras', name: 'Sarana & Prasarana' },
    { module: 'perpustakaan', name: 'Perpustakaan Digital' },
    { module: 'cbt', name: 'CBT & Ujian Online' },
    { module: 'bk', name: 'Bimbingan & Konseling' },
    { module: 'alumni', name: 'Tracer Study & Alumni' },
    { module: 'ppdb', name: 'PPDB / PSB Online' },
    { module: 'portal_ortu', name: 'Portal Orang Tua' },
    { module: 'portal_siswa', name: 'Portal Siswa' },
    { module: 'al_quran', name: 'Al-Qur\'an & Tahfidz' }
  ];

  // 3. Tambahkan permission .view dan .manage untuk masing-masing modul
  for (const app of appModules) {
    const viewCode = `${app.module}.view`;
    const manageCode = `${app.module}.manage`;

    const existsView = await knex('permissions').where({ code: viewCode }).first();
    if (!existsView) {
      await knex('permissions').insert({
        code: viewCode,
        module: app.module,
        description: `Hanya Tampil / View Only Modul ${app.name}`,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }

    const existsManage = await knex('permissions').where({ code: manageCode }).first();
    if (!existsManage) {
      await knex('permissions').insert({
        code: manageCode,
        module: app.module,
        description: `Akses Penuh / Admin Modul ${app.name}`,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Biarkan tidak dihapus untuk menjaga integritas data
};
