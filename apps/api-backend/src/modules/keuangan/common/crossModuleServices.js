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
async function getStudent(studentId, academicYearId = null) {
  const id = Number(studentId);
  if (!id) return null;

  try {
    const student = await dbAkademik('students')
      .where({ id })
      .select('id', 'satuan_pendidikan_id', 'nis', 'nisn', 'full_name', 'gender', 'status', 'user_id', 'cohort_id', 'enrolled_at')
      .first()
      .timeout(5000, { cancel: true });

    if (!student) return null;

    let matchingAyIds = [];
    let currentAyObj = null;
    if (academicYearId && academicYearId !== 'all') {
      try {
        const ayRow = await dbAkademik('academic_years').where('id', Number(academicYearId)).first();
        if (ayRow) {
          currentAyObj = ayRow;
          const sameAys = await dbAkademik('academic_years').where('name', ayRow.name);
          matchingAyIds = sameAys.map(a => a.id);
        }
      } catch (e) {
        console.warn('[getStudent] Could not resolve matching AY IDs:', e.message);
      }
    }

    const enrollments = await dbAkademik('student_class_enrollments')
      .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
      .where({ 'student_class_enrollments.student_id': id })
      .where('class_groups.type', 'reguler')
      .select(
        'student_class_enrollments.class_group_id',
        'class_groups.name as class_group_name',
        'class_groups.grade_level_id',
        'student_class_enrollments.academic_year_id',
        'student_class_enrollments.status as enrollment_status'
      )
      .timeout(5000, { cancel: true });

    let activeEnrollment = null;
    if (matchingAyIds.length > 0) {
      activeEnrollment = enrollments.find(e => matchingAyIds.includes(e.academic_year_id) && e.enrollment_status !== 'keluar');
    } else {
      activeEnrollment = enrollments.find(e => e.enrollment_status === 'aktif') || enrollments[0];
    }

    let className = activeEnrollment?.class_group_name || null;
    if (!className) {
      let isFutureStudent = false;
      if (currentAyObj) {
        const ayEndDate = currentAyObj.end_date ? new Date(currentAyObj.end_date) : null;
        const enrolledDate = student.enrolled_at ? new Date(student.enrolled_at) : null;
        if (enrolledDate && ayEndDate && enrolledDate > ayEndDate) {
          isFutureStudent = true;
        } else {
          const hasFutureEnrollment = enrollments.some(e => e.academic_year_id > (currentAyObj.id || 0));
          if (hasFutureEnrollment) isFutureStudent = true;
        }
      }
      if (isFutureStudent) {
        className = 'Calon Siswa Baru';
      } else if (student.status === 'lulus') {
        className = 'Alumni';
      } else if (student.status === 'keluar') {
        className = 'Keluar / Mutasi';
      } else {
        className = '-';
      }
    }

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
      class_name: className,
      academic_year_id: activeEnrollment?.academic_year_id || null
    };
  } catch (err) {
    console.error(`[Keuangan CrossModule] Gagal mengambil siswa ID ${id}:`, err.message);
    throw new Error(`Gagal terhubung ke data Akademik (Siswa ID ${id}): ${err.message}`);
  }
}

/**
 * Mendapatkan data batch Siswa dari modul Akademik beserta rombel aktifnya dalam 1 query batch
 * Menghilangkan anti-pattern N+1 query loop
 * @param {Array<number|string>} studentIds
 * @param {number|string|null} academicYearId
 * @returns {Promise<Map<number, Object>>} Map keyed by student.id
 */
async function getStudentsByIds(studentIds = [], academicYearId = null) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) return new Map();
  const validIds = [...new Set(studentIds.map(Number).filter(Boolean))];
  if (validIds.length === 0) return new Map();

  try {
    const students = await dbAkademik('students')
      .whereIn('id', validIds)
      .select('id', 'satuan_pendidikan_id', 'nis', 'nisn', 'full_name', 'gender', 'status', 'user_id', 'cohort_id', 'enrolled_at')
      .timeout(10000, { cancel: true });

    let matchingAyIds = [];
    let currentAyObj = null;
    if (academicYearId && academicYearId !== 'all') {
      try {
        const ayRow = await dbAkademik('academic_years').where('id', Number(academicYearId)).first();
        if (ayRow) {
          currentAyObj = ayRow;
          const sameAys = await dbAkademik('academic_years').where('name', ayRow.name);
          matchingAyIds = sameAys.map(a => a.id);
        }
      } catch (e) {
        console.warn('[getStudentsByIds] Could not resolve matching AY IDs:', e.message);
      }
    }

    const allEnrollments = await dbAkademik('student_class_enrollments')
      .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
      .whereIn('student_class_enrollments.student_id', validIds)
      .where('class_groups.type', 'reguler')
      .select(
        'student_class_enrollments.student_id',
        'class_groups.id as class_group_id',
        'class_groups.name as class_group_name',
        'class_groups.grade_level_id',
        'student_class_enrollments.academic_year_id',
        'student_class_enrollments.status as enrollment_status'
      )
      .timeout(10000, { cancel: true });

    const enrollmentMap = new Map();
    validIds.forEach(sId => {
      const studentEns = allEnrollments.filter(e => e.student_id === sId);
      if (matchingAyIds.length > 0) {
        const matched = studentEns.find(e => matchingAyIds.includes(e.academic_year_id) && e.enrollment_status !== 'keluar');
        enrollmentMap.set(sId, matched || null);
      } else {
        const activeEn = studentEns.find(e => e.enrollment_status === 'aktif') || studentEns[0];
        enrollmentMap.set(sId, activeEn || null);
      }
    });

    const resultMap = new Map();
    students.forEach(s => {
      const matchedEnrollment = enrollmentMap.get(s.id);
      let className = matchedEnrollment?.class_group_name || null;
      let classId = matchedEnrollment?.class_group_id || null;
      let gradeLevelId = matchedEnrollment?.grade_level_id || null;

      if (!className) {
        let isFutureStudent = false;
        if (currentAyObj) {
          const ayEndDate = currentAyObj.end_date ? new Date(currentAyObj.end_date) : null;
          const enrolledDate = s.enrolled_at ? new Date(s.enrolled_at) : null;
          if (enrolledDate && ayEndDate && enrolledDate > ayEndDate) {
            isFutureStudent = true;
          } else {
            const studentEns = allEnrollments.filter(e => e.student_id === s.id);
            const hasFutureEnrollment = studentEns.some(e => e.academic_year_id > (currentAyObj.id || 0));
            if (hasFutureEnrollment) isFutureStudent = true;
          }
        }

        if (isFutureStudent) {
          className = 'Calon Siswa Baru';
        } else if (s.status === 'lulus') {
          className = 'Alumni';
        } else if (s.status === 'keluar') {
          className = 'Keluar / Mutasi';
        } else {
          className = '-';
        }
      }

      resultMap.set(s.id, {
        id: s.id,
        school_unit_id: s.satuan_pendidikan_id,
        satuan_pendidikan_id: s.satuan_pendidikan_id,
        nis: s.nis,
        nisn: s.nisn,
        full_name: s.full_name,
        gender: s.gender,
        status: s.status,
        user_id: s.user_id,
        cohort_id: s.cohort_id,
        grade_level_id: gradeLevelId || 1,
        current_grade_level_id: gradeLevelId || 1,
        class_id: classId,
        current_class_id: classId,
        class_name: className,
        academic_year_id: matchedEnrollment?.academic_year_id || null
      });
    });

    return resultMap;
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil batch siswa:', err.message);
    throw new Error(`Gagal terhubung ke data Akademik (Batch Siswa): ${err.message}`);
  }
}

/**
 * Mendapatkan daftar Rombel / Kelas dari modul Akademik
 * @param {number|string} schoolUnitId
 * @param {number|string} academicYearId
 * @returns {Promise<Array>}
 */
async function listClassGroups(schoolUnitId, academicYearId = null) {
  try {
    let q = dbAkademik('class_groups').where('type', 'reguler');
    if (schoolUnitId) {
      q = q.where('satuan_pendidikan_id', Number(schoolUnitId));
    }
    if (academicYearId) {
      q = q.where('academic_year_id', Number(academicYearId));
    }
    const classes = await q.select('id', 'name', 'grade_level_id', 'academic_year_id')
      .orderBy('name', 'asc')
      .timeout(5000, { cancel: true });
    return classes;
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil daftar rombel:', err.message);
    return [];
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

    // Join student_class_enrollments & class_groups untuk mendapatkan grade_level_id & class_id (Hanya Rombel Reguler)
    q = q.leftJoin('student_class_enrollments', function() {
      this.on('students.id', '=', 'student_class_enrollments.student_id')
        .andOn('student_class_enrollments.status', '=', dbAkademik.raw('?', ['aktif']));
    }).leftJoin('class_groups', function() {
      this.on('student_class_enrollments.class_group_id', '=', 'class_groups.id')
        .andOn('class_groups.type', '=', dbAkademik.raw('?', ['reguler']));
    });

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
        'student_class_enrollments.class_group_id': cId
      })
      .where('class_groups.type', 'reguler')
      .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
      .select(
        'students.id',
        'students.satuan_pendidikan_id as school_unit_id',
        'students.nis',
        'students.nisn',
        'students.full_name',
        'students.gender',
        'students.status as student_status',
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
 * Mendapatkan seluruh siswa pada Satuan Pendidikan dari modul Akademik berdasarkan Tahun Ajaran
 * (Mencakup student_class_enrollments dan riwayat kronologis student_class_history untuk tahun ajaran lampau)
 * @param {number|string} schoolUnitId
 * @param {Object} filters (academic_year_id, class_id, cohort_id, grade_level_id, search)
 * @returns {Promise<Array>}
 */
async function getStudentsByAcademicYear(schoolUnitId, filters = {}) {
  try {
    const targetUnitId = schoolUnitId && schoolUnitId !== 'all' && Number(schoolUnitId) !== 0 ? Number(schoolUnitId) : null;
    const targetYearId = filters.academic_year_id && filters.academic_year_id !== 'all' ? Number(filters.academic_year_id) : null;

    let targetYearIds = [];
    if (targetYearId) {
      targetYearIds.push(targetYearId);
      // Cari seluruh ID tahun ajaran dengan nama yang sama (misal 2026/2027) agar sinkron lintas satuan pendidikan
      const refYear = await dbAkademik('academic_years').where({ id: targetYearId }).first();
      if (refYear && refYear.name) {
        const matchingYears = await dbAkademik('academic_years').where({ name: refYear.name });
        matchingYears.forEach(y => {
          if (!targetYearIds.includes(y.id)) targetYearIds.push(y.id);
        });
      }
    }

    if (targetYearIds.length > 0) {
      // 1. Cari dari student_class_enrollments untuk tahun ajaran tersebut (HANYA rombel reguler)
      let enrQuery = dbAkademik('student_class_enrollments')
        .join('students', 'student_class_enrollments.student_id', 'students.id')
        .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
        .whereIn('student_class_enrollments.academic_year_id', targetYearIds)
        .where('class_groups.type', 'reguler')
        .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
        .select(
          'students.id',
          'students.satuan_pendidikan_id as school_unit_id',
          'students.nis',
          'students.nisn',
          'students.full_name',
          'students.gender',
          'students.status as student_status',
          'students.cohort_id',
          'class_groups.id as class_id',
          'class_groups.name as class_name',
          'class_groups.grade_level_id',
          'class_groups.grade_level_id as current_grade_level_id'
        );

      if (targetUnitId) {
        enrQuery = enrQuery.where('students.satuan_pendidikan_id', targetUnitId);
      }
      if (filters.class_id) {
        enrQuery = enrQuery.where('student_class_enrollments.class_group_id', Number(filters.class_id));
      }

      // 2. Cari dari student_class_history untuk tahun ajaran tersebut (riwayat historis masa lampau, HANYA rombel reguler)
      let histQuery = dbAkademik('student_class_history')
        .join('students', 'student_class_history.student_id', 'students.id')
        .join('class_groups', 'student_class_history.class_group_id', 'class_groups.id')
        .whereIn('student_class_history.academic_year_id', targetYearIds)
        .where('class_groups.type', 'reguler')
        .select(
          'students.id',
          'students.satuan_pendidikan_id as school_unit_id',
          'students.nis',
          'students.nisn',
          'students.full_name',
          'students.gender',
          'students.status as student_status',
          'students.cohort_id',
          'class_groups.id as class_id',
          'class_groups.name as class_name',
          'student_class_history.grade_level_id',
          'student_class_history.grade_level_id as current_grade_level_id'
        );

      if (targetUnitId) {
        histQuery = histQuery.where('students.satuan_pendidikan_id', targetUnitId);
      }
      if (filters.class_id) {
        histQuery = histQuery.where('student_class_history.class_group_id', Number(filters.class_id));
      }

      const [enrStudents, histStudents] = await Promise.all([
        enrQuery.timeout(5000, { cancel: true }),
        histQuery.timeout(5000, { cancel: true })
      ]);

      // Gabungkan dan deduplikasi per student.id (utamakan enrollment jika ada)
      const map = new Map();
      histStudents.forEach(s => map.set(s.id, s));
      enrStudents.forEach(s => map.set(s.id, s));

      let results = Array.from(map.values());
      if (filters.search) {
        const q = filters.search.toLowerCase();
        results = results.filter(s =>
          (s.full_name && s.full_name.toLowerCase().includes(q)) ||
          (s.nis && s.nis.toLowerCase().includes(q)) ||
          (s.nisn && s.nisn.toLowerCase().includes(q))
        );
      }
      results.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      return results;
    } else {
      // Fallback: Seluruh siswa aktif
      return getAllActiveStudents(schoolUnitId, filters);
    }
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil daftar siswa per tahun ajaran:', err.message);
    throw new Error(`Gagal terhubung ke data Akademik (List Siswa per T.A.): ${err.message}`);
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
    const qObj = typeof query === 'object' && query !== null ? query : (query ? { satuan_pendidikan_id: query } : {});
    if (qObj.satuan_pendidikan_id) {
      q = q.where('satuan_pendidikan_id', qObj.satuan_pendidikan_id);
    }
    if (qObj.year) {
      q = q.where('year', qObj.year);
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

const dbManajemen = require('../../../config/db/manajemen');

/**
 * Mendapatkan data Program Kerja RKT dari modul Manajemen
 * @param {number|string} programId
 * @returns {Promise<Object|null>}
 */
async function getWorkPlanProgramById(programId) {
  const id = Number(programId);
  if (!id) return null;

  try {
    // 1. Cek di tabel rips_programs (Manajemen RIPS/RKT)
    const hasRipsTable = await dbManajemen.schema.hasTable('rips_programs');
    if (hasRipsTable) {
      const ripsProg = await dbManajemen('rips_programs')
        .where({ id })
        .select('id', 'code', 'name', 'description')
        .first()
        .timeout(5000, { cancel: true });
      if (ripsProg) {
        return {
          id: ripsProg.id,
          code: ripsProg.code,
          name: ripsProg.code ? `[${ripsProg.code}] ${ripsProg.name}` : ripsProg.name,
          title: ripsProg.name,
          raw_name: ripsProg.name
        };
      }
    }

    // 2. Fallback work_plan_programs jika tabel lama ada
    const hasTable = await dbManajemen.schema.hasTable('work_plan_programs');
    if (!hasTable) return null;

    const program = await dbManajemen('work_plan_programs')
      .where({ id })
      .select('id', 'school_unit_id', 'title', 'code', 'budget_estimate_reference', 'status')
      .first()
      .timeout(5000, { cancel: true });

    return program || null;
  } catch (err) {
    console.warn(`[Keuangan CrossModule] Gagal mengambil program kerja RKT ID ${id}:`, err.message);
    return null;
  }
}

/**
 * Mendapatkan daftar Program Kerja RKT dari modul Manajemen
 * @param {number|string} schoolUnitId
 * @returns {Promise<Array>}
 */
async function listWorkPlanPrograms(schoolUnitId) {
  try {
    const hasTable = await dbManajemen.schema.hasTable('work_plan_programs');
    if (!hasTable) return [];

    let q = dbManajemen('work_plan_programs');
    if (schoolUnitId && schoolUnitId !== 'all') {
      q = q.where('school_unit_id', schoolUnitId);
    }
    const list = await q.select('id', 'school_unit_id', 'title', 'code', 'budget_estimate_reference', 'status')
      .orderBy('id', 'asc')
      .timeout(5000, { cancel: true });

    return list;
  } catch (err) {
    console.warn('[Keuangan CrossModule] Gagal mengambil daftar program kerja RKT:', err.message);
    return [];
  }
}

async function getSchoolUnit(schoolUnitId) {
  const id = Number(schoolUnitId);
  if (!id) return null;
  try {
    const unit = await dbCore('school_units')
      .where({ id })
      .select('id', 'name', 'level', 'npsn', 'is_active')
      .first();
    return unit || null;
  } catch (err) {
    console.warn(`[Keuangan CrossModule] Gagal getSchoolUnit ID ${id}:`, err.message);
    return { id, name: `Satuan Pendidikan #${id}` };
  }
}

async function listSchoolUnits() {
  try {
    const units = await dbCore('school_units')
      .where('is_active', 1)
      .select('id', 'name', 'level', 'npsn', 'is_active')
      .orderBy('id', 'asc');
    return units.length > 0 ? units : [{ id: 1, name: 'Satuan Pendidikan 1' }];
  } catch (err) {
    console.warn('[Keuangan CrossModule] Gagal listSchoolUnits:', err.message);
    return [{ id: 1, name: 'Satuan Pendidikan 1' }];
  }
}

/**
 * Mendapatkan data Calon Murid dari modul Akademik (PSB)
 * @param {number|string} registrantId
 * @returns {Promise<Object|null>}
 */
async function getPsbRegistrant(registrantId) {
  const id = Number(registrantId);
  if (!id) return null;

  try {
    const reg = await dbAkademik('psb_registrants as r')
      .leftJoin('psb_processes as p', 'r.psb_process_id', 'p.id')
      .where('r.id', id)
      .orWhere('r.placed_student_id', id)
      .select(
        'r.id',
        'r.registration_number',
        'r.full_name',
        'r.status as psb_status',
        'r.satuan_pendidikan_id',
        'r.psb_process_id',
        'p.target_academic_year',
        'p.name as process_name'
      )
      .first();

    if (reg) return reg;

    // Fallback cari di tabel students jika pendaftar sudah jadi santri aktif / tercatat langsung
    const student = await dbAkademik('students as s')
      .where('s.id', id)
      .select(
        's.id',
        's.nipd',
        's.nis',
        's.full_name',
        's.status as student_status',
        's.satuan_pendidikan_id'
      )
      .first();

    if (student) {
      return {
        id: student.id,
        registration_number: student.nipd || student.nis || `NIS-${student.id}`,
        full_name: student.full_name,
        psb_status: 'placed',
        satuan_pendidikan_id: student.satuan_pendidikan_id,
        process_name: 'Santri Terdaftar'
      };
    }

    return null;
  } catch (err) {
    console.warn(`[Keuangan CrossModule] Gagal mengambil calon murid PSB ID ${id}:`, err.message);
    return null;
  }
}

/**
 * Mendapatkan daftar Calon Murid dari modul Akademik (PSB)
 * @param {number|string} schoolUnitId
 * @param {Object} filters
 * @returns {Promise<Array>}
 */
async function listPsbRegistrants(schoolUnitId, filters = {}) {
  try {
    let targetAyName = filters.target_academic_year || null;
    const targetAyId = filters.target_academic_year_id || filters.academic_year_id || null;

    let ayRow = null;
    let targetAyIds = [];
    if (targetAyId) {
      ayRow = await dbAkademik('academic_years').where('id', targetAyId).first();
      if (ayRow) {
        targetAyName = ayRow.name;
        const sameNameAys = await dbAkademik('academic_years').where('name', targetAyName);
        targetAyIds = sameNameAys.map(a => a.id);
      }
    } else if (targetAyName) {
      const sameNameAys = await dbAkademik('academic_years').where('name', targetAyName);
      if (sameNameAys.length > 0) {
        ayRow = sameNameAys[0];
        targetAyIds = sameNameAys.map(a => a.id);
      }
    }

    if (ayRow) {
      targetAyName = ayRow.name;
    }

    const startYearStr = targetAyName ? targetAyName.split('/')[0].trim() : null;
    const isSingleUnit = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' && schoolUnitId !== 'null' && Number(schoolUnitId) !== 0;

    // 1. Ambil pendaftar baru & pindahan dari modul PSB (psb_registrants)
    let query = dbAkademik('psb_registrants as r')
      .join('psb_processes as p', 'r.psb_process_id', 'p.id');

    if (isSingleUnit) {
      query = query.where('r.satuan_pendidikan_id', Number(schoolUnitId));
    }

    // Filter spesifik tahun ajaran sasaran jika diberikan
    if (targetAyName) {
      query = query.where(b => {
        b.where('p.target_academic_year', targetAyName)
          .orWhere('p.target_academic_year', 'like', `%${targetAyName}%`);
      });
    }

    if (filters.status) {
      query = query.where('r.status', filters.status);
    } else {
      query = query.whereNotIn('r.status', ['rejected', 'withdrawn']);
    }

    if (filters.entry_type && filters.entry_type !== 'all') {
      query = query.where('r.entry_type', filters.entry_type);
    }

    if (filters.psb_process_id) {
      query = query.where('r.psb_process_id', filters.psb_process_id);
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      query = query.where(b => {
        b.where('r.full_name', 'like', term)
          .orWhere('r.registration_number', 'like', term);
      });
    }

    const rows = await query
      .select(
        'r.id',
        'r.registration_number',
        'r.full_name',
        'r.status as psb_status',
        'r.entry_type',
        'r.satuan_pendidikan_id',
        'p.target_academic_year',
        'p.name as process_name',
        'r.placed_student_id as student_id'
      )
      .orderBy('r.id', 'desc');

    const mappedRows = rows.map(r => ({
      ...r,
      entry_type_label: r.entry_type === 'pindahan' ? 'Siswa Pindahan' : 'Siswa Baru (Reguler)',
      process_name: r.entry_type === 'pindahan' ? `${r.process_name} - Pindahan` : r.process_name
    }));

    // 2. Ambil siswa baru / pindahan yang tercatat di tabel students HANYA untuk tahun ajaran sasaran ini
    let studentRows = [];
    if (ayRow && startYearStr) {
      let sQuery = dbAkademik('students as s')
        .leftJoin('cohorts as c', 's.cohort_id', 'c.id');

      if (isSingleUnit) {
        sQuery = sQuery.where('s.satuan_pendidikan_id', Number(schoolUnitId));
      }

      const activeAyIds = targetAyIds.length > 0 ? targetAyIds : [ayRow.id];

      // Pastikan hanya siswa yang baru masuk di Tahun Ajaran ini (bukan siswa yang naik dari tahun sebelumnya):
      // 1. Cohort-nya harus sesuai tahun ajaran ini (misal: '2026' untuk TA 2026/2027) ATAU enrolled_at di tahun ini ATAU pertama kali masuk rombel di TA ini
      // 2. TIDAK terdaftar di angkatan tahun sebelumnya (c.year >= startYearStr)
      // 3. TIDAK memiliki riwayat kelas/enrollment di tahun ajaran sebelum tahun ajaran target (ay.start_date < targetAy.start_date)
      sQuery = sQuery.where(b => {
        b.where('c.year', startYearStr)
          .orWhere('c.name', 'like', `%${startYearStr}%`)
          .orWhere(dbAkademik.raw('YEAR(s.enrolled_at)'), startYearStr)
          .orWhere(function() {
            this.whereExists(function() {
              this.select('sce.id')
                .from('student_class_enrollments as sce')
                .whereRaw('sce.student_id = s.id')
                .whereIn('sce.academic_year_id', activeAyIds);
            }).whereNotExists(function() {
              this.select('prev_sce.id')
                .from('student_class_enrollments as prev_sce')
                .join('academic_years as prev_ay', 'prev_sce.academic_year_id', 'prev_ay.id')
                .whereRaw('prev_sce.student_id = s.id')
                .where('prev_ay.start_date', '<', ayRow.start_date);
            });
          });
      })
      .where(b => {
        b.whereNull('c.year')
          .orWhere('c.year', '>=', startYearStr);
      })
      .whereNotExists(function() {
        this.select('prev_sce.id')
          .from('student_class_enrollments as prev_sce')
          .join('academic_years as prev_ay', 'prev_sce.academic_year_id', 'prev_ay.id')
          .whereRaw('prev_sce.student_id = s.id')
          .where('prev_ay.start_date', '<', ayRow.start_date);
      });

      if (filters.search) {
        const term = `%${filters.search}%`;
        sQuery = sQuery.where(b => {
          b.where('s.full_name', 'like', term)
            .orWhere('s.nipd', 'like', term)
            .orWhere('s.nis', 'like', term);
        });
      }

      const matchedStudents = await sQuery
        .select('s.id', 's.full_name', 's.nipd', 's.nis', 's.status', 's.satuan_pendidikan_id')
        .limit(300);

      const existingPlacedStudentIds = new Set(
        rows.map(r => r.student_id).filter(Boolean).map(String)
      );
      const existingFullNames = new Set(
        rows.map(r => (r.full_name || '').toLowerCase().trim())
      );

      matchedStudents.forEach(s => {
        if (!existingPlacedStudentIds.has(String(s.id)) && !existingFullNames.has((s.full_name || '').toLowerCase().trim())) {
          studentRows.push({
            id: s.id,
            registration_number: s.nipd || s.nis || `NIS-${s.id}`,
            full_name: s.full_name,
            psb_status: 'placed',
            entry_type: 'reguler',
            entry_type_label: 'Siswa Baru (Terdaftar)',
            satuan_pendidikan_id: s.satuan_pendidikan_id,
            target_academic_year: targetAyName || 'Tahun Ajaran Sasaran',
            process_name: `Siswa Baru TA ${targetAyName || ''}`,
            student_id: s.id,
            is_student: true
          });
        }
      });
    }

    return [...mappedRows, ...studentRows];
  } catch (err) {
    console.warn('[Keuangan CrossModule] Gagal listPsbRegistrants:', err.message);
    return [];
  }
}

/**
 * Placement Hook: Menautkan student_id resmi ke seluruh tagihan PPDB calon murid
 * serta memastikan kesinambungan penetapan skema biaya & pembukuan di Tahun Ajaran target
 * @param {number|string} registrantId
 * @param {number|string} studentId
 * @param {number|string} [targetAcademicYearId]
 * @returns {Promise<Object>}
 */
async function onStudentPlaced(registrantId, studentId, targetAcademicYearId = null) {
  const regId = Number(registrantId);
  const sId = Number(studentId);
  if (!regId || !sId) {
    throw new Error('registrantId dan studentId valid wajib diisi untuk onStudentPlaced');
  }

  const dbKeuangan = require('../../../config/db/keuangan');

  // 1. Tautkan seluruh tagihan PPDB ke student_id resmi
  const updatedCount = await dbKeuangan('ppdb_registration_bills')
    .where({ psb_registrant_ref_id: regId })
    .update({
      linked_student_id: sId,
      updated_at: dbKeuangan.fn.now()
    });

  // 2. Ambil data siswa untuk mengetahui satuan pendidikan & tahun ajaran target
  const student = await getStudent(sId);
  const effectiveAyId = targetAcademicYearId ? Number(targetAcademicYearId) : (student?.academic_year_id || 1);
  const schoolUnitId = student?.satuan_pendidikan_id || student?.school_unit_id || 1;

  // 3. Pastikan penetapan skema biaya (student_fee_scheme_assignments) ada di Tahun Ajaran target
  let createdAssignment = false;
  if (effectiveAyId) {
    const existingAsg = await dbKeuangan('student_fee_scheme_assignments')
      .where({
        student_id: sId,
        academic_year_id: effectiveAyId
      })
      .first();

    if (!existingAsg) {
      // Cari fee scheme yang aktif untuk tahun ajaran target & unit tersebut
      const defaultScheme = await dbKeuangan('fee_schemes')
        .where(b => {
          b.where('school_unit_id', schoolUnitId).orWhere('school_unit_id', 0).orWhereNull('school_unit_id');
        })
        .where('academic_year_id', effectiveAyId)
        .orderBy('id', 'asc')
        .first();

      if (defaultScheme) {
        await dbKeuangan('student_fee_scheme_assignments').insert({
          school_unit_id: schoolUnitId,
          student_id: sId,
          academic_year_id: effectiveAyId,
          fee_scheme_id: defaultScheme.id,
          reason: 'Penetapan otomatis dari transisi penerimaan santri baru (PPDB Placement)',
          is_custom: false,
          created_at: dbKeuangan.fn.now(),
          updated_at: dbKeuangan.fn.now()
        });
        createdAssignment = true;
      }
    }
  }

  // 4. Sinkronisasikan seluruh tagihan PPDB siswa ke tabel student_bills
  const ppdbBills = await dbKeuangan('ppdb_registration_bills')
    .where({ psb_registrant_ref_id: regId, is_installment_parent: false })
    .whereNot('status', 'cancelled');

  for (const pb of ppdbBills) {
    try {
      await syncPpdbBillToStudentBill(pb, dbKeuangan);
    } catch (sErr) {
      console.warn(`[onStudentPlaced] Warning sync tagihan PPDB #${pb.id} ke student_bills:`, sErr.message);
    }
  }

  console.log(`[Placement Hook] Berhasil menautkan & menyinkronkan ${updatedCount} tagihan PPDB (Registrant #${regId}) ke Siswa Aktif #${sId} (Auto-Assignment TA ${effectiveAyId}: ${createdAssignment ? 'Yes' : 'Existing'})`);
  return {
    registrant_id: regId,
    student_id: sId,
    academic_year_id: effectiveAyId,
    linked_bills_count: updatedCount,
    fee_scheme_assigned: createdAssignment
  };
}

function formatDateOnly(d) {
  if (!d) return null;
  if (typeof d === 'string') {
    const clean = d.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return clean;
  }
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * Sinkronisasi Tagihan PPDB (ppdb_registration_bills) ke Tagihan Siswa (student_bills)
 * Menjamin tanggal tagihan, jatuh tempo, nominal kotor/bersih, diskon, dan status lunas/terbayar 100% identik
 */
async function syncPpdbBillToStudentBill(ppdbBillOrId, dbTrx = null) {
  const dbKeuangan = dbTrx || require('../../../config/db/keuangan');
  let pb = typeof ppdbBillOrId === 'object' && ppdbBillOrId !== null ? ppdbBillOrId : null;
  if (!pb || !pb.id) {
    pb = await dbKeuangan('ppdb_registration_bills').where({ id: Number(ppdbBillOrId) }).first();
  }
  if (!pb) return null;

  let sId = pb.linked_student_id ? Number(pb.linked_student_id) : null;
  if (!sId && pb.psb_registrant_ref_id) {
    try {
      const std = await getStudent(pb.psb_registrant_ref_id);
      if (std) {
        sId = std.id;
        await dbKeuangan('ppdb_registration_bills').where({ id: pb.id }).update({ linked_student_id: sId });
      }
    } catch (_) {}
  }
  if (!sId) return null;

  const schoolUnitId = Number(pb.school_unit_id) || 1;
  const academicYearId = Number(pb.target_academic_year_id || pb.academic_year_id || 1);
  const feeTypeId = Number(pb.fee_type_id);
  const billDate = formatDateOnly(pb.bill_date || pb.created_at);
  const dueDate = formatDateOnly(pb.due_date || pb.created_at);
  const amount = parseFloat(pb.amount || 0);
  const paidAmount = parseFloat(pb.paid_amount || 0);
  const discountAmount = parseFloat(pb.discount_amount || 0);
  const discountReason = pb.discount_reason || null;
  const status = pb.status || 'unpaid';
  const notes = pb.notes ? `[PPDB] ${pb.notes}` : 'Tagihan Penerimaan Santri Baru (PPDB)';

  const existing = await dbKeuangan('student_bills')
    .where({
      student_id: sId,
      fee_type_id: feeTypeId
    })
    .whereNull('period_month')
    .whereNot('status', 'cancelled')
    .first();

  if (existing) {
    await dbKeuangan('student_bills')
      .where({ id: existing.id })
      .update({
        school_unit_id: schoolUnitId,
        academic_year_id: academicYearId,
        amount: amount,
        paid_amount: paidAmount,
        discount_amount: discountAmount,
        discount_reason: discountReason,
        bill_date: billDate,
        due_date: dueDate,
        status: status,
        edit_reason: notes,
        updated_at: dbKeuangan.fn.now()
      });
    return dbKeuangan('student_bills').where({ id: existing.id }).first();
  } else if (status !== 'cancelled') {
    let periodYear = new Date().getFullYear();
    if (pb.due_date) periodYear = new Date(pb.due_date).getFullYear();
    else if (pb.bill_date) periodYear = new Date(pb.bill_date).getFullYear();

    const [insertedId] = await dbKeuangan('student_bills').insert({
      school_unit_id: schoolUnitId,
      academic_year_id: academicYearId,
      student_id: sId,
      fee_type_id: feeTypeId,
      period_month: null,
      period_year: periodYear,
      amount: amount,
      paid_amount: paidAmount,
      discount_amount: discountAmount,
      discount_reason: discountReason,
      bill_date: billDate,
      due_date: dueDate,
      version: 1,
      status: status,
      published_at: pb.created_at || dbKeuangan.fn.now(),
      edit_reason: notes,
      created_at: pb.created_at || dbKeuangan.fn.now(),
      updated_at: dbKeuangan.fn.now()
    });
    return dbKeuangan('student_bills').where({ id: insertedId }).first();
  }
  return null;
}

/**
 * Sinkronisasi Tagihan Siswa (student_bills) ke Tagihan PPDB (ppdb_registration_bills)
 * Bila dilakukan perubahan/pengisian dari /keuangan/bills
 */
async function syncStudentBillToPpdbBill(studentBillOrId, dbTrx = null) {
  const dbKeuangan = dbTrx || require('../../../config/db/keuangan');
  let sb = typeof studentBillOrId === 'object' && studentBillOrId !== null ? studentBillOrId : null;
  if (!sb || !sb.id) {
    sb = await dbKeuangan('student_bills').where({ id: Number(studentBillOrId) }).first();
  }
  if (!sb) return null;

  const sId = Number(sb.student_id);
  const feeTypeId = Number(sb.fee_type_id);

  const existingPpdb = await dbKeuangan('ppdb_registration_bills')
    .where(b => {
      b.where({ linked_student_id: sId, fee_type_id: feeTypeId })
       .orWhere({ psb_registrant_ref_id: sId, fee_type_id: feeTypeId });
    })
    .where('is_installment_parent', false)
    .whereNot('status', 'cancelled')
    .first();

  if (existingPpdb) {
    const billDate = formatDateOnly(sb.bill_date || existingPpdb.bill_date || sb.created_at);
    const dueDate = formatDateOnly(sb.due_date || existingPpdb.due_date);
    const amount = parseFloat(sb.amount || 0);
    const paidAmount = parseFloat(sb.paid_amount || existingPpdb.paid_amount || 0);
    const discountAmount = parseFloat(sb.discount_amount || 0);
    const discountReason = sb.discount_reason || null;
    const status = sb.status;
    const notes = sb.edit_reason || sb.notes || existingPpdb.notes || null;

    await dbKeuangan('ppdb_registration_bills')
      .where({ id: existingPpdb.id })
      .update({
        amount: amount,
        paid_amount: paidAmount,
        discount_amount: discountAmount,
        discount_reason: discountReason,
        bill_date: billDate,
        due_date: dueDate,
        status: status,
        notes: notes,
        updated_at: dbKeuangan.fn.now()
      });

    return dbKeuangan('ppdb_registration_bills').where({ id: existingPpdb.id }).first();
  }
  return null;
}

/**
 * Mendapatkan daftar Siswa Alumni / Lulus dari modul Akademik
 * Sesuai konteks Tahun Ajaran: Santri yang aktif di kelas pada tahun ajaran tersebut
 * diklasifikasikan sebagai Siswa Aktif (Tab 1), dan hanya menjadi Alumni (Tab 2)
 * pada tahun-tahun ajaran setelah kelulusannya.
 * @param {number|string} schoolUnitId
 * @param {Object} filters (academic_year_id, cohort_id, search)
 * @returns {Promise<Array>}
 */
async function getAlumniStudents(schoolUnitId, filters = {}) {
  try {
    const targetUnitId = schoolUnitId && schoolUnitId !== 'all' && Number(schoolUnitId) !== 0 ? Number(schoolUnitId) : null;
    const targetAyId = filters.academic_year_id && filters.academic_year_id !== 'all' ? Number(filters.academic_year_id) : null;

    let targetAy = null;
    let targetAyIds = [];
    if (targetAyId) {
      targetAy = await dbAkademik('academic_years').where({ id: targetAyId }).first();
      if (targetAy && targetAy.name) {
        const matchingYears = await dbAkademik('academic_years').where({ name: targetAy.name });
        targetAyIds = matchingYears.map(y => y.id);
      } else if (targetAy) {
        targetAyIds = [targetAy.id];
      }
    }

    // Identifikasi siswa yang aktif / terdaftar dalam rombel pada Tahun Ajaran konteks
    let activeStudentIdsInTargetAy = new Set();
    if (targetAyIds.length > 0) {
      const enrolledIds = await dbAkademik('student_class_enrollments')
        .whereIn('academic_year_id', targetAyIds)
        .whereNotIn('status', ['dibatalkan', 'batal'])
        .pluck('student_id');
      const histIds = await dbAkademik('student_class_history')
        .whereIn('academic_year_id', targetAyIds)
        .pluck('student_id');
      activeStudentIdsInTargetAy = new Set([...enrolledIds, ...histIds]);
    }

    let q = dbAkademik('students')
      .whereIn('students.status', ['lulus', 'alumni', 'keluar', 'mutasi', 'drop_out', 'non_aktif']);

    if (targetUnitId) {
      q = q.where('students.satuan_pendidikan_id', targetUnitId);
    }
    if (filters.cohort_id) {
      q = q.where('students.cohort_id', Number(filters.cohort_id));
    }
    if (filters.search && String(filters.search).trim()) {
      const s = String(filters.search).trim();
      q = q.where(function() {
        this.where('students.full_name', 'like', `%${s}%`)
          .orWhere('students.nis', 'like', `%${s}%`)
          .orWhere('students.nipd', 'like', `%${s}%`)
          .orWhere('students.nisn', 'like', `%${s}%`);
      });
    }

    const students = await q.select(
      'students.id',
      'students.satuan_pendidikan_id as school_unit_id',
      'students.nis',
      'students.nipd',
      'students.nisn',
      'students.full_name',
      'students.gender',
      'students.status as student_status',
      'students.cohort_id',
      'students.cohort_name',
      'students.created_at'
    ).orderBy('students.full_name', 'asc');

    if (students.length === 0) return [];

    const studentIds = students.map(s => s.id);

    // Ambil riwayat kelas terakhir & tahun kelulusan
    const histories = await dbAkademik('student_class_history')
      .join('class_groups', 'student_class_history.class_group_id', 'class_groups.id')
      .join('academic_years', 'student_class_history.academic_year_id', 'academic_years.id')
      .whereIn('student_class_history.student_id', studentIds)
      .select(
        'student_class_history.student_id',
        'student_class_history.class_group_id',
        'student_class_history.academic_year_id',
        'student_class_history.decision',
        'class_groups.name as class_name',
        'class_groups.grade_level_id',
        'academic_years.name as academic_year_name',
        'academic_years.start_date'
      )
      .orderBy('academic_years.start_date', 'desc');

    const lastClassMap = {};
    histories.forEach(h => {
      if (!lastClassMap[h.student_id]) {
        lastClassMap[h.student_id] = h;
      }
    });

    return students.filter(st => {
      // 1. Jika pada tahun ajaran target siswa masih aktif di rombel kelas, jangan masukkan ke alumni/keluar (karena berada di Tab 1 Tagihan Siswa Aktif)
      if (activeStudentIdsInTargetAy.has(st.id)) {
        return false;
      }
      // 2. Jika tahun ajaran kelulusan terjadi SETELAH atau SAMA DENGAN tahun ajaran target, pada tahun tersebut siswa belum lulus
      if (targetAy && targetAy.start_date) {
        const last = lastClassMap[st.id];
        if (last && last.start_date && new Date(last.start_date) >= new Date(targetAy.start_date)) {
          return false;
        }
      }
      return true;
    }).map(st => {
      const last = lastClassMap[st.id] || {};
      const isExited = ['keluar', 'mutasi', 'drop_out', 'non_aktif'].includes(st.student_status);
      let lastClass = last.class_name || (isExited ? 'Keluar / Mutasi' : 'Kelas 9 / 12');
      let gradAyName = last.academic_year_name
        ? (isExited ? `Keluar T.A. ${last.academic_year_name}` : `Lulus T.A. ${last.academic_year_name}`)
        : (isExited ? 'Siswa Keluar / Non-Aktif' : 'Alumni');

      return {
        id: st.id,
        school_unit_id: st.school_unit_id,
        nis: st.nis || st.nipd || '-',
        nipd: st.nipd || st.nis || '-',
        nisn: st.nisn || '-',
        full_name: st.full_name,
        gender: st.gender,
        student_status: st.student_status,
        cohort_id: st.cohort_id,
        cohort_name: st.cohort_name || '-',
        last_class_id: last.class_group_id || null,
        last_class_name: lastClass,
        graduation_academic_year_id: last.academic_year_id || null,
        graduation_academic_year_name: gradAyName
      };
    });
  } catch (err) {
    console.error('[Keuangan CrossModule] Gagal mengambil data santri alumni:', err.message);
    throw new Error(`Gagal terhubung ke data Akademik (Alumni): ${err.message}`);
  }
}

module.exports = {
  getSchoolUnit,
  listSchoolUnits,
  getAcademicYear,
  listAcademicYears,
  getStudent,
  getStudentsByIds,
  getStudentGuardians,
  getAllActiveStudents,
  getStudentsByClass,
  getStudentsByAcademicYear,
  getAlumniStudents,
  listClassGroups,
  listCohorts,
  listGradeLevels,
  getEmployee,
  listEmployees,
  getWorkPlanProgramById,
  listWorkPlanPrograms,
  getPsbRegistrant,
  listPsbRegistrants,
  onStudentPlaced,
  syncPpdbBillToStudentBill,
  syncStudentBillToPpdbBill,
  formatDateOnly
};


