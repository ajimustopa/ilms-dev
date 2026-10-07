/**
 * Seed Data Uji HRD [DATA_UJI_HRD]
 * Modul Kepegawaian & Core Aldepos
 * Target: core_dev, kepegawaian_dev (127.0.0.1:3306)
 */

const bcrypt = require('bcryptjs');

async function seedDataUji(coreDb, kepDb) {
  console.log('[SEED DATA_UJI_HRD] Seeding test foundation, school unit, users and employees...');

  // 1. Foundation Profile
  const hasFoundation = await coreDb('foundation_profiles').where({ id: 1 }).first();
  if (!hasFoundation) {
    await coreDb('foundation_profiles').insert({
      id: 1,
      name: 'Yayasan Aldepos',
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // 2. School Unit in core_dev
  const hasUnit = await coreDb('school_units').where({ id: 1 }).first();
  if (!hasUnit) {
    await coreDb('school_units').insert({
      id: 1,
      foundation_id: 1,
      name: 'SMA IT Aldepos',
      level: 'SMA',
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 4. Seed Users in core_dev
  const testUsers = [
    { id: 1, username: 'superadmin', full_name: 'Super Administrator', account_type: 'admin', ref_type: null, ref_id: null },
    { id: 2, username: 'hrd', full_name: 'Siti Aminah, S.Pd (HRD)', account_type: 'staff', ref_type: 'staff', ref_id: 1 },
    { id: 3, username: 'kepala_sekolah', full_name: 'Dr. H. Ahmad Dahlan, M.Pd (Kepala Sekolah)', account_type: 'staff', ref_type: 'staff', ref_id: 2 },
    { id: 4, username: 'guru_budi', full_name: 'Budi Santoso, S.Kom (Guru)', account_type: 'teacher', ref_type: 'staff', ref_id: 3 },
    { id: 5, username: 'guru_dewi', full_name: 'Dewi Lestari, S.Pd (Guru Baru)', account_type: 'teacher', ref_type: 'staff', ref_id: 4 }
  ];

  for (const u of testUsers) {
    const existing = await coreDb('users').where({ id: u.id }).first();
    if (!existing) {
      await coreDb('users').insert({
        id: u.id,
        username: u.username,
        password_hash: passwordHash,
        full_name: u.full_name,
        account_type: u.account_type,
        ref_type: u.ref_type,
        ref_id: u.ref_id,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  // 5. Assign roles in core_dev
  const roleMap = {
    1: 'super_admin',
    2: 'hrd',
    3: 'admin_satuan_pendidikan',
    4: 'guru',
    5: 'guru'
  };

  for (const [userId, roleName] of Object.entries(roleMap)) {
    const role = await coreDb('roles').where({ name: roleName }).first();
    if (role) {
      const existingAssignment = await coreDb('user_school_roles')
        .where({ user_id: userId, role_id: role.id })
        .first();
      if (!existingAssignment) {
        await coreDb('user_school_roles').insert({
          user_id: userId,
          school_unit_id: 1,
          role_id: role.id,
          created_at: new Date()
        });
      }
    }
  }

  // 6. Seed Job Positions in kepegawaian_dev
  const positions = [
    { id: 1, school_unit_id: 1, name: 'Kepala Sekolah', level: 1, parent_position_id: null },
    { id: 2, school_unit_id: 1, name: 'Wakil Kepala Sekolah', level: 2, parent_position_id: 1 },
    { id: 3, school_unit_id: 1, name: 'Kepala HRD & Personalia', level: 2, parent_position_id: null },
    { id: 4, school_unit_id: 1, name: 'Guru Mata Pelajaran', level: 3, parent_position_id: 2 }
  ];

  for (const pos of positions) {
    const existing = await kepDb('job_positions').where({ id: pos.id }).first();
    if (!existing) {
      await kepDb('job_positions').insert({
        ...pos,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  // 7. Seed Employees in kepegawaian_dev
  const testEmployees = [
    {
      id: 1,
      school_unit_id: 1,
      employee_number: 'EMP001',
      nip: '198501012010012001',
      full_name: 'Siti Aminah, S.Pd',
      gender: 'female',
      marital_status: 'married',
      employment_status: 'gty',
      current_position_id: 3,
      join_date: '2022-07-01',
      direct_supervisor_employee_id: 2,
      account_status: 'active'
    },
    {
      id: 2,
      school_unit_id: 1,
      employee_number: 'EMP002',
      nip: '197805122005011002',
      full_name: 'Dr. H. Ahmad Dahlan, M.Pd',
      gender: 'male',
      marital_status: 'married',
      employment_status: 'gty',
      current_position_id: 1,
      join_date: '2020-07-01',
      direct_supervisor_employee_id: null,
      account_status: 'active'
    },
    {
      id: 3,
      school_unit_id: 1,
      employee_number: 'EMP003',
      nip: '199203152018011003',
      full_name: 'Budi Santoso, S.Kom',
      gender: 'male',
      marital_status: 'single',
      employment_status: 'gty',
      current_position_id: 4,
      join_date: '2023-07-01',
      direct_supervisor_employee_id: 2,
      account_status: 'active'
    },
    {
      id: 4,
      school_unit_id: 1,
      employee_number: 'EMP004',
      nip: '199508202022012004',
      full_name: 'Dewi Lestari, S.Pd',
      gender: 'female',
      marital_status: 'single',
      employment_status: 'pty',
      current_position_id: 4,
      join_date: '2026-10-10', // Prorated 9.0
      direct_supervisor_employee_id: 2,
      account_status: 'active'
    },
    {
      id: 5,
      school_unit_id: 1,
      employee_number: 'EMP005',
      nip: null,
      full_name: 'Rahmat Hidayat',
      gender: 'male',
      marital_status: 'single',
      employment_status: 'honorer',
      current_position_id: null,
      join_date: '2024-01-01',
      direct_supervisor_employee_id: 2,
      account_status: 'active'
    }
  ];

  for (const emp of testEmployees) {
    const existing = await kepDb('employees').where({ id: emp.id }).first();
    if (!existing) {
      await kepDb('employees').insert({
        ...emp,
        created_at: new Date(),
        updated_at: new Date()
      });
    } else {
      await kepDb('employees').where({ id: emp.id }).update({
        join_date: emp.join_date,
        direct_supervisor_employee_id: emp.direct_supervisor_employee_id,
        employment_status: emp.employment_status,
        updated_at: new Date()
      });
    }
  }

  // 8. Seed School Unit Approver (KS for Unit 1)
  const existingApprover = await kepDb('school_unit_approvers')
    .where({ school_unit_id: 1, approver_role: 'unit_head' })
    .first();
  if (!existingApprover) {
    await kepDb('school_unit_approvers').insert({
      school_unit_id: 1,
      approver_role: 'unit_head',
      employee_id: 2, // Dr. H. Ahmad Dahlan, M.Pd
      valid_from: '2026-07-01',
      valid_to: null,
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  console.log('[SEED DATA_UJI_HRD] Test data successfully seeded!');
}

module.exports = { seedDataUji };
