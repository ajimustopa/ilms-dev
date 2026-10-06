/**
 * Script Pemulihan & Sinkronisasi Menyeluruh Data Master Core Aldepos
 * - Profil Yayasan & Satuan Pendidikan Resmi
 * - Master Roles & Hak Akses Lengkap (20+ Peran)
 * - Pemulihan Akun Seluruh Pegawai/Guru (41 Akun) & Siswa (171 Akun)
 */
const bcrypt = require('bcryptjs');
const coreDb = require('../src/config/db/core');
const kepegawaianDb = require('../src/config/db/kepegawaian');
const akademikDb = require('../src/config/db/akademik');
const { generateShortUsername } = require('../src/utils/usernameGenerator');

async function restoreAndSyncCoreData() {
  console.log('================================================================');
  console.log(' MEMULAI PEMULIHAN & SINKRONISASI DATA CORE ALDEPOS...');
  console.log('================================================================\n');

  // 1. PULIHKAN PROFIL YAYASAN
  console.log('[1/5] Memulihkan Profil Yayasan Aldepos...');
  const existingFoundation = await coreDb('foundation_profiles').where({ id: 1 }).first();
  const foundationData = {
    name: 'Yayasan Pendidikan Aldepos Salapan Salapan',
    address: 'Jl. K.H. Abdul Halim No. 99, Pasir Jambu, Kec. Sukaraja, Kab. Bogor, Jawa Barat 16710',
    phone_number: '0251-8271999',
    email: 'yayasan@aldepos.sch.id',
    chairman_name: 'Dr. H. Aldepos, M.Pd.',
    updated_at: coreDb.fn.now()
  };

  if (existingFoundation) {
    await coreDb('foundation_profiles').where({ id: 1 }).update(foundationData);
  } else {
    await coreDb('foundation_profiles').insert({ id: 1, ...foundationData, created_at: coreDb.fn.now() });
  }
  console.log('  -> Profil Yayasan berhasil diperbarui.');

  // 2. PULIHKAN SATUAN PENDIDIKAN
  console.log('\n[2/5] Memulihkan Satuan Pendidikan (SMP & SMA IT Aldepos)...');
  const schoolUnitsData = [
    {
      id: 1,
      foundation_id: 1,
      name: 'SMP IT Aldepos Islamic Boarding School',
      level: 'SMP',
      npsn: '69979991',
      address: 'Jl. K.H. Abdul Halim No. 99, Pasir Jambu, Kec. Sukaraja, Kab. Bogor',
      principal_name: 'Kepala Sekolah SMPIT',
      phone_number: '0251-8271991',
      website: 'https://smpit.aldepos.sch.id',
      email: 'smpit@aldepos.sch.id',
      operating_license: '421.3/089-Disdik/2020',
      is_active: true
    },
    {
      id: 2,
      foundation_id: 1,
      name: 'SMA IT Aldepos Islamic Boarding School',
      level: 'SMA',
      npsn: '69979992',
      address: 'Jl. K.H. Abdul Halim No. 99, Pasir Jambu, Kec. Sukaraja, Kab. Bogor',
      principal_name: 'Kepala Sekolah SMAIT',
      phone_number: '0251-8271992',
      website: 'https://smait.aldepos.sch.id',
      email: 'smait@aldepos.sch.id',
      operating_license: '421.3/090-Disdik/2021',
      is_active: true
    }
  ];

  for (const su of schoolUnitsData) {
    const existing = await coreDb('school_units').where({ id: su.id }).first();
    if (existing) {
      await coreDb('school_units').where({ id: su.id }).update({ ...su, updated_at: coreDb.fn.now() });
    } else {
      await coreDb('school_units').insert({ ...su, created_at: coreDb.fn.now(), updated_at: coreDb.fn.now() });
    }
    console.log(`  -> Unit #${su.id}: ${su.name} (${su.level})`);
  }

  // 3. PULIHKAN ROLES & PERMISSIONS LENGKAP
  console.log('\n[3/5] Memulihkan Master Roles & Permissions...');
  const standardRoles = [
    { id: 1, name: 'super_admin', description: 'Akses penuh seluruh Core Service & Modul Yayasan', is_system_role: true },
    { id: 2, name: 'admin_yayasan', description: 'Admin tingkat Yayasan / Lintas Seluruh Satuan Pendidikan', is_system_role: false },
    { id: 3, name: 'admin_satuan_pendidikan', description: 'Admin tingkat Satuan Pendidikan', is_system_role: false },
    { id: 4, name: 'developer', description: 'Akses ke integrasi & dokumentasi API', is_system_role: false },
    { id: 5, name: 'admin_keuangan', description: 'Administrator Modul Keuangan & Pembukuan', is_system_role: false },
    { id: 6, name: 'staff_payroll', description: 'Staf Penggajian Pegawai', is_system_role: false },
    { id: 7, name: 'hrd', description: 'Pengelola Kepegawaian & SDM Yayasan', is_system_role: true },
    { id: 8, name: 'guru', description: 'Pendidik / Tenaga Pengajar Mata Pelajaran', is_system_role: true },
    { id: 9, name: 'wali_kelas', description: 'Wali Kelas & Manajemen Rapor Siswa', is_system_role: true },
    { id: 10, name: 'guru_bk', description: 'Guru Bimbingan & Konseling', is_system_role: true },
    { id: 11, name: 'waka_kurikulum', description: 'Wakil Kepala Kurikulum & Pembagian Jadwal', is_system_role: true },
    { id: 12, name: 'sarpras_manager', description: 'Pengelola Sarana, Prasarana & Aset', is_system_role: true },
    { id: 13, name: 'pustakawan', description: 'Pengelola Perpustakaan & Sirkulasi Buku', is_system_role: true },
    { id: 14, name: 'panitia_ppdb', description: 'Panitia Penerimaan Peserta Didik Baru', is_system_role: true },
    { id: 15, name: 'staf', description: 'Staf Umum & Karyawan Satuan Pendidikan', is_system_role: true },
    { id: 16, name: 'pelatih_ekskul', description: 'Pelatih & Pembina Ekstrakurikuler', is_system_role: false },
    { id: 17, name: 'guru_tamu', description: 'Pendidik Tamu / Partner Akademik', is_system_role: false },
    { id: 18, name: 'siswa', description: 'Peserta Didik / Santri', is_system_role: true },
    { id: 19, name: 'wali_santri', description: 'Orang Tua / Wali Santri', is_system_role: true },
    { id: 20, name: 'kasir_kantin', description: 'Kasir & Pengelola POS Kantin', is_system_role: true },
    { id: 21, name: 'kepala_dapur', description: 'Pengelola Dapur & Menu Makanan Santri', is_system_role: true }
  ];

  for (const r of standardRoles) {
    const existing = await coreDb('roles').where({ name: r.name }).first();
    if (!existing) {
      await coreDb('roles').insert({
        id: r.id,
        name: r.name,
        description: r.description,
        is_system_role: r.is_system_role,
        created_at: coreDb.fn.now(),
        updated_at: coreDb.fn.now()
      });
    } else {
      await coreDb('roles').where({ id: existing.id }).update({
        description: r.description,
        is_system_role: r.is_system_role,
        updated_at: coreDb.fn.now()
      });
    }
  }

  // Permissions 14 Modul
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
    { module: 'al_quran', name: 'Al-Qur\'an & Tahfidz' },
    { module: 'kantin', name: 'Kantin & POS' },
    { module: 'dapur', name: 'Dapur Santri' }
  ];

  for (const app of appModules) {
    for (const action of ['view', 'manage']) {
      const code = `${app.module}.${action}`;
      const exists = await coreDb('permissions').where({ code }).first();
      if (!exists) {
        await coreDb('permissions').insert({
          code,
          module: app.module,
          description: `${action === 'view' ? 'Lihat' : 'Kelola'} Modul ${app.name}`,
          created_at: coreDb.fn.now(),
          updated_at: coreDb.fn.now()
        });
      }
    }
  }

  // Hubungkan role_permissions
  const allRoles = await coreDb('roles').select('id', 'name');
  const allPerms = await coreDb('permissions').select('id', 'code', 'module');
  const roleMap = {};
  allRoles.forEach(r => { roleMap[r.name] = r.id; });

  const rolePermissionMapping = {
    super_admin: allPerms.map(p => p.id),
    admin_yayasan: allPerms.map(p => p.id),
    admin_satuan_pendidikan: allPerms.map(p => p.id),
    developer: allPerms.map(p => p.id),
    hrd: allPerms.filter(p => p.module === 'kepegawaian' || p.code === 'core.view').map(p => p.id),
    admin_keuangan: allPerms.filter(p => p.module === 'keuangan' || p.code === 'core.view').map(p => p.id),
    guru: allPerms.filter(p => ['akademik', 'al_quran', 'cbt', 'portal_siswa'].includes(p.module)).map(p => p.id),
    wali_kelas: allPerms.filter(p => ['akademik', 'al_quran', 'kesiswaan', 'cbt', 'portal_siswa'].includes(p.module)).map(p => p.id),
    guru_bk: allPerms.filter(p => ['bk', 'kesiswaan', 'akademik'].includes(p.module)).map(p => p.id),
    waka_kurikulum: allPerms.filter(p => ['akademik', 'cbt', 'kesiswaan'].includes(p.module)).map(p => p.id),
    sarpras_manager: allPerms.filter(p => p.module === 'sarpras').map(p => p.id),
    pustakawan: allPerms.filter(p => p.module === 'perpustakaan').map(p => p.id),
    kasir_kantin: allPerms.filter(p => p.module === 'kantin').map(p => p.id),
    kepala_dapur: allPerms.filter(p => p.module === 'dapur').map(p => p.id),
    siswa: allPerms.filter(p => ['portal_siswa', 'al_quran'].includes(p.module) || p.code.endsWith('.view')).map(p => p.id),
    staf: allPerms.filter(p => p.code.endsWith('.view')).map(p => p.id)
  };

  for (const [roleName, permIds] of Object.entries(rolePermissionMapping)) {
    const rId = roleMap[roleName];
    if (!rId) continue;
    await coreDb('role_permissions').where({ role_id: rId }).del();
    if (permIds.length > 0) {
      await coreDb('role_permissions').insert(permIds.map(pId => ({
        role_id: rId,
        permission_id: pId,
        created_at: coreDb.fn.now(),
        updated_at: coreDb.fn.now()
      })));
    }
  }
  console.log('  -> Master Roles & Permissions terkonfigurasi lengkap.');

  // 4. GENERATE / SINKRONISASI AKUN PEGAWAI (41 PEGAWAI)
  console.log('\n[4/5] Memulihkan & Menyinkronkan Akun 41 Pegawai & Guru...');
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('abs321', salt);

  const existingUsers = await coreDb('users').select('id', 'username', 'ref_type', 'ref_id');
  const usedUsernames = new Set();
  usedUsernames.add('superadmin');

  // Cari wali kelas IDs dari rombel akademik
  const homeroomRows = await akademikDb('class_groups').distinct('homeroom_teacher_employee_id');
  const homeroomIds = new Set(homeroomRows.map(h => h.homeroom_teacher_employee_id).filter(Boolean));

  const employees = await kepegawaianDb('employees').select('id', 'school_unit_id', 'full_name', 'employment_status', 'email', 'nip');
  console.log(`  -> Menemukan ${employees.length} data pegawai di Kepegawaian.`);

  for (const emp of employees) {
    const shortUsername = generateShortUsername(emp.full_name, usedUsernames);

    // Tentukan role pegawai
    let targetRoleName = 'guru';
    if (emp.employment_status === 'hrd') targetRoleName = 'hrd';
    else if (emp.employment_status === 'pelatih_ekskul') targetRoleName = 'pelatih_ekskul';
    else if (emp.employment_status === 'guru_tamu' || emp.employment_status === 'partner') targetRoleName = 'guru_tamu';
    else if (emp.employment_status === 'pty' || emp.employment_status === 'staf') targetRoleName = 'staf';
    else if (homeroomIds.has(emp.id)) targetRoleName = 'wali_kelas';

    const targetRoleId = roleMap[targetRoleName] || roleMap['guru'] || 8;

    const existingUser = existingUsers.find(u => u.ref_type === 'staff' && u.ref_id === emp.id);
    let userId;

    if (existingUser) {
      userId = existingUser.id;
      await coreDb('users').where({ id: userId }).update({
        username: shortUsername,
        full_name: emp.full_name,
        password_hash: defaultPasswordHash,
        status: 'active',
        account_type: targetRoleName.includes('guru') || targetRoleName === 'wali_kelas' ? 'teacher' : 'staff',
        updated_at: coreDb.fn.now()
      });
      console.log(`     [UPDATE] ${emp.full_name} -> User: "${shortUsername}" (${targetRoleName})`);
    } else {
      const [newId] = await coreDb('users').insert({
        username: shortUsername,
        password_hash: defaultPasswordHash,
        full_name: emp.full_name,
        account_type: targetRoleName.includes('guru') || targetRoleName === 'wali_kelas' ? 'teacher' : 'staff',
        ref_type: 'staff',
        ref_id: emp.id,
        status: 'active',
        created_at: coreDb.fn.now(),
        updated_at: coreDb.fn.now()
      });
      userId = newId;
      console.log(`     [CREATE] ${emp.full_name} -> User: "${shortUsername}" (${targetRoleName})`);
    }

    // Set user_school_roles
    await coreDb('user_school_roles').where({ user_id: userId }).del();
    await coreDb('user_school_roles').insert({
      user_id: userId,
      school_unit_id: emp.school_unit_id || 1,
      role_id: targetRoleId,
      created_at: coreDb.fn.now(),
      updated_at: coreDb.fn.now()
    });
  }

  // 5. GENERATE / SINKRONISASI AKUN SISWA (171 SISWA)
  console.log('\n[5/5] Memulihkan & Menyinkronkan Akun 171 Santri/Siswa...');
  const students = await akademikDb('students').select('id', 'satuan_pendidikan_id', 'full_name', 'nis', 'nisn');
  const studentRoleId = roleMap['siswa'] || 18;

  for (const st of students) {
    const shortUsername = generateShortUsername(st.full_name, usedUsernames);
    const existingSt = existingUsers.find(u => u.ref_type === 'student' && u.ref_id === st.id);
    let userId;

    if (existingSt) {
      userId = existingSt.id;
      await coreDb('users').where({ id: userId }).update({
        username: shortUsername,
        full_name: st.full_name,
        password_hash: defaultPasswordHash,
        status: 'active',
        account_type: 'student',
        updated_at: coreDb.fn.now()
      });
    } else {
      const [newId] = await coreDb('users').insert({
        username: shortUsername,
        password_hash: defaultPasswordHash,
        full_name: st.full_name,
        account_type: 'student',
        ref_type: 'student',
        ref_id: st.id,
        status: 'active',
        created_at: coreDb.fn.now(),
        updated_at: coreDb.fn.now()
      });
      userId = newId;
    }

    await coreDb('user_school_roles').where({ user_id: userId }).del();
    await coreDb('user_school_roles').insert({
      user_id: userId,
      school_unit_id: st.satuan_pendidikan_id || 1,
      role_id: studentRoleId,
      created_at: coreDb.fn.now(),
      updated_at: coreDb.fn.now()
    });
  }

  console.log(`  -> Berhasil menyinkronkan ${students.length} akun santri.`);

  // 6. PASTIKAN SUPERADMIN TERHUBUNG KE KEDUA UNIT
  const superAdminUser = await coreDb('users').where({ username: 'superadmin' }).first();
  if (superAdminUser) {
    await coreDb('user_school_roles').where({ user_id: superAdminUser.id }).del();
    await coreDb('user_school_roles').insert([
      { user_id: superAdminUser.id, school_unit_id: 1, role_id: 1, created_at: coreDb.fn.now(), updated_at: coreDb.fn.now() },
      { user_id: superAdminUser.id, school_unit_id: 2, role_id: 1, created_at: coreDb.fn.now(), updated_at: coreDb.fn.now() }
    ]);
  }

  console.log('\n================================================================');
  console.log(' PEMULIHAN & SINKRONISASI SUKSES PENUH!');
  console.log(' Total Akun Terdaftar di Core: ' + (await coreDb('users').count('* as c'))[0].c);
  console.log(' Password default untuk Pegawai & Siswa: abs321');
  console.log('================================================================');
  process.exit(0);
}

restoreAndSyncCoreData().catch((err) => {
  console.error('Error saat pemulihan:', err);
  process.exit(1);
});
