/**
 * Script migrasi & provisioning username otomatis unik sesingkat mungkin
 * untuk seluruh Pegawai dan Siswa di database.
 * Password default yang ditetapkan: "abs321"
 */
const bcrypt = require('bcryptjs');
const coreDb = require('../src/config/db/core');
const kepegawaianDb = require('../src/config/db/kepegawaian');
const akademikDb = require('../src/config/db/akademik');
const { generateShortUsername } = require('../src/utils/usernameGenerator');

async function migrateAndProvisionUsers() {
  console.log('=== MEMULAI GENERASI USERNAME & AKUN (DEFAULT PASSWORD: abs321) ===\n');

  // Generate hash untuk password default "abs321"
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('abs321', salt);

  // Ambil username yang sudah terpakai di core_local
  const existingUsers = await coreDb('users').select('id', 'username', 'ref_type', 'ref_id');
  const usedUsernames = new Set();
  
  // Keep superadmin username intact
  for (const u of existingUsers) {
    if (u.username === 'superadmin') {
      usedUsernames.add('superadmin');
    }
  }

  // 1. GENERATE & UPDATE AKUN PEGAWAI
  console.log('--- Memproses Data Pegawai ---');
  const employees = await kepegawaianDb('employees').select('id', 'school_unit_id', 'full_name', 'employment_status');
  console.log(`Ditemukan ${employees.length} data pegawai.`);

  for (const emp of employees) {
    const shortUsername = generateShortUsername(emp.full_name, usedUsernames);
    
    // Tentukan role pegawai
    let targetRoleId = 3; // admin_satuan_pendidikan / staff
    if (emp.employment_status === 'pelatih_ekskul') targetRoleId = 16;
    else if (emp.employment_status === 'guru_tamu' || emp.employment_status === 'partner') targetRoleId = 17;
    else if (emp.employment_status === 'gty' || emp.employment_status === 'gtt') targetRoleId = 8; // guru
    else if (emp.employment_status === 'hrd') targetRoleId = 5;

    // Cek apakah sudah ada akun untuk employee ini
    const existingEmpUser = existingUsers.find(u => u.ref_type === 'staff' && u.ref_id === emp.id);

    if (existingEmpUser) {
      await coreDb('users').where({ id: existingEmpUser.id }).update({
        username: shortUsername,
        full_name: emp.full_name,
        password_hash: defaultPasswordHash,
        status: 'active',
        updated_at: coreDb.fn.now()
      });
      console.log(`[UPDATED] Pegawai: ${emp.full_name} -> Username: "${shortUsername}"`);
    } else {
      const [newUserId] = await coreDb('users').insert({
        username: shortUsername,
        password_hash: defaultPasswordHash,
        full_name: emp.full_name,
        account_type: 'staff',
        ref_type: 'staff',
        ref_id: emp.id,
        status: 'active',
        created_at: coreDb.fn.now(),
        updated_at: coreDb.fn.now()
      });

      await coreDb('user_school_roles').insert({
        user_id: newUserId,
        school_unit_id: emp.school_unit_id || 1,
        role_id: targetRoleId,
        created_at: coreDb.fn.now(),
        updated_at: coreDb.fn.now()
      });
      console.log(`[CREATED] Pegawai: ${emp.full_name} -> Username: "${shortUsername}"`);
    }
  }

  // 2. GENERATE & PROVISION AKUN SISWA
  console.log('\n--- Memproses Data Siswa ---');
  const students = await akademikDb('students').select('id', 'satuan_pendidikan_id', 'full_name', 'nis');
  console.log(`Ditemukan ${students.length} data siswa.`);

  for (const st of students) {
    const shortUsername = generateShortUsername(st.full_name, usedUsernames);
    const existingStUser = existingUsers.find(u => u.ref_type === 'student' && u.ref_id === st.id);

    if (existingStUser) {
      await coreDb('users').where({ id: existingStUser.id }).update({
        username: shortUsername,
        full_name: st.full_name,
        password_hash: defaultPasswordHash,
        status: 'active',
        updated_at: coreDb.fn.now()
      });
      console.log(`[UPDATED] Siswa: ${st.full_name} -> Username: "${shortUsername}"`);
    } else {
      const [newUserId] = await coreDb('users').insert({
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

      await coreDb('user_school_roles').insert({
        user_id: newUserId,
        school_unit_id: st.satuan_pendidikan_id || 1,
        role_id: 18, // role 'siswa'
        created_at: coreDb.fn.now(),
        updated_at: coreDb.fn.now()
      });
      console.log(`[CREATED] Siswa: ${st.full_name} -> Username: "${shortUsername}"`);
    }
  }

  console.log('\n=== SEMUA USERNAME & AKUN SELESAI DIGENERATE DAN DISINKRONISASI! ===');
  process.exit(0);
}

migrateAndProvisionUsers().catch((err) => {
  console.error('Error saat migrasi user:', err);
  process.exit(1);
});
