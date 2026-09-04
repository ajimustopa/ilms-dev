/**
 * Students Service Implementation
 * Modul Akademik - Fitur: Data Master Siswa, Orang Tua / Wali, Mutasi, Onboarding,
 * Rekap Rapor DIK/DIN, Fisik Periodik & Dapodik Standard Lengkap
 */
const db = require('../../../config/db/akademik');
const schoolUnitsService = require('../../core/school-units/service');
const usersService = require('../../core/users/service');
const webhooksService = require('../../core/webhooks/service');
const { parseUnitId } = require('../../../utils/parseUnitId');

const DEFAULT_REPORT_RECAPS = [
  { grade_name: 'Kelas 7', semester: 'Semester 1' },
  { grade_name: 'Kelas 7', semester: 'Semester 2' },
  { grade_name: 'Kelas 8', semester: 'Semester 1' },
  { grade_name: 'Kelas 8', semester: 'Semester 2' },
  { grade_name: 'Kelas 9', semester: 'Semester 1' },
  { grade_name: 'Kelas 9', semester: 'Semester 2' }
];

function maskPii(val) {
  if (!val || typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed.length <= 4) return '****';
  return `${trimmed.slice(0, 4)}${'*'.repeat(Math.max(4, trimmed.length - 8))}${trimmed.slice(-4)}`;
}

function maskIncome(val) {
  return val ? '[Dirahasiakan]' : null;
}

function isPrivilegedUser(user) {
  if (!user) return false;
  if (user.is_super_admin || user.account_type === 'super_admin') return true;
  const roles = user.user_school_roles || user.roles || [];
  return roles.some(r => {
    const roleName = typeof r === 'string' ? r : r.role_name || r.name;
    return ['super_admin', 'admin_yayasan', 'admin_satuan_pendidikan', 'tu', 'guru', 'wali_kelas', 'guru_bk'].includes(roleName);
  });
}

class StudentsService {
  // ==========================================
  // 1. Data Induk Siswa (Students)
  // ==========================================
  async listStudents(query = {}, user = null) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.per_page || query.limit, 10) || 20);
    const offset = (page - 1) * limit;

    let baseQuery = db('students');

    const unitId = parseUnitId(query.satuan_pendidikan_id);
    if (unitId) {
      baseQuery = baseQuery.where('students.satuan_pendidikan_id', unitId);
    }
    if (query.cohort_id) {
      baseQuery = baseQuery.where('students.cohort_id', query.cohort_id);
    }
    if (query.status) {
      baseQuery = baseQuery.where('students.status', query.status);
    }
    if (query.dapodik_status) {
      baseQuery = baseQuery.where('students.dapodik_status', query.dapodik_status);
    }

    // Filter per Tahun Ajaran (Periodik)
    if (query.academic_year_id && query.academic_year_id !== 'all') {
      baseQuery = baseQuery.whereIn('students.id', function() {
        this.select('student_class_enrollments.student_id')
          .from('student_class_enrollments')
          .where('student_class_enrollments.academic_year_id', query.academic_year_id)
          .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal']);
      });
    }

    if (query.search) {
      const q = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where(builder => {
        builder.where('students.full_name', 'like', q)
          .orWhere('students.nickname', 'like', q)
          .orWhere('students.nis', 'like', q)
          .orWhere('students.nisn', 'like', q)
          .orWhere('students.nipd', 'like', q);
      });
    }

    const totalRow = await baseQuery.clone().count('students.id as total').first();
    const total = totalRow ? parseInt(totalRow.total, 10) : 0;

    const rawData = await baseQuery
      .orderBy('students.id', 'desc')
      .limit(limit)
      .offset(offset);

    // Attach active enrollment & class_group information (Khusus Rombel Reguler)
    const studentIds = rawData.map(s => s.id);
    let enrollmentsMap = {};
    if (studentIds.length > 0) {
      let enrQuery = db('student_class_enrollments')
        .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
        .leftJoin('academic_years', 'student_class_enrollments.academic_year_id', 'academic_years.id')
        .whereIn('student_class_enrollments.student_id', studentIds)
        .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
        .where(function() {
          this.whereNull('class_groups.type').orWhere('class_groups.type', 'reguler');
        });

      if (query.academic_year_id && query.academic_year_id !== 'all') {
        enrQuery = enrQuery.where('student_class_enrollments.academic_year_id', query.academic_year_id);
      }

      const enrollments = await enrQuery
        .select(
          'student_class_enrollments.id as enrollment_id',
          'student_class_enrollments.student_id',
          'class_groups.id as class_group_id',
          'class_groups.name as class_group_name',
          'academic_years.id as academic_year_id',
          'academic_years.name as academic_year_name',
          'academic_years.is_active as is_year_active'
        )
        .orderBy('academic_years.is_active', 'desc')
        .orderBy('student_class_enrollments.id', 'desc');

      for (const enr of enrollments) {
        if (!enrollmentsMap[enr.student_id]) {
          enrollmentsMap[enr.student_id] = enr;
        }
      }
    }

    const privileged = isPrivilegedUser(user);
    const data = rawData.map(item => {
      const enr = enrollmentsMap[item.id] || null;
      const baseItem = {
        ...item,
        class_group_id: enr?.class_group_id || null,
        class_group_name: enr?.class_group_name || null,
        enrollment_id: enr?.enrollment_id || null,
        academic_year_id: enr?.academic_year_id || null,
        academic_year_name: enr?.academic_year_name || null
      };

      if (privileged) return baseItem;
      return {
        ...baseItem,
        family_card_number: maskPii(item.family_card_number),
        nik: maskPii(item.nik)
      };
    });

    return {
      data,
      pagination: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  }

  async getStudentById(id, user = null) {
    const student = await db('students').where({ id }).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Data Alamat (1:1)
    const address = await db('student_addresses').where({ student_id: id }).first();

    // 2. Data Fisik Dasar (1:1)
    const physicalData = await db('student_physical_data').where({ student_id: id }).first();

    // 3. Data Fisik Periodik (1:N)
    const periodicPhysicalRecords = await db('student_periodic_physical_records')
      .where({ student_id: id })
      .orderBy('record_date', 'desc')
      .orderBy('id', 'desc');

    // 4. Data Registrasi & Masuk (1:1)
    const admission = await db('student_admissions')
      .leftJoin('grade_levels', 'student_admissions.initial_grade_level_id', 'grade_levels.id')
      .leftJoin('class_groups', 'student_admissions.initial_class_group_id', 'class_groups.id')
      .where('student_admissions.student_id', id)
      .select(
        'student_admissions.*',
        'grade_levels.name as initial_grade_name',
        'class_groups.name as initial_class_name'
      )
      .first();

    // 5. Checklist Berkas Pendaftaran (1:1)
    const documentChecklist = await db('student_document_checklists').where({ student_id: id }).first();

    // 6. Data Orang Tua / Wali (1:N)
    const rawGuardians = await db('student_guardians')
      .join('guardians', 'student_guardians.guardian_id', 'guardians.id')
      .where('student_guardians.student_id', id)
      .select(
        'guardians.*',
        'student_guardians.relationship',
        'student_guardians.expense_bearer',
        'student_guardians.is_primary_contact'
      );

    const privileged = isPrivilegedUser(user);

    const guardians = rawGuardians.map(g => {
      if (privileged) return g;
      return {
        ...g,
        nik: maskPii(g.nik),
        income_range: maskIncome(g.income_range)
      };
    });

    // 7. Kelengkapan Rekap Rapor DIK/DIN (1:N)
    let reportCardRecaps = await db('student_report_card_recap_checklists')
      .where({ student_id: id })
      .orderBy('grade_name', 'asc')
      .orderBy('semester', 'asc');

    if (reportCardRecaps.length === 0) {
      // Auto seed default semester templates
      const seedRows = DEFAULT_REPORT_RECAPS.map(item => ({
        student_id: id,
        grade_name: item.grade_name,
        semester: item.semester,
        dik_status: false,
        din_status: false,
        created_at: new Date(),
        updated_at: new Date()
      }));
      await db('student_report_card_recap_checklists').insert(seedRows);
      reportCardRecaps = await db('student_report_card_recap_checklists')
        .where({ student_id: id })
        .orderBy('grade_name', 'asc')
        .orderBy('semester', 'asc');
    }

    // 8. Riwayat Mutasi / Kelulusan (1:N)
    const mutations = await db('student_mutations')
      .where({ student_id: id })
      .orderBy('id', 'desc');

    return {
      ...student,
      family_card_number: privileged ? student.family_card_number : maskPii(student.family_card_number),
      nik: privileged ? student.nik : maskPii(student.nik),
      student_address: address || null,
      physical_data: physicalData || null,
      periodic_physical_records: periodicPhysicalRecords || [],
      admission: admission || null,
      document_checklist: documentChecklist || null,
      guardians: guardians || [],
      report_card_recaps: reportCardRecaps || [],
      mutations: mutations || []
    };
  }

  async createStudent(payload) {
    const {
      satuan_pendidikan_id,
      nis,
      nisn,
      nipd,
      family_card_number,
      nik,
      full_name,
      nickname,
      gender,
      birth_place,
      birth_date,
      birth_certificate_reg_no,
      order_in_family,
      number_of_siblings,
      number_of_step_siblings,
      number_of_adoptive_siblings,
      religion,
      citizenship,
      special_needs,
      primary_language,
      hobby,
      ambition,
      photo_url,
      status,
      dapodik_status,
      dapodik_notes,
      enrolled_at,
      student_address,
      physical_data,
      admission,
      document_checklist
    } = payload;

    if (!satuan_pendidikan_id || !nis || !full_name || !gender) {
      const error = new Error('Field satuan_pendidikan_id, nis, full_name, dan gender wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Cek duplikasi NIS
    const existingNis = await db('students')
      .where({ satuan_pendidikan_id, nis: nis.trim() })
      .first();
    if (existingNis) {
      const error = new Error(`NIS ${nis} sudah terdaftar pada Satuan Pendidikan ini`);
      error.statusCode = 409;
      throw error;
    }

    const [studentId] = await db('students').insert({
      satuan_pendidikan_id,
      cohort_id: payload.cohort_id || null,
      cohort_name: payload.cohort_name || null,
      nis: nis.trim(),
      nisn: nisn ? nisn.trim() : null,
      nipd: nipd ? nipd.trim() : null,
      family_card_number: family_card_number ? family_card_number.trim() : null,
      nik: nik ? nik.trim() : null,
      full_name: full_name.trim(),
      nickname: nickname ? nickname.trim() : null,
      gender,
      birth_place: birth_place || null,
      birth_date: birth_date || null,
      birth_certificate_reg_no: birth_certificate_reg_no || null,
      order_in_family: order_in_family || null,
      number_of_siblings: number_of_siblings || null,
      number_of_step_siblings: number_of_step_siblings || null,
      number_of_adoptive_siblings: number_of_adoptive_siblings || null,
      religion: religion || null,
      citizenship: citizenship || 'WNI',
      special_needs: special_needs || null,
      primary_language: primary_language || null,
      hobby: hobby || null,
      ambition: ambition || null,
      address: student_address?.full_address || student_address?.street_address || null,
      photo_url: photo_url || null,
      status: status || 'aktif',
      data_entry_mode: data_entry_mode || 'lengkap',
      dapodik_status: dapodik_status || 'belum_masuk_dapodik',
      dapodik_notes: dapodik_notes || null,
      enrolled_at: enrolled_at || new Date().toISOString().split('T')[0],
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // 1. Simpan student_addresses
    if (student_address) {
      await db('student_addresses').insert({
        student_id: studentId,
        street_address: student_address.street_address || null,
        rt: student_address.rt || null,
        rw: student_address.rw || null,
        hamlet: student_address.hamlet || null,
        village: student_address.village || null,
        district: student_address.district || null,
        postal_code: student_address.postal_code || null,
        email: student_address.email || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    // 2. Simpan student_physical_data
    if (physical_data) {
      await db('student_physical_data').insert({
        student_id: studentId,
        height_cm: physical_data.height_cm || null,
        weight_kg: physical_data.weight_kg || null,
        head_circumference_cm: physical_data.head_circumference_cm || null,
        blood_type: physical_data.blood_type || null,
        severe_disease: physical_data.severe_disease || null,
        dietary_restrictions: physical_data.dietary_restrictions || null,
        health_notes: physical_data.health_notes || null,
        medical_history: physical_data.medical_history || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    // 3. Simpan student_admissions
    if (admission) {
      await db('student_admissions').insert({
        student_id: studentId,
        initial_grade_level_id: admission.initial_grade_level_id || null,
        initial_class_group_id: admission.initial_class_group_id || null,
        registration_type: admission.registration_type || 'siswa_baru',
        admission_date: admission.admission_date || new Date().toISOString().split('T')[0],
        previous_school_name: admission.previous_school_name || null,
        previous_school_address: admission.previous_school_address || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    // 4. Simpan student_document_checklists
    if (document_checklist) {
      await db('student_document_checklists').insert({
        student_id: studentId,
        ...document_checklist,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    // 5. Inisialisasi Rekap Rapor DIK/DIN
    const seedRows = DEFAULT_REPORT_RECAPS.map(item => ({
      student_id: studentId,
      grade_name: item.grade_name,
      semester: item.semester,
      dik_status: false,
      din_status: false,
      created_at: new Date(),
      updated_at: new Date()
    }));
    await db('student_report_card_recap_checklists').insert(seedRows);

    // 6. Hubungkan ke Tahun Ajaran & Rombel (Data Periodik)
    const targetAcademicYearId = payload.academic_year_id || (await db('academic_years').where({ satuan_pendidikan_id, is_active: 1 }).first())?.id;
    const targetClassGroupId = payload.class_group_id || admission?.initial_class_group_id || null;

    if (targetAcademicYearId && targetClassGroupId) {
      await db('student_class_enrollments').insert({
        satuan_pendidikan_id,
        student_id: studentId,
        class_group_id: targetClassGroupId,
        academic_year_id: targetAcademicYearId,
        status: 'aktif',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    // 7. Auto Provision Akun Core Siswa
    try {
      const { generateShortUsername } = require('../../../utils/usernameGenerator');
      const coreDb = require('../../../config/db/core');
      const existingUsernames = new Set((await coreDb('users').select('username')).map(u => u.username));
      const generatedUsername = generateShortUsername(full_name.trim(), existingUsernames);

      await usersService.internalCreateUser({
        username: generatedUsername,
        password: 'abs321',
        full_name: full_name.trim(),
        account_type: 'student',
        ref_type: 'student',
        ref_id: studentId,
        school_unit_id: satuan_pendidikan_id,
        role_id: 18 // Role siswa
      });
    } catch (e) {
      console.warn(`[Student Account Provisioning Warning] Gagal membuat akun Core untuk siswa ${studentId}:`, e.message);
    }

    return this.getStudentById(studentId, { is_super_admin: true });
  }

  // ==========================================
  // Kenaikan Kelas / Roll-over Tahun Ajaran (Periodik)
  // ==========================================
  async promoteStudents(payload, user = null) {
    const {
      satuan_pendidikan_id,
      target_academic_year_id,
      target_class_group_id,
      student_ids,
      students, // Optional array of { student_id, target_class_group_id, decision }
      decision // Global fallback decision (mis. "Naik Kelas", "Tinggal Kelas")
    } = payload;

    const recordedBy = user?.full_name || user?.username || 'Admin Akademik';

    // Normalize student list
    let candidateList = [];
    if (Array.isArray(students) && students.length > 0) {
      candidateList = students;
    } else if (Array.isArray(student_ids) && student_ids.length > 0) {
      candidateList = student_ids.map((id) => ({
        student_id: Number(id),
        target_class_group_id: Number(target_class_group_id),
        decision: decision || 'Naik Kelas'
      }));
    } else {
      const error = new Error('Field student_ids atau students (array) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const processed = [];
    for (const item of candidateList) {
      const sId = item.student_id;
      const targetClassId = item.target_class_group_id || target_class_group_id;
      const studentDecision = item.decision || decision || 'Naik Kelas';

      if (!targetClassId) continue;

      const targetClass = await db('class_groups').where({ id: targetClassId }).first();
      const targetYearId = target_academic_year_id || targetClass?.academic_year_id || 1;
      const gradeLevelId = targetClass?.grade_level_id || 1;
      const unitId = satuan_pendidikan_id || targetClass?.satuan_pendidikan_id || 1;

      // 1. Nonaktifkan status enrollment lama siswa
      const prevEnrollmentStatus = String(studentDecision).toLowerCase().includes('tinggal') ? 'tinggal_kelas' : 'naik_kelas';
      await db('student_class_enrollments')
        .where({ student_id: sId, status: 'aktif' })
        .update({ status: prevEnrollmentStatus, updated_at: db.fn.now() });

      // 2. Buat atau update enrollment di rombel tujuan tahun ajaran baru
      const existing = await db('student_class_enrollments')
        .where({ student_id: sId, academic_year_id: targetYearId })
        .first();

      if (existing) {
        await db('student_class_enrollments')
          .where({ id: existing.id })
          .update({
            class_group_id: targetClassId,
            status: 'aktif',
            updated_at: db.fn.now()
          });
        processed.push(existing.id);
      } else {
        const [newId] = await db('student_class_enrollments').insert({
          satuan_pendidikan_id: unitId,
          student_id: sId,
          class_group_id: targetClassId,
          academic_year_id: targetYearId,
          status: 'aktif',
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        processed.push(newId);
      }

      // 3. Catat riwayat historis ke student_class_history (Append-Only)
      await db('student_class_history').insert({
        student_id: sId,
        academic_year_id: targetYearId,
        class_group_id: targetClassId,
        grade_level_id: gradeLevelId,
        enrollment_type: 'promotion',
        decision: studentDecision,
        recorded_at: db.fn.now(),
        recorded_by: recordedBy
      });

      // Update student status jika sebelumnya bukan aktif
      await db('students').where({ id: sId }).update({
        status: 'aktif',
        updated_at: db.fn.now()
      });
    }

    return {
      message: `Berhasil memproses kenaikan / penempatan ${processed.length} siswa`,
      count: processed.length
    };
  }

  async updateStudent(id, payload, user = null) {
    const student = await db('students').where({ id }).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    const allowed = [
      'cohort_id',
      'cohort_name',
      'nis',
      'nisn',
      'nipd',
      'family_card_number',
      'nik',
      'full_name',
      'nickname',
      'gender',
      'birth_place',
      'birth_date',
      'birth_certificate_reg_no',
      'order_in_family',
      'number_of_siblings',
      'number_of_step_siblings',
      'number_of_adoptive_siblings',
      'religion',
      'citizenship',
      'special_needs',
      'primary_language',
      'hobby',
      'ambition',
      'address',
      'photo_url',
      'status',
      'data_entry_mode',
      'dapodik_status',
      'dapodik_notes',
      'enrolled_at'
    ];

    for (const key of allowed) {
      if (payload[key] !== undefined) updateData[key] = payload[key];
    }

    await db('students').where({ id }).update(updateData);

    // Update child sub-sections jika disertakan
    if (payload.student_address) {
      await this.updateAddress(id, payload.student_address);
    }
    if (payload.physical_data) {
      await this.updatePhysicalData(id, payload.physical_data);
    }
    if (payload.admission) {
      await this.updateAdmission(id, payload.admission);
    }
    if (payload.document_checklist) {
      await this.updateDocumentChecklist(id, payload.document_checklist);
    }

    return this.getStudentById(id, user);
  }

  async deleteStudent(id) {
    const student = await db('students').where({ id }).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('students').where({ id }).update({
      status: 'nonaktif',
      updated_at: db.fn.now()
    });

    return { id: Number(id), status: 'nonaktif' };
  }

  // ==========================================
  // 2. Alamat Siswa (student_addresses)
  // ==========================================
  async updateAddress(studentId, payload) {
    const existing = await db('student_addresses').where({ student_id: studentId }).first();
    const updateFields = {
      street_address: payload.street_address !== undefined ? payload.street_address : undefined,
      rt: payload.rt !== undefined ? payload.rt : undefined,
      rw: payload.rw !== undefined ? payload.rw : undefined,
      hamlet: payload.hamlet !== undefined ? payload.hamlet : undefined,
      village: payload.village !== undefined ? payload.village : undefined,
      district: payload.district !== undefined ? payload.district : undefined,
      postal_code: payload.postal_code !== undefined ? payload.postal_code : undefined,
      full_address: payload.full_address !== undefined ? payload.full_address : undefined,
      email: payload.email !== undefined ? payload.email : undefined,
      updated_at: db.fn.now()
    };

    // Bersihkan undefined
    Object.keys(updateFields).forEach(k => updateFields[k] === undefined && delete updateFields[k]);

    if (existing) {
      await db('student_addresses').where({ student_id: studentId }).update(updateFields);
    } else {
      await db('student_addresses').insert({
        student_id: studentId,
        ...updateFields,
        created_at: db.fn.now()
      });
    }

    return db('student_addresses').where({ student_id: studentId }).first();
  }

  // ==========================================
  // 3. Data Fisik & Riwayat Periodik
  // ==========================================
  async updatePhysicalData(studentId, payload) {
    const existing = await db('student_physical_data').where({ student_id: studentId }).first();
    const fields = {
      height_cm: payload.height_cm,
      weight_kg: payload.weight_kg,
      head_circumference_cm: payload.head_circumference_cm,
      blood_type: payload.blood_type,
      severe_disease: payload.severe_disease,
      dietary_restrictions: payload.dietary_restrictions,
      health_notes: payload.health_notes,
      medical_history: payload.medical_history,
      updated_at: db.fn.now()
    };
    Object.keys(fields).forEach(k => fields[k] === undefined && delete fields[k]);

    if (existing) {
      await db('student_physical_data').where({ student_id: studentId }).update(fields);
    } else {
      await db('student_physical_data').insert({
        student_id: studentId,
        ...fields,
        created_at: db.fn.now()
      });
    }

    return db('student_physical_data').where({ student_id: studentId }).first();
  }

  async savePeriodicPhysical(studentId, payload) {
    const { record_date, period_label, height_cm, weight_kg, head_circumference_cm, notes, recorded_by } = payload;
    if (!record_date || height_cm === undefined || weight_kg === undefined) {
      const error = new Error('Field record_date, height_cm, dan weight_kg wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('student_periodic_physical_records').insert({
      student_id: studentId,
      record_date,
      period_label: period_label || null,
      height_cm: Number(height_cm),
      weight_kg: Number(weight_kg),
      head_circumference_cm: head_circumference_cm ? Number(head_circumference_cm) : null,
      notes: notes || null,
      recorded_by: recorded_by || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Sinkronkan juga data fisik terbaru ke student_physical_data
    await this.updatePhysicalData(studentId, {
      height_cm: Number(height_cm),
      weight_kg: Number(weight_kg),
      head_circumference_cm: head_circumference_cm ? Number(head_circumference_cm) : null
    });

    return db('student_periodic_physical_records').where({ id }).first();
  }

  async deletePeriodicPhysical(studentId, recordId) {
    await db('student_periodic_physical_records')
      .where({ id: recordId, student_id: studentId })
      .del();
    return { id: Number(recordId), deleted: true };
  }

  // ==========================================
  // 4. Orang Tua / Wali Siswa (Guardians)
  // ==========================================
  async saveGuardian(studentId, payload) {
    const {
      guardian_id,
      relationship,
      expense_bearer,
      is_primary_contact,
      validation_status,
      nik,
      full_name,
      birth_place,
      birth_date,
      education_level,
      occupation,
      income_range,
      special_needs,
      phone,
      email,
      address
    } = payload;

    if (!full_name) {
      const error = new Error('Nama lengkap orang tua / wali wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    let targetGuardianId = guardian_id;

    if (targetGuardianId) {
      // Update guardian yang ada
      await db('guardians').where({ id: targetGuardianId }).update({
        nik: nik || null,
        full_name: full_name.trim(),
        validation_status: validation_status || 'unverified',
        birth_place: birth_place || null,
        birth_date: birth_date || null,
        education_level: education_level || null,
        occupation: occupation || null,
        income_range: income_range || null,
        special_needs: special_needs || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        updated_at: db.fn.now()
      });
    } else {
      // Buat baru
      const [newId] = await db('guardians').insert({
        nik: nik || null,
        full_name: full_name.trim(),
        validation_status: validation_status || 'unverified',
        birth_place: birth_place || null,
        birth_date: birth_date || null,
        education_level: education_level || null,
        occupation: occupation || null,
        income_range: income_range || null,
        special_needs: special_needs || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      targetGuardianId = newId;
    }

    const rel = relationship || 'ayah';
    const bearer = expense_bearer || rel;

    // Relasikan pivot student_guardians
    const existingPivot = await db('student_guardians')
      .where({ student_id: studentId, guardian_id: targetGuardianId })
      .first();

    if (existingPivot) {
      await db('student_guardians')
        .where({ student_id: studentId, guardian_id: targetGuardianId })
        .update({
          relationship: rel,
          expense_bearer: bearer,
          is_primary_contact: !!is_primary_contact,
          updated_at: db.fn.now()
        });
    } else {
      await db('student_guardians').insert({
        student_id: studentId,
        guardian_id: targetGuardianId,
        relationship: rel,
        expense_bearer: bearer,
        is_primary_contact: !!is_primary_contact,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    return this.getStudentById(studentId, { is_super_admin: true });
  }

  async deleteGuardian(studentId, guardianId) {
    await db('student_guardians')
      .where({ student_id: studentId, guardian_id: guardianId })
      .del();
    return { student_id: Number(studentId), guardian_id: Number(guardianId), deleted: true };
  }

  // ==========================================
  // 5. Registrasi Masuk (student_admissions)
  // ==========================================
  async updateAdmission(studentId, payload) {
    const existing = await db('student_admissions').where({ student_id: studentId }).first();
    const fields = {
      initial_grade_level_id: payload.initial_grade_level_id || null,
      initial_class_group_id: payload.initial_class_group_id || null,
      registration_type: payload.registration_type || 'siswa_baru',
      admission_date: payload.admission_date || new Date().toISOString().split('T')[0],
      previous_school_name: payload.previous_school_name || null,
      previous_school_address: payload.previous_school_address || null,
      updated_at: db.fn.now()
    };

    if (existing) {
      await db('student_admissions').where({ student_id: studentId }).update(fields);
    } else {
      await db('student_admissions').insert({
        student_id: studentId,
        ...fields,
        created_at: db.fn.now()
      });
    }

    return db('student_admissions').where({ student_id: studentId }).first();
  }

  // ==========================================
  // 6. Checklist Berkas Pendaftaran
  // ==========================================
  async updateDocumentChecklist(studentId, payload) {
    const existing = await db('student_document_checklists').where({ student_id: studentId }).first();
    const allowed = [
      'form_submitted',
      'form_verified',
      'form_file_url',
      'birth_cert_submitted',
      'birth_cert_verified',
      'birth_cert_file_url',
      'family_card_submitted',
      'family_card_verified',
      'family_card_file_url',
      'father_ktp_submitted',
      'father_ktp_verified',
      'father_ktp_file_url',
      'mother_ktp_submitted',
      'mother_ktp_verified',
      'mother_ktp_file_url',
      'other_docs_submitted',
      'other_docs_verified',
      'other_docs_file_url',
      'photo_2x3_submitted',
      'photo_2x3_verified',
      'photo_2x3_file_url',
      'photo_3x4_submitted',
      'photo_3x4_verified',
      'photo_3x4_file_url',
      'ijazah_submitted',
      'ijazah_verified',
      'ijazah_file_url',
      'class_group_joined',
      'class_group_joined_verified',
      'teacher_socialized',
      'teacher_socialized_verified',
      'learning_started',
      'learning_started_verified',
      'data_completed',
      'data_verified',
      'notes'
    ];

    const fields = { updated_at: db.fn.now() };
    for (const k of allowed) {
      if (payload[k] !== undefined) fields[k] = payload[k];
    }

    if (existing) {
      await db('student_document_checklists').where({ student_id: studentId }).update(fields);
    } else {
      await db('student_document_checklists').insert({
        student_id: studentId,
        ...fields,
        created_at: db.fn.now()
      });
    }

    return db('student_document_checklists').where({ student_id: studentId }).first();
  }

  // ==========================================
  // 7. Kelengkapan Rekap Rapor DIK/DIN
  // ==========================================
  async saveReportCardRecaps(studentId, recapsArray) {
    if (!Array.isArray(recapsArray)) {
      const error = new Error('recapsArray harus berupa array');
      error.statusCode = 422;
      throw error;
    }

    for (const item of recapsArray) {
      if (!item.grade_name || !item.semester) continue;
      const existing = await db('student_report_card_recap_checklists')
        .where({ student_id: studentId, grade_name: item.grade_name, semester: item.semester })
        .first();

      if (existing) {
        await db('student_report_card_recap_checklists')
          .where({ id: existing.id })
          .update({
            dik_status: !!item.dik_status,
            din_status: !!item.din_status,
            file_url_dik: item.file_url_dik !== undefined ? item.file_url_dik : undefined,
            file_url_din: item.file_url_din !== undefined ? item.file_url_din : undefined,
            notes: item.notes !== undefined ? item.notes : undefined,
            updated_at: db.fn.now()
          });
      } else {
        await db('student_report_card_recap_checklists').insert({
          student_id: studentId,
          grade_name: item.grade_name,
          semester: item.semester,
          dik_status: !!item.dik_status,
          din_status: !!item.din_status,
          file_url_dik: item.file_url_dik || null,
          file_url_din: item.file_url_din || null,
          notes: item.notes || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    return db('student_report_card_recap_checklists')
      .where({ student_id: studentId })
      .orderBy('grade_name', 'asc')
      .orderBy('semester', 'asc');
  }

  // ==========================================
  // 8. Mutasi & Kelulusan (student_mutations)
  // ==========================================
  async listMutations(query = {}) {
    let baseQuery = db('student_mutations')
      .join('students', 'student_mutations.student_id', 'students.id')
      .select(
        'student_mutations.*',
        'students.full_name as student_name',
        'students.nis'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('student_mutations.student_id', query.student_id);
    }
    if (query.mutation_type) {
      baseQuery = baseQuery.where('student_mutations.mutation_type', query.mutation_type);
    }
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('student_mutations.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }

    return baseQuery.orderBy('student_mutations.id', 'desc');
  }

  async createMutation(payload) {
    const {
      student_id,
      mutation_type,
      mutation_date,
      origin_or_destination_school,
      notes,
      satuan_pendidikan_id,
      exam_participant_number,
      diploma_certificate_number,
      skhun_number,
      next_school_name,
      transfer_reason,
      exit_letter_number,
      acceptance_letter_status,
      dapodik_mutation_letter_status
    } = payload;

    if (!student_id || !mutation_type || !mutation_date) {
      const error = new Error('Field student_id, mutation_type, dan mutation_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const student = await db('students').where({ id: student_id }).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const targetSchoolUnitId = satuan_pendidikan_id || student.satuan_pendidikan_id;

    const [mutationId] = await db('student_mutations').insert({
      satuan_pendidikan_id: targetSchoolUnitId,
      student_id,
      mutation_type,
      mutation_date,
      origin_or_destination_school: origin_or_destination_school || null,
      notes: notes || null,
      exam_participant_number: exam_participant_number || null,
      diploma_certificate_number: diploma_certificate_number || null,
      skhun_number: skhun_number || null,
      next_school_name: next_school_name || null,
      transfer_reason: transfer_reason || null,
      exit_letter_number: exit_letter_number || null,
      acceptance_letter_status: acceptance_letter_status || null,
      dapodik_mutation_letter_status: dapodik_mutation_letter_status || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    let newStatus = student.status;
    if (mutation_type === 'lulus') newStatus = 'lulus';
    else if (mutation_type === 'pindah_keluar' || mutation_type === 'transferred') newStatus = 'pindah';
    else if (mutation_type === 'keluar' || mutation_type === 'dropped_out') newStatus = 'keluar';
    else if (mutation_type === 'masuk' || mutation_type === 'pindah_masuk') newStatus = 'aktif';

    await db('students').where({ id: student_id }).update({
      status: newStatus,
      updated_at: db.fn.now()
    });

    // Jika mutasi keluar / lulus, nonaktifkan enrollment di rombel aktif (riwayat student_class_history tetap utuh)
    if (['lulus', 'pindah_keluar', 'keluar', 'transferred', 'dropped_out'].includes(mutation_type)) {
      await db('student_class_enrollments')
        .where({ student_id })
        .update({
          status: mutation_type === 'lulus' ? 'lulus' : 'pindah',
          updated_at: db.fn.now()
        });
    }

    return db('student_mutations').where({ id: mutationId }).first();
  }

  // ==========================================
  // 9. Workflow Kelulusan Siswa (Alumni)
  // ==========================================
  async graduateStudents(payload, user = null) {
    const {
      student_ids,
      academic_year_id,
      graduation_date,
      decree_number,
      notes,
      satuan_pendidikan_id
    } = payload;

    if (!Array.isArray(student_ids) || student_ids.length === 0 || !graduation_date) {
      const error = new Error('Field student_ids (array) dan graduation_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const recordedBy = user?.full_name || user?.username || 'Admin Akademik';
    const gradDate = graduation_date.split('T')[0];

    const graduated = [];
    for (const studentId of student_ids) {
      const student = await db('students').where({ id: studentId }).first();
      if (!student) continue;

      const unitId = satuan_pendidikan_id || student.satuan_pendidikan_id || 1;

      // 1. Update status siswa menjadi 'lulus'
      await db('students').where({ id: studentId }).update({
        status: 'lulus',
        updated_at: db.fn.now()
      });

      // 2. Buat catatan mutasi kelulusan di student_mutations
      await db('student_mutations').insert({
        satuan_pendidikan_id: unitId,
        student_id: studentId,
        mutation_type: 'lulus',
        mutation_date: gradDate,
        exit_letter_number: decree_number || null,
        notes: notes || `Dinyatakan lulus pada tahun ajaran ${academic_year_id || '-'} sesuai SK ${decree_number || '-'}`,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      // 3. Selesaikan status enrollment rombel aktif
      await db('student_class_enrollments')
        .where({ student_id: studentId, status: 'aktif' })
        .update({
          status: 'lulus',
          updated_at: db.fn.now()
        });

      graduated.push(studentId);
    }

    return {
      message: `Berhasil memproses kelulusan ${graduated.length} santri menjadi alumni`,
      count: graduated.length,
      graduation_date: gradDate,
      decree_number
    };
  }

  // Data cetak SKL / Ijazah Kelulusan
  async getGraduationCertificateData(studentId) {
    const student = await db('students')
      .leftJoin('cohorts', 'students.cohort_id', 'cohorts.id')
      .select('students.*', 'cohorts.name as cohort_name')
      .where('students.id', studentId)
      .first();

    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Ambil mutasi kelulusan
    const graduationMutation = await db('student_mutations')
      .where({ student_id: studentId, mutation_type: 'lulus' })
      .orderBy('id', 'desc')
      .first();

    // Ambil rapor semester akhir
    const reportCard = await db('report_cards')
      .where({ student_id: studentId })
      .orderBy('id', 'desc')
      .first();

    // Ambil rekap nilai rapor
    const scores = await db('student_scores')
      .join('subjects', 'student_scores.subject_id', 'subjects.id')
      .where({ 'student_scores.student_id': studentId })
      .select(
        'student_scores.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code'
      );

    // Ambil wali santri
    const guardians = await db('student_guardians')
      .join('guardians', 'student_guardians.guardian_id', 'guardians.id')
      .where({ 'student_guardians.student_id': studentId })
      .select('guardians.*', 'student_guardians.relationship');

    return {
      student,
      graduation_info: graduationMutation || {
        mutation_date: new Date().toISOString().split('T')[0],
        exit_letter_number: 'SKL/2026/001'
      },
      last_report_card: reportCard || null,
      scores: scores || [],
      guardians: guardians || []
    };
  }

  // ==========================================
  // 10. Riwayat Kronologis Rombel Siswa (student_class_history)
  // ==========================================
  async getStudentClassHistory(studentId) {
    const history = await db('student_class_history')
      .leftJoin('academic_years', 'student_class_history.academic_year_id', 'academic_years.id')
      .leftJoin('class_groups', 'student_class_history.class_group_id', 'class_groups.id')
      .leftJoin('grade_levels', 'student_class_history.grade_level_id', 'grade_levels.id')
      .select(
        'student_class_history.*',
        'academic_years.name as academic_year_name',
        'class_groups.name as class_group_name',
        'grade_levels.name as grade_level_name'
      )
      .where('student_class_history.student_id', studentId)
      .orderBy('student_class_history.recorded_at', 'asc');

    return history;
  }

  // ==========================================
  // 11. Tambah Cepat Siswa Riwayat / Alumni (Quick Add Legacy)
  // ==========================================
  async quickAddLegacyStudent(payload, user = null) {
    const {
      full_name,
      nis,
      nisn,
      gender,
      birth_date,
      cohort_id,
      graduation_year,
      status = 'lulus',
      entry_academic_year_id,
      class_group_id,
      satuan_pendidikan_id
    } = payload;

    if (!full_name || !full_name.trim()) {
      const error = new Error('Field full_name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const unitId = satuan_pendidikan_id || 1;
    const recordedBy = user?.full_name || user?.username || 'Admin Import';

    // 1. Cek duplikasi (warning, bukan hard block)
    let warning = null;
    if (nisn && nisn.trim()) {
      const matchNisn = await db('students').where('nisn', nisn.trim()).first();
      if (matchNisn) {
        warning = `Perhatian: Ditemukan siswa dengan NISN sama: "${matchNisn.full_name}" (ID: ${matchNisn.id}, Status: ${matchNisn.status})`;
      }
    }

    if (!warning && birth_date) {
      const bDate = birth_date.split('T')[0];
      const matchNameBirth = await db('students')
        .where('satuan_pendidikan_id', unitId)
        .whereRaw('LOWER(full_name) = ?', [full_name.trim().toLowerCase()])
        .where('birth_date', bDate)
        .first();

      if (matchNameBirth) {
        warning = `Perhatian: Ditemukan siswa dengan nama & tanggal lahir sama: "${matchNameBirth.full_name}" (ID: ${matchNameBirth.id})`;
      }
    }

    // 2. Auto-detect / create cohort jika graduation_year diisi
    let finalCohortId = cohort_id ? Number(cohort_id) : null;
    if (!finalCohortId && graduation_year) {
      const yearStr = String(graduation_year).trim();
      let cohort = await db('cohorts')
        .where('satuan_pendidikan_id', unitId)
        .where('year', yearStr)
        .first();

      if (!cohort) {
        const [cId] = await db('cohorts').insert({
          satuan_pendidikan_id: unitId,
          year: yearStr,
          name: `Angkatan ${yearStr}`,
          description: `Auto-generated cohort kelulusan ${yearStr}`,
          is_active: 1,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        finalCohortId = cId;
      } else {
        finalCohortId = cohort.id;
      }
    }

    // 3. Normalisasi status siswa & enrollment
    const validStatuses = ['calon', 'aktif', 'lulus', 'pindah', 'keluar'];
    const finalStudentStatus = validStatuses.includes(status) ? status : (status === 'transferred' ? 'pindah' : status === 'dropped_out' ? 'keluar' : 'lulus');

    const generatedNis = nis && String(nis).trim()
      ? String(nis).trim()
      : (nisn && String(nisn).trim() ? `LEG-${String(nisn).trim()}` : `LEG-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`);

    // 4. Insert ke students (mode ringkas_riwayat)
    const [studentId] = await db('students').insert({
      satuan_pendidikan_id: unitId,
      cohort_id: finalCohortId,
      cohort_name: graduation_year ? `Angkatan ${graduation_year}` : null,
      full_name: full_name.trim(),
      nis: generatedNis,
      nisn: nisn ? String(nisn).trim() : null,
      gender: gender === 'P' ? 'P' : 'L',
      birth_date: birth_date ? birth_date.split('T')[0] : null,
      status: finalStudentStatus,
      data_entry_mode: 'ringkas_riwayat',
      enrolled_at: new Date().toISOString().split('T')[0],
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // 5. Hubungkan ke rombel jika class_group_id disertakan
    if (class_group_id) {
      const classGroup = await db('class_groups').where('id', class_group_id).first();
      if (classGroup) {
        const targetYearId = classGroup.academic_year_id || entry_academic_year_id || 1;
        const enrollmentStatus = finalStudentStatus === 'lulus' ? 'lulus' : finalStudentStatus === 'pindah' ? 'pindah' : 'aktif';

        await db('student_class_enrollments').insert({
          satuan_pendidikan_id: unitId,
          student_id: studentId,
          class_group_id: class_group_id,
          academic_year_id: targetYearId,
          status: enrollmentStatus,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });

        await db('student_class_history').insert({
          student_id: studentId,
          academic_year_id: targetYearId,
          class_group_id: class_group_id,
          grade_level_id: classGroup.grade_level_id || 1,
          enrollment_type: 'manual',
          decision: `Data Riwayat Rombel / Alumni (${finalStudentStatus})`,
          recorded_at: db.fn.now(),
          recorded_by: recordedBy
        });
      }
    }

    const createdStudent = await db('students')
      .leftJoin('cohorts', 'students.cohort_id', 'cohorts.id')
      .select('students.*', 'cohorts.name as cohort_name')
      .where('students.id', studentId)
      .first();

    return {
      student: createdStudent,
      warning,
      is_duplicate_warning: !!warning
    };
  }

  // ==========================================
  // 12. Pencarian Cepat Siswa (Quick Search for Matching / Import)
  // ==========================================
  async searchQuick(query = {}) {
    const { q, satuan_pendidikan_id, limit = 20 } = query;
    let baseQuery = db('students')
      .leftJoin('student_class_enrollments as sce', function () {
        this.on('students.id', '=', 'sce.student_id')
          .andOn('sce.status', '=', db.raw('?', ['aktif']));
      })
      .leftJoin('class_groups', 'sce.class_group_id', 'class_groups.id')
      .leftJoin('cohorts', 'students.cohort_id', 'cohorts.id')
      .select(
        'students.id',
        'students.satuan_pendidikan_id',
        'students.full_name',
        'students.nis',
        'students.nisn',
        'students.gender',
        'students.birth_date',
        'students.status',
        'students.data_entry_mode',
        'cohorts.name as cohort_name',
        'class_groups.name as current_class_name'
      );

    if (satuan_pendidikan_id) {
      baseQuery = baseQuery.where('students.satuan_pendidikan_id', satuan_pendidikan_id);
    }

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      baseQuery = baseQuery.where(function () {
        this.where('students.full_name', 'like', term)
          .orWhere('students.nis', 'like', term)
          .orWhere('students.nisn', 'like', term);
      });
    }

    return baseQuery.orderBy('students.id', 'desc').limit(Number(limit));
  }
}

module.exports = new StudentsService();
