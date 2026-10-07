/**
 * Seed Data Uji HRD [DATA_UJI_HRD]
 * Modul Kepegawaian & Core Aldepos
 * Target: core_dev, kepegawaian_dev (127.0.0.1:3306)
 */

const bcrypt = require('bcryptjs');
const { assertDevDatabase } = require('../../../../config/db/dbGuard');

async function seedDataUji(coreDb, kepDb) {
  // Safety checks
  assertDevDatabase(coreDb.client.connectionSettings, 'SEED_DATA_UJI_CORE');
  assertDevDatabase(kepDb.client.connectionSettings, 'SEED_DATA_UJI_KEPEGAWAIAN');

  console.log('[SEED DATA_UJI_HRD] Seeding test foundation, school unit, users, employees, schedules...');

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
      name: 'SMP IT Aldepos',
      level: 'SMP',
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
    { id: 2, username: 'hrd_smp', full_name: 'Siti Aminah, S.Pd (HRD)', account_type: 'staff', ref_type: 'staff', ref_id: 1 },
    { id: 3, username: 'kepala_sekolah_uji', full_name: 'Dr. H. Ahmad Dahlan, M.Pd (Kepala Sekolah)', account_type: 'staff', ref_type: 'staff', ref_id: 2 },
    { id: 4, username: 'guru_uji', full_name: 'Budi Santoso, S.Kom (Guru GTY)', account_type: 'teacher', ref_type: 'staff', ref_id: 3 },
    { id: 5, username: 'staf_uji', full_name: 'Dewi Lestari, S.Pd (Guru PTY)', account_type: 'teacher', ref_type: 'staff', ref_id: 4 },
    { id: 6, username: 'siswa_uji', full_name: 'Andi Pratama (Siswa)', account_type: 'student', ref_type: 'student', ref_id: 101 }
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
    5: 'guru',
    6: 'siswa'
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
    { id: 4, school_unit_id: 1, name: 'Guru Mata Pelajaran', level: 3, parent_position_id: 2 },
    { id: 5, school_unit_id: 1, name: 'Staf Administrasi & TU', level: 3, parent_position_id: 2 },
    { id: 6, school_unit_id: 1, name: 'Pelatih / Pembina Ekstrakurikuler', level: 3, parent_position_id: 2 }
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

  // 7. Seed ~12 Employees in kepegawaian_dev
  const testEmployees = [
    { id: 1, school_unit_id: 1, employee_number: 'EMP001', nip: '198501012010012001', full_name: 'Siti Aminah, S.Pd', gender: 'female', marital_status: 'married', employment_status: 'gty', current_position_id: 3, join_date: '2022-07-01', direct_supervisor_employee_id: 2, account_status: 'active' },
    { id: 2, school_unit_id: 1, employee_number: 'EMP002', nip: '197805122005011002', full_name: 'Dr. H. Ahmad Dahlan, M.Pd', gender: 'male', marital_status: 'married', employment_status: 'gty', current_position_id: 1, join_date: '2020-07-01', direct_supervisor_employee_id: null, account_status: 'active' },
    { id: 3, school_unit_id: 1, employee_number: 'EMP003', nip: '199203152018011003', full_name: 'Budi Santoso, S.Kom', gender: 'male', marital_status: 'single', employment_status: 'gty', current_position_id: 4, join_date: '2023-07-01', direct_supervisor_employee_id: 2, account_status: 'active' },
    { id: 4, school_unit_id: 1, employee_number: 'EMP004', nip: '199508202022012004', full_name: 'Dewi Lestari, S.Pd', gender: 'female', marital_status: 'single', employment_status: 'pty', current_position_id: 4, join_date: '2026-10-10', direct_supervisor_employee_id: 2, account_status: 'active' },
    { id: 5, school_unit_id: 1, employee_number: 'EMP005', nip: '198002142008011005', full_name: 'Agus Kurniawan, M.Si', gender: 'male', marital_status: 'married', employment_status: 'pns', current_position_id: 4, join_date: '2021-07-01', direct_supervisor_employee_id: 2, account_status: 'active' },
    { id: 6, school_unit_id: 1, employee_number: 'EMP006', nip: null, full_name: 'Hendra Wijaya', gender: 'male', marital_status: 'single', employment_status: 'pelatih_ekskul', current_position_id: 6, join_date: '2024-01-15', direct_supervisor_employee_id: 2, account_status: 'active' },
    { id: 7, school_unit_id: 1, employee_number: 'EMP007', nip: '199311052020012007', full_name: 'Ratna Sari, A.Md', gender: 'female', marital_status: 'married', employment_status: 'pty', current_position_id: 5, join_date: '2024-07-01', direct_supervisor_employee_id: 1, account_status: 'active' },
    { id: 8, school_unit_id: 1, employee_number: 'EMP008', nip: '198904122016011008', full_name: 'Bambang Prasetyo, S.Pd', gender: 'male', marital_status: 'married', employment_status: 'gty', current_position_id: 4, join_date: '2022-07-01', direct_supervisor_employee_id: 2, account_status: 'active' },
    { id: 9, school_unit_id: 1, employee_number: 'EMP009', nip: '199706182023012009', full_name: 'Nurul Hidayah, S.Pd', gender: 'female', marital_status: 'single', employment_status: 'pty', current_position_id: 4, join_date: '2025-07-01', direct_supervisor_employee_id: 2, account_status: 'active' },
    { id: 10, school_unit_id: 1, employee_number: 'EMP010', nip: '197909252006041010', full_name: 'Eko Susanto, M.Pd', gender: 'male', marital_status: 'married', employment_status: 'pns', current_position_id: 4, join_date: '2019-07-01', direct_supervisor_employee_id: 2, account_status: 'active' },
    { id: 11, school_unit_id: 1, employee_number: 'EMP011', nip: null, full_name: 'Linda Permata', gender: 'female', marital_status: 'single', employment_status: 'pty', current_position_id: 5, join_date: '2025-01-01', direct_supervisor_employee_id: 1, account_status: 'active' },
    { id: 12, school_unit_id: 1, employee_number: 'EMP012', nip: null, full_name: 'Dimas Saputra', gender: 'male', marital_status: 'single', employment_status: 'pelatih_ekskul', current_position_id: 6, join_date: '2024-07-01', direct_supervisor_employee_id: 2, account_status: 'active' }
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

  // 8. Seed Work Schedule Assignments
  const assignments = [
    { employee_id: 6, assignment_type: 'flexible', flexible_target_hours: 8.0 },
    { employee_id: 12, assignment_type: 'flexible', flexible_target_hours: 8.0 }
  ];
  for (const a of assignments) {
    const existingA = await kepDb('employee_work_schedule_assignments').where({ employee_id: a.employee_id }).first();
    if (!existingA) {
      await kepDb('employee_work_schedule_assignments').insert({
        employee_id: a.employee_id,
        assignment_type: a.assignment_type,
        flexible_target_hours: a.flexible_target_hours,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => {});
    }
  }

  // 9. Seed School Unit Approver (KS for Unit 1)
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

  console.log('[SEED DATA_UJI_HRD] All 12 test employees and accounts seeded successfully!');
}

module.exports = { seedDataUji };
