/**
 * Initial Database Seed for Kepegawaian Module
 * 
 * Data:
 * - 4 Posisi Jabatan Master (Kepala Sekolah, Wakil Kepala Sekolah, Guru Kelas, Staf Tata Usaha)
 * - 2 Pegawai Dummy (Ahmad Fauzi - Guru Kelas, Siti Aminah - Staf Tata Usaha)
 * - 2 Riwayat Jabatan Pegawai
 * 
 * Catatan:
 * - Pegawai di seed ini TIDAK membuat akun login apa pun di database Kepegawaian (tidak ada tabel password/users di sini).
 * - Akun login pegawai terhubung ke Core Service via users.ref_type='staff' & users.ref_id=employees.id.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Nonaktifkan pemeriksaan foreign key untuk pembersihan data (idempotent seed)
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  // Bersihkan tabel-tabel modul kepegawaian
  await knex('performance_reviews').truncate();
  await knex('payroll_items').truncate();
  await knex('payroll_periods').truncate();
  await knex('employee_overtimes').truncate();
  await knex('employee_leave_requests').truncate();
  await knex('employee_attendances').truncate();
  await knex('employee_mutations').truncate();
  await knex('employee_position_history').truncate();
  await knex('recruitment_candidates').truncate();
  await knex('employee_retirement_plans').truncate();
  await knex('employee_family_members').truncate();
  await knex('employee_education_trainings').truncate();
  await knex('employee_school_assignments').truncate();
  await knex('job_positions').truncate();
  await knex('employees').truncate();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 1. Seed Master Jabatan (job_positions)
  await knex('job_positions').insert([
    {
      id: 1,
      school_unit_id: 1,
      name: 'Kepala Sekolah',
      level: 1,
      parent_position_id: null
    },
    {
      id: 2,
      school_unit_id: 1,
      name: 'Wakil Kepala Sekolah',
      level: 2,
      parent_position_id: 1
    },
    {
      id: 3,
      school_unit_id: 1,
      name: 'Guru Kelas',
      level: 3,
      parent_position_id: 2
    },
    {
      id: 4,
      school_unit_id: 1,
      name: 'Staf Tata Usaha',
      level: 3,
      parent_position_id: 2
    }
  ]);

  // 2. Seed Data Pegawai (employees)
  await knex('employees').insert([
    {
      id: 1,
      school_unit_id: 1,
      employee_number: 'PEG-0001',
      nip: null,
      nuptk: '1234567890123456',
      full_name: 'Ahmad Fauzi',
      academic_title: 'S.Pd.',
      birth_place: 'Sukabumi',
      birth_date: '1990-05-12',
      gender: 'male',
      religion: 'Islam',
      marital_status: 'married',
      address: 'Jl. Contoh No. 2',
      phone_number: '081234567890',
      email: 'ahmad.fauzi@contoh.sch.id',
      photo_url: null,
      current_position_id: 3,
      current_rank: 'III/a',
      employment_status: 'gtt',
      account_status: 'active'
    },
    {
      id: 2,
      school_unit_id: 1,
      employee_number: 'PEG-0002',
      nip: null,
      nuptk: null,
      full_name: 'Siti Aminah',
      academic_title: 'S.E.',
      birth_place: 'Bogor',
      birth_date: '1988-02-20',
      gender: 'female',
      religion: 'Islam',
      marital_status: 'married',
      address: 'Jl. Contoh No. 3',
      phone_number: '081234567891',
      email: 'siti.aminah@contoh.sch.id',
      photo_url: null,
      current_position_id: 4,
      current_rank: null,
      employment_status: 'ptt',
      account_status: 'active'
    }
  ]);

  // 3. Seed Riwayat Jabatan Pegawai (employee_position_history)
  await knex('employee_position_history').insert([
    {
      id: 1,
      employee_id: 1,
      position_id: 3,
      rank: 'III/a',
      effective_date: '2020-07-01',
      end_date: null
    },
    {
      id: 2,
      employee_id: 2,
      position_id: 4,
      rank: null,
      effective_date: '2021-01-10',
      end_date: null
    }
  ]);
};
