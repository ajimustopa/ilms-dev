/**
 * Cross-Module Services for Keuangan Module
 * 
 * Integrasi nyata ke Modul Akademik & Modul Kepegawaian (In-Process Database Query)
 * sesuai arsitektur Modular Monolith (AI-CONTEXT.md & ARSITEKTUR-SISTEM.md Bagian 6).
 */
const dbAkademik = require('../../../config/db/akademik');
const dbKepegawaian = require('../../../config/db/kepegawaian');
const dbCore = require('../../../config/db/core');

/**
 * Mendapatkan data Tahun Ajaran dari modul Akademik
 * @param {number|string} academicYearId
 * @returns {Promise<Object|null>}
 */
async function getAcademicYear(academicYearId) {
  const id = Number(academicYearId);
  if (!id) return null;

  try {
    const year = await dbAkademik('academic_years')
      .where({ id })
      .select('id', 'satuan_pendidikan_id', 'name', 'start_date', 'end_date', 'is_active')
      .first()
      .timeout(5000, { cancel: true });

    if (!year) return null;
    return {
      id: year.id,
      satuan_pendidikan_id: year.satuan_pendidikan_id,
      name: year.name,
      start_date: year.start_date ? (typeof year.start_date === 'string' ? year.start_date.slice(0, 10) : year.start_date.toISOString().slice(0, 10)) : null,
      end_date: year.end_date ? (typeof year.end_date === 'string' ? year.end_date.slice(0, 10) : year.end_date.toISOString().slice(0, 10)) : null,
      is_active: Boolean(year.is_active)
    };
  } catch (err) {
    console.error(`[Keuangan CrossModule] Gagal mengambil tahun ajaran ID ${id}:`, err.message);
    throw new Error(`Gagal terhubung ke data Akademik (Tahun Ajaran ID ${id}): ${err.message}`);
  }
}

/**
 * Mendapatkan daftar Tahun Ajaran dari modul Akademik
 * @param {Object} query - Filter query (satuan_pendidikan_id, is_active)
 * @returns {Promise<Array>}
 */
async function listAcademicYears(query = {}) {
  try {
    let q = dbAkademik('academic_years');
    if (query.satuan_pendidikan_id) {
      q = q.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.is_active !== undefined && query.is_active !== '') {
      const isActive = query.is_active === 'true' || query.is_active === true || query.is_active === '1' || query.is_active === 1;
      q = q.where('is_active', isActive);
    }
    const list = await q.select('id', 'satuan_pendidikan_id', 'name', 'start_date', 'end_date', 'is_active')
      .orderBy('id', 'desc')
      .timeout(5000, { cancel: true });

    return list.map(y => ({
      id: y.id,
      satuan_pendidikan_id: y.satuan_pendidikan_id,
      name: y.name,
      start_date: y.start_date ? (typeof y.start_date === 'string' ? y.start_date.slice(0, 10) : y.start_date.toISOString().slice(0, 10)) : null,
      end_date: y.end_date ? (typeof y.end_date === 'string' ? y.end_date.slice(0, 10) : y.end_date.toISOString().slice(0, 10)) : null,
      is_active: Boolean(y.is_active)
    }));
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil daftar tahun ajaran:', err.message);
    throw new Error(`Gagal terhubung ke data Akademik (List Tahun Ajaran): ${err.message}`);
  }
}

/**
 * Mendapatkan data Siswa dari modul Akademik beserta rombel aktifnya
 * @param {number|string} studentId
 * @returns {Promise<Object|null>}
 */
async function getStudent(studentId) {
  const id = Number(studentId);
  if (!id) return null;

  try {
    const student = await dbAkademik('students')
      .where({ id })
      .select('id', 'satuan_pendidikan_id', 'nis', 'nisn', 'full_name', 'gender', 'status', 'user_id', 'cohort_id')
      .first()
      .timeout(5000, { cancel: true });

    if (!student) return null;

    // Ambil rombel dan grade level aktif saat ini
    const activeEnrollment = await dbAkademik('student_class_enrollments')
      .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
      .where({ 'student_class_enrollments.student_id': id, 'student_class_enrollments.status': 'aktif' })
      .select(
        'class_groups.id as class_group_id',
        'class_groups.name as class_group_name',
        'class_groups.grade_level_id',
        'student_class_enrollments.academic_year_id'
      )
      .first()
      .timeout(5000, { cancel: true });

    return {
      id: student.id,
      school_unit_id: student.satuan_pendidikan_id,
      satuan_pendidikan_id: student.satuan_pendidikan_id,
      nis: student.nis,
      nisn: student.nisn,
      full_name: student.full_name,
      gender: student.gender,
      status: student.status,
      user_id: student.user_id,
      cohort_id: student.cohort_id,
      grade_level_id: activeEnrollment?.grade_level_id || 1,
      current_grade_level_id: activeEnrollment?.grade_level_id || 1,
      class_id: activeEnrollment?.class_group_id || null,
      current_class_id: activeEnrollment?.class_group_id || null,
      class_name: activeEnrollment?.class_group_name || null,
      academic_year_id: activeEnrollment?.academic_year_id || null
    };
  } catch (err) {
    console.error(`[Keuangan CrossModule] Gagal mengambil siswa ID ${id}:`, err.message);
    throw new Error(`Gagal terhubung ke data Akademik (Siswa ID ${id}): ${err.message}`);
  }
}

/**
 * Mendapatkan data Wali Siswa dari modul Akademik
 * @param {number|string} studentId
 * @returns {Promise<Array>}
 */
async function getStudentGuardians(studentId) {
  const id = Number(studentId);
  if (!id) return [];

  try {
    const guardians = await dbAkademik('student_guardians')
      .join('guardians', 'student_guardians.guardian_id', 'guardians.id')
      .where('student_guardians.student_id', id)
      .select(
        'guardians.id',
        'guardians.full_name',
        'guardians.phone',
        'guardians.email',
        'guardians.user_id',
        'student_guardians.relationship',
        'student_guardians.is_primary_contact'
      )
      .timeout(5000, { cancel: true });

    return guardians;
  } catch (err) {
    console.error(`[Keuangan CrossModule] Gagal mengambil wali siswa ID ${id}:`, err.message);
    throw new Error(`Gagal terhubung ke data Akademik (Wali Siswa ID ${id}): ${err.message}`);
  }
}

/**
 * Mendapatkan seluruh siswa aktif pada Satuan Pendidikan dari modul Akademik
 * @param {number|string} schoolUnitId
 * @param {Object} filters
 * @returns {Promise<Array>}
 */
async function getAllActiveStudents(schoolUnitId, filters = {}) {
  try {
    let q = dbAkademik('students')
      .where('students.status', 'aktif');

    if (schoolUnitId) {
      q = q.where('students.satuan_pendidikan_id', Number(schoolUnitId));
    }
    if (filters.cohort_id) {
      q = q.where('students.cohort_id', Number(filters.cohort_id));
    }

    // Join student_class_enrollments & class_groups untuk mendapatkan grade_level_id & class_id
    q = q.leftJoin('student_class_enrollments', function() {
      this.on('students.id', '=', 'student_class_enrollments.student_id')
        .andOn('student_class_enrollments.status', '=', dbAkademik.raw('?', ['aktif']));
    }).leftJoin('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id');

    if (filters.grade_level_id) {
      q = q.where('class_groups.grade_level_id', Number(filters.grade_level_id));
    }
    if (filters.class_group_id || filters.class_id) {
      q = q.where('class_groups.id', Number(filters.class_group_id || filters.class_id));
    }

    const students = await q.select(
      'students.id',
      'students.satuan_pendidikan_id as school_unit_id',
      'students.nis',
      'students.nisn',
      'students.full_name',
      'students.gender',
      'students.cohort_id',
      'class_groups.id as class_id',
      'class_groups.name as class_name',
      'class_groups.grade_level_id',
      'class_groups.grade_level_id as current_grade_level_id'
    ).orderBy('students.full_name', 'asc').timeout(5000, { cancel: true });

    return students.map(s => ({
      ...s,
      grade_level_id: s.grade_level_id || 1,
      current_grade_level_id: s.grade_level_id || 1
    }));
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil daftar siswa aktif:', err.message);
    throw new Error(`Gagal terhubung ke data Akademik (List Siswa Aktif): ${err.message}`);
  }
}

/**
 * Mendapatkan daftar Siswa berdasarkan Rombel/Kelas dari modul Akademik
 * @param {number|string} classId
 * @param {number|string} schoolUnitId
 * @returns {Promise<Array>}
 */
async function getStudentsByClass(classId, schoolUnitId) {
  const cId = Number(classId);
  if (!cId) return [];

  try {
    const enrollments = await dbAkademik('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
      .where({
        'student_class_enrollments.class_group_id': cId,
        'student_class_enrollments.status': 'aktif',
        'students.status': 'aktif'
      })
      .select(
        'students.id',
        'students.satuan_pendidikan_id as school_unit_id',
        'students.nis',
        'students.nisn',
        'students.full_name',
        'students.gender',
        'students.cohort_id',
        'class_groups.id as class_id',
        'class_groups.name as class_name',
        'class_groups.grade_level_id',
        'class_groups.grade_level_id as current_grade_level_id'
      )
      .orderBy('students.full_name', 'asc')
      .timeout(5000, { cancel: true });

    return enrollments;
  } catch (err) {
    console.error(`[Keuangan CrossModule] Gagal mengambil siswa rombel ${cId}:`, err.message);
    throw new Error(`Gagal terhubung ke data Akademik (Rombel ID ${cId}): ${err.message}`);
  }
}

/**
 * Mendapatkan daftar Rombel dari modul Akademik
 * @param {Object} query
 * @returns {Promise<Array>}
 */
async function listClassGroups(query = {}) {
  try {
    let q = dbAkademik('class_groups')
      .leftJoin('student_class_enrollments', function() {
        this.on('class_groups.id', '=', 'student_class_enrollments.class_group_id')
          .andOn('student_class_enrollments.status', '=', dbAkademik.raw('?', ['aktif']));
      })
      .groupBy('class_groups.id', 'class_groups.name', 'class_groups.grade_level_id', 'class_groups.academic_year_id', 'class_groups.satuan_pendidikan_id')
      .select(
        'class_groups.id',
        'class_groups.satuan_pendidikan_id',
        'class_groups.name',
        'class_groups.grade_level_id',
        'class_groups.academic_year_id',
        dbAkademik.raw('COUNT(student_class_enrollments.id) as student_count')
      );

    if (query.satuan_pendidikan_id) {
      q = q.where('class_groups.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.academic_year_id) {
      q = q.where('class_groups.academic_year_id', query.academic_year_id);
    }
    if (query.grade_level_id) {
      q = q.where('class_groups.grade_level_id', query.grade_level_id);
    }

    const list = await q.orderBy('class_groups.name', 'asc').timeout(5000, { cancel: true });
    return list.map(c => ({
      id: c.id,
      satuan_pendidikan_id: c.satuan_pendidikan_id,
      name: c.name,
      grade_level_id: c.grade_level_id,
      academic_year_id: c.academic_year_id,
      student_count: parseInt(c.student_count, 10) || 0
    }));
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil daftar rombel:', err.message);
    throw new Error(`Gagal terhubung ke data Akademik (List Rombel): ${err.message}`);
  }
}

/**
 * Mendapatkan daftar Angkatan (Cohorts) dari modul Akademik
 * @param {Object} query
 * @returns {Promise<Array>}
 */
async function listCohorts(query = {}) {
  try {
    let q = dbAkademik('cohorts');
    if (query.satuan_pendidikan_id) {
      q = q.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.year) {
      q = q.where('year', query.year);
    }
    const list = await q.select('id', 'satuan_pendidikan_id', 'name', 'year')
      .orderBy('year', 'desc')
      .timeout(5000, { cancel: true });

    return list;
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil daftar cohorts:', err.message);
    throw new Error(`Gagal terhubung ke data Akademik (List Cohorts): ${err.message}`);
  }
}

/**
 * Mendapatkan daftar Tingkat/Jenjang Kelas (Grade Levels) dari modul Akademik
 * @param {Object} query
 * @returns {Promise<Array>}
 */
async function listGradeLevels(query = {}) {
  try {
    let q = dbAkademik('grade_levels');
    if (query.satuan_pendidikan_id) {
      q = q.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    const list = await q.select('id', 'satuan_pendidikan_id', 'name', 'order as level_order')
      .orderBy('order', 'asc')
      .timeout(5000, { cancel: true });

    return list;
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil daftar tingkat kelas:', err.message);
    throw new Error(`Gagal terhubung ke data Akademik (List Grade Levels): ${err.message}`);
  }
}

/**
 * Mendapatkan data Pegawai dari modul Kepegawaian
 * @param {number|string} employeeId
 * @returns {Promise<Object|null>}
 */
async function getEmployee(employeeId) {
  const id = Number(employeeId);
  if (!id) return null;

  try {
    const employee = await dbKepegawaian('employees')
      .where({ id })
      .select('id', 'school_unit_id', 'employee_number', 'full_name', 'account_status', 'phone_number', 'email')
      .first()
      .timeout(5000, { cancel: true });

    if (!employee) return null;
    return {
      id: employee.id,
      school_unit_id: employee.school_unit_id,
      employee_number: employee.employee_number,
      full_name: employee.full_name,
      account_status: employee.account_status,
      phone: employee.phone_number,
      phone_number: employee.phone_number,
      email: employee.email
    };
  } catch (err) {
    console.error(`[Keuangan CrossModule] Gagal mengambil pegawai ID ${id}:`, err.message);
    throw new Error(`Gagal terhubung ke data Kepegawaian (Pegawai ID ${id}): ${err.message}`);
  }
}

/**
 * Mendapatkan daftar seluruh Pegawai aktif dari modul Kepegawaian
 * @param {number|string} schoolUnitId
 * @returns {Promise<Array>}
 */
async function listEmployees(schoolUnitId = null) {
  try {
    let q = dbKepegawaian('employees').where('account_status', 'active');
    if (schoolUnitId) {
      q = q.where('school_unit_id', Number(schoolUnitId));
    }
    const list = await q.select('id', 'school_unit_id', 'employee_number', 'full_name', 'account_status', 'phone_number', 'email')
      .orderBy('full_name', 'asc')
      .timeout(5000, { cancel: true });

    return list.map(e => ({
      ...e,
      phone: e.phone_number
    }));
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil daftar pegawai:', err.message);
    throw new Error(`Gagal terhubung ke data Kepegawaian (List Pegawai): ${err.message}`);
  }
}

/**
 * Mendapatkan data Satuan Pendidikan dari modul Core
 * @param {number|string} schoolUnitId
 * @returns {Promise<Object|null>}
 */
async function getSchoolUnit(schoolUnitId) {
  const id = Number(schoolUnitId);
  if (!id) return null;

  try {
    const unit = await dbCore('school_units')
      .where({ id })
      .first()
      .timeout(5000, { cancel: true });

    return unit || null;
  } catch (err) {
    console.error(`[Keuangan CrossModule] Gagal mengambil data school_unit ID ${id}:`, err.message);
    return null;
  }
}

module.exports = {
  getSchoolUnit,
  getAcademicYear,
  listAcademicYears,
  getStudent,
  getStudentGuardians,
  getAllActiveStudents,
  getStudentsByClass,
  listClassGroups,
  listCohorts,
  listGradeLevels,
  getEmployee,
  listEmployees
};
