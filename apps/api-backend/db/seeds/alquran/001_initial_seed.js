/**
 * Initial Seed Data for Modul Tahfidz & Al-Quran (Alquran)
 * Sesuai erd-alquran.md §4
 */
exports.seed = async function(knex) {
  // 1. Bersihkan data lama dengan mematikan foreign key checks sementara
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  await knex('hafalan_targets').truncate();
  await knex('hafalan_records').truncate();
  await knex('munaqasyah_exams').truncate();
  await knex('kitab_kuning').truncate();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 2. Seed hafalan_targets
  await knex('hafalan_targets').insert([
    {
      school_unit_id: 1,
      class_ref_id: 1,
      period_label: 'Semester Ganjil 2026/2027',
      target_type: 'juz',
      target_value: 2
    },
    {
      school_unit_id: 1,
      class_ref_id: 2,
      period_label: 'Semester Ganjil 2026/2027',
      target_type: 'halaman',
      target_value: 40
    }
  ]);

  // 3. Seed hafalan_records
  await knex('hafalan_records').insert([
    {
      school_unit_id: 1,
      student_ref_id: 1,
      juz: 1,
      page_start: 1,
      page_end: 5,
      record_date: '2026-08-10',
      tajwid_score: 85.00,
      verification_status: 'verified',
      recorded_by_teacher_ref_id: 1
    },
    {
      school_unit_id: 1,
      student_ref_id: 1,
      juz: 1,
      page_start: 6,
      page_end: 10,
      record_date: '2026-08-12',
      tajwid_score: 88.50,
      verification_status: 'pending',
      recorded_by_teacher_ref_id: 1
    }
  ]);

  // 4. Seed munaqasyah_exams
  await knex('munaqasyah_exams').insert([
    {
      school_unit_id: 1,
      student_ref_id: 1,
      juz_examined: 1,
      exam_date: '2026-09-01',
      examiner_teacher_ref_id: 2,
      status: 'scheduled'
    }
  ]);

  // 5. Seed kitab_kuning
  await knex('kitab_kuning').insert([
    {
      school_unit_id: 1,
      book_name: 'Safinatun Najah',
      author: 'Syekh Salim bin Sumair',
      level: 'Pemula',
      teacher_ref_id: 1
    },
    {
      school_unit_id: 1,
      book_name: "Ta'lim Muta'alim",
      author: 'Syekh Az-Zarnuji',
      level: 'Menengah',
      teacher_ref_id: 2
    }
  ]);
};
