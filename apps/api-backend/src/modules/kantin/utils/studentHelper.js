/**
 * Student Display Info Helper for Kantin Module
 * Sesuai panduan ARSITEKTUR-SISTEM.md §6 & instruksi integrasi in-process Akademik
 */
const db = require('../../../config/db/kantin');
const academicInternalService = require('../../akademik/internal/service');

/**
 * Mengambil nama, jenis kelamin (JK), rombel, angkatan (cohort), dan NIS siswa secara in-process dari modul Akademik.
 * Tetap memperbarui kolom cache (cached_student_name, cached_class_group_name) di canteen_students
 * setiap kali data diambil agar fallback tetap aman jika koneksi/data Akademik sedang tidak tersedia.
 *
 * @param {number|string} studentId 
 * @returns {Promise<{student_id: number, student_name: string, gender: string, class_group_name: string, cohort_name: string, nis: string|null}>}
 */
async function getStudentDisplayInfo(studentId) {
  const numericId = Number(studentId);

  // 1. Panggil fungsi service internal Akademik secara in-process
  try {
    const academicStudent = await academicInternalService.getStudentBrief(numericId);
    if (academicStudent) {
      const studentName = academicStudent.full_name;
      const gender = academicStudent.gender || '-';
      const cohortName = academicStudent.cohort_name || '-';
      const nis = academicStudent.nis || null;
      const nipd = academicStudent.nipd || academicStudent.nis || null;
      const isInActiveTa = Boolean(academicStudent.is_in_active_academic_year);
      const activeAcademicYearName = academicStudent.active_academic_year_name || null;

      let classGroupName = '-';
      let academicStatus = academicStudent.academic_status || 'aktif';
      let academicStatusLabel = 'Aktif (TA Berjalan)';

      if (isInActiveTa && academicStudent.current_class) {
        classGroupName = academicStudent.current_class.class_group_name;
        academicStatus = 'aktif';
        academicStatusLabel = 'Aktif (TA Berjalan)';
      } else {
        // Santri tidak terdaftar di rombel tahun ajaran aktif
        if (academicStudent.academic_status === 'lulus') {
          academicStatus = 'lulus';
          academicStatusLabel = 'Lulus';
          classGroupName = academicStudent.last_class
            ? `${academicStudent.last_class.class_group_name} (Lulus)`
            : 'Alumni (Lulus)';
        } else if (academicStudent.academic_status === 'pindah') {
          academicStatus = 'pindah';
          academicStatusLabel = 'Pindah';
          classGroupName = academicStudent.last_class
            ? `${academicStudent.last_class.class_group_name} (Pindah)`
            : 'Mutasi (Pindah)';
        } else if (academicStudent.academic_status === 'keluar') {
          academicStatus = 'keluar';
          academicStatusLabel = 'Keluar';
          classGroupName = academicStudent.last_class
            ? `${academicStudent.last_class.class_group_name} (Keluar)`
            : 'Keluar';
        } else {
          academicStatus = 'non_aktif_ta';
          academicStatusLabel = 'Non-Aktif TA Berjalan';
          classGroupName = academicStudent.last_class
            ? `${academicStudent.last_class.class_group_name} (TA ${academicStudent.last_class.academic_year_name || 'Lama'})`
            : 'Belum Ditempatkan';
        }
      }

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
        class_group_name: classGroupName,
        cohort_name: cohortName,
        nis,
        nipd,
        academic_status: academicStatus,
        academic_status_label: academicStatusLabel,
        is_active_ta: isInActiveTa,
        active_academic_year_name: activeAcademicYearName
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
    class_group_name: localStudent?.cached_class_group_name || '-',
    cohort_name: '-',
    nis: null,
    nipd: null,
    academic_status: 'unknown',
    academic_status_label: 'Lokal Kantin',
    is_active_ta: false,
    active_academic_year_name: null
  };
}

module.exports = {
  getStudentDisplayInfo
};
