/**
 * Cross-Module Mock Services for Keuangan
 * 
 * TODO: Hubungkan fungsi-fungsi di bawah ini ke service asli Akademik & Kepegawaian
 * secara in-process (lihat ARSITEKTUR-SISTEM.md Bagian 6) setelah modul-modul tersebut
 * terintegrasi penuh pada backend yang sama.
 */

// TODO: Import database atau service Akademik jika sudah siap
// const akademikDb = require('../../../config/db/akademik');
// TODO: Import database atau service Kepegawaian jika sudah siap
// const kepegawaianDb = require('../../../config/db/kepegawaian');

/**
 * Mendapatkan data Tahun Ajaran dari modul Akademik
 * @param {number|string} academicYearId
 * @returns {Promise<Object>}
 */
async function getAcademicYear(academicYearId) {
  // TODO: Ganti mock ini dengan pemanggilan query ke modul Akademik (tabel `academic_years`)
  return {
    id: Number(academicYearId),
    name: '2026/2027',
    start_date: '2026-07-01',
    end_date: '2027-06-30',
    is_active: true
  };
}

/**
 * Mendapatkan data Siswa dari modul Akademik
 * @param {number|string} studentId
 * @returns {Promise<Object>}
 */
async function getStudent(studentId) {
  // TODO: Ganti mock ini dengan pemanggilan query ke modul Akademik (tabel `students`)
  return {
    id: Number(studentId),
    nis: '20260001',
    nisn: '0012345678',
    full_name: 'Siswa Contoh ' + studentId,
    current_grade_level_id: 1,
    current_class_id: 1,
    status: 'active'
  };
}

/**
 * Mendapatkan daftar Siswa berdasarkan Rombel/Kelas dari modul Akademik
 * @param {number|string} classId
 * @param {number|string} schoolUnitId
 * @returns {Promise<Array>}
 */
async function getStudentsByClass(classId, schoolUnitId) {
  // TODO: Ganti mock ini dengan query student_class_enrollments dari modul Akademik
  return [
    {
      id: 1,
      nis: '20260001',
      full_name: 'Ahmad Siswa 1',
      grade_level_id: 1,
      class_id: Number(classId),
      school_unit_id: Number(schoolUnitId)
    },
    {
      id: 2,
      nis: '20260002',
      full_name: 'Budi Siswa 2',
      grade_level_id: 1,
      class_id: Number(classId),
      school_unit_id: Number(schoolUnitId)
    }
  ];
}

/**
 * Mendapatkan seluruh siswa aktif pada Satuan Pendidikan dari modul Akademik
 * @param {number|string} schoolUnitId
 * @returns {Promise<Array>}
 */
async function getAllActiveStudents(schoolUnitId) {
  // TODO: Ganti mock ini dengan query siswa aktif dari modul Akademik
  return [
    {
      id: 1,
      nis: '20260001',
      full_name: 'Ahmad Siswa 1',
      grade_level_id: 1,
      school_unit_id: Number(schoolUnitId)
    },
    {
      id: 2,
      nis: '20260002',
      full_name: 'Budi Siswa 2',
      grade_level_id: 1,
      school_unit_id: Number(schoolUnitId)
    }
  ];
}

/**
 * Mendapatkan data Pegawai dari modul Kepegawaian
 * @param {number|string} employeeId
 * @returns {Promise<Object>}
 */
async function getEmployee(employeeId) {
  // TODO: Ganti mock ini dengan pemanggilan query ke modul Kepegawaian (tabel `employees`)
  return {
    id: Number(employeeId),
    employee_number: 'PEG-0001',
    full_name: 'Pegawai Contoh ' + employeeId,
    employment_status: 'gtt',
    account_status: 'active'
  };
}

module.exports = {
  getAcademicYear,
  getStudent,
  getStudentsByClass,
  getAllActiveStudents,
  getEmployee
};
