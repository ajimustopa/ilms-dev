/**
 * Student Display Info Helper for Kantin Module
 * Sesuai panduan ARSITEKTUR-SISTEM.md §6 & instruksi integrasi in-process Akademik
 */
const db = require('../../../config/db/kantin');
const academicInternalService = require('../../akademik/internal/service');

/**
 * Mengambil nama, jenis kelamin (JK), dan rombel siswa secara in-process dari modul Akademik.
 * Tetap memperbarui kolom cache (cached_student_name, cached_class_group_name) di canteen_students
 * setiap kali data diambil agar fallback tetap aman jika koneksi/data Akademik sedang tidak tersedia.
 *
 * @param {number|string} studentId 
 * @returns {Promise<{student_id: number, student_name: string, gender: string, class_group_name: string}>}
 */
async function getStudentDisplayInfo(studentId) {
  const numericId = Number(studentId);

  // 1. Panggil fungsi service internal Akademik secara in-process
  try {
    const academicStudent = await academicInternalService.getStudentBrief(numericId);
    if (academicStudent) {
      const studentName = academicStudent.full_name;
      const gender = academicStudent.gender || '-';
      const classGroupName = academicStudent.current_class?.class_group_name || '-';

      // Update kolom cache di canteen_students agar selalu sinkron & siap sebagai fallback
      try {
        await db('canteen_students')
          .where({ student_id: numericId })
          .update({
            cached_student_name: studentName,
            cached_class_group_name: classGroupName,
            updated_at: db.fn.now()
          });
      } catch (cacheErr) {
        // Abaikan jika record belum dibuat di database kantin
      }

      return {
        student_id: numericId,
        student_name: studentName,
        gender,
        class_group_name: classGroupName
      };
    }
  } catch (err) {
    // Fallback: Modul Akademik sedang tidak tersedia / siswa tidak ditemukan di DB Akademik
    console.warn(`[Kantin Helper] Fallback cache digunakan untuk student_id ${numericId}: ${err.message}`);
  }

  // 2. Fallback: baca dari kolom cache lokal di tabel canteen_students
  const localStudent = await db('canteen_students').where({ student_id: numericId }).first();

  return {
    student_id: numericId,
    student_name: localStudent?.cached_student_name || `Siswa #${numericId}`,
    gender: '-',
    class_group_name: localStudent?.cached_class_group_name || '-'
  };
}

module.exports = {
  getStudentDisplayInfo
};
