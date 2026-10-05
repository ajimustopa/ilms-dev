/**
 * Migration 83: Align Academic Year for Angkatan 2025 (2025/2026) Student Bills
 */

exports.up = async function (knex) {
  try {
    // Cari siswa-siswa Angkatan 2025 dari db akademik
    const akademikKnex = knex.client.config.connection.database?.includes('keuangan')
      ? require('../../../src/config/db/akademik')
      : null;

    if (akademikKnex) {
      const students2025 = await akademikKnex('students')
        .where('nis', 'like', '2526%')
        .orWhere('cohort_name', 'like', '%2025%')
        .select('id');

      const studentIds = students2025.map(s => s.id);
      if (studentIds.length > 0) {
        await knex('student_bills')
          .whereIn('student_id', studentIds)
          .where('academic_year_id', 3)
          .update({ academic_year_id: 1 });
      }
    }
  } catch (err) {
    console.warn('Migration 83 warning:', err.message);
  }
};

exports.down = async function (knex) {
  // no-op
};
