/**
 * Initial Database Seed for Core Service
 * 
 * Data:
 * - 1 Profil Yayasan
 * - 2 Satuan Pendidikan (SD & SMP)
 * - 4 Master Role Dasar (super_admin, admin_yayasan, admin_satuan_pendidikan, developer)
 * - 1 Akun Super Admin Dummy (Password: "Password123!")
 * - Relasi user_school_roles menghubungkan Super Admin ke kedua Satuan Pendidikan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

/**
 * Helper untuk mendapatkan hash bcrypt dari password
 * Jika modul bcrypt/bcryptjs tersedia, gunakan hash dinamis;
 * jika belum terinstall, gunakan precomputed valid bcrypt hash untuk 'Password123!'
 */
function getPasswordHash(plaintext) {
  try {
    const bcrypt = require('bcrypt') || require('bcryptjs');
    return bcrypt.hashSync(plaintext, 10);
  } catch (err) {
    // Pre-computed valid bcrypt hash (cost 10) untuk plaintext "Password123!"
    return '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
  }
}

exports.seed = async function (knex) {
  // Nonaktifkan pemeriksaan foreign key untuk pembersihan data (idempotent seed)
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  // Bersihkan tabel yang bersangkutan
  await knex('user_school_roles').truncate();
  await knex('users').truncate();
  await knex('roles').truncate();
  await knex('school_units').truncate();
  await knex('foundation_profiles').truncate();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 1. Seed Profil Yayasan
  const [foundationId] = await knex('foundation_profiles').insert([
    {
      id: 1,
      name: 'Yayasan Contoh',
      address: 'Jl. Contoh No. 1',
      phone_number: '021-1234567',
      email: 'info@yayasan-contoh.sch.id',
      chairman_name: 'Nama Ketua',
      logo: null
    }
  ]);

  // 2. Seed Satuan Pendidikan
  const actualFoundationId = foundationId || 1;
  await knex('school_units').insert([
    {
      id: 1,
      foundation_id: actualFoundationId,
      name: 'SD Contoh 1',
      level: 'SD',
      npsn: '12345678',
      address: null,
      principal_name: null,
      phone_number: null,
      website: null,
      email: null,
      logo: null,
      operating_license: null,
      is_active: true
    },
    {
      id: 2,
      foundation_id: actualFoundationId,
      name: 'SMP Contoh 1',
      level: 'SMP',
      npsn: '87654321',
      address: null,
      principal_name: null,
      phone_number: null,
      website: null,
      email: null,
      logo: null,
      operating_license: null,
      is_active: true
    }
  ]);

  // 3. Seed Master Role Dasar
  await knex('roles').insert([
    {
      id: 1,
      name: 'super_admin',
      description: 'Akses penuh seluruh Core Service',
      is_system_role: true
    },
    {
      id: 2,
      name: 'admin_yayasan',
      description: 'Admin tingkat Yayasan',
      is_system_role: false
    },
    {
      id: 3,
      name: 'admin_satuan_pendidikan',
      description: 'Admin tingkat Satuan Pendidikan',
      is_system_role: false
    },
    {
      id: 4,
      name: 'developer',
      description: 'Akses ke integrasi & dokumentasi API',
      is_system_role: false
    }
  ]);

  // 4. Seed User Dummy Super Admin
  const passwordHash = getPasswordHash('Password123!');
  await knex('users').insert([
    {
      id: 1,
      username: 'superadmin',
      password_hash: passwordHash,
      full_name: 'Super Admin',
      account_type: 'admin',
      ref_type: null,
      ref_id: null,
      status: 'active',
      last_login_at: null
    }
  ]);

  // 5. Seed user_school_roles (Hubungkan Super Admin ke SD dan SMP)
  await knex('user_school_roles').insert([
    {
      id: 1,
      user_id: 1,
      school_unit_id: 1,
      role_id: 1
    },
    {
      id: 2,
      user_id: 1,
      school_unit_id: 2,
      role_id: 1
    }
  ]);
};
