/**
 * Curriculum Service Implementation
 * Modul Akademik - Fitur Master: Tahun Ajaran, Angkatan (Cohorts), Tingkat Kelas,
 * Rombongan Belajar (Class Groups), Anggota Rombel (Enrollments & Unassigned Picker),
 * Mapel, Jadwal Ajar.
 */
const db = require('../../../config/db/akademik');
const schoolUnitsService = require('../../core/school-units/service');
const employeesService = require('../../kepegawaian/employees/service');

class CurriculumService {
  // ==========================================
  // 1. Tahun Ajaran (Academic Years)
  // ==========================================
  async listAcademicYears(query = {}) {
    let baseQuery = db('academic_years');
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    return baseQuery.orderBy('start_date', 'desc');
  }

  async createAcademicYear(payload) {
    const { satuan_pendidikan_id, name, start_date, end_date, is_active } = payload;
    if (!name || !start_date || !end_date) {
      const error = new Error('Field name, start_date, dan end_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (is_active && satuan_pendidikan_id) {
      await db('academic_years').where({ satuan_pendidikan_id }).update({ is_active: false });
    } else if (is_active) {
      await db('academic_years').update({ is_active: false });
    }

    const [id] = await db('academic_years').insert({
      satuan_pendidikan_id: satuan_pendidikan_id || null,
      name: name.trim(),
      start_date,
      end_date,
      is_active: is_active ? true : false,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('academic_years').where({ id }).first();
  }

  async updateAcademicYear(id, payload) {
    const year = await db('academic_years').where({ id }).first();
    if (!year) {
      const error = new Error('Tahun ajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.satuan_pendidikan_id !== undefined) updateData.satuan_pendidikan_id = payload.satuan_pendidikan_id || null;
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.start_date) updateData.start_date = payload.start_date;
    if (payload.end_date) updateData.end_date = payload.end_date;
    if (payload.is_active !== undefined) {
      if (payload.is_active) {
        const unitId = payload.satuan_pendidikan_id || year.satuan_pendidikan_id;
        if (unitId) {
          await db('academic_years').where({ satuan_pendidikan_id: unitId }).update({ is_active: false });
        } else {
          await db('academic_years').update({ is_active: false });
        }
      }
      updateData.is_active = !!payload.is_active;
    }

    await db('academic_years').where({ id }).update(updateData);
    return db('academic_years').where({ id }).first();
  }

  async deleteAcademicYear(id) {
    const year = await db('academic_years').where({ id }).first();
    if (!year) {
      const error = new Error('Tahun ajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const hasClasses = await db('class_groups').where({ academic_year_id: id }).first();
    if (hasClasses) {
      const error = new Error('Tidak dapat menghapus tahun ajaran yang memiliki data rombel');
      error.statusCode = 422;
      throw error;
    }

    await db('academic_years').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  async activateAcademicYear(id) {
    const year = await db('academic_years').where({ id }).first();
    if (!year) {
      const error = new Error('Tahun ajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (year.satuan_pendidikan_id) {
      await db('academic_years').where({ satuan_pendidikan_id: year.satuan_pendidikan_id }).update({ is_active: false });
    } else {
      await db('academic_years').update({ is_active: false });
    }
    await db('academic_years').where({ id }).update({ is_active: true, updated_at: db.fn.now() });

    return db('academic_years').where({ id }).first();
  }

  // ==========================================
  // 2. Angkatan (Cohorts)
  // ==========================================
  async listCohorts(query = {}) {
    let baseQuery = db('cohorts');
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.is_active !== undefined) {
      baseQuery = baseQuery.where('is_active', query.is_active === 'true' || query.is_active === true);
    }
    return baseQuery.orderBy('year', 'desc');
  }

  async createCohort(payload) {
    const { satuan_pendidikan_id, year, name, description, is_active } = payload;
    if (!satuan_pendidikan_id || !year || !name) {
      const error = new Error('Field satuan_pendidikan_id, year, dan name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('cohorts').insert({
      satuan_pendidikan_id,
      year: year.toString().trim(),
      name: name.trim(),
      description: description || null,
      is_active: is_active !== undefined ? !!is_active : true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('cohorts').where({ id }).first();
  }

  async updateCohort(id, payload) {
    const cohort = await db('cohorts').where({ id }).first();
    if (!cohort) {
      const error = new Error('Angkatan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.year) updateData.year = payload.year.toString().trim();
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.is_active !== undefined) updateData.is_active = !!payload.is_active;

    await db('cohorts').where({ id }).update(updateData);
    return db('cohorts').where({ id }).first();
  }

  async deleteCohort(id) {
    const cohort = await db('cohorts').where({ id }).first();
    if (!cohort) {
      const error = new Error('Angkatan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Set null cohort_id pada siswa
    await db('students').where({ cohort_id: id }).update({ cohort_id: null });
    await db('cohorts').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 3. Semester (Semesters)
  // ==========================================
  async listSemesters(query = {}) {
    let baseQuery = db('semesters');

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where(function() {
        this.where('semesters.satuan_pendidikan_id', query.satuan_pendidikan_id)
            .orWhereNull('semesters.satuan_pendidikan_id');
      });
    }
    if (query.academic_year_id) {
      baseQuery = baseQuery.where(function() {
        this.where('semesters.academic_year_id', query.academic_year_id)
            .orWhereNull('semesters.academic_year_id');
      });
    }
    return baseQuery.orderBy('semesters.start_date', 'asc');
  }

  async createSemester(payload) {
    const { satuan_pendidikan_id, name, start_date, end_date, is_active } = payload;
    if (!satuan_pendidikan_id || !name || !start_date || !end_date) {
      const error = new Error('Field satuan_pendidikan_id, name, start_date, dan end_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (is_active) {
      await db('semesters').where({ satuan_pendidikan_id }).update({ is_active: false });
    }

    const [id] = await db('semesters').insert({
      satuan_pendidikan_id: Number(satuan_pendidikan_id),
      academic_year_id: payload.academic_year_id || null,
      name: name.trim(),
      start_date,
      end_date,
      is_active: is_active ? true : false,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('semesters').where({ id }).first();
  }

  async updateSemester(id, payload) {
    const semester = await db('semesters').where({ id }).first();
    if (!semester) {
      const error = new Error('Semester tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.satuan_pendidikan_id !== undefined) updateData.satuan_pendidikan_id = payload.satuan_pendidikan_id || null;
    if (payload.name) updateData.name = payload.name;
    if (payload.start_date) updateData.start_date = payload.start_date;
    if (payload.end_date) updateData.end_date = payload.end_date;
    if (payload.academic_year_id !== undefined) updateData.academic_year_id = payload.academic_year_id || null;
    if (payload.is_active !== undefined) {
      if (payload.is_active) {
        const unitId = payload.satuan_pendidikan_id || semester.satuan_pendidikan_id;
        if (unitId) {
          await db('semesters').where({ satuan_pendidikan_id: unitId }).update({ is_active: false });
        } else {
          await db('semesters').update({ is_active: false });
        }
      }
      updateData.is_active = !!payload.is_active;
    }

    await db('semesters').where({ id }).update(updateData);
    return db('semesters').where({ id }).first();
  }

  async deleteSemester(id) {
    const semester = await db('semesters').where({ id }).first();
    if (!semester) {
      const error = new Error('Semester tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('semesters').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  async activateSemester(id) {
    const semester = await db('semesters').where({ id }).first();
    if (!semester) {
      const error = new Error('Semester tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (semester.satuan_pendidikan_id) {
      await db('semesters').where({ satuan_pendidikan_id: semester.satuan_pendidikan_id }).update({ is_active: false });
    } else {
      await db('semesters').update({ is_active: false });
    }
    await db('semesters').where({ id }).update({ is_active: true, updated_at: db.fn.now() });

    return db('semesters').where({ id }).first();
  }

  // ==========================================
  // 4. Jenjang / Tingkat Kelas (Grade Levels)
  // ==========================================
  async listGradeLevels(query = {}) {
    let baseQuery = db('grade_levels');
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    // Jika include_inactive tidak diset atau false, hanya kembalikan tingkat kelas yang aktif
    if (query.include_inactive !== 'true' && query.include_inactive !== true) {
      baseQuery = baseQuery.where(builder => {
        builder.where('is_active', true).orWhereNull('is_active');
      });
    } else if (query.is_active !== undefined) {
      baseQuery = baseQuery.where('is_active', Boolean(query.is_active));
    }
    return baseQuery.orderBy('order', 'asc');
  }

  async createGradeLevel(payload) {
    const { satuan_pendidikan_id, name, order, is_active } = payload;
    if (!name || order === undefined) {
      const error = new Error('Field name dan order wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('grade_levels').insert({
      satuan_pendidikan_id: satuan_pendidikan_id || null,
      name: name.trim(),
      order: parseInt(order, 10),
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('grade_levels').where({ id }).first();
  }

  async updateGradeLevel(id, payload) {
    const grade = await db('grade_levels').where({ id }).first();
    if (!grade) {
      const error = new Error('Tingkat kelas tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.satuan_pendidikan_id !== undefined) updateData.satuan_pendidikan_id = payload.satuan_pendidikan_id || null;
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.order !== undefined) updateData.order = parseInt(payload.order, 10);
    if (payload.is_active !== undefined) updateData.is_active = Boolean(payload.is_active);

    await db('grade_levels').where({ id }).update(updateData);
    return db('grade_levels').where({ id }).first();
  }

  async deleteGradeLevel(id) {
    const grade = await db('grade_levels').where({ id }).first();
    if (!grade) {
      const error = new Error('Tingkat kelas tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const hasClasses = await db('class_groups').where({ grade_level_id: id }).first();
    if (hasClasses) {
      const error = new Error('Tidak dapat menghapus tingkat yang sudah digunakan oleh rombel');
      error.statusCode = 422;
      throw error;
    }

    await db('grade_levels').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 5. Rombongan Belajar (Class Groups)
  // ==========================================
  async listClassGroups(query = {}) {
    let baseQuery = db('class_groups')
      .leftJoin('academic_years', 'class_groups.academic_year_id', 'academic_years.id')
      .leftJoin('grade_levels', 'class_groups.grade_level_id', 'grade_levels.id')
      .leftJoin('extracurriculars', 'class_groups.extracurricular_id', 'extracurriculars.id')
      .leftJoin('subjects', 'class_groups.subject_id', 'subjects.id')
      .select(
        'class_groups.*',
        'academic_years.name as academic_year_name',
        'grade_levels.name as grade_level_name',
        'extracurriculars.name as extracurricular_name',
        'subjects.name as subject_name',
        'subjects.code as subject_code'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('class_groups.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.academic_year_id) {
      if (!query.satuan_pendidikan_id) {
        // Mode Semua Unit: Cari seluruh ID tahun ajaran dengan nama yang sama (misal 2026/2027)
        const refYear = await db('academic_years').where({ id: query.academic_year_id }).first();
        if (refYear && refYear.name) {
          const matchingYears = await db('academic_years').where({ name: refYear.name });
          const matchingYearIds = matchingYears.map(y => y.id);
          baseQuery = baseQuery.whereIn('class_groups.academic_year_id', matchingYearIds);
        } else {
          baseQuery = baseQuery.where('class_groups.academic_year_id', query.academic_year_id);
        }
      } else {
        baseQuery = baseQuery.where('class_groups.academic_year_id', query.academic_year_id);
      }
    }
    if (query.grade_level_id) {
      baseQuery = baseQuery.where('class_groups.grade_level_id', query.grade_level_id);
    }
    if (query.type) {
      baseQuery = baseQuery.where('class_groups.type', query.type);
    }
    if (query.extracurricular_id) {
      baseQuery = baseQuery.where('class_groups.extracurricular_id', query.extracurricular_id);
    }
    if (query.subject_id) {
      baseQuery = baseQuery.where('class_groups.subject_id', query.subject_id);
    }

    const rows = await baseQuery.orderBy('class_groups.name', 'asc');

    // Enrich jumlah siswa & nama wali kelas / pembina
    const enriched = [];
    for (const r of rows) {
      let homeroom_teacher_name = null;
      if (r.homeroom_teacher_employee_id) {
        try {
          const emp = await employeesService.getEmployeeById(r.homeroom_teacher_employee_id);
          homeroom_teacher_name = emp?.full_name || null;
        } catch (e) {}
      }

      // Hitung anggota aktif
      const countRes = await db('student_class_enrollments')
        .where({ class_group_id: r.id, status: 'aktif' })
        .count('id as cnt')
        .first();

      const student_count = countRes ? Number(countRes.cnt) : 0;

      enriched.push({ ...r, homeroom_teacher_name, student_count });
    }
    return enriched;
  }

  async getClassGroupById(id) {
    const classGroup = await db('class_groups')
      .leftJoin('academic_years', 'class_groups.academic_year_id', 'academic_years.id')
      .leftJoin('grade_levels', 'class_groups.grade_level_id', 'grade_levels.id')
      .leftJoin('extracurriculars', 'class_groups.extracurricular_id', 'extracurriculars.id')
      .leftJoin('subjects', 'class_groups.subject_id', 'subjects.id')
      .where('class_groups.id', id)
      .select(
        'class_groups.*',
        'academic_years.name as academic_year_name',
        'grade_levels.name as grade_level_name',
        'extracurriculars.name as extracurricular_name',
        'subjects.name as subject_name',
        'subjects.code as subject_code'
      )
      .first();

    if (!classGroup) {
      const error = new Error(`Rombel/Kelas ID ${id} tidak ditemukan`);
      error.statusCode = 404;
      throw error;
    }

    let homeroom_teacher_name = null;
    if (classGroup.homeroom_teacher_employee_id) {
      try {
        const emp = await employeesService.getEmployeeById(classGroup.homeroom_teacher_employee_id);
        homeroom_teacher_name = emp?.full_name || null;
      } catch (e) {}
    }

    const countRes = await db('student_class_enrollments')
      .where({ class_group_id: classGroup.id, status: 'aktif' })
      .count('id as cnt')
      .first();

    return {
      ...classGroup,
      homeroom_teacher_name,
      student_count: countRes ? Number(countRes.cnt) : 0
    };
  }

  async createClassGroup(payload) {
    const {
      satuan_pendidikan_id,
      academic_year_id,
      grade_level_id,
      name,
      homeroom_teacher_employee_id,
      capacity,
      type = 'reguler',
      extracurricular_id,
      subject_id,
      is_cross_unit = false,
      target_school_unit_ids = []
    } = payload;

    if (!satuan_pendidikan_id || !academic_year_id || !name) {
      const error = new Error('Field satuan_pendidikan_id, academic_year_id, dan name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (type === 'reguler' && !grade_level_id) {
      const error = new Error('Tingkat kelas wajib diisi untuk rombel reguler');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('class_groups').insert({
      satuan_pendidikan_id,
      academic_year_id,
      grade_level_id: grade_level_id || null,
      name: name.trim(),
      type: type || 'reguler',
      extracurricular_id: extracurricular_id || null,
      subject_id: subject_id || null,
      is_cross_unit: !!is_cross_unit,
      target_school_unit_ids: Array.isArray(target_school_unit_ids) ? JSON.stringify(target_school_unit_ids) : null,
      homeroom_teacher_employee_id: homeroom_teacher_employee_id || null,
      capacity: capacity ? parseInt(capacity, 10) : null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getClassGroupById(id);
  }

  async updateClassGroup(id, payload) {
    const current = await db('class_groups').where({ id }).first();
    if (!current) {
      const error = new Error('Rombel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.grade_level_id !== undefined) updateData.grade_level_id = payload.grade_level_id || null;
    if (payload.academic_year_id) updateData.academic_year_id = payload.academic_year_id;
    if (payload.type) updateData.type = payload.type;
    if (payload.extracurricular_id !== undefined) updateData.extracurricular_id = payload.extracurricular_id || null;
    if (payload.subject_id !== undefined) updateData.subject_id = payload.subject_id || null;
    if (payload.is_cross_unit !== undefined) updateData.is_cross_unit = !!payload.is_cross_unit;
    if (payload.target_school_unit_ids !== undefined) {
      updateData.target_school_unit_ids = Array.isArray(payload.target_school_unit_ids)
        ? JSON.stringify(payload.target_school_unit_ids)
        : null;
    }
    if (payload.capacity !== undefined) updateData.capacity = payload.capacity;
    if (payload.homeroom_teacher_employee_id !== undefined) {
      updateData.homeroom_teacher_employee_id = payload.homeroom_teacher_employee_id || null;
    }

    await db('class_groups').where({ id }).update(updateData);
    return this.getClassGroupById(id);
  }

  async deleteClassGroup(id) {
    const current = await db('class_groups').where({ id }).first();
    if (!current) {
      const error = new Error('Rombel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Cek apakah ada anggota aktif
    const hasMembers = await db('student_class_enrollments').where({ class_group_id: id }).first();
    if (hasMembers) {
      // Hapus atau kosongkan penempatan siswa
      await db('student_class_enrollments').where({ class_group_id: id }).del();
    }

    await db('class_groups').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 6. Anggota Rombel & Pemindahan (Enrollments)
  // ==========================================

  /**
   * Mengambil daftar siswa yang terdaftar di rombel tertentu (termasuk informasi rombel regulernya jika rombel ekskul)
   */
  async listClassGroupMembers(classGroupId) {
    const classGroup = await db('class_groups').where({ id: classGroupId }).first();
    const academicYearId = classGroup?.academic_year_id;

    const members = await db('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .leftJoin('cohorts', 'students.cohort_id', 'cohorts.id')
      .where('student_class_enrollments.class_group_id', classGroupId)
      .where('student_class_enrollments.status', 'aktif')
      .select(
        'student_class_enrollments.id as enrollment_id',
        'student_class_enrollments.status as enrollment_status',
        'student_class_enrollments.created_at as enrolled_at',
        'students.id as student_id',
        'students.satuan_pendidikan_id',
        'students.nis',
        'students.nisn',
        'students.full_name',
        'students.gender',
        'students.status as student_status',
        'students.cohort_name',
        'cohorts.name as cohort_title'
      )
      .orderBy('students.full_name', 'asc');

    const studentIds = members.map((m) => m.student_id);
    let regularClassMap = {};

    if (studentIds.length > 0) {
      let regQuery = db('student_class_enrollments')
        .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
        .whereIn('student_class_enrollments.student_id', studentIds)
        .where('student_class_enrollments.status', 'aktif')
        .where(function() {
          this.whereNull('class_groups.type').orWhere('class_groups.type', 'reguler');
        });

      if (academicYearId) {
        regQuery = regQuery.where('student_class_enrollments.academic_year_id', academicYearId);
      }

      const regEnrollments = await regQuery.select(
        'student_class_enrollments.student_id',
        'class_groups.id as regular_class_id',
        'class_groups.name as regular_class_name'
      );

      for (const r of regEnrollments) {
        regularClassMap[r.student_id] = r.regular_class_name;
      }
    }

    return members.map((m) => ({
      ...m,
      regular_class_name: regularClassMap[m.student_id] || null
    }));
  }

  /**
   * Mengambil daftar siswa yang BELUM MASUK rombel untuk tahun ajaran aktif/terpilih
   */
  async listUnassignedStudents(query = {}) {
    let academic_year_id = query.academic_year_id;
    if (!academic_year_id) {
      const activeYear = await db('academic_years').where({ is_active: true }).first();
      academic_year_id = activeYear?.id;
    }

    // Subquery: Siswa yang sudah terdaftar di rombel reguler aktif pada tahun ajaran ini
    let enrolledSub = db('student_class_enrollments')
      .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
      .where('student_class_enrollments.status', 'aktif')
      .where(function() {
        this.whereNull('class_groups.type').orWhere('class_groups.type', 'reguler');
      });

    if (academic_year_id) {
      enrolledSub = enrolledSub.where('student_class_enrollments.academic_year_id', academic_year_id);
    }
    const enrolledIds = enrolledSub.select('student_class_enrollments.student_id');

    let baseQuery = db('students')
      .leftJoin('cohorts', 'students.cohort_id', 'cohorts.id')
      .where('students.status', 'aktif')
      .whereNotIn('students.id', enrolledIds)
      .select(
        'students.id',
        'students.satuan_pendidikan_id',
        'students.nis',
        'students.nisn',
        'students.full_name',
        'students.gender',
        'students.status',
        'students.cohort_name',
        'students.cohort_id',
        'cohorts.name as cohort_title'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('students.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.cohort_id) {
      baseQuery = baseQuery.where('students.cohort_id', query.cohort_id);
    }
    if (query.search) {
      baseQuery = baseQuery.where((q) => {
        q.where('students.full_name', 'like', `%${query.search}%`)
          .orWhere('students.nis', 'like', `%${query.search}%`)
          .orWhere('students.nisn', 'like', `%${query.search}%`);
      });
    }

    return baseQuery.orderBy('students.full_name', 'asc');
  }

  /**
   * Menambahkan banyak siswa sekaligus ke dalam rombel
   */
  async addStudentsToClassGroup(classGroupId, payload) {
    const { student_ids, academic_year_id, satuan_pendidikan_id } = payload;
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      const error = new Error('Pilih minimal satu siswa untuk dimasukkan ke rombel');
      error.statusCode = 422;
      throw error;
    }

    const classGroup = await db('class_groups').where({ id: classGroupId }).first();
    if (!classGroup) {
      const error = new Error('Rombel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const finalAcademicYearId = academic_year_id || classGroup.academic_year_id;

    for (const sid of student_ids) {
      // Ambil satuan pendidikan asli siswa jika ada
      const student = await db('students').where({ id: sid }).first();
      const studentSatuanId = student?.satuan_pendidikan_id || satuan_pendidikan_id || classGroup.satuan_pendidikan_id;

      // JIKA ROMBEL REGULER: Siswa hanya boleh memiliki 1 rombel reguler aktif per tahun ajaran
      const isRegularClass = !classGroup.type || classGroup.type === 'reguler';
      if (isRegularClass) {
        // Hapus/nonaktifkan penempatan rombel reguler lain pada tahun ajaran yang sama
        const otherRegEnrs = await db('student_class_enrollments')
          .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
          .where('student_class_enrollments.student_id', sid)
          .where('student_class_enrollments.academic_year_id', finalAcademicYearId)
          .where(function() {
            this.whereNull('class_groups.type').orWhere('class_groups.type', 'reguler');
          })
          .whereNot('student_class_enrollments.class_group_id', classGroupId)
          .select('student_class_enrollments.id');

        if (otherRegEnrs.length > 0) {
          const idsToDelete = otherRegEnrs.map((r) => r.id);
          await db('student_class_enrollments').whereIn('id', idsToDelete).del();
        }
      }

      // Cek apakah siswa sudah terdaftar di rombel ini pada tahun ajaran ini
      const existing = await db('student_class_enrollments')
        .where({
          student_id: sid,
          class_group_id: classGroupId,
          academic_year_id: finalAcademicYearId
        })
        .first();

      if (existing) {
        await db('student_class_enrollments')
          .where({ id: existing.id })
          .update({
            status: 'aktif',
            updated_at: db.fn.now()
          });
      } else {
        await db('student_class_enrollments').insert({
          satuan_pendidikan_id: studentSatuanId,
          student_id: sid,
          class_group_id: classGroupId,
          academic_year_id: finalAcademicYearId,
          status: 'aktif',
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    return this.listClassGroupMembers(classGroupId);
  }

  /**
   * Mengeluarkan siswa dari rombel supaya statusnya kembali unassigned & catat riwayat penghapusan
   */
  async removeStudentFromClassGroup(enrollmentId, payload = {}, user = null) {
    const enrollment = await db('student_class_enrollments')
      .leftJoin('students', 'student_class_enrollments.student_id', 'students.id')
      .leftJoin('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
      .where('student_class_enrollments.id', enrollmentId)
      .select(
        'student_class_enrollments.*',
        'students.full_name as student_name',
        'students.nis as student_nis',
        'class_groups.name as class_group_name',
        'class_groups.type as class_type'
      )
      .first();

    if (!enrollment) {
      const error = new Error('Data penempatan rombel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const reason = payload.reason?.trim() || 'Dikeluarkan dari rombel';
    const notes = payload.notes?.trim() || null;

    // Catat ke student_class_removal_logs
    await db('student_class_removal_logs').insert({
      enrollment_id: Number(enrollmentId),
      student_id: enrollment.student_id,
      class_group_id: enrollment.class_group_id,
      academic_year_id: enrollment.academic_year_id || null,
      satuan_pendidikan_id: enrollment.satuan_pendidikan_id || null,
      student_name: enrollment.student_name || 'Siswa',
      student_nis: enrollment.student_nis || null,
      class_group_name: enrollment.class_group_name || 'Rombel',
      class_type: enrollment.class_type || 'reguler',
      reason,
      notes,
      removed_by_user_id: user?.id || null,
      removed_by_user_name: user?.full_name || user?.username || 'Administrator',
      removed_at: db.fn.now()
    });

    // Hapus data enrollment
    await db('student_class_enrollments').where({ id: enrollmentId }).del();

    return {
      enrollment_id: Number(enrollmentId),
      student_id: enrollment.student_id,
      student_name: enrollment.student_name,
      class_group_name: enrollment.class_group_name,
      reason,
      notes,
      removed: true
    };
  }

  /**
   * Mengambil riwayat pengeluaran siswa dari rombel
   */
  async listClassRemovalLogs(query = {}) {
    let baseQuery = db('student_class_removal_logs');

    if (query.class_group_id) {
      baseQuery = baseQuery.where('class_group_id', query.class_group_id);
    }
    if (query.student_id) {
      baseQuery = baseQuery.where('student_id', query.student_id);
    }
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.class_type) {
      baseQuery = baseQuery.where('class_type', query.class_type);
    }
    if (query.search) {
      baseQuery = baseQuery.where((q) => {
        q.where('student_name', 'like', `%${query.search}%`)
          .orWhere('student_nis', 'like', `%${query.search}%`)
          .orWhere('class_group_name', 'like', `%${query.search}%`)
          .orWhere('reason', 'like', `%${query.search}%`)
          .orWhere('notes', 'like', `%${query.search}%`);
      });
    }

    return baseQuery.orderBy('removed_at', 'desc').limit(query.limit || 100);
  }

  /**
   * Memindahkan siswa langsung dari rombel saat ini ke rombel tujuan
   */
  async transferStudentClassGroup(enrollmentId, payload) {
    const { target_class_group_id } = payload;
    if (!target_class_group_id) {
      const error = new Error('Rombel tujuan wajib dipilih');
      error.statusCode = 422;
      throw error;
    }

    const enrollment = await db('student_class_enrollments').where({ id: enrollmentId }).first();
    if (!enrollment) {
      const error = new Error('Data penempatan rombel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const targetClass = await db('class_groups').where({ id: target_class_group_id }).first();
    if (!targetClass) {
      const error = new Error('Rombel tujuan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('student_class_enrollments')
      .where({ id: enrollmentId })
      .update({
        class_group_id: target_class_group_id,
        status: 'aktif',
        updated_at: db.fn.now()
      });

    return db('student_class_enrollments').where({ id: enrollmentId }).first();
  }

  // ==========================================
  // 7. Mata Pelajaran (Subjects, Sub-Subjects & Status Toggle with Audit Logs)
  // ==========================================
  async listSubjects(query = {}) {
    let baseQuery = db('subjects')
      .leftJoin('grade_levels', 'subjects.grade_level_id', 'grade_levels.id')
      .leftJoin('subjects as parent_subjects', 'subjects.parent_subject_id', 'parent_subjects.id')
      .select(
        'subjects.*',
        'grade_levels.name as grade_level_name',
        'parent_subjects.name as parent_subject_name',
        'parent_subjects.code as parent_subject_code'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('subjects.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.grade_level_id) {
      baseQuery = baseQuery.where('subjects.grade_level_id', query.grade_level_id);
    }
    // Jika include_inactive bernilai 'true' / 1, ambil semua, jika tidak default tampilkan hanya yang aktif
    if (query.include_inactive !== 'true' && query.include_inactive !== true && query.include_inactive !== '1') {
      baseQuery = baseQuery.where('subjects.is_active', true);
    }

    return baseQuery.orderBy('subjects.name', 'asc');
  }

  async createSubject(payload, user = null) {
    const {
      satuan_pendidikan_id,
      grade_level_id,
      name,
      code,
      kkm,
      is_active,
      parent_subject_id,
      jp_allocation_mode,
      is_elective,
      elective_group_name
    } = payload;

    if (!satuan_pendidikan_id || !name) {
      const error = new Error('Field satuan_pendidikan_id dan name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('subjects').insert({
      satuan_pendidikan_id,
      grade_level_id: grade_level_id || null,
      name: name.trim(),
      code: code ? code.trim() : null,
      kkm: kkm !== undefined && kkm !== null && kkm !== '' ? parseFloat(kkm) : null,
      parent_subject_id: parent_subject_id ? parseInt(parent_subject_id, 10) : null,
      jp_allocation_mode: jp_allocation_mode || 'standalone',
      is_elective: is_elective ? true : false,
      elective_group_name: elective_group_name ? elective_group_name.trim() : null,
      is_active: is_active !== undefined ? is_active : true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Catat audit log pembuatan mapel
    try {
      await db('subject_audit_logs').insert({
        satuan_pendidikan_id,
        subject_id: id,
        action: 'create',
        previous_status: null,
        new_status: is_active !== undefined ? is_active : true,
        reason: payload.reason || 'Penambahan mata pelajaran baru',
        user_id: user?.id || null,
        user_name: user?.full_name || user?.name || 'Administrator',
        meta_data: JSON.stringify({ name, code, kkm, parent_subject_id, jp_allocation_mode, is_elective, elective_group_name }),
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    } catch (e) {
      console.error('Audit log error on subject creation:', e);
    }

    return db('subjects').where({ id }).first();
  }

  async updateSubject(id, payload, user = null) {
    const current = await db('subjects').where({ id }).first();
    if (!current) {
      const error = new Error('Mata pelajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.code !== undefined) updateData.code = payload.code ? payload.code.trim() : null;
    if (payload.grade_level_id !== undefined) updateData.grade_level_id = payload.grade_level_id || null;
    if (payload.kkm !== undefined) updateData.kkm = payload.kkm !== '' && payload.kkm !== null ? parseFloat(payload.kkm) : null;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active ? true : false;
    if (payload.parent_subject_id !== undefined) updateData.parent_subject_id = payload.parent_subject_id ? parseInt(payload.parent_subject_id, 10) : null;
    if (payload.jp_allocation_mode !== undefined) updateData.jp_allocation_mode = payload.jp_allocation_mode || 'standalone';
    if (payload.is_elective !== undefined) updateData.is_elective = payload.is_elective ? true : false;
    if (payload.elective_group_name !== undefined) updateData.elective_group_name = payload.elective_group_name ? payload.elective_group_name.trim() : null;

    await db('subjects').where({ id }).update(updateData);

    try {
      await db('subject_audit_logs').insert({
        satuan_pendidikan_id: current.satuan_pendidikan_id,
        subject_id: id,
        action: 'update',
        previous_status: current.is_active,
        new_status: payload.is_active !== undefined ? payload.is_active : current.is_active,
        reason: payload.reason || 'Pembaruan data mata pelajaran',
        user_id: user?.id || null,
        user_name: user?.full_name || user?.name || 'Administrator',
        meta_data: JSON.stringify({
          before: { ...current },
          after: {
            name: payload.name,
            code: payload.code,
            grade_level_id: payload.grade_level_id,
            kkm: payload.kkm,
            is_active: payload.is_active,
            parent_subject_id: payload.parent_subject_id,
            jp_allocation_mode: payload.jp_allocation_mode,
            is_elective: payload.is_elective,
            elective_group_name: payload.elective_group_name
          }
        }),
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    } catch (e) {
      console.error('Audit log error on subject update:', e);
    }

    return db('subjects').where({ id }).first();
  }

  async toggleSubjectStatus(id, payload = {}, user = null) {
    const current = await db('subjects').where({ id }).first();
    if (!current) {
      const error = new Error('Mata pelajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const newStatus = payload.is_active !== undefined ? Boolean(payload.is_active) : !current.is_active;
    const reason = payload.reason?.trim() || (newStatus ? 'Pengaktifan kembali mata pelajaran' : 'Penonaktifan mata pelajaran');

    await db('subjects').where({ id }).update({
      is_active: newStatus,
      updated_at: db.fn.now()
    });

    // Catat ke subject_audit_logs
    await db('subject_audit_logs').insert({
      satuan_pendidikan_id: current.satuan_pendidikan_id,
      subject_id: id,
      action: 'toggle_status',
      previous_status: current.is_active,
      new_status: newStatus,
      reason,
      user_id: user?.id || null,
      user_name: user?.full_name || user?.name || 'Administrator',
      meta_data: JSON.stringify({ subject_name: current.name, subject_code: current.code }),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return {
      success: true,
      data: await db('subjects').where({ id }).first(),
      message: `Mata pelajaran "${current.name}" berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`
    };
  }

  async listSubjectLogs(query = {}) {
    let baseQuery = db('subject_audit_logs')
      .join('subjects', 'subject_audit_logs.subject_id', 'subjects.id')
      .select(
        'subject_audit_logs.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('subject_audit_logs.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.subject_id) {
      baseQuery = baseQuery.where('subject_audit_logs.subject_id', query.subject_id);
    }

    return baseQuery.orderBy('subject_audit_logs.created_at', 'desc').limit(100);
  }

  async deleteSubject(id, user = null, reason = 'Penghapusan mata pelajaran') {
    const current = await db('subjects').where({ id }).first();
    if (!current) {
      const error = new Error('Mata pelajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    try {
      await db('subject_audit_logs').insert({
        satuan_pendidikan_id: current.satuan_pendidikan_id,
        subject_id: id,
        action: 'delete',
        previous_status: current.is_active,
        new_status: null,
        reason,
        user_id: user?.id || null,
        user_name: user?.full_name || user?.name || 'Administrator',
        meta_data: JSON.stringify(current),
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    } catch (e) {
      console.error('Audit log error on subject deletion:', e);
    }

    await db('subjects').where({ id }).del();
    return { success: true, message: 'Mata pelajaran berhasil dihapus' };
  }

  // ==========================================
  // 8. Pembagian Tugas Mengajar & Ekskul (Multi-Teacher & Audit Log)
  // ==========================================
  async listTeachingDuties(query = {}) {
    let baseQuery = db('subject_teacher_assignments')
      .leftJoin('subjects', 'subject_teacher_assignments.subject_id', 'subjects.id')
      .leftJoin('extracurriculars', 'subject_teacher_assignments.extracurricular_id', 'extracurriculars.id')
      .leftJoin('class_groups', 'subject_teacher_assignments.class_group_id', 'class_groups.id')
      .leftJoin('academic_years', 'subject_teacher_assignments.academic_year_id', 'academic_years.id')
      .select(
        'subject_teacher_assignments.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'subjects.grade_level_id as subject_grade_level_id',
        'extracurriculars.name as extracurricular_name',
        'class_groups.name as class_group_name',
        'class_groups.grade_level_id as class_group_grade_level_id',
        'academic_years.name as academic_year_name'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('subject_teacher_assignments.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.academic_year_id) {
      baseQuery = baseQuery.where('subject_teacher_assignments.academic_year_id', query.academic_year_id);
    }
    if (query.class_group_id) {
      baseQuery = baseQuery.where('subject_teacher_assignments.class_group_id', query.class_group_id);
    }
    if (query.type) {
      baseQuery = baseQuery.where('subject_teacher_assignments.type', query.type);
    }

    const rows = await baseQuery.orderBy('subject_teacher_assignments.created_at', 'desc');

    const enriched = [];
    for (const r of rows) {
      let teacher_name = null;
      let teacher_nip = null;
      let teacher_home_school_unit_id = null;
      if (r.teacher_employee_id) {
        try {
          const emp = await employeesService.getEmployeeById(r.teacher_employee_id);
          teacher_name = emp?.full_name || null;
          teacher_nip = emp?.nip || emp?.employee_code || null;
          teacher_home_school_unit_id = emp?.school_unit_id || null;
        } catch (e) {}
      }
      enriched.push({
        ...r,
        teacher_name,
        teacher_nip,
        teacher_home_school_unit_id,
        is_cross_unit: !!(teacher_home_school_unit_id && r.satuan_pendidikan_id && String(teacher_home_school_unit_id) !== String(r.satuan_pendidikan_id))
      });
    }

    return enriched;
  }

  async assignTeacherDuty(payload, user = null) {
    const {
      satuan_pendidikan_id,
      academic_year_id,
      type = 'mapel',
      subject_id,
      extracurricular_id,
      class_group_id,
      class_group_ids,
      teacher_employee_id,
      teachers, // Array opsional untuk 2 guru atau lebih: [ { teacher_employee_id, allocated_hours, role_description } ]
      allocated_hours,
      role_description = 'Guru Pengampu',
      sk_number,
      reason = 'Penetapan tugas mengajar',
      notes
    } = payload;

    if (!satuan_pendidikan_id || !academic_year_id) {
      const error = new Error('Field satuan_pendidikan_id dan academic_year_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (type === 'mapel' && !subject_id) {
      const error = new Error('Pilih mata pelajaran yang akan ditugaskan');
      error.statusCode = 422;
      throw error;
    }

    if (type === 'ekskul' && !extracurricular_id) {
      const error = new Error('Pilih ekstrakurikuler yang akan ditugaskan');
      error.statusCode = 422;
      throw error;
    }

    // Tentukan list class_group_ids
    let targetClassGroupIds = [];
    if (Array.isArray(class_group_ids) && class_group_ids.length > 0) {
      targetClassGroupIds = class_group_ids.map(id => Number(id));
    } else if (class_group_id) {
      targetClassGroupIds = [Number(class_group_id)];
    } else {
      targetClassGroupIds = [null]; // Global / Semua rombel
    }

    // Ambil nama target untuk audit log
    let target_name = '';
    if (type === 'mapel') {
      const s = await db('subjects').where({ id: subject_id }).first();
      target_name = s ? s.name : `Mapel #${subject_id}`;
    } else {
      const ex = await db('extracurriculars').where({ id: extracurricular_id }).first();
      target_name = ex ? ex.name : `Ekskul #${extracurricular_id}`;
    }

    // Tentukan list guru yang akan ditugaskan
    let teacherAssignmentsList = [];
    if (Array.isArray(teachers) && teachers.length > 0) {
      teacherAssignmentsList = teachers.filter(t => t.teacher_employee_id);
    } else if (teacher_employee_id) {
      teacherAssignmentsList = [{
        teacher_employee_id: Number(teacher_employee_id),
        allocated_hours: allocated_hours ? parseInt(allocated_hours, 10) : null,
        role_description: role_description || 'Guru Pengampu'
      }];
    }

    if (teacherAssignmentsList.length === 0) {
      const error = new Error('Pilih minimal 1 guru pengampu yang ditugaskan');
      error.statusCode = 422;
      throw error;
    }

    const isJoinedClass = Boolean(payload.is_joined_class || (targetClassGroupIds.length > 1 && payload.is_joined_class !== false));
    const jointGroupId = isJoinedClass ? (payload.joint_group_id || `JG_${Date.now()}_${subject_id || extracurricular_id}`) : null;

    const createdAssignments = [];

    for (const cgId of targetClassGroupIds) {
      let class_group_name = null;
      if (cgId) {
        const cg = await db('class_groups').where({ id: cgId }).first();
        class_group_name = cg ? cg.name : null;
      }

      // Hapus penugasan lama untuk (Mapel/Ekskul + Rombel) ini agar digantikan dengan alokasi baru (1 atau 2 guru)
      const existingAssignments = await db('subject_teacher_assignments')
        .where({
          academic_year_id,
          type,
          class_group_id: cgId || null
        })
        .where(type === 'mapel' ? { subject_id } : { extracurricular_id });

      await db('subject_teacher_assignments')
        .where({
          academic_year_id,
          type,
          class_group_id: cgId || null
        })
        .where(type === 'mapel' ? { subject_id } : { extracurricular_id })
        .del();

      for (const t of teacherAssignmentsList) {
        let teacher_name = null;
        try {
          const emp = await employeesService.getEmployeeById(t.teacher_employee_id);
          teacher_name = emp?.full_name || `Employee #${t.teacher_employee_id}`;
        } catch (e) {
          teacher_name = `Employee #${t.teacher_employee_id}`;
        }

        const [newId] = await db('subject_teacher_assignments').insert({
          satuan_pendidikan_id,
          academic_year_id,
          type,
          subject_id: type === 'mapel' ? subject_id : null,
          extracurricular_id: type === 'ekskul' ? extracurricular_id : null,
          class_group_id: cgId || null,
          is_joined_class: isJoinedClass,
          joint_group_id: jointGroupId,
          teacher_employee_id: t.teacher_employee_id,
          allocated_hours: t.allocated_hours !== undefined && t.allocated_hours !== null ? parseInt(t.allocated_hours, 10) : null,
          role_description: t.role_description || role_description || 'Guru Pengampu',
          sk_number: sk_number ? sk_number.trim() : null,
          notes: notes ? notes.trim() : null,
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });

        // Catat Riwayat ke Audit Log
        await db('subject_teacher_assignment_logs').insert({
          satuan_pendidikan_id,
          academic_year_id,
          assignment_id: newId,
          action: existingAssignments.length > 0 ? 'perubahan' : 'penambahan',
          type,
          target_id: type === 'mapel' ? subject_id : extracurricular_id,
          target_name,
          class_group_id: cgId || null,
          class_group_name,
          teacher_employee_id: t.teacher_employee_id,
          teacher_name,
          previous_teacher_id: existingAssignments[0]?.teacher_employee_id || null,
          previous_teacher_name: null,
          sk_number: sk_number ? sk_number.trim() : null,
          reason: reason ? reason.trim() : (teacherAssignmentsList.length > 1 ? `Penetapan team teaching / pembagian JP (${t.allocated_hours || ''} JP)` : 'Penetapan tugas guru'),
          created_by: user?.username || user?.full_name || 'Admin',
          created_at: db.fn.now()
        });

        createdAssignments.push(newId);
      }
    }

    return {
      success: true,
      total_assigned: createdAssignments.length,
      assignment_ids: createdAssignments
    };
  }

  async removeTeacherDuty(id, payload = {}, user = null) {
    const assignment = await db('subject_teacher_assignments').where({ id }).first();
    if (!assignment) {
      const error = new Error('Penugasan guru tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const { reason } = payload;
    if (!reason || !reason.trim()) {
      const error = new Error('Keterangan / alasan penghapusan guru wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Ambil info nama target, rombel & guru
    let target_name = '';
    if (assignment.type === 'mapel') {
      const s = await db('subjects').where({ id: assignment.subject_id }).first();
      target_name = s ? s.name : `Mapel #${assignment.subject_id}`;
    } else {
      const ex = await db('extracurriculars').where({ id: assignment.extracurricular_id }).first();
      target_name = ex ? ex.name : `Ekskul #${assignment.extracurricular_id}`;
    }

    let class_group_name = null;
    if (assignment.class_group_id) {
      const cg = await db('class_groups').where({ id: assignment.class_group_id }).first();
      class_group_name = cg ? cg.name : null;
    }

    let teacher_name = null;
    try {
      const emp = await employeesService.getEmployeeById(assignment.teacher_employee_id);
      teacher_name = emp?.full_name || `Employee #${assignment.teacher_employee_id}`;
    } catch (e) {
      teacher_name = `Employee #${assignment.teacher_employee_id}`;
    }

    // Catat Riwayat Penghapusan ke Audit Log
    await db('subject_teacher_assignment_logs').insert({
      satuan_pendidikan_id: assignment.satuan_pendidikan_id,
      academic_year_id: assignment.academic_year_id,
      assignment_id: id,
      action: 'penghapusan',
      type: assignment.type,
      target_id: assignment.type === 'mapel' ? assignment.subject_id : assignment.extracurricular_id,
      target_name,
      class_group_id: assignment.class_group_id || null,
      class_group_name,
      teacher_employee_id: assignment.teacher_employee_id,
      teacher_name,
      reason: reason.trim(),
      created_by: user?.username || user?.full_name || 'Admin',
      created_at: db.fn.now()
    });

    await db('subject_teacher_assignments').where({ id }).del();
    return { success: true, message: 'Penugasan guru berhasil dihapus dan dicatat dalam riwayat' };
  }

  async listTeachingDutyLogs(query = {}) {
    let baseQuery = db('subject_teacher_assignment_logs')
      .leftJoin('academic_years', 'subject_teacher_assignment_logs.academic_year_id', 'academic_years.id')
      .select(
        'subject_teacher_assignment_logs.*',
        'academic_years.name as academic_year_name'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('subject_teacher_assignment_logs.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.academic_year_id) {
      baseQuery = baseQuery.where('subject_teacher_assignment_logs.academic_year_id', query.academic_year_id);
    }
    if (query.type) {
      baseQuery = baseQuery.where('subject_teacher_assignment_logs.type', query.type);
    }

    return baseQuery.orderBy('subject_teacher_assignment_logs.created_at', 'desc');
  }

  // ==========================================
  // 9. Opsi / Preset Jadwal & Jadwal Pelajaran (Subject Schedules, Presets, Anti-Bentrok & Audit Logs)
  // ==========================================
  async listSchedulePresets(query = {}) {
    const { satuan_pendidikan_id, academic_year_id } = query;
    let baseQuery = db('subject_schedule_presets')
      .leftJoin('academic_years', 'subject_schedule_presets.academic_year_id', 'academic_years.id')
      .select(
        'subject_schedule_presets.*',
        'academic_years.name as academic_year_name'
      );

    if (satuan_pendidikan_id) {
      baseQuery = baseQuery.where('subject_schedule_presets.satuan_pendidikan_id', satuan_pendidikan_id);
    }
    if (academic_year_id) {
      baseQuery = baseQuery.where('subject_schedule_presets.academic_year_id', academic_year_id);
    }

    let presets = await baseQuery.orderBy([
      { column: 'subject_schedule_presets.is_active', order: 'desc' },
      { column: 'subject_schedule_presets.id', order: 'asc' }
    ]);

    // Jika belum ada preset sama sekali untuk satuan pendidikan & TA ini, auto-inisialisasi default preset
    if (presets.length === 0 && satuan_pendidikan_id && academic_year_id) {
      const [newPresetId] = await db('subject_schedule_presets').insert({
        satuan_pendidikan_id,
        academic_year_id,
        name: 'Jadwal Reguler Utama',
        code: 'REGULER-1',
        description: 'Preset jadwal reguler standar sekolah',
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      // Hubungkan jadwal orphan yang belum memiliki preset_id
      await db('subject_schedules')
        .where({ satuan_pendidikan_id, academic_year_id })
        .whereNull('preset_id')
        .update({ preset_id: newPresetId });

      const created = await db('subject_schedule_presets').where({ id: newPresetId }).first();
      presets = [created];
    }

    // Hitung jumlah item jadwal di masing-masing preset
    const presetIds = presets.map(p => p.id);
    const countMap = {};
    if (presetIds.length > 0) {
      const counts = await db('subject_schedules')
        .whereIn('preset_id', presetIds)
        .groupBy('preset_id')
        .select('preset_id', db.raw('count(id) as total'));

      counts.forEach(c => {
        countMap[c.preset_id] = parseInt(c.total, 10);
      });
    }

    return presets.map(p => ({
      ...p,
      schedules_count: countMap[p.id] || 0
    }));
  }

  async createSchedulePreset(payload, user = null) {
    const {
      satuan_pendidikan_id,
      academic_year_id,
      name,
      code,
      description,
      is_active = false,
      effective_start_date,
      effective_end_date,
      copy_from_preset_id,
      reason = 'Penambahan opsi jadwal baru'
    } = payload;

    if (!satuan_pendidikan_id || !academic_year_id || !name) {
      const error = new Error('Field satuan_pendidikan_id, academic_year_id, dan nama opsi jadwal wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Cek apakah ini preset pertama untuk TA & unit ini
    const existingCount = await db('subject_schedule_presets')
      .where({ satuan_pendidikan_id, academic_year_id })
      .count('id as total')
      .first();

    const shouldBeActive = is_active || parseInt(existingCount.total, 10) === 0;

    if (shouldBeActive) {
      await db('subject_schedule_presets')
        .where({ satuan_pendidikan_id, academic_year_id })
        .update({ is_active: false });
    }

    const [presetId] = await db('subject_schedule_presets').insert({
      satuan_pendidikan_id,
      academic_year_id,
      name: name.trim(),
      code: code ? code.trim() : null,
      description: description || null,
      is_active: shouldBeActive,
      effective_start_date: effective_start_date || null,
      effective_end_date: effective_end_date || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Jika copy_from_preset_id diberikan, duplikasi seluruh jadwal, relasinya, dan struktur waktu (time slots)
    let copiedCount = 0;
    if (copy_from_preset_id) {
      // 1. Duplikasi Struktur Waktu (Time Slots)
      const sourceTimeSlots = await db('timetable_time_slots')
        .where({ preset_id: copy_from_preset_id })
        .select('*');

      for (const slot of sourceTimeSlots) {
        await db('timetable_time_slots').insert({
          satuan_pendidikan_id,
          academic_year_id,
          preset_id: presetId,
          day_of_week: slot.day_of_week,
          period_index: slot.period_index,
          start_time: slot.start_time,
          end_time: slot.end_time,
          type: slot.type,
          label: slot.label,
          color: slot.color || null,
          is_generator_usable: slot.is_generator_usable,
          is_visible: slot.is_visible,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }

      // 2. Duplikasi Sesi Jadwal (Subject Schedules)
      const sourceSchedules = await db('subject_schedules')
        .where({ preset_id: copy_from_preset_id })
        .select('*');

      for (const src of sourceSchedules) {
        const [newSchId] = await db('subject_schedules').insert({
          satuan_pendidikan_id,
          academic_year_id,
          preset_id: presetId,
          schedule_type: src.schedule_type,
          subject_id: src.subject_id,
          extracurricular_id: src.extracurricular_id,
          teacher_employee_id: src.teacher_employee_id,
          day_of_week: src.day_of_week,
          start_time: src.start_time,
          end_time: src.end_time,
          period_label: src.period_label,
          room_name: src.room_name,
          is_combined_class: src.is_combined_class,
          is_active: src.is_active,
          notes: src.notes,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });

        const sourceRels = await db('subject_schedule_class_groups')
          .where({ schedule_id: src.id })
          .select('class_group_id');

        if (sourceRels.length > 0) {
          const newRels = sourceRels.map(r => ({
            schedule_id: newSchId,
            class_group_id: r.class_group_id
          }));
          await db('subject_schedule_class_groups').insert(newRels);
        }
        copiedCount++;
      }
    }

    // Catat Audit Log
    const userName = user?.full_name || user?.username || 'Admin Kurikulum';
    await db('subject_schedule_logs').insert({
      satuan_pendidikan_id,
      academic_year_id,
      preset_id: presetId,
      preset_name: name,
      action: copy_from_preset_id ? 'duplikasi_preset' : 'tambah_preset',
      reason,
      changes_summary: copy_from_preset_id
        ? `Membuat opsi jadwal baru "${name}" dan menduplikasi ${copiedCount} item jadwal dari preset sumber.`
        : `Membuat opsi jadwal baru "${name}" (${shouldBeActive ? 'Langsung Diberlakukan Aktif' : 'Status Nonaktif'}).`,
      created_by: userName,
      created_at: db.fn.now()
    });

    return db('subject_schedule_presets').where({ id: presetId }).first();
  }

  async activateSchedulePreset(id, payload = {}, user = null) {
    const preset = await db('subject_schedule_presets').where({ id }).first();
    if (!preset) {
      const error = new Error('Opsi jadwal tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const { reason = 'Pemberlakuan / pengaktifan opsi jadwal' } = payload;
    if (!reason || !reason.trim()) {
      const error = new Error('Alasan pengaktifan opsi jadwal wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Nonaktifkan semua preset lain di satuan pendidikan & tahun ajaran yang sama
    await db('subject_schedule_presets')
      .where({
        satuan_pendidikan_id: preset.satuan_pendidikan_id,
        academic_year_id: preset.academic_year_id
      })
      .update({ is_active: false });

    // Aktifkan preset terpilih
    await db('subject_schedule_presets')
      .where({ id })
      .update({
        is_active: true,
        updated_at: db.fn.now()
      });

    // Catat Audit Log
    const userName = user?.full_name || user?.username || 'Admin Kurikulum';
    await db('subject_schedule_logs').insert({
      satuan_pendidikan_id: preset.satuan_pendidikan_id,
      academic_year_id: preset.academic_year_id,
      preset_id: preset.id,
      preset_name: preset.name,
      action: 'aktivasi_preset',
      reason: reason.trim(),
      changes_summary: `Mengaktifkan opsi jadwal "${preset.name}" sebagai jadwal resmi yang diberlakukan di sekolah.`,
      created_by: userName,
      created_at: db.fn.now()
    });

    return db('subject_schedule_presets').where({ id }).first();
  }

  async updateSchedulePreset(id, payload = {}, user = null) {
    const current = await db('subject_schedule_presets').where({ id }).first();
    if (!current) {
      const error = new Error('Opsi jadwal tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const { name, code, description, effective_start_date, effective_end_date, reason } = payload;
    const updateData = { updated_at: db.fn.now() };
    if (name) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code ? code.trim() : null;
    if (description !== undefined) updateData.description = description;
    if (effective_start_date !== undefined) updateData.effective_start_date = effective_start_date || null;
    if (effective_end_date !== undefined) updateData.effective_end_date = effective_end_date || null;

    await db('subject_schedule_presets').where({ id }).update(updateData);

    if (reason) {
      const userName = user?.full_name || user?.username || 'Admin Kurikulum';
      await db('subject_schedule_logs').insert({
        satuan_pendidikan_id: current.satuan_pendidikan_id,
        academic_year_id: current.academic_year_id,
        preset_id: current.id,
        preset_name: name || current.name,
        action: 'ubah_preset',
        reason: reason.trim(),
        changes_summary: `Memperbarui konfigurasi opsi jadwal "${name || current.name}".`,
        created_by: userName,
        created_at: db.fn.now()
      });
    }

    return db('subject_schedule_presets').where({ id }).first();
  }

  async deleteSchedulePreset(id, payload = {}, user = null) {
    const current = await db('subject_schedule_presets').where({ id }).first();
    if (!current) {
      const error = new Error('Opsi jadwal tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Cek apakah ada opsi jadwal lain di TA & satuan pendidikan yang sama
    const totalPresets = await db('subject_schedule_presets')
      .where({
        satuan_pendidikan_id: current.satuan_pendidikan_id,
        academic_year_id: current.academic_year_id
      })
      .count('id as total')
      .first();

    if (parseInt(totalPresets.total, 10) <= 1) {
      const error = new Error('Tidak dapat menghapus satu-satunya opsi jadwal pada tahun ajaran ini.');
      error.statusCode = 422;
      throw error;
    }

    if (current.is_active) {
      const error = new Error('Tidak dapat menghapus opsi jadwal yang sedang aktif/diberlakukan. Silakan aktifkan opsi jadwal lain terlebih dahulu.');
      error.statusCode = 422;
      throw error;
    }

    const { reason = 'Penghapusan opsi jadwal' } = payload;

    // Catat log sebelum hapus
    const userName = user?.full_name || user?.username || 'Admin Kurikulum';
    await db('subject_schedule_logs').insert({
      satuan_pendidikan_id: current.satuan_pendidikan_id,
      academic_year_id: current.academic_year_id,
      preset_id: current.id,
      preset_name: current.name,
      action: 'hapus_preset',
      reason: reason.trim(),
      changes_summary: `Menghapus opsi jadwal "${current.name}".`,
      created_by: userName,
      created_at: db.fn.now()
    });

    await db('subject_schedule_presets').where({ id }).del();
    return { success: true, message: `Opsi jadwal "${current.name}" berhasil dihapus` };
  }

  async listScheduleLogs(query = {}) {
    let baseQuery = db('subject_schedule_logs');

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.academic_year_id) {
      baseQuery = baseQuery.where('academic_year_id', query.academic_year_id);
    }
    if (query.preset_id) {
      baseQuery = baseQuery.where('preset_id', query.preset_id);
    }
    if (query.schedule_id) {
      baseQuery = baseQuery.where('schedule_id', query.schedule_id);
    }
    if (query.action) {
      baseQuery = baseQuery.where('action', query.action);
    }

    return baseQuery.orderBy('created_at', 'desc').limit(query.limit || 150);
  }

  async listSchedules(query = {}) {
    // Pastikan preset tersedia untuk satuan pendidikan dan tahun ajaran
    let activePreset = null;
    let presets = [];
    if (query.satuan_pendidikan_id && query.academic_year_id) {
      presets = await this.listSchedulePresets({
        satuan_pendidikan_id: query.satuan_pendidikan_id,
        academic_year_id: query.academic_year_id
      });
      activePreset = presets.find(p => p.is_active) || presets[0] || null;
    }

    let targetPresetId = query.preset_id || (query.satuan_pendidikan_id && activePreset ? activePreset.id : undefined);

    let baseQuery = db('subject_schedules')
      .leftJoin('subjects', 'subject_schedules.subject_id', 'subjects.id')
      .leftJoin('extracurriculars', 'subject_schedules.extracurricular_id', 'extracurriculars.id')
      .leftJoin('academic_years', 'subject_schedules.academic_year_id', 'academic_years.id')
      .leftJoin('subject_schedule_presets', 'subject_schedules.preset_id', 'subject_schedule_presets.id')
      .select(
        'subject_schedules.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'extracurriculars.name as extracurricular_name',
        'academic_years.name as academic_year_name',
        'subject_schedule_presets.name as preset_name',
        'subject_schedule_presets.is_active as preset_is_active'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('subject_schedules.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }

    if (query.academic_year_id) {
      if (!query.satuan_pendidikan_id) {
        // Mode Semua Unit: Cari seluruh ID tahun ajaran dengan nama yang sama (misal 2026/2027)
        const refYear = await db('academic_years').where({ id: query.academic_year_id }).first();
        let matchingYearIds = [query.academic_year_id];
        if (refYear && refYear.name) {
          const matchingYears = await db('academic_years').where({ name: refYear.name });
          matchingYearIds = matchingYears.map(y => y.id);
          baseQuery = baseQuery.whereIn('subject_schedules.academic_year_id', matchingYearIds);
        } else {
          baseQuery = baseQuery.where('subject_schedules.academic_year_id', query.academic_year_id);
        }

        // Jika preset_id tidak ditentukan secara eksplisit di mode Semua Unit,
        // ambil HANYA jadwal dari preset aktif di masing-masing unit/tahun ajaran
        if (!targetPresetId) {
          const activePresets = await db('subject_schedule_presets')
            .whereIn('academic_year_id', matchingYearIds)
            .where('is_active', 1);
          const activePresetIds = activePresets.map(p => p.id);
          if (activePresetIds.length > 0) {
            baseQuery = baseQuery.whereIn('subject_schedules.preset_id', activePresetIds);
          }
        }
      } else {
        baseQuery = baseQuery.where('subject_schedules.academic_year_id', query.academic_year_id);
      }
    }

    if (targetPresetId) {
      baseQuery = baseQuery.where('subject_schedules.preset_id', targetPresetId);
    }
    if (query.day_of_week) {
      baseQuery = baseQuery.where('subject_schedules.day_of_week', query.day_of_week);
    }
    if (query.schedule_type) {
      baseQuery = baseQuery.where('subject_schedules.schedule_type', query.schedule_type);
    }

    let rows = await baseQuery.orderBy([
      { column: 'subject_schedules.day_of_week', order: 'asc' },
      { column: 'subject_schedules.start_time', order: 'asc' }
    ]);

    // Ambil rombel yang berelasi untuk setiap schedule
    const scheduleIds = rows.map(r => r.id);
    let classGroupMap = {};
    if (scheduleIds.length > 0) {
      const relRows = await db('subject_schedule_class_groups')
        .join('class_groups', 'subject_schedule_class_groups.class_group_id', 'class_groups.id')
        .whereIn('subject_schedule_class_groups.schedule_id', scheduleIds)
        .select(
          'subject_schedule_class_groups.schedule_id',
          'class_groups.id as class_group_id',
          'class_groups.name as class_group_name',
          'class_groups.type as class_group_type'
        );

      relRows.forEach(rel => {
        if (!classGroupMap[rel.schedule_id]) classGroupMap[rel.schedule_id] = [];
        classGroupMap[rel.schedule_id].push({
          id: rel.class_group_id,
          name: rel.class_group_name,
          type: rel.class_group_type
        });
      });
    }

    // Filter per class_group_id jika diminta di query
    if (query.class_group_id) {
      const targetCgId = Number(query.class_group_id);
      rows = rows.filter(r => {
        const cgs = classGroupMap[r.id] || [];
        return cgs.some(cg => cg.id === targetCgId);
      });
    }

    const enriched = [];
    for (const r of rows) {
      let teacher_name = null;
      let teacher_nip = null;
      if (r.teacher_employee_id) {
        try {
          const emp = await employeesService.getEmployeeById(r.teacher_employee_id);
          teacher_name = emp?.full_name || null;
          teacher_nip = emp?.nip || emp?.employee_code || null;
        } catch (e) {}
      }

      const assigned_classes = classGroupMap[r.id] || [];
      const class_group_names = assigned_classes.map(c => c.name).join(', ');

      enriched.push({
        ...r,
        teacher_name,
        teacher_nip,
        class_groups: assigned_classes,
        class_group_names: class_group_names || '-'
      });
    }

    // Hitung status pelajaran aktif vs tidak aktif untuk tahun ajaran ini
    let subjectsStatus = [];
    if (query.satuan_pendidikan_id) {
      const allSubjects = await db('subjects')
        .where('satuan_pendidikan_id', query.satuan_pendidikan_id)
        .select('id', 'name', 'code', 'kkm');

      const allExtras = await db('extracurriculars')
        .where((q) => {
          q.where('satuan_pendidikan_id', query.satuan_pendidikan_id).orWhereNull('satuan_pendidikan_id');
        })
        .select('id', 'name');

      const scheduledSubjectIds = new Set(
        enriched.filter(e => e.schedule_type === 'mapel' && e.is_active).map(e => e.subject_id)
      );
      const scheduledExtraIds = new Set(
        enriched.filter(e => e.schedule_type === 'ekskul' && e.is_active).map(e => e.extracurricular_id)
      );

      allSubjects.forEach(s => {
        const totalSchedules = enriched.filter(e => e.schedule_type === 'mapel' && e.subject_id === s.id && e.is_active).length;
        subjectsStatus.push({
          id: s.id,
          name: s.name,
          code: s.code,
          type: 'mapel',
          is_active: scheduledSubjectIds.has(s.id),
          total_schedules: totalSchedules
        });
      });

      allExtras.forEach(ex => {
        const totalSchedules = enriched.filter(e => e.schedule_type === 'ekskul' && e.extracurricular_id === ex.id && e.is_active).length;
        subjectsStatus.push({
          id: ex.id,
          name: ex.name,
          code: 'EKSKUL',
          type: 'ekskul',
          is_active: scheduledExtraIds.has(ex.id),
          total_schedules: totalSchedules
        });
      });
    }

    return {
      schedules: enriched,
      subjects_status: subjectsStatus,
      active_preset: activePreset,
      presets: presets
    };
  }

  async checkScheduleConflicts({ preset_id = null, academic_year_id, day_of_week, start_time, end_time, teacher_employee_id, class_group_ids, exclude_id = null }) {
    const dayNames = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu' };
    const dayName = dayNames[day_of_week] || `Hari #${day_of_week}`;

    // Cari seluruh academic_year_id yang setara (misal '2026/2027' pada SMP dan SMA) agar validasi guru berlaku lintas satuan pendidikan
    let targetYearIds = [academic_year_id];
    if (academic_year_id) {
      const curYear = await db('academic_years').where({ id: academic_year_id }).first();
      if (curYear && curYear.name) {
        const matchedYears = await db('academic_years').where({ name: curYear.name });
        targetYearIds = matchedYears.map(y => y.id);
      }
    }

    // 1. Cek Bentrok Guru Pengampu (Berlaku Lintas Seluruh Satuan Pendidikan dalam Tahun Ajaran yang Sama)
    if (teacher_employee_id) {
      // Ambil preset aktif untuk seluruh targetYearIds agar tidak memvalidasi terhadap preset non-aktif
      const activePresets = await db('subject_schedule_presets')
        .whereIn('academic_year_id', targetYearIds)
        .where('is_active', 1);
      const activePresetIds = activePresets.map(p => p.id);
      if (preset_id) {
        activePresetIds.push(preset_id);
      }

      let query = db('subject_schedules')
        .leftJoin('subjects', 'subject_schedules.subject_id', 'subjects.id')
        .leftJoin('extracurriculars', 'subject_schedules.extracurricular_id', 'extracurriculars.id')
        .whereIn('subject_schedules.academic_year_id', targetYearIds)
        .where('subject_schedules.day_of_week', day_of_week)
        .where('subject_schedules.teacher_employee_id', teacher_employee_id)
        .where('subject_schedules.is_active', true)
        .where((builder) => {
          builder.where('subject_schedules.start_time', '<', end_time)
                 .andWhere('subject_schedules.end_time', '>', start_time);
        })
        .select(
          'subject_schedules.*',
          'subjects.name as subject_name',
          'extracurriculars.name as extra_name'
        );

      if (activePresetIds.length > 0) {
        query = query.whereIn('subject_schedules.preset_id', Array.from(new Set(activePresetIds)));
      }

      if (exclude_id) {
        query = query.whereNot('subject_schedules.id', exclude_id);
      }

      const teacherConflict = await query.first();
      if (teacherConflict) {
        let empName = 'Guru terpilih';
        try {
          const emp = await employeesService.getEmployeeById(teacher_employee_id);
          empName = emp?.full_name || empName;
        } catch (e) {}

        // Ambil nama rombel dan satuan pendidikan tempat guru tersebut sudah terjadwal
        const conflictClasses = await db('subject_schedule_class_groups')
          .join('class_groups', 'subject_schedule_class_groups.class_group_id', 'class_groups.id')
          .where('subject_schedule_class_groups.schedule_id', teacherConflict.id)
          .select('class_groups.name');
        const conflictClassNames = conflictClasses.map(c => c.name).join(', ') || 'Rombel Lain';

        const collName = teacherConflict.subject_name || teacherConflict.extra_name || 'kegiatan KBM';
        const error = new Error(`Jadwal BENTROK GURU: ${empName} sudah memiliki jadwal ${collName} di rombel ${conflictClassNames} pada hari ${dayName} jam ${teacherConflict.start_time} - ${teacherConflict.end_time}.`);
        error.statusCode = 409;
        throw error;
      }
    }

    // 2. Cek Bentrok Rombongan Belajar (Class Groups)
    if (class_group_ids && class_group_ids.length > 0) {
      let query = db('subject_schedule_class_groups')
        .join('subject_schedules', 'subject_schedule_class_groups.schedule_id', 'subject_schedules.id')
        .join('class_groups', 'subject_schedule_class_groups.class_group_id', 'class_groups.id')
        .leftJoin('subjects', 'subject_schedules.subject_id', 'subjects.id')
        .leftJoin('extracurriculars', 'subject_schedules.extracurricular_id', 'extracurriculars.id')
        .where('subject_schedules.academic_year_id', academic_year_id)
        .where('subject_schedules.day_of_week', day_of_week)
        .where('subject_schedules.is_active', true)
        .whereIn('subject_schedule_class_groups.class_group_id', class_group_ids)
        .where((builder) => {
          builder.where('subject_schedules.start_time', '<', end_time)
                 .andWhere('subject_schedules.end_time', '>', start_time);
        })
        .select(
          'subject_schedules.*',
          'class_groups.name as class_group_name',
          'subjects.name as subject_name',
          'extracurriculars.name as extra_name'
        );

      if (preset_id) {
        query = query.where('subject_schedules.preset_id', preset_id);
      } else {
        const activePresets = await db('subject_schedule_presets')
          .where('academic_year_id', academic_year_id)
          .where('is_active', 1);
        const activePresetIds = activePresets.map(p => p.id);
        if (activePresetIds.length > 0) {
          query = query.whereIn('subject_schedules.preset_id', activePresetIds);
        }
      }
      if (exclude_id) {
        query = query.whereNot('subject_schedules.id', exclude_id);
      }

      const classConflict = await query.first();
      if (classConflict) {
        const collName = classConflict.subject_name || classConflict.extra_name || 'kegiatan lain';
        const error = new Error(`Jadwal BENTROK KELAS: Rombel ${classConflict.class_group_name} sudah memiliki jadwal ${collName} pada hari ${dayName} jam ${classConflict.start_time} - ${classConflict.end_time}`);
        error.statusCode = 409;
        throw error;
      }
    }
  }

  async createSchedule(payload, user = null) {
    const {
      satuan_pendidikan_id,
      academic_year_id,
      preset_id,
      schedule_type = 'mapel',
      subject_id,
      extracurricular_id,
      teacher_employee_id,
      day_of_week,
      start_time,
      end_time,
      period_label,
      room_name,
      class_group_ids = [],
      is_combined_class = false,
      notes,
      reason = 'Penambahan jadwal baru'
    } = payload;

    if (!satuan_pendidikan_id || !academic_year_id || !day_of_week || !start_time || !end_time) {
      const error = new Error('Field satuan_pendidikan_id, academic_year_id, day_of_week, start_time, dan end_time wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (!class_group_ids || class_group_ids.length === 0) {
      const error = new Error('Pilih minimal 1 rombongan belajar untuk jadwal ini');
      error.statusCode = 422;
      throw error;
    }

    if (schedule_type === 'mapel' && !subject_id) {
      const error = new Error('Mata pelajaran wajib dipilih untuk jadwal mapel');
      error.statusCode = 422;
      throw error;
    }

    if (schedule_type === 'ekskul' && !extracurricular_id) {
      const error = new Error('Ekstrakurikuler wajib dipilih untuk jadwal ekskul');
      error.statusCode = 422;
      throw error;
    }

    // Tentukan target preset_id
    let targetPresetId = preset_id;
    if (!targetPresetId) {
      const activePreset = await db('subject_schedule_presets')
        .where({ satuan_pendidikan_id, academic_year_id, is_active: true })
        .first();
      if (activePreset) {
        targetPresetId = activePreset.id;
      } else {
        const presets = await this.listSchedulePresets({ satuan_pendidikan_id, academic_year_id });
        targetPresetId = presets[0]?.id;
      }
    }

    // Deteksi Mode Rombel Gabungan Otomatis:
    // Jika guru dan mapel yang sama sudah terjadwal di jam & hari yang sama, dan pengguna bermaksud
    // menggabungkan rombel (misal rombel 9-A dan 10-A), leburkan/perbarui sesi eksisting menjadi rombel gabungan.
    if (teacher_employee_id) {
      let targetYearIds = [academic_year_id];
      const curYear = await db('academic_years').where({ id: academic_year_id }).first();
      if (curYear && curYear.name) {
        const matchedYears = await db('academic_years').where({ name: curYear.name });
        targetYearIds = matchedYears.map(y => y.id);
      }

      const activePresets = await db('subject_schedule_presets')
        .whereIn('academic_year_id', targetYearIds)
        .where('is_active', 1);
      const activePresetIds = activePresets.map(p => p.id);
      if (targetPresetId) activePresetIds.push(targetPresetId);

      let matchingSubjectIds = subject_id ? [subject_id] : [];
      if (schedule_type === 'mapel' && subject_id) {
        const curSub = await db('subjects').where({ id: subject_id }).first();
        if (curSub) {
          const sameSubs = await db('subjects')
            .where((q) => {
              if (curSub.name) q.where('name', curSub.name);
              if (curSub.code) q.orWhere('code', curSub.code);
            });
          matchingSubjectIds = sameSubs.map(s => s.id);
        }
      }

      const existingSameSession = await db('subject_schedules')
        .whereIn('academic_year_id', targetYearIds)
        .whereIn('preset_id', Array.from(new Set(activePresetIds)))
        .where('day_of_week', parseInt(day_of_week, 10))
        .where('teacher_employee_id', teacher_employee_id)
        .where('is_active', true)
        .where((builder) => {
          builder.where('start_time', '<', end_time.trim())
                 .andWhere('end_time', '>', start_time.trim());
        })
        .where((builder) => {
          if (schedule_type === 'mapel' && matchingSubjectIds.length > 0) {
            builder.whereIn('subject_id', matchingSubjectIds);
          } else if (schedule_type === 'ekskul' && extracurricular_id) {
            builder.where('extracurricular_id', extracurricular_id);
          }
        })
        .first();

      if (existingSameSession) {
        // Ambil rombel eksis dari sesi tersebut
        const existingRels = await db('subject_schedule_class_groups')
          .where('schedule_id', existingSameSession.id)
          .select('class_group_id');
        const existingCgIds = existingRels.map(r => r.class_group_id);

        const hasOverlapOrCombinedIntent = class_group_ids.some(cid => existingCgIds.includes(cid)) ||
                                           Boolean(is_combined_class) ||
                                           class_group_ids.length > 1;

        if (hasOverlapOrCombinedIntent) {
          const mergedCgIds = Array.from(new Set([...existingCgIds, ...class_group_ids]));
          return await this.updateSchedule(existingSameSession.id, {
            ...payload,
            class_group_ids: mergedCgIds,
            is_combined_class: true,
            reason: reason || 'Penggabungan Rombel (Kelas Gabungan)'
          }, user);
        }
      }
    }

    // Jalankan validasi anti-bentrok
    await this.checkScheduleConflicts({
      preset_id: targetPresetId,
      academic_year_id,
      day_of_week,
      start_time,
      end_time,
      teacher_employee_id,
      class_group_ids
    });

    const isCombined = class_group_ids.length > 1 || !!is_combined_class;

    const [scheduleId] = await db('subject_schedules').insert({
      satuan_pendidikan_id,
      academic_year_id,
      preset_id: targetPresetId,
      schedule_type,
      subject_id: schedule_type === 'mapel' ? subject_id : null,
      extracurricular_id: schedule_type === 'ekskul' ? extracurricular_id : null,
      teacher_employee_id: teacher_employee_id || null,
      day_of_week: parseInt(day_of_week, 10),
      start_time: start_time.trim(),
      end_time: end_time.trim(),
      period_label: period_label || null,
      room_name: room_name || null,
      is_combined_class: isCombined,
      is_active: true,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Masukkan relasi class_groups (mendukung rombel gabungan)
    const relInserts = class_group_ids.map(cgId => ({
      schedule_id: scheduleId,
      class_group_id: cgId
    }));

    await db('subject_schedule_class_groups').insert(relInserts);

    // Ambil info nama untuk dicatat ke audit log
    let targetName = '';
    if (schedule_type === 'mapel') {
      const s = await db('subjects').where({ id: subject_id }).first();
      targetName = s ? s.name : `Mapel #${subject_id}`;
    } else {
      const ex = await db('extracurriculars').where({ id: extracurricular_id }).first();
      targetName = ex ? ex.name : `Ekskul #${extracurricular_id}`;
    }

    let teacherName = 'Belum ditentukan';
    if (teacher_employee_id) {
      try {
        const emp = await employeesService.getEmployeeById(teacher_employee_id);
        teacherName = emp?.full_name || `Guru #${teacher_employee_id}`;
      } catch (e) {}
    }

    const cgs = await db('class_groups').whereIn('id', class_group_ids).select('name');
    const cgNames = cgs.map(c => c.name).join(', ');

    const dayNames = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu' };
    const dayName = dayNames[day_of_week] || `Hari #${day_of_week}`;

    const presetObj = targetPresetId ? await db('subject_schedule_presets').where({ id: targetPresetId }).first() : null;
    const userName = user?.full_name || user?.username || 'Admin Kurikulum';

    await db('subject_schedule_logs').insert({
      satuan_pendidikan_id,
      academic_year_id,
      preset_id: targetPresetId,
      preset_name: presetObj?.name || 'Jadwal Reguler',
      schedule_id: scheduleId,
      action: 'tambah_jadwal',
      schedule_type,
      subject_or_extra_name: targetName,
      teacher_name: teacherName,
      class_group_names: cgNames,
      day_name: dayName,
      time_range: `${start_time} - ${end_time}`,
      reason: reason ? reason.trim() : 'Penambahan jadwal baru',
      changes_summary: `Menambahkan jadwal ${schedule_type.toUpperCase()} ${targetName} di kelas ${cgNames} (${dayName}, ${start_time}-${end_time}, Guru: ${teacherName}, Ruang: ${room_name || 'Kelas'}).`,
      created_by: userName,
      created_at: db.fn.now()
    });

    return db('subject_schedules').where({ id: scheduleId }).first();
  }

  async updateSchedule(id, payload, user = null) {
    const current = await db('subject_schedules').where({ id }).first();
    if (!current) {
      const error = new Error('Jadwal pelajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const {
      academic_year_id = current.academic_year_id,
      preset_id = current.preset_id,
      schedule_type = current.schedule_type,
      subject_id,
      extracurricular_id,
      teacher_employee_id,
      day_of_week = current.day_of_week,
      start_time = current.start_time,
      end_time = current.end_time,
      period_label,
      room_name,
      class_group_ids,
      is_combined_class,
      notes,
      reason = 'Penyesuaian jadwal pelajaran'
    } = payload;

    if (!reason || !reason.trim()) {
      const error = new Error('Alasan perubahan jadwal wajib diisi untuk pencatatan riwayat');
      error.statusCode = 422;
      throw error;
    }

    // Ambil existing class groups jika tidak disediakan di payload
    let targetClassGroupIds = class_group_ids;
    if (!targetClassGroupIds) {
      const existingRels = await db('subject_schedule_class_groups').where({ schedule_id: id }).select('class_group_id');
      targetClassGroupIds = existingRels.map(r => r.class_group_id);
    }

    // Jalankan validasi anti-bentrok
    await this.checkScheduleConflicts({
      preset_id,
      academic_year_id,
      day_of_week,
      start_time,
      end_time,
      teacher_employee_id: teacher_employee_id !== undefined ? teacher_employee_id : current.teacher_employee_id,
      class_group_ids: targetClassGroupIds,
      exclude_id: id
    });

    const isCombined = targetClassGroupIds.length > 1 || (is_combined_class !== undefined ? is_combined_class : current.is_combined_class);

    const updateData = {
      updated_at: db.fn.now(),
      schedule_type,
      day_of_week: parseInt(day_of_week, 10),
      start_time: start_time.trim(),
      end_time: end_time.trim(),
      is_combined_class: isCombined
    };

    if (payload.preset_id !== undefined) updateData.preset_id = preset_id;
    if (payload.subject_id !== undefined) updateData.subject_id = schedule_type === 'mapel' ? subject_id : null;
    if (payload.extracurricular_id !== undefined) updateData.extracurricular_id = schedule_type === 'ekskul' ? extracurricular_id : null;
    if (payload.teacher_employee_id !== undefined) updateData.teacher_employee_id = teacher_employee_id || null;
    if (payload.period_label !== undefined) updateData.period_label = period_label || null;
    if (payload.room_name !== undefined) updateData.room_name = room_name || null;
    if (payload.notes !== undefined) updateData.notes = notes || null;

    await db('subject_schedules').where({ id }).update(updateData);

    if (class_group_ids && class_group_ids.length > 0) {
      await db('subject_schedule_class_groups').where({ schedule_id: id }).del();
      const relInserts = class_group_ids.map(cgId => ({
        schedule_id: id,
        class_group_id: cgId
      }));
      await db('subject_schedule_class_groups').insert(relInserts);
    }

    // Ambil info untuk log
    let targetName = '';
    const finalSubId = payload.subject_id !== undefined ? subject_id : current.subject_id;
    const finalExtraId = payload.extracurricular_id !== undefined ? extracurricular_id : current.extracurricular_id;
    if (schedule_type === 'mapel' && finalSubId) {
      const s = await db('subjects').where({ id: finalSubId }).first();
      targetName = s ? s.name : `Mapel #${finalSubId}`;
    } else if (finalExtraId) {
      const ex = await db('extracurriculars').where({ id: finalExtraId }).first();
      targetName = ex ? ex.name : `Ekskul #${finalExtraId}`;
    }

    const finalTeacherId = teacher_employee_id !== undefined ? teacher_employee_id : current.teacher_employee_id;
    let teacherName = 'Belum ditentukan';
    if (finalTeacherId) {
      try {
        const emp = await employeesService.getEmployeeById(finalTeacherId);
        teacherName = emp?.full_name || `Guru #${finalTeacherId}`;
      } catch (e) {}
    }

    const cgs = await db('class_groups').whereIn('id', targetClassGroupIds).select('name');
    const cgNames = cgs.map(c => c.name).join(', ');

    const dayNames = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu' };
    const dayName = dayNames[day_of_week] || `Hari #${day_of_week}`;

    const presetObj = preset_id ? await db('subject_schedule_presets').where({ id: preset_id }).first() : null;
    const userName = user?.full_name || user?.username || 'Admin Kurikulum';

    // Rangkuman perubahan
    const changes = [];
    if (current.day_of_week != day_of_week || current.start_time != start_time || current.end_time != end_time) {
      changes.push(`Waktu: ${dayNames[current.day_of_week] || current.day_of_week} (${current.start_time}-${current.end_time}) -> ${dayName} (${start_time}-${end_time})`);
    }
    if (current.teacher_employee_id != finalTeacherId) {
      changes.push(`Pengampu diubah ke: ${teacherName}`);
    }
    if (current.room_name != room_name) {
      changes.push(`Ruangan: ${current.room_name || '-'} -> ${room_name || '-'}`);
    }

    await db('subject_schedule_logs').insert({
      satuan_pendidikan_id: current.satuan_pendidikan_id,
      academic_year_id,
      preset_id,
      preset_name: presetObj?.name || 'Jadwal Reguler',
      schedule_id: id,
      action: 'ubah_jadwal',
      schedule_type,
      subject_or_extra_name: targetName,
      teacher_name: teacherName,
      class_group_names: cgNames,
      day_name: dayName,
      time_range: `${start_time} - ${end_time}`,
      reason: reason.trim(),
      changes_summary: changes.length > 0 ? changes.join('; ') : `Perubahan data jadwal ${targetName} (${cgNames}).`,
      created_by: userName,
      created_at: db.fn.now()
    });

    return db('subject_schedules').where({ id }).first();
  }

  async deleteSchedule(id, payload = {}, user = null) {
    const current = await db('subject_schedules').where({ id }).first();
    if (!current) {
      const error = new Error('Jadwal pelajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const { reason = 'Penghapusan jadwal pelajaran' } = payload;

    // Ambil info nama untuk dicatat ke audit log
    let targetName = '';
    if (current.schedule_type === 'mapel' && current.subject_id) {
      const s = await db('subjects').where({ id: current.subject_id }).first();
      targetName = s ? s.name : `Mapel #${current.subject_id}`;
    } else if (current.extracurricular_id) {
      const ex = await db('extracurriculars').where({ id: current.extracurricular_id }).first();
      targetName = ex ? ex.name : `Ekskul #${current.extracurricular_id}`;
    }

    let teacherName = 'Belum ditentukan';
    if (current.teacher_employee_id) {
      try {
        const emp = await employeesService.getEmployeeById(current.teacher_employee_id);
        teacherName = emp?.full_name || `Guru #${current.teacher_employee_id}`;
      } catch (e) {}
    }

    const relCgs = await db('subject_schedule_class_groups')
      .join('class_groups', 'subject_schedule_class_groups.class_group_id', 'class_groups.id')
      .where('subject_schedule_class_groups.schedule_id', id)
      .select('class_groups.name');
    const cgNames = relCgs.map(c => c.name).join(', ');

    const dayNames = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu' };
    const dayName = dayNames[current.day_of_week] || `Hari #${current.day_of_week}`;

    const presetObj = current.preset_id ? await db('subject_schedule_presets').where({ id: current.preset_id }).first() : null;
    const userName = user?.full_name || user?.username || 'Admin Kurikulum';

    await db('subject_schedule_logs').insert({
      satuan_pendidikan_id: current.satuan_pendidikan_id,
      academic_year_id: current.academic_year_id,
      preset_id: current.preset_id,
      preset_name: presetObj?.name || 'Jadwal Reguler',
      schedule_id: id,
      action: 'hapus_jadwal',
      schedule_type: current.schedule_type,
      subject_or_extra_name: targetName,
      teacher_name: teacherName,
      class_group_names: cgNames,
      day_name: dayName,
      time_range: `${current.start_time} - ${current.end_time}`,
      reason: reason.trim(),
      changes_summary: `Menghapus jadwal ${targetName} pada rombel ${cgNames} (${dayName}, ${current.start_time}-${current.end_time}).`,
      created_by: userName,
      created_at: db.fn.now()
    });

    await db('subject_schedule_class_groups').where({ schedule_id: id }).del();
    await db('subject_schedules').where({ id }).del();
    return { success: true, message: 'Jadwal berhasil dihapus dan dicatat ke riwayat' };
  }

  async toggleScheduleStatus(id, payload = {}, user = null) {
    const current = await db('subject_schedules').where({ id }).first();
    if (!current) {
      const error = new Error('Jadwal pelajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const nextStatus = !current.is_active;
    const { reason = nextStatus ? 'Pengaktifan jadwal kembali' : 'Penonaktifan sementara jadwal' } = payload;

    await db('subject_schedules').where({ id }).update({
      is_active: nextStatus,
      updated_at: db.fn.now()
    });

    // Ambil info nama untuk dicatat ke audit log
    let targetName = '';
    if (current.schedule_type === 'mapel' && current.subject_id) {
      const s = await db('subjects').where({ id: current.subject_id }).first();
      targetName = s ? s.name : `Mapel #${current.subject_id}`;
    } else if (current.extracurricular_id) {
      const ex = await db('extracurriculars').where({ id: current.extracurricular_id }).first();
      targetName = ex ? ex.name : `Ekskul #${current.extracurricular_id}`;
    }

    const presetObj = current.preset_id ? await db('subject_schedule_presets').where({ id: current.preset_id }).first() : null;
    const userName = user?.full_name || user?.username || 'Admin Kurikulum';

    await db('subject_schedule_logs').insert({
      satuan_pendidikan_id: current.satuan_pendidikan_id,
      academic_year_id: current.academic_year_id,
      preset_id: current.preset_id,
      preset_name: presetObj?.name || 'Jadwal Reguler',
      schedule_id: id,
      action: 'status_jadwal',
      schedule_type: current.schedule_type,
      subject_or_extra_name: targetName,
      reason: reason.trim(),
      changes_summary: `Mengubah status jadwal ${targetName} menjadi ${nextStatus ? 'Aktif' : 'Nonaktif'}.`,
      created_by: userName,
      created_at: db.fn.now()
    });

    return { id, is_active: nextStatus };
  }


  // ==========================================
  // 10. Tujuan Pembelajaran (Learning Objectives)
  // ==========================================
  async listLearningObjectives(query = {}) {
    let baseQuery = db('learning_objectives')
      .join('subjects', 'learning_objectives.subject_id', 'subjects.id')
      .join('grade_levels', 'learning_objectives.grade_level_id', 'grade_levels.id')
      .join('academic_years', 'learning_objectives.academic_year_id', 'academic_years.id')
      .leftJoin('semesters', 'learning_objectives.semester_id', 'semesters.id')
      .select(
        'learning_objectives.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'grade_levels.name as grade_level_name',
        'academic_years.name as academic_year_name',
        'semesters.name as semester_name'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('learning_objectives.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.academic_year_id) {
      baseQuery = baseQuery.where('learning_objectives.academic_year_id', query.academic_year_id);
    }
    if (query.grade_level_id) {
      baseQuery = baseQuery.where('learning_objectives.grade_level_id', query.grade_level_id);
    }
    if (query.subject_id) {
      baseQuery = baseQuery.where('learning_objectives.subject_id', query.subject_id);
    }
    if (query.semester_id) {
      baseQuery = baseQuery.where('learning_objectives.semester_id', query.semester_id);
    }

    return baseQuery.orderBy([
      { column: 'learning_objectives.order_index', order: 'asc' },
      { column: 'learning_objectives.id', order: 'asc' }
    ]);
  }

  async createLearningObjective(payload) {
    const {
      satuan_pendidikan_id,
      academic_year_id,
      grade_level_id,
      subject_id,
      semester_id,
      code,
      description,
      order_index = 1
    } = payload;

    if (!satuan_pendidikan_id || !academic_year_id || !grade_level_id || !subject_id || !code || !description) {
      const error = new Error('Field satuan_pendidikan_id, academic_year_id, grade_level_id, subject_id, code, dan description wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('learning_objectives').insert({
      satuan_pendidikan_id,
      academic_year_id,
      grade_level_id,
      subject_id,
      semester_id: semester_id || null,
      code: code.trim(),
      description: description.trim(),
      order_index: parseInt(order_index, 10) || 1,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('learning_objectives').where({ id }).first();
  }

  async createLearningObjectivesBulk(payload) {
    const {
      satuan_pendidikan_id,
      academic_year_id,
      grade_level_id,
      subject_id,
      semester_id,
      items
    } = payload;

    if (!satuan_pendidikan_id || !academic_year_id || !grade_level_id || !subject_id || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Field satuan_pendidikan_id, academic_year_id, grade_level_id, subject_id, dan items (array) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const inserted = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description || !item.description.trim()) continue;

      const code = item.code && item.code.trim() ? item.code.trim() : `TP-${i + 1}`;
      const orderIndex = item.order_index !== undefined ? parseInt(item.order_index, 10) : (i + 1);

      const [id] = await db('learning_objectives').insert({
        satuan_pendidikan_id,
        academic_year_id,
        grade_level_id,
        subject_id,
        semester_id: item.semester_id || semester_id || null,
        code,
        description: item.description.trim(),
        order_index: orderIndex,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      inserted.push(id);
    }

    return {
      message: `Berhasil menambahkan ${inserted.length} Tujuan Pembelajaran secara massal`,
      count: inserted.length,
      ids: inserted
    };
  }

  async updateLearningObjective(id, payload) {
    const current = await db('learning_objectives').where({ id }).first();

    if (!current) {
      const error = new Error('Tujuan Pembelajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.code) updateData.code = payload.code.trim();
    if (payload.description) updateData.description = payload.description.trim();
    if (payload.order_index !== undefined) updateData.order_index = parseInt(payload.order_index, 10) || 1;
    if (payload.semester_id !== undefined) updateData.semester_id = payload.semester_id || null;
    if (payload.grade_level_id !== undefined) updateData.grade_level_id = payload.grade_level_id;
    if (payload.subject_id !== undefined) updateData.subject_id = payload.subject_id;
    if (payload.academic_year_id !== undefined) updateData.academic_year_id = payload.academic_year_id;
    if (payload.is_active !== undefined) updateData.is_active = !!payload.is_active;

    await db('learning_objectives').where({ id }).update(updateData);
    return db('learning_objectives').where({ id }).first();
  }

  async deleteLearningObjective(id) {
    const current = await db('learning_objectives').where({ id }).first();
    if (!current) {
      const error = new Error('Tujuan Pembelajaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('learning_objectives').where({ id }).del();
    return { success: true, message: 'Tujuan Pembelajaran berhasil dihapus' };
  }

  // ==========================================
  // 11. KKM / KKTP Mata Pelajaran Per Kelas & Tahun Ajaran
  // ==========================================
  async listSubjectGradeKkms(query = {}) {
    let baseQuery = db('subject_grade_kkms')
      .join('subjects', 'subject_grade_kkms.subject_id', 'subjects.id')
      .join('grade_levels', 'subject_grade_kkms.grade_level_id', 'grade_levels.id')
      .join('academic_years', 'subject_grade_kkms.academic_year_id', 'academic_years.id')
      .leftJoin('class_groups', 'subject_grade_kkms.class_group_id', 'class_groups.id')
      .select(
        'subject_grade_kkms.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'grade_levels.name as grade_level_name',
        'academic_years.name as academic_year_name',
        'class_groups.name as class_group_name'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('subject_grade_kkms.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.academic_year_id) {
      baseQuery = baseQuery.where('subject_grade_kkms.academic_year_id', query.academic_year_id);
    }
    if (query.grade_level_id) {
      baseQuery = baseQuery.where('subject_grade_kkms.grade_level_id', query.grade_level_id);
    }
    if (query.subject_id) {
      baseQuery = baseQuery.where('subject_grade_kkms.subject_id', query.subject_id);
    }

    return baseQuery.orderBy('grade_levels.order', 'asc').orderBy('subjects.name', 'asc');
  }

  async batchUpsertSubjectGradeKkms(payload) {
    const { satuan_pendidikan_id, academic_year_id, grade_level_id, items } = payload;
    if (!satuan_pendidikan_id || !academic_year_id || !grade_level_id || !Array.isArray(items)) {
      const error = new Error('Field satuan_pendidikan_id, academic_year_id, grade_level_id, dan array items wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const results = [];
    for (const item of items) {
      const subject_id = item.subject_id;
      const kkm = parseFloat(item.kkm) || 75.00;
      const threshold_c = item.threshold_c !== undefined && item.threshold_c !== '' ? parseFloat(item.threshold_c) : kkm;
      const threshold_b = item.threshold_b !== undefined && item.threshold_b !== '' ? parseFloat(item.threshold_b) : Math.round(kkm + (100 - kkm) / 3);
      const threshold_a = item.threshold_a !== undefined && item.threshold_a !== '' ? parseFloat(item.threshold_a) : Math.round(kkm + 2 * (100 - kkm) / 3);

      const existing = await db('subject_grade_kkms')
        .where({
          satuan_pendidikan_id,
          academic_year_id,
          grade_level_id,
          subject_id
        })
        .first();

      if (existing) {
        await db('subject_grade_kkms')
          .where({ id: existing.id })
          .update({
            kkm,
            threshold_c,
            threshold_b,
            threshold_a,
            description: item.description || null,
            updated_at: db.fn.now()
          });
        results.push(existing.id);
      } else {
        const [newId] = await db('subject_grade_kkms').insert({
          satuan_pendidikan_id,
          academic_year_id,
          grade_level_id,
          subject_id,
          class_group_id: item.class_group_id || null,
          kkm,
          threshold_c,
          threshold_b,
          threshold_a,
          description: item.description || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push(newId);
      }
    }

    return {
      message: `Berhasil menetapkan KKM untuk ${results.length} mata pelajaran`,
      count: results.length
    };
  }

  async deleteSubjectGradeKkm(id) {
    const current = await db('subject_grade_kkms').where({ id }).first();
    if (!current) {
      const error = new Error('Data KKM tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('subject_grade_kkms').where({ id }).del();
    return { success: true, message: 'Data KKM berhasil dihapus' };
  }

  // ==========================================
  // 12. Struktur Kurikulum (Alokasi JP per Mapel per Jenjang Kelas per Pekan)
  // ==========================================
  async listCurriculumStructures(query = {}) {
    const { satuan_pendidikan_id, academic_year_id, grade_level_id } = query;
    let baseQuery = db('curriculum_structures')
      .join('subjects', 'curriculum_structures.subject_id', 'subjects.id')
      .join('grade_levels', 'curriculum_structures.grade_level_id', 'grade_levels.id')
      .join('academic_years', 'curriculum_structures.academic_year_id', 'academic_years.id')
      .select(
        'curriculum_structures.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'grade_levels.name as grade_level_name',
        'academic_years.name as academic_year_name',
        'academic_years.minutes_per_jp as ay_minutes_per_jp'
      );

    if (satuan_pendidikan_id) {
      baseQuery = baseQuery.where('curriculum_structures.satuan_pendidikan_id', satuan_pendidikan_id);
    }
    if (academic_year_id) {
      baseQuery = baseQuery.where('curriculum_structures.academic_year_id', academic_year_id);
    }
    if (grade_level_id) {
      baseQuery = baseQuery.where('curriculum_structures.grade_level_id', grade_level_id);
    }

    return baseQuery.orderBy([
      { column: 'grade_levels.id', order: 'asc' },
      { column: 'subjects.name', order: 'asc' }
    ]);
  }

  async saveCurriculumStructures(payload) {
    const { satuan_pendidikan_id, academic_year_id, grade_level_id, minutes_per_jp, items } = payload;
    if (!satuan_pendidikan_id || !academic_year_id || !Array.isArray(items)) {
      const error = new Error('Data payload struktur kurikulum tidak lengkap');
      error.statusCode = 422;
      throw error;
    }

    const minPerJp = parseInt(minutes_per_jp, 10) || 40;

    // Update minutes_per_jp in academic_years if specified
    if (academic_year_id && minutes_per_jp) {
      await db('academic_years').where({ id: academic_year_id }).update({
        minutes_per_jp: minPerJp,
        updated_at: db.fn.now()
      });
    }

    const results = [];
    for (const item of items) {
      const subject_id = item.subject_id;
      const targetGradeLevelId = item.grade_level_id || grade_level_id;
      if (!targetGradeLevelId) continue;

      const hours_per_week = parseInt(item.hours_per_week, 10) || 0;
      const session_duration = parseInt(item.session_duration, 10) || (hours_per_week >= 2 ? 2 : 1);
      const notes = item.notes || null;

      const existing = await db('curriculum_structures')
        .where({
          satuan_pendidikan_id,
          academic_year_id,
          grade_level_id: targetGradeLevelId,
          subject_id
        })
        .first();

      if (existing) {
        await db('curriculum_structures')
          .where({ id: existing.id })
          .update({
            hours_per_week,
            session_duration,
            minutes_per_jp: minPerJp,
            notes,
            updated_at: db.fn.now()
          });
        results.push(existing.id);
      } else {
        const [newId] = await db('curriculum_structures').insert({
          satuan_pendidikan_id,
          academic_year_id,
          grade_level_id: targetGradeLevelId,
          subject_id,
          hours_per_week,
          session_duration,
          minutes_per_jp: minPerJp,
          notes,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push(newId);
      }
    }

    return {
      message: `Berhasil menetapkan Struktur Kurikulum untuk ${results.length} entri mata pelajaran & jenjang`,
      count: results.length
    };
  }
}

module.exports = new CurriculumService();


