/**
 * Initial Database Seed for Akademik Module
 * 
 * Data:
 * - Tahun Ajaran 2026/2027 (Aktif)
 * - Semester Ganjil (Aktif) & Genap
 * - Tingkat / Jenjang Kelas (Kelas 1 - 6 SD, Kelas VII - IX SMP)
 * - Rombongan Belajar (Kelas 1-A & 1-B)
 * - Mata Pelajaran Dasar (PAI, Bahasa Indonesia, Matematika, IPAS)
 * - 2 Data Induk Siswa Dummy (Muhammad Rizky, Aisyah Putri)
 * - 2 Data Orang Tua / Wali Siswa
 * - Relasi Orang Tua Siswa (student_guardians)
 * - Penempatan Rombel Siswa (student_class_enrollments)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Nonaktifkan foreign key checks untuk pembersihan data (idempotent seed)
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  // Bersihkan tabel-tabel modul akademik
  await knex('activity_logs').truncate();
  await knex('academic_calendar_events').truncate();
  await knex('extracurricular_members').truncate();
  await knex('extracurriculars').truncate();
  await knex('counseling_records').truncate();
  await knex('student_achievements').truncate();
  await knex('student_disciplinary_records').truncate();
  await knex('student_leave_requests').truncate();
  await knex('student_attendances').truncate();
  await knex('report_cards').truncate();
  await knex('student_attitude_scores').truncate();
  await knex('student_scores').truncate();
  await knex('teaching_assignments').truncate();
  await knex('subjects').truncate();
  await knex('student_class_enrollments').truncate();
  await knex('class_groups').truncate();
  await knex('student_mutations').truncate();
  await knex('student_guardians').truncate();
  await knex('guardians').truncate();
  await knex('students').truncate();
  await knex('grade_levels').truncate();
  await knex('semesters').truncate();
  await knex('academic_years').truncate();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 1. Seed Tahun Ajaran (academic_years)
  await knex('academic_years').insert([
    {
      id: 1,
      name: '2026/2027',
      start_date: '2026-07-01',
      end_date: '2027-06-30',
      is_active: true
    }
  ]);

  // 2. Seed Semester (semesters)
  await knex('semesters').insert([
    {
      id: 1,
      academic_year_id: 1,
      name: 'ganjil',
      start_date: '2026-07-01',
      end_date: '2026-12-31',
      is_active: true
    },
    {
      id: 2,
      academic_year_id: 1,
      name: 'genap',
      start_date: '2027-01-01',
      end_date: '2027-06-30',
      is_active: false
    }
  ]);

  // 3. Seed Jenjang / Tingkat Kelas (grade_levels)
  await knex('grade_levels').insert([
    { id: 1, name: 'Kelas 1', order: 1 },
    { id: 2, name: 'Kelas 2', order: 2 },
    { id: 3, name: 'Kelas 3', order: 3 },
    { id: 4, name: 'Kelas 4', order: 4 },
    { id: 5, name: 'Kelas 5', order: 5 },
    { id: 6, name: 'Kelas 6', order: 6 },
    { id: 7, name: 'Kelas VII', order: 7 },
    { id: 8, name: 'Kelas VIII', order: 8 },
    { id: 9, name: 'Kelas IX', order: 9 }
  ]);

  // 4. Seed Rombongan Belajar (class_groups)
  await knex('class_groups').insert([
    {
      id: 1,
      satuan_pendidikan_id: 1,
      academic_year_id: 1,
      grade_level_id: 1,
      name: '1-A',
      homeroom_teacher_employee_id: 1,
      capacity: 30
    },
    {
      id: 2,
      satuan_pendidikan_id: 1,
      academic_year_id: 1,
      grade_level_id: 1,
      name: '1-B',
      homeroom_teacher_employee_id: null,
      capacity: 30
    }
  ]);

  // 5. Seed Mata Pelajaran (subjects)
  await knex('subjects').insert([
    {
      id: 1,
      satuan_pendidikan_id: 1,
      grade_level_id: 1,
      name: 'Pendidikan Agama Islam',
      code: 'PAI-1',
      kkm: 75.00
    },
    {
      id: 2,
      satuan_pendidikan_id: 1,
      grade_level_id: 1,
      name: 'Bahasa Indonesia',
      code: 'BIN-1',
      kkm: 70.00
    },
    {
      id: 3,
      satuan_pendidikan_id: 1,
      grade_level_id: 1,
      name: 'Matematika',
      code: 'MAT-1',
      kkm: 70.00
    },
    {
      id: 4,
      satuan_pendidikan_id: 1,
      grade_level_id: 1,
      name: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      code: 'IPAS-1',
      kkm: 72.00
    }
  ]);

  // 6. Seed Data Induk Siswa (students)
  await knex('students').insert([
    {
      id: 1,
      satuan_pendidikan_id: 1,
      nis: '202601001',
      nisn: '0012345678',
      full_name: 'Muhammad Rizky',
      gender: 'L',
      birth_place: 'Sukabumi',
      birth_date: '2019-04-10',
      address: 'Jl. Merdeka No. 10 Sukabumi',
      photo_url: null,
      user_id: null,
      status: 'aktif',
      enrolled_at: '2026-07-15'
    },
    {
      id: 2,
      satuan_pendidikan_id: 1,
      nis: '202601002',
      nisn: '0012345679',
      full_name: 'Aisyah Putri',
      gender: 'P',
      birth_place: 'Bogor',
      birth_date: '2019-08-22',
      address: 'Jl. Pahlawan No. 25 Bogor',
      photo_url: null,
      user_id: null,
      status: 'aktif',
      enrolled_at: '2026-07-15'
    },
    {
      id: 3,
      satuan_pendidikan_id: 1,
      nis: '202601003',
      nisn: '0012345680',
      full_name: 'Budi Santoso',
      gender: 'L',
      birth_place: 'Bandung',
      birth_date: '2019-01-15',
      address: 'Jl. Dago No. 8 Bandung',
      photo_url: null,
      user_id: null,
      status: 'aktif',
      enrolled_at: '2026-07-15'
    }
  ]);

  // 7. Seed Data Orang Tua / Wali (guardians)
  await knex('guardians').insert([
    {
      id: 1,
      full_name: 'Hendra Setiawan',
      occupation: 'Wiraswasta',
      phone: '081298765432',
      email: 'hendra.setiawan@example.com',
      address: 'Jl. Merdeka No. 10 Sukabumi',
      user_id: null
    },
    {
      id: 2,
      full_name: 'Nurul Hidayah',
      occupation: 'Pegawai Negeri Sipil',
      phone: '081298765433',
      email: 'nurul.hidayah@example.com',
      address: 'Jl. Pahlawan No. 25 Bogor',
      user_id: null
    }
  ]);

  // 8. Seed Relasi Siswa - Wali (student_guardians)
  await knex('student_guardians').insert([
    {
      id: 1,
      student_id: 1,
      guardian_id: 1,
      relationship: 'ayah',
      is_primary_contact: true
    },
    {
      id: 2,
      student_id: 2,
      guardian_id: 2,
      relationship: 'ibu',
      is_primary_contact: true
    }
  ]);

  // 9. Seed Penempatan Siswa ke Rombel (student_class_enrollments)
  await knex('student_class_enrollments').insert([
    {
      id: 1,
      satuan_pendidikan_id: 1,
      student_id: 1,
      class_group_id: 1,
      academic_year_id: 1,
      status: 'aktif'
    },
    {
      id: 2,
      satuan_pendidikan_id: 1,
      student_id: 2,
      class_group_id: 1,
      academic_year_id: 1,
      status: 'aktif'
    }
  ]);
};
