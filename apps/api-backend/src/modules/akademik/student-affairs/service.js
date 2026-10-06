/**
 * Student Affairs Service Implementation
 * Modul Akademik - Fitur 6: Kesiswaan & Pencatatan Kejadian Siswa Terpadu
 */
const db = require('../../../config/db/akademik');
const employeesService = require('../../kepegawaian/employees/service');
const { parseUnitId } = require('../../../utils/parseUnitId');

class StudentAffairsService {
  // ==========================================
  // Helper Internal: Penentuan Peran & Visibilitas
  // ==========================================
  _getUserRoleInfo(user) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const schoolRoles = Array.isArray(user?.school_roles) ? user.school_roles.map(r => r.role_name) : [];
    const allRoles = [...new Set([...roles, ...schoolRoles])];

    const isSuperAdmin = user?.account_type === 'super_admin' || allRoles.includes('super_admin') || allRoles.includes('admin_yayasan');
    const isAdminUnit = isSuperAdmin || user?.account_type === 'admin' || allRoles.includes('admin_satuan_pendidikan');
    const isKesiswaan = isAdminUnit || allRoles.some(r => ['kesiswaan', 'waka_kesiswaan', 'staf_kesiswaan'].includes(r));
    const isBK = isAdminUnit || allRoles.some(r => ['guru_bk', 'konselor'].includes(r));
    const isWaliKelas = allRoles.includes('wali_kelas');
    const employeeId = user?.ref_type === 'staff' ? user.ref_id : (user?.employee_id || null);

    return {
      isSuperAdmin,
      isAdminUnit,
      isKesiswaan,
      isBK,
      isWaliKelas,
      employeeId,
      allRoles
    };
  }

  // ==========================================
  // 1. Master Kategori Kejadian (Incident Categories)
  // ==========================================
  async listIncidentCategories(query = {}) {
    let baseQuery = db('incident_categories');

    const unitId = parseUnitId(query.satuan_pendidikan_id);
    if (unitId) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', unitId);
    }
    if (query.type) {
      baseQuery = baseQuery.where('type', query.type);
    }
    if (query.is_active !== undefined) {
      baseQuery = baseQuery.where('is_active', query.is_active === 'true' || query.is_active === true || query.is_active === 1);
    }

    return baseQuery.orderBy('type', 'asc').orderBy('code', 'asc');
  }

  async createIncidentCategory(payload) {
    const { satuan_pendidikan_id, code, name, type, severity_level, default_points } = payload;
    if (!satuan_pendidikan_id || !code || !name || !type) {
      const error = new Error('Field satuan_pendidikan_id, code, name, dan type wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const exists = await db('incident_categories')
      .where({ satuan_pendidikan_id, code: code.trim() })
      .first();

    if (exists) {
      const error = new Error(`Kode kategori '${code}' sudah terdaftar pada satuan pendidikan ini`);
      error.statusCode = 409;
      throw error;
    }

    const [id] = await db('incident_categories').insert({
      satuan_pendidikan_id,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      type,
      severity_level: severity_level || 'low',
      default_points: default_points !== undefined ? parseInt(default_points, 10) : 0,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('incident_categories').where({ id }).first();
  }

  async updateIncidentCategory(id, payload) {
    const category = await db('incident_categories').where({ id }).first();
    if (!category) {
      const error = new Error('Kategori kejadian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.type) updateData.type = payload.type;
    if (payload.severity_level) updateData.severity_level = payload.severity_level;
    if (payload.default_points !== undefined) updateData.default_points = parseInt(payload.default_points, 10);
    if (payload.is_active !== undefined) updateData.is_active = Boolean(payload.is_active);

    await db('incident_categories').where({ id }).update(updateData);
    return db('incident_categories').where({ id }).first();
  }

  // ==========================================
  // 2. Buku Catatan Kejadian Siswa Terpadu (Student Incidents)
  // ==========================================
  async listIncidents(query = {}, user = null) {
    const roleInfo = this._getUserRoleInfo(user);
    const unitId = parseUnitId(query.satuan_pendidikan_id);

    let baseQuery = db('student_incidents')
      .join('students', 'student_incidents.student_id', 'students.id')
      .leftJoin('incident_categories', 'student_incidents.category_id', 'incident_categories.id')
      .leftJoin('academic_years', 'student_incidents.academic_year_id', 'academic_years.id')
      .select(
        'student_incidents.*',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'students.gender',
        'incident_categories.name as category_name',
        'incident_categories.code as category_code',
        'incident_categories.severity_level',
        'academic_years.name as academic_year_name'
      );

    if (unitId) {
      baseQuery = baseQuery.where('student_incidents.satuan_pendidikan_id', unitId);
    }
    if (query.student_id) {
      baseQuery = baseQuery.where('student_incidents.student_id', query.student_id);
    }
    if (query.type) {
      baseQuery = baseQuery.where('student_incidents.type', query.type);
    }
    if (query.category_id) {
      baseQuery = baseQuery.where('student_incidents.category_id', query.category_id);
    }
    if (query.handling_status) {
      baseQuery = baseQuery.where('student_incidents.handling_status', query.handling_status);
    }
    if (query.start_date) {
      baseQuery = baseQuery.where('student_incidents.incident_date', '>=', query.start_date);
    }
    if (query.end_date) {
      baseQuery = baseQuery.where('student_incidents.incident_date', '<=', query.end_date);
    }
    if (query.search) {
      const s = `%${query.search}%`;
      baseQuery = baseQuery.where(builder => {
        builder.where('student_incidents.title', 'like', s)
          .orWhere('student_incidents.description', 'like', s)
          .orWhere('students.full_name', 'like', s)
          .orWhere('students.nis', 'like', s);
      });
    }

    // Server-Side Visibility Enforcement
    if (!roleInfo.isAdminUnit && !roleInfo.isBK && !roleInfo.isKesiswaan) {
      // Jika Wali Kelas: cari daftar ID siswa di rombel yang dibinanya
      let homeroomStudentIds = [];
      if (roleInfo.isWaliKelas && roleInfo.employeeId) {
        const myClassGroups = await db('class_groups')
          .where({ homeroom_teacher_employee_id: roleInfo.employeeId })
          .select('id');
        const classGroupIds = myClassGroups.map(cg => cg.id);
        if (classGroupIds.length > 0) {
          const enrollments = await db('student_class_enrollments')
            .whereIn('class_group_id', classGroupIds)
            .where('status', 'active')
            .select('student_id');
          homeroomStudentIds = enrollments.map(e => e.student_id);
        }
      }

      baseQuery = baseQuery.where(b => {
        // 1. Visibilitas umum
        b.whereIn('student_incidents.visibility_level', ['public_school', 'teachers_only']);

        // 2. Jika pelapor adalah user sendiri
        if (roleInfo.employeeId) {
          b.orWhere('student_incidents.reported_by_employee_id', roleInfo.employeeId);
        }

        // 3. Jika Wali Kelas dan siswa termasuk binaannya
        if (homeroomStudentIds.length > 0) {
          b.orWhere(sub => {
            sub.where('student_incidents.visibility_level', 'homeroom_and_bk')
              .whereIn('student_incidents.student_id', homeroomStudentIds);
          });
        }
      });
    }

    const rows = await baseQuery.orderBy('student_incidents.incident_date', 'desc').orderBy('student_incidents.id', 'desc');

    // Enrich info nama pegawai pelapor/penangan jika ada
    const enriched = [];
    for (const r of rows) {
      let reporter_name = null;
      let handler_name = null;
      let verifier_name = null;

      if (r.reported_by_employee_id) {
        try {
          const emp = await employeesService.getEmployeeById(r.reported_by_employee_id);
          reporter_name = emp?.full_name || null;
        } catch (e) {}
      }
      if (r.handled_by_employee_id) {
        try {
          const emp = await employeesService.getEmployeeById(r.handled_by_employee_id);
          handler_name = emp?.full_name || null;
        } catch (e) {}
      }
      if (r.verified_by_employee_id) {
        try {
          const emp = await employeesService.getEmployeeById(r.verified_by_employee_id);
          verifier_name = emp?.full_name || null;
        } catch (e) {}
      }

      enriched.push({
        ...r,
        reporter_name,
        handler_name,
        verifier_name
      });
    }

    return enriched;
  }

  async getIncidentById(id, user = null) {
    const roleInfo = this._getUserRoleInfo(user);

    const incident = await db('student_incidents')
      .join('students', 'student_incidents.student_id', 'students.id')
      .leftJoin('incident_categories', 'student_incidents.category_id', 'incident_categories.id')
      .leftJoin('academic_years', 'student_incidents.academic_year_id', 'academic_years.id')
      .select(
        'student_incidents.*',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'students.gender',
        'incident_categories.name as category_name',
        'incident_categories.code as category_code',
        'incident_categories.severity_level',
        'academic_years.name as academic_year_name'
      )
      .where('student_incidents.id', id)
      .first();

    if (!incident) {
      const error = new Error('Catatan kejadian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Check visibility permissions
    if (!roleInfo.isAdminUnit && !roleInfo.isBK && !roleInfo.isKesiswaan) {
      const isReporter = roleInfo.employeeId && Number(incident.reported_by_employee_id) === Number(roleInfo.employeeId);
      let isHomeroomOfStudent = false;

      if (roleInfo.isWaliKelas && roleInfo.employeeId) {
        const myClassGroups = await db('class_groups')
          .where({ homeroom_teacher_employee_id: roleInfo.employeeId })
          .select('id');
        const classGroupIds = myClassGroups.map(cg => cg.id);
        if (classGroupIds.length > 0) {
          const enrolled = await db('student_class_enrollments')
            .whereIn('class_group_id', classGroupIds)
            .where({ student_id: incident.student_id, status: 'active' })
            .first();
          if (enrolled) isHomeroomOfStudent = true;
        }
      }

      if (incident.visibility_level === 'bk_only') {
        const error = new Error('Anda tidak memiliki izin untuk mengakses catatan insiden ini');
        error.statusCode = 403;
        throw error;
      }
      if (incident.visibility_level === 'homeroom_and_bk' && !isHomeroomOfStudent && !isReporter) {
        const error = new Error('Catatan insiden ini hanya dapat diakses oleh Wali Kelas dan Guru BK');
        error.statusCode = 403;
        throw error;
      }
    }

    // Enrich nama pegawai
    let reporter_name = null;
    let handler_name = null;
    let verifier_name = null;

    if (incident.reported_by_employee_id) {
      try {
        const emp = await employeesService.getEmployeeById(incident.reported_by_employee_id);
        reporter_name = emp?.full_name || null;
      } catch (e) {}
    }
    if (incident.handled_by_employee_id) {
      try {
        const emp = await employeesService.getEmployeeById(incident.handled_by_employee_id);
        handler_name = emp?.full_name || null;
      } catch (e) {}
    }
    if (incident.verified_by_employee_id) {
      try {
        const emp = await employeesService.getEmployeeById(incident.verified_by_employee_id);
        verifier_name = emp?.full_name || null;
      } catch (e) {}
    }

    // Ambil catatan konseling terkait jika ada dan user memiliki hak
    let relatedCounseling = [];
    if (roleInfo.isAdminUnit || roleInfo.isBK || roleInfo.isWaliKelas) {
      let cQuery = db('counseling_records')
        .where('incident_id', incident.id);
      if (!roleInfo.isAdminUnit && !roleInfo.isBK) {
        cQuery = cQuery.whereIn('visibility_level', ['bk_and_homeroom', 'all_staff']);
      }
      relatedCounseling = await cQuery.select('*').orderBy('session_date', 'desc');
    }

    return {
      ...incident,
      reporter_name,
      handler_name,
      verifier_name,
      related_counseling: relatedCounseling
    };
  }

  async createIncident(payload, user = null) {
    const roleInfo = this._getUserRoleInfo(user);
    const {
      student_id,
      category_id,
      type,
      title,
      description,
      points,
      incident_date,
      incident_time,
      location,
      handled_by_employee_id,
      handling_status,
      handling_action,
      visibility_level,
      satuan_pendidikan_id,
      academic_year_id
    } = payload;

    if (!student_id || !title || !description || !incident_date) {
      const error = new Error('Field student_id, title, description, dan incident_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Ambil data siswa untuk auto-resolve satuan_pendidikan_id
    const student = await db('students').where({ id: student_id }).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const finalUnitId = satuan_pendidikan_id || student.satuan_pendidikan_id || 1;

    // Evaluasi category dan type default
    let finalType = type || 'negative';
    let finalPoints = points !== undefined ? parseInt(points, 10) : 0;

    if (category_id) {
      const cat = await db('incident_categories').where({ id: category_id }).first();
      if (cat) {
        finalType = type || cat.type;
        if (points === undefined || points === null) {
          finalPoints = cat.default_points;
        }
      }
    }

    const reporterId = roleInfo.employeeId || null;

    const [id] = await db('student_incidents').insert({
      satuan_pendidikan_id: finalUnitId,
      student_id,
      academic_year_id: academic_year_id || null,
      category_id: category_id || null,
      type: finalType,
      title: title.trim(),
      description: description.trim(),
      points: finalPoints,
      incident_date,
      incident_time: incident_time || null,
      location: location ? location.trim() : null,
      reported_by_employee_id: reporterId,
      handled_by_employee_id: handled_by_employee_id || null,
      handling_status: handling_status || 'reported',
      handling_action: handling_action || null,
      resolution_date: (handling_status === 'resolved' ? (payload.resolution_date || incident_date) : null),
      visibility_level: visibility_level || 'teachers_only',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getIncidentById(id, user);
  }

  async updateIncident(id, payload, user = null) {
    const roleInfo = this._getUserRoleInfo(user);
    const incident = await db('student_incidents').where({ id }).first();

    if (!incident) {
      const error = new Error('Catatan kejadian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Hanya pelapor sebelum resolved, atau admin / kesiswaan yang boleh mengubah isi laporan
    const isReporter = roleInfo.employeeId && Number(incident.reported_by_employee_id) === Number(roleInfo.employeeId);
    if (!roleInfo.isAdminUnit && !roleInfo.isKesiswaan && !roleInfo.isBK) {
      if (!isReporter) {
        const error = new Error('Anda tidak memiliki izin untuk mengubah laporan kejadian ini');
        error.statusCode = 403;
        throw error;
      }
      if (incident.handling_status === 'resolved') {
        const error = new Error('Kejadian yang sudah berstatus selesai (resolved) hanya dapat diubah oleh Admin/Kesiswaan');
        error.statusCode = 403;
        throw error;
      }
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.title) updateData.title = payload.title.trim();
    if (payload.description) updateData.description = payload.description.trim();
    if (payload.category_id !== undefined) updateData.category_id = payload.category_id || null;
    if (payload.type) updateData.type = payload.type;
    if (payload.points !== undefined) updateData.points = parseInt(payload.points, 10);
    if (payload.incident_date) updateData.incident_date = payload.incident_date;
    if (payload.incident_time !== undefined) updateData.incident_time = payload.incident_time || null;
    if (payload.location !== undefined) updateData.location = payload.location ? payload.location.trim() : null;
    if (payload.visibility_level) updateData.visibility_level = payload.visibility_level;

    await db('student_incidents').where({ id }).update(updateData);
    return this.getIncidentById(id, user);
  }

  async updateHandlingStatus(id, payload, user = null) {
    const roleInfo = this._getUserRoleInfo(user);
    const incident = await db('student_incidents').where({ id }).first();

    if (!incident) {
      const error = new Error('Catatan kejadian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const { handling_status, handling_action, handled_by_employee_id, resolution_date } = payload;
    if (!handling_status) {
      const error = new Error('Field handling_status wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const updateData = {
      handling_status,
      updated_at: db.fn.now()
    };

    if (handling_action !== undefined) updateData.handling_action = handling_action || null;
    if (handled_by_employee_id !== undefined) {
      updateData.handled_by_employee_id = handled_by_employee_id || null;
    } else if (roleInfo.employeeId) {
      updateData.handled_by_employee_id = roleInfo.employeeId;
    }

    if (handling_status === 'resolved') {
      updateData.resolution_date = resolution_date || new Date().toISOString().split('T')[0];
    } else if (handling_status === 'reported') {
      updateData.resolution_date = null;
    }

    await db('student_incidents').where({ id }).update(updateData);
    return this.getIncidentById(id, user);
  }

  async verifyIncidentPoints(id, payload, user = null) {
    const roleInfo = this._getUserRoleInfo(user);
    if (!roleInfo.isSuperAdmin && !roleInfo.isAdminUnit && !roleInfo.isKesiswaan) {
      const error = new Error('Hanya Kesiswaan dan Administrator yang berhak memverifikasi poin kejadian siswa');
      error.statusCode = 403;
      throw error;
    }

    const incident = await db('student_incidents').where({ id }).first();
    if (!incident) {
      const error = new Error('Catatan kejadian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const verifierId = roleInfo.employeeId || null;
    const updateData = {
      verified_by_employee_id: verifierId,
      verified_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    if (payload.points !== undefined) {
      updateData.points = parseInt(payload.points, 10);
    }

    await db('student_incidents').where({ id }).update(updateData);
    return this.getIncidentById(id, user);
  }

  async getStudentIncidentSummary(studentId) {
    const student = await db('students').where({ id: studentId }).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const incidents = await db('student_incidents')
      .where({ student_id: studentId })
      .andWhereNot('handling_status', 'cancelled');

    let totalPositivePoints = 0;
    let totalNegativePoints = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    incidents.forEach(inc => {
      if (inc.type === 'positive') {
        totalPositivePoints += (inc.points || 0);
        positiveCount++;
      } else if (inc.type === 'negative') {
        totalNegativePoints += (inc.points || 0);
        negativeCount++;
      } else {
        neutralCount++;
      }
    });

    const netScore = totalPositivePoints - totalNegativePoints;

    return {
      student_id: Number(studentId),
      student_name: student.full_name,
      nis: student.nis,
      total_incidents: incidents.length,
      positive_count: positiveCount,
      negative_count: negativeCount,
      neutral_count: neutralCount,
      total_positive_points: totalPositivePoints,
      total_negative_points: totalNegativePoints,
      net_score: netScore
    };
  }

  // ==========================================
  // 3. Pelanggaran & Disiplin Legacy Adapter
  // ==========================================
  async listDisciplinaryRecords(query = {}) {
    let baseQuery = db('student_disciplinary_records')
      .join('students', 'student_disciplinary_records.student_id', 'students.id')
      .select(
        'student_disciplinary_records.*',
        'students.full_name as student_name',
        'students.nis'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('student_disciplinary_records.student_id', query.student_id);
    }

    return baseQuery.orderBy('student_disciplinary_records.incident_date', 'desc');
  }

  async createDisciplinaryRecord(payload, user = null) {
    const { student_id, violation_type, points, incident_date, notes, handled_by_employee_id } = payload;
    if (!student_id || !violation_type || points === undefined || !incident_date) {
      const error = new Error('Field student_id, violation_type, points, dan incident_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const handlerId = handled_by_employee_id || (user?.ref_type === 'staff' ? user.ref_id : null);

    const [id] = await db('student_disciplinary_records').insert({
      student_id,
      violation_type: violation_type.trim(),
      points: parseInt(points, 10),
      incident_date,
      handled_by_employee_id: handlerId,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Simpan juga ke student_incidents agar sinkron
    try {
      const student = await db('students').where({ id: student_id }).first();
      await db('student_incidents').insert({
        satuan_pendidikan_id: student?.satuan_pendidikan_id || 1,
        student_id,
        type: 'negative',
        title: violation_type.trim(),
        description: notes ? notes.trim() : violation_type.trim(),
        points: parseInt(points, 10),
        incident_date,
        handled_by_employee_id: handlerId,
        reported_by_employee_id: handlerId,
        handling_status: 'reported',
        visibility_level: 'teachers_only',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    } catch (e) {
      console.warn('Sync to student_incidents ignored:', e.message);
    }

    return db('student_disciplinary_records').where({ id }).first();
  }

  // ==========================================
  // 4. Prestasi Siswa Legacy Adapter
  // ==========================================
  async listAchievements(query = {}) {
    let baseQuery = db('student_achievements')
      .join('students', 'student_achievements.student_id', 'students.id')
      .select(
        'student_achievements.*',
        'students.full_name as student_name',
        'students.nis'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('student_achievements.student_id', query.student_id);
    }
    if (query.level) {
      baseQuery = baseQuery.where('student_achievements.level', query.level);
    }

    return baseQuery.orderBy('student_achievements.achieved_at', 'desc');
  }

  async createAchievement(payload) {
    const { student_id, achievement_type, level, achieved_at, notes } = payload;
    if (!student_id || !achievement_type || !achieved_at) {
      const error = new Error('Field student_id, achievement_type, dan achieved_at wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('student_achievements').insert({
      student_id,
      achievement_type: achievement_type.trim(),
      level: level || null,
      achieved_at,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Simpan juga ke student_incidents agar sinkron
    try {
      const student = await db('students').where({ id: student_id }).first();
      await db('student_incidents').insert({
        satuan_pendidikan_id: student?.satuan_pendidikan_id || 1,
        student_id,
        type: 'positive',
        title: achievement_type.trim(),
        description: `Tingkat ${level || 'sekolah'}. ${notes || ''}`.trim(),
        points: 15,
        incident_date: achieved_at,
        handling_status: 'resolved',
        visibility_level: 'public_school',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    } catch (e) {
      console.warn('Sync to student_incidents ignored:', e.message);
    }

    return db('student_achievements').where({ id }).first();
  }

  // ==========================================
  // 5. Bimbingan Konseling (Counseling Records)
  // ==========================================
  async listCounselingRecords(query = {}, user = null) {
    let baseQuery = db('counseling_records')
      .join('students', 'counseling_records.student_id', 'students.id')
      .leftJoin('student_incidents', 'counseling_records.incident_id', 'student_incidents.id')
      .select(
        'counseling_records.*',
        'students.full_name as student_name',
        'students.nis',
        'student_incidents.title as incident_title'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('counseling_records.student_id', query.student_id);
    }
    if (query.incident_id) {
      baseQuery = baseQuery.where('counseling_records.incident_id', query.incident_id);
    }

    // Role visibility filtering
    const roleInfo = this._getUserRoleInfo(user);
    if (!roleInfo.isAdminUnit && !roleInfo.isBK) {
      if (roleInfo.isWaliKelas) {
        baseQuery = baseQuery.whereIn('counseling_records.visibility_level', ['bk_and_homeroom', 'all_staff']);
      } else {
        baseQuery = baseQuery.where('counseling_records.visibility_level', 'all_staff');
      }
    }

    return baseQuery.orderBy('counseling_records.session_date', 'desc');
  }

  async createCounselingRecord(payload, user = null) {
    const { student_id, session_date, service_type, notes, visibility_level, counselor_employee_id, incident_id, follow_up_status } = payload;
    if (!student_id || !session_date || !notes) {
      const error = new Error('Field student_id, session_date, dan notes wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const student = await db('students').where({ id: student_id }).first();
    const counselorId = counselor_employee_id || (user?.ref_type === 'staff' ? user.ref_id : null);

    const [id] = await db('counseling_records').insert({
      satuan_pendidikan_id: student?.satuan_pendidikan_id || null,
      student_id,
      incident_id: incident_id || null,
      session_date,
      service_type: service_type ? service_type.trim() : null,
      notes: notes.trim(),
      visibility_level: visibility_level || 'bk_only',
      counselor_employee_id: counselorId,
      follow_up_status: follow_up_status || 'completed',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('counseling_records').where({ id }).first();
  }

  // ==========================================
  // 6. Ekstrakurikuler
  // ==========================================
  async listExtracurriculars(query = {}) {
    let baseQuery = db('extracurriculars');
    const unitId = parseUnitId(query.satuan_pendidikan_id);
    if (unitId) {
      baseQuery = baseQuery.where((q) => {
        q.where('satuan_pendidikan_id', unitId).orWhereNull('satuan_pendidikan_id');
      });
    }

    const rows = await baseQuery.orderBy('name', 'asc');
    const enriched = [];
    for (const r of rows) {
      let supervisor_name = null;
      if (r.supervisor_employee_id) {
        try {
          const emp = await employeesService.getEmployeeById(r.supervisor_employee_id);
          supervisor_name = emp?.full_name || null;
        } catch (e) {}
      }
      enriched.push({ ...r, supervisor_name });
    }
    return enriched;
  }

  async createExtracurricular(payload) {
    const { satuan_pendidikan_id, name, supervisor_employee_id, schedule } = payload;
    if (!name) {
      const error = new Error('Field name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (supervisor_employee_id) {
      try {
        await employeesService.getEmployeeById(supervisor_employee_id);
      } catch (e) {
        const error = new Error(`Pembina (Employee ID ${supervisor_employee_id}) tidak valid`);
        error.statusCode = 422;
        throw error;
      }
    }

    const [id] = await db('extracurriculars').insert({
      satuan_pendidikan_id: satuan_pendidikan_id || null,
      name: name.trim(),
      supervisor_employee_id: supervisor_employee_id || null,
      schedule: schedule || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('extracurriculars').where({ id }).first();
  }

  async addExtracurricularMember(extracurricularId, payload) {
    const { student_id, academic_year_id } = payload;
    if (!student_id || !academic_year_id) {
      const error = new Error('Field student_id dan academic_year_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const extra = await db('extracurriculars').where({ id: extracurricularId }).first();
    if (!extra) {
      const error = new Error('Ekstrakurikuler tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const existing = await db('extracurricular_members')
      .where({ extracurricular_id: extracurricularId, student_id, academic_year_id })
      .first();

    if (existing) {
      return existing;
    }

    const [id] = await db('extracurricular_members').insert({
      extracurricular_id: extracurricularId,
      student_id,
      academic_year_id,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('extracurricular_members').where({ id }).first();
  }

  // ==========================================
  // 7. Kalender Akademik
  // ==========================================
  async listCalendarEvents(query = {}) {
    let baseQuery = db('academic_calendar_events')
      .leftJoin('grade_levels', 'academic_calendar_events.grade_level_id', 'grade_levels.id')
      .select(
        'academic_calendar_events.*',
        'grade_levels.name as grade_level_name'
      );

    const unitId = parseUnitId(query.satuan_pendidikan_id);
    if (unitId) {
      baseQuery = baseQuery.where(b => {
        b.where('academic_calendar_events.satuan_pendidikan_id', unitId)
          .orWhereNull('academic_calendar_events.satuan_pendidikan_id');
      });
    }

    return baseQuery.orderBy('academic_calendar_events.start_date', 'asc');
  }

  async createCalendarEvent(payload) {
    const { satuan_pendidikan_id, title, start_date, end_date, grade_level_id, notes } = payload;
    if (!title || !start_date || !end_date) {
      const error = new Error('Field title, start_date, dan end_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('academic_calendar_events').insert({
      satuan_pendidikan_id: satuan_pendidikan_id || null,
      title: title.trim(),
      start_date,
      end_date,
      grade_level_id: grade_level_id || null,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('academic_calendar_events').where({ id }).first();
  }
}

module.exports = new StudentAffairsService();
