/**
 * PSB (Penerimaan Murid Baru) Service
 * Modul Akademik - Fitur PSB Terpadu (Proses, Gelombang, Pendaftar, Seleksi Tes, & Penempatan)
 */
const crypto = require('crypto');
const db = require('../../../config/db/akademik');
const coreDb = require('../../../config/db/core');
const keuanganDb = require('../../../config/db/keuangan');
const usersService = require('../../core/users/service');
const { generateShortUsername } = require('../../../utils/usernameGenerator');

class PsbService {
  // ============================================================
  // 1. PSB PROCESSES & UNITS
  // ============================================================

  async listProcesses(query = {}) {
    let q = db('psb_processes');

    if (query.search) {
      q = q.where('name', 'like', `%${query.search.trim()}%`);
    }
    if (query.target_academic_year) {
      q = q.where('target_academic_year', query.target_academic_year);
    }
    if (query.context_type) {
      q = q.where('context_type', query.context_type);
    }
    if (query.status) {
      q = q.where('status', query.status);
    }

    const items = await q.orderBy('id', 'desc');

    // Attach units overview
    for (const item of items) {
      item.units = await db('psb_process_units').where({ psb_process_id: item.id });
      item.total_target = item.units.reduce((acc, u) => acc + (u.target_registrants || 0), 0);
      item.total_quota_male = item.units.reduce((acc, u) => acc + (u.quota_male || 0), 0);
      item.total_quota_female = item.units.reduce((acc, u) => acc + (u.quota_female || 0), 0);
    }

    return items;
  }

  async getProcessById(id) {
    const process = await db('psb_processes').where({ id }).first();
    if (!process) {
      const error = new Error('Proses PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const units = await db('psb_process_units').where({ psb_process_id: id });
    const groups = await db('psb_groups').where({ psb_process_id: id }).orderBy('start_date', 'asc');
    const tests = await db('psb_tests').where({ psb_process_id: id });

    return {
      ...process,
      units,
      groups,
      tests
    };
  }

  async createProcess(payload) {
    const {
      name,
      description,
      target_academic_year,
      context_type = 'satuan',
      status = 'draft',
      start_date,
      end_date,
      units = []
    } = payload;

    if (!name || !target_academic_year) {
      const error = new Error('Nama proses dan tahun ajaran target wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    let processId;
    await db.transaction(async (trx) => {
      const [newId] = await trx('psb_processes').insert({
        name: name.trim(),
        description: description || null,
        target_academic_year: target_academic_year.trim(),
        context_type,
        status,
        start_date: start_date || null,
        end_date: end_date || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      processId = newId;

      if (Array.isArray(units) && units.length > 0) {
        for (const u of units) {
          if (u.satuan_pendidikan_id) {
            await trx('psb_process_units').insert({
              psb_process_id: processId,
              satuan_pendidikan_id: u.satuan_pendidikan_id,
              code_prefix: u.code_prefix ? u.code_prefix.trim().toUpperCase() : 'PSB',
              target_registrants: Number(u.target_registrants) || 0,
              quota_male: Number(u.quota_male) || 0,
              quota_female: Number(u.quota_female) || 0,
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            });
          }
        }
      }
    });

    return this.getProcessById(processId);
  }

  async updateProcess(id, payload) {
    const process = await db('psb_processes').where({ id }).first();
    if (!process) {
      const error = new Error('Proses PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const {
      name,
      description,
      target_academic_year,
      context_type,
      status,
      start_date,
      end_date
    } = payload;

    const updateData = { updated_at: db.fn.now() };
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (target_academic_year) updateData.target_academic_year = target_academic_year.trim();
    if (context_type) updateData.context_type = context_type;
    if (status) updateData.status = status;
    if (start_date !== undefined) updateData.start_date = start_date || null;
    if (end_date !== undefined) updateData.end_date = end_date || null;

    await db('psb_processes').where({ id }).update(updateData);
    return this.getProcessById(id);
  }

  async deleteProcess(id) {
    const process = await db('psb_processes').where({ id }).first();
    if (!process) {
      const error = new Error('Proses PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const registrantsCount = await db('psb_registrants').where({ psb_process_id: id }).count('id as total').first();
    if (registrantsCount && Number(registrantsCount.total) > 0) {
      const error = new Error('Proses PSB tidak dapat dihapus karena sudah memiliki data pendaftar');
      error.statusCode = 400;
      throw error;
    }

    await db('psb_processes').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  async getProcessUnits(processId) {
    return db('psb_process_units').where({ psb_process_id: processId });
  }

  async updateProcessUnits(processId, units = []) {
    const process = await db('psb_processes').where({ id: processId }).first();
    if (!process) {
      const error = new Error('Proses PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db.transaction(async (trx) => {
      for (const u of units) {
        if (!u.satuan_pendidikan_id) continue;

        const existing = await trx('psb_process_units')
          .where({ psb_process_id: processId, satuan_pendidikan_id: u.satuan_pendidikan_id })
          .first();

        const data = {
          code_prefix: u.code_prefix ? u.code_prefix.trim().toUpperCase() : 'PSB',
          target_registrants: Number(u.target_registrants) || 0,
          quota_male: Number(u.quota_male) || 0,
          quota_female: Number(u.quota_female) || 0,
          updated_at: db.fn.now()
        };

        if (existing) {
          await trx('psb_process_units')
            .where({ id: existing.id })
            .update(data);
        } else {
          await trx('psb_process_units').insert({
            psb_process_id: processId,
            satuan_pendidikan_id: u.satuan_pendidikan_id,
            ...data,
            created_at: db.fn.now()
          });
        }
      }
    });

    return this.getProcessUnits(processId);
  }

  async getProcessDashboard(processId) {
    const process = await db('psb_processes').where({ id: processId }).first();
    if (!process) {
      const error = new Error('Proses PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const units = await db('psb_process_units').where({ psb_process_id: processId });
    const registrants = await db('psb_registrants').where({ psb_process_id: processId });

    // Status breakdown
    const statusCounts = {
      registered: 0,
      testing: 0,
      test_passed: 0,
      test_failed: 0,
      placed: 0,
      rejected: 0,
      withdrawn: 0
    };

    let totalMale = 0;
    let totalFemale = 0;

    for (const r of registrants) {
      if (statusCounts[r.status] !== undefined) {
        statusCounts[r.status]++;
      }
    }

    // Units statistics
    const unitsStats = units.map((u) => {
      const unitRegistrants = registrants.filter((r) => r.satuan_pendidikan_id === u.satuan_pendidikan_id);
      const placedCount = unitRegistrants.filter((r) => r.status === 'placed').length;
      return {
        satuan_pendidikan_id: u.satuan_pendidikan_id,
        code_prefix: u.code_prefix,
        target_registrants: u.target_registrants || 0,
        quota_male: u.quota_male || 0,
        quota_female: u.quota_female || 0,
        total_quota: (u.quota_male || 0) + (u.quota_female || 0),
        actual_registrants: unitRegistrants.length,
        actual_placed: placedCount,
        achievement_rate: u.target_registrants ? Number(((unitRegistrants.length / u.target_registrants) * 100).toFixed(1)) : 0
      };
    });

    // Groups breakdown
    const groups = await db('psb_groups').where({ psb_process_id: processId });
    const groupsStats = groups.map((g) => {
      const count = registrants.filter((r) => r.psb_group_id === g.id).length;
      return {
        id: g.id,
        name: g.name,
        quota: g.quota,
        registered_count: count,
        is_active: g.is_active
      };
    });

    return {
      process_id: Number(processId),
      name: process.name,
      target_academic_year: process.target_academic_year,
      status: process.status,
      total_registrants: registrants.length,
      status_breakdown: statusCounts,
      units_stats: unitsStats,
      groups_stats: groupsStats
    };
  }

  // ============================================================
  // 2. PSB GROUPS (GELOMBANG / JALUR)
  // ============================================================

  async listGroups(query = {}) {
    let q = db('psb_groups');

    if (query.psb_process_id) {
      q = q.where('psb_process_id', query.psb_process_id);
    }
    if (query.satuan_pendidikan_id) {
      q = q.where((b) => {
        b.where('satuan_pendidikan_id', query.satuan_pendidikan_id)
          .orWhereNull('satuan_pendidikan_id');
      });
    }
    if (query.is_active !== undefined) {
      q = q.where('is_active', query.is_active === 'true' || query.is_active === true ? 1 : 0);
    }

    return q.orderBy('id', 'asc');
  }

  async getGroupById(id) {
    const group = await db('psb_groups').where({ id }).first();
    if (!group) {
      const error = new Error('Gelombang PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return group;
  }

  async createGroup(payload) {
    const {
      psb_process_id,
      satuan_pendidikan_id,
      name,
      description,
      quota,
      start_date,
      end_date,
      is_active = true
    } = payload;

    if (!psb_process_id || !name) {
      const error = new Error('psb_process_id dan nama gelombang wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('psb_groups').insert({
      psb_process_id,
      satuan_pendidikan_id: satuan_pendidikan_id || null,
      name: name.trim(),
      description: description || null,
      quota: quota ? Number(quota) : null,
      start_date: start_date || null,
      end_date: end_date || null,
      is_active: is_active ? 1 : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getGroupById(id);
  }

  async updateGroup(id, payload) {
    const group = await db('psb_groups').where({ id }).first();
    if (!group) {
      const error = new Error('Gelombang PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const {
      satuan_pendidikan_id,
      name,
      description,
      quota,
      start_date,
      end_date,
      is_active
    } = payload;

    const updateData = { updated_at: db.fn.now() };
    if (satuan_pendidikan_id !== undefined) updateData.satuan_pendidikan_id = satuan_pendidikan_id || null;
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (quota !== undefined) updateData.quota = quota ? Number(quota) : null;
    if (start_date !== undefined) updateData.start_date = start_date || null;
    if (end_date !== undefined) updateData.end_date = end_date || null;
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;

    await db('psb_groups').where({ id }).update(updateData);
    return this.getGroupById(id);
  }

  async deleteGroup(id) {
    const group = await db('psb_groups').where({ id }).first();
    if (!group) {
      const error = new Error('Gelombang PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_groups').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ============================================================
  // 3. PSB REGISTRANTS (PENDAFTARAN & DATA CALON MURID)
  // ============================================================

  /**
   * Helper internal untuk auto-generate registration_number: {code_prefix}-{00001}
   */
  async generateRegistrationNumber(psbProcessId, satuanPendidikanId) {
    const unitSetting = await db('psb_process_units')
      .where({ psb_process_id: psbProcessId, satuan_pendidikan_id: satuanPendidikanId })
      .first();

    const prefix = unitSetting?.code_prefix ? unitSetting.code_prefix.trim().toUpperCase() : 'PSB';

    const countRow = await db('psb_registrants')
      .where({ psb_process_id: psbProcessId, satuan_pendidikan_id: satuanPendidikanId })
      .count('id as total')
      .first();

    const nextSeq = (Number(countRow?.total) || 0) + 1;
    let candidateNumber = `${prefix}-${String(nextSeq).padStart(5, '0')}`;

    // Pastikan collision-free
    let collision = await db('psb_registrants').where({ registration_number: candidateNumber }).first();
    let offset = nextSeq;
    while (collision) {
      offset++;
      candidateNumber = `${prefix}-${String(offset).padStart(5, '0')}`;
      collision = await db('psb_registrants').where({ registration_number: candidateNumber }).first();
    }

    return candidateNumber;
  }

  /**
   * Helper internal untuk resolve nama fee_group dari DB Keuangan
   */
  async resolveFeeGroupName(feeGroupId) {
    if (!feeGroupId) return null;
    try {
      const group = await keuanganDb('fee_groups').where({ id: feeGroupId }).first();
      return group?.name || null;
    } catch (err) {
      console.warn('[PsbService] Warning resolving fee group from keuangan DB:', err.message);
      return null;
    }
  }

  async listRegistrants(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 50);
    const offset = (page - 1) * limit;

    let baseQuery = db('psb_registrants')
      .leftJoin('psb_processes', 'psb_registrants.psb_process_id', 'psb_processes.id')
      .leftJoin('psb_groups', 'psb_registrants.psb_group_id', 'psb_groups.id')
      .leftJoin('grade_levels', 'psb_registrants.requested_grade_level_id', 'grade_levels.id');

    if (query.psb_process_id) {
      baseQuery = baseQuery.where('psb_registrants.psb_process_id', query.psb_process_id);
    }
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('psb_registrants.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.psb_group_id) {
      baseQuery = baseQuery.where('psb_registrants.psb_group_id', query.psb_group_id);
    }
    if (query.status) {
      baseQuery = baseQuery.where('psb_registrants.status', query.status);
    }
    if (query.entry_type) {
      baseQuery = baseQuery.where('psb_registrants.entry_type', query.entry_type);
    }
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where((b) => {
        b.where('psb_registrants.full_name', 'like', s)
          .orWhere('psb_registrants.registration_number', 'like', s)
          .orWhere('psb_registrants.nisn', 'like', s)
          .orWhere('psb_registrants.father_name', 'like', s)
          .orWhere('psb_registrants.parent_contact', 'like', s);
      });
    }

    const countRes = await baseQuery.clone().count('psb_registrants.id as total').first();
    const totalItems = parseInt(countRes.total, 10) || 0;

    const items = await baseQuery
      .select(
        'psb_registrants.*',
        'psb_processes.name as psb_process_name',
        'psb_processes.target_academic_year',
        'psb_groups.name as psb_group_name',
        'grade_levels.name as requested_grade_level_name'
      )
      .orderBy('psb_registrants.id', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / limit) || 1
      }
    };
  }

  async getRegistrantById(id) {
    const registrant = await db('psb_registrants')
      .leftJoin('psb_processes', 'psb_registrants.psb_process_id', 'psb_processes.id')
      .leftJoin('psb_groups', 'psb_registrants.psb_group_id', 'psb_groups.id')
      .leftJoin('grade_levels', 'psb_registrants.requested_grade_level_id', 'grade_levels.id')
      .leftJoin('class_groups', 'psb_registrants.placed_class_group_id', 'class_groups.id')
      .where('psb_registrants.id', id)
      .select(
        'psb_registrants.*',
        'psb_processes.name as psb_process_name',
        'psb_processes.target_academic_year',
        'psb_groups.name as psb_group_name',
        'grade_levels.name as requested_grade_level_name',
        'class_groups.name as placed_class_group_name'
      )
      .first();

    if (!registrant) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Attach documents, test sessions, and placement logs
    const documents = await db('psb_registrant_documents').where({ psb_registrant_id: id });
    const testSessions = await db('psb_test_sessions')
      .join('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .where({ 'psb_test_sessions.psb_registrant_id': id })
      .select('psb_test_sessions.*', 'psb_tests.name as test_name', 'psb_tests.passing_score');
    const placementLogs = await db('psb_placement_logs').where({ psb_registrant_id: id }).orderBy('placed_at', 'desc');

    return {
      ...registrant,
      documents,
      test_sessions: testSessions,
      placement_logs: placementLogs
    };
  }

  async createRegistrant(payload) {
    const {
      psb_process_id,
      satuan_pendidikan_id,
      psb_group_id,
      nisn,
      full_name,
      address,
      previous_school_name,
      father_name,
      mother_name,
      parent_contact,
      entry_type = 'reguler',
      requested_grade_level_id,
      fee_group_id,
      source = 'admin_input',
      website_registrant_ref_id
    } = payload;

    if (!psb_process_id || !satuan_pendidikan_id || !full_name) {
      const error = new Error('psb_process_id, satuan_pendidikan_id, dan nama lengkap wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const regNumber = await this.generateRegistrationNumber(psb_process_id, satuan_pendidikan_id);
    const feeGroupName = await this.resolveFeeGroupName(fee_group_id);

    const [id] = await db('psb_registrants').insert({
      psb_process_id,
      satuan_pendidikan_id,
      psb_group_id: psb_group_id || null,
      registration_number: regNumber,
      nisn: nisn ? nisn.trim() : null,
      full_name: full_name.trim(),
      address: address || null,
      previous_school_name: previous_school_name || null,
      father_name: father_name || null,
      mother_name: mother_name || null,
      parent_contact: parent_contact || null,
      entry_type,
      requested_grade_level_id: requested_grade_level_id || null,
      fee_group_id: fee_group_id || null,
      fee_group_name_snapshot: feeGroupName,
      status: 'registered',
      source,
      website_registrant_ref_id: website_registrant_ref_id || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getRegistrantById(id);
  }

  async updateRegistrant(id, payload) {
    const reg = await db('psb_registrants').where({ id }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const allowedFields = [
      'psb_group_id',
      'nisn',
      'full_name',
      'address',
      'previous_school_name',
      'father_name',
      'mother_name',
      'parent_contact',
      'entry_type',
      'requested_grade_level_id',
      'fee_group_id',
      'status'
    ];

    const updateData = { updated_at: db.fn.now() };

    for (const key of allowedFields) {
      if (payload[key] !== undefined) {
        updateData[key] = payload[key];
      }
    }

    if (payload.fee_group_id !== undefined) {
      updateData.fee_group_name_snapshot = await this.resolveFeeGroupName(payload.fee_group_id);
    }

    await db('psb_registrants').where({ id }).update(updateData);
    return this.getRegistrantById(id);
  }

  async deleteRegistrant(id) {
    const reg = await db('psb_registrants').where({ id }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (reg.status === 'placed' || reg.placed_student_id) {
      const error = new Error('Calon murid yang sudah ditempatkan ke kelas definitif tidak dapat dihapus');
      error.statusCode = 400;
      throw error;
    }

    await db('psb_registrants').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  /**
   * Pembuatan Akun Otomatis untuk Calon Murid
   * Return username & password plaintext SEKALI SAJA (tidak disimpan plaintext di DB)
   */
  async createRegistrantAccount(registrantId) {
    const reg = await db('psb_registrants').where({ id: registrantId }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (reg.user_account_id) {
      const error = new Error('Calon murid ini sudah memiliki akun terdaftar');
      error.statusCode = 409;
      throw error;
    }

    // 1. Generate short unique username dari nama pendaftar
    const existingUsernames = new Set((await coreDb('users').select('username')).map((u) => u.username));
    const generatedUsername = generateShortUsername(reg.full_name.trim(), existingUsernames);

    // 2. Generate Random Alphanumeric Password (8 Karakter)
    const randomPassword = crypto.randomBytes(4).toString('hex').toLowerCase(); // 8 karakter mis. "a3f8b91c"

    // 3. Cari role untuk calon murid di Core Service (fallback ke role siswa = 18 jika calon_murid belum ada)
    let targetRoleId = 18;
    try {
      const roleRow = await coreDb('roles').where({ name: 'calon_murid' }).orWhere({ name: 'siswa' }).first();
      if (roleRow) targetRoleId = roleRow.id;
    } catch (e) {
      targetRoleId = 18;
    }

    // 4. Panggil Core Service User Creation
    const coreAccount = await usersService.internalCreateUser({
      username: generatedUsername,
      password: randomPassword,
      full_name: reg.full_name.trim(),
      account_type: 'student',
      ref_type: 'psb_registrant',
      ref_id: reg.id,
      school_unit_id: reg.satuan_pendidikan_id,
      role_id: targetRoleId
    });

    // 5. Update user_account_id di tabel psb_registrants
    await db('psb_registrants').where({ id: registrantId }).update({
      user_account_id: coreAccount.id,
      updated_at: db.fn.now()
    });

    return {
      psb_registrant_id: Number(registrantId),
      user_account_id: coreAccount.id,
      username: generatedUsername,
      password: randomPassword, // Diserahkan sekali kepada client
      message: 'Akun portal calon murid berhasil dibuat'
    };
  }

  /**
   * Penempatan Definitif Calon Murid ke Kelas / Siswa Aktif
   */
  async placeRegistrant(registrantId, payload) {
    const { class_group_id, nipd, academic_year_id, notes, placed_by = 'Petugas PSB' } = payload;

    if (!class_group_id || !academic_year_id) {
      const error = new Error('class_group_id dan academic_year_id wajib diisi untuk penempatan');
      error.statusCode = 422;
      throw error;
    }

    const reg = await db('psb_registrants').where({ id: registrantId }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (reg.status === 'placed' && reg.placed_student_id) {
      const error = new Error('Calon murid ini sudah pernah ditempatkan');
      error.statusCode = 400;
      throw error;
    }

    // Cek kapasitas kelas
    const classGroup = await db('class_groups').where({ id: class_group_id }).first();
    if (!classGroup) {
      const error = new Error('Rombel kelas tujuan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const currentEnrollmentCount = await db('student_class_enrollments')
      .where({ class_group_id, status: 'active' })
      .count('id as total')
      .first();

    const currentTotal = parseInt(currentEnrollmentCount?.total, 10) || 0;
    if (classGroup.capacity && currentTotal >= classGroup.capacity) {
      const error = new Error(`Kapasitas rombel ${classGroup.name} sudah penuh (${currentTotal}/${classGroup.capacity})`);
      error.statusCode = 400;
      throw error;
    }

    return await db.transaction(async (trx) => {
      // 1. Catat log penempatan
      await trx('psb_placement_logs').insert({
        psb_registrant_id: registrantId,
        academic_year_id,
        class_group_id,
        nipd: nipd || null,
        placed_by,
        placed_at: db.fn.now(),
        notes: notes || null
      });

      // 2. Buat data siswa definitif di tabel `students`
      const assignedNis = nipd || reg.registration_number;
      const [studentId] = await trx('students').insert({
        satuan_pendidikan_id: reg.satuan_pendidikan_id,
        nis: assignedNis,
        nisn: reg.nisn || null,
        nipd: nipd || null,
        full_name: reg.full_name,
        gender: 'L', // default / diperbarui di wizard
        address: reg.address || null,
        status: 'aktif',
        enrolled_at: new Date().toISOString().split('T')[0],
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      // 3. Masukkan ke riwayat admission siswa
      await trx('student_admissions').insert({
        student_id: studentId,
        initial_grade_level_id: reg.requested_grade_level_id || classGroup.grade_level_id || null,
        initial_class_group_id: class_group_id,
        registration_type: reg.entry_type === 'pindahan' ? 'pindahan' : 'siswa_baru',
        admission_date: new Date().toISOString().split('T')[0],
        previous_school_name: reg.previous_school_name || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      // 4. Enroll siswa ke rombel
      await trx('student_class_enrollments').insert({
        student_id: studentId,
        class_group_id,
        academic_year_id,
        status: 'active',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      // 4b. Catat jejak ke student_class_history (Append-Only)
      await trx('student_class_history').insert({
        student_id: studentId,
        academic_year_id: academic_year_id || 1,
        class_group_id,
        grade_level_id: classGroup.grade_level_id || 1,
        enrollment_type: 'psb_placement',
        decision: `Penempatan Santri Baru di ${classGroup.name}`,
        recorded_at: db.fn.now(),
        recorded_by: placed_by || 'Admin PSB'
      });

      // 5. Update status registrant
      await trx('psb_registrants').where({ id: registrantId }).update({
        status: 'placed',
        placed_class_group_id: class_group_id,
        placed_student_id: studentId,
        placed_nipd: nipd || assignedNis,
        updated_at: db.fn.now()
      });

      return {
        psb_registrant_id: Number(registrantId),
        student_id: studentId,
        class_group_id: Number(class_group_id),
        class_group_name: classGroup.name,
        placed_nipd: nipd || assignedNis,
        status: 'placed',
        message: `Calon murid ${reg.full_name} berhasil ditempatkan ke kelas ${classGroup.name} sebagai siswa aktif`
      };
    });
  }

  // ============================================================
  // 4. PSB REGISTRANT DOCUMENTS
  // ============================================================

  async listDocuments(registrantId) {
    return db('psb_registrant_documents').where({ psb_registrant_id: registrantId });
  }

  async addDocument(registrantId, payload) {
    const { document_type, document_name, file_url, is_submitted = true, notes } = payload;
    if (!document_type || !file_url) {
      const error = new Error('document_type dan file_url wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('psb_registrant_documents').insert({
      psb_registrant_id: registrantId,
      document_type,
      document_name: document_name || document_type,
      file_url,
      is_submitted: is_submitted ? 1 : 0,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('psb_registrant_documents').where({ id }).first();
  }

  async verifyDocument(registrantId, docId, payload) {
    const { verified_by, notes } = payload;
    const doc = await db('psb_registrant_documents')
      .where({ id: docId, psb_registrant_id: registrantId })
      .first();

    if (!doc) {
      const error = new Error('Dokumen calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_registrant_documents')
      .where({ id: docId })
      .update({
        verified_by: verified_by || null,
        verified_at: db.fn.now(),
        notes: notes || doc.notes,
        updated_at: db.fn.now()
      });

    return db('psb_registrant_documents').where({ id: docId }).first();
  }

  async deleteDocument(registrantId, docId) {
    const doc = await db('psb_registrant_documents')
      .where({ id: docId, psb_registrant_id: registrantId })
      .first();

    if (!doc) {
      const error = new Error('Dokumen tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_registrant_documents').where({ id: docId }).del();
    return { id: Number(docId), deleted: true };
  }

  // ============================================================
  // 5. PSB TESTS & QUESTIONS
  // ============================================================

  async listTests(query = {}) {
    let q = db('psb_tests');
    if (query.psb_process_id) {
      q = q.where('psb_process_id', query.psb_process_id);
    }
    if (query.is_active !== undefined) {
      q = q.where('is_active', query.is_active === 'true' || query.is_active === true ? 1 : 0);
    }
    const tests = await q.orderBy('id', 'desc');

    for (const t of tests) {
      t.total_questions = (await db('psb_test_questions').where({ psb_test_id: t.id }).count('id as total').first())?.total || 0;
    }

    return tests;
  }

  async getTestById(id) {
    const test = await db('psb_tests').where({ id }).first();
    if (!test) {
      const error = new Error('Tes seleksi PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const questions = await db('psb_test_questions')
      .where({ psb_test_id: id })
      .orderBy('order_number', 'asc');

    return {
      ...test,
      questions: questions.map((q) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }))
    };
  }

  async createTest(payload) {
    const { psb_process_id, name, description, duration_minutes, passing_score, is_active = true } = payload;
    if (!psb_process_id || !name) {
      const error = new Error('psb_process_id dan nama tes wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('psb_tests').insert({
      psb_process_id,
      name: name.trim(),
      description: description || null,
      duration_minutes: duration_minutes ? Number(duration_minutes) : null,
      passing_score: passing_score ? Number(passing_score) : null,
      is_active: is_active ? 1 : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getTestById(id);
  }

  async updateTest(id, payload) {
    const test = await db('psb_tests').where({ id }).first();
    if (!test) {
      const error = new Error('Tes seleksi PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const allowed = ['name', 'description', 'duration_minutes', 'passing_score', 'is_active'];
    const updateData = { updated_at: db.fn.now() };

    for (const k of allowed) {
      if (payload[k] !== undefined) {
        updateData[k] = payload[k];
      }
    }

    await db('psb_tests').where({ id }).update(updateData);
    return this.getTestById(id);
  }

  async deleteTest(id) {
    const test = await db('psb_tests').where({ id }).first();
    if (!test) {
      const error = new Error('Tes seleksi PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_tests').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  async createTestQuestion(testId, payload) {
    const { question_type, question_text, options, correct_answer, score_weight = 1.0, order_number } = payload;
    if (!question_type || !question_text) {
      const error = new Error('question_type dan question_text wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('psb_test_questions').insert({
      psb_test_id: testId,
      question_type,
      question_text: question_text.trim(),
      options: options ? JSON.stringify(options) : null,
      correct_answer: correct_answer ? correct_answer.trim() : null,
      score_weight: Number(score_weight) || 1.0,
      order_number: Number(order_number) || 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('psb_test_questions').where({ id }).first();
  }

  async updateTestQuestion(questionId, payload) {
    const q = await db('psb_test_questions').where({ id: questionId }).first();
    if (!q) {
      const error = new Error('Soal tes tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.question_type) updateData.question_type = payload.question_type;
    if (payload.question_text) updateData.question_text = payload.question_text.trim();
    if (payload.options !== undefined) updateData.options = payload.options ? JSON.stringify(payload.options) : null;
    if (payload.correct_answer !== undefined) updateData.correct_answer = payload.correct_answer ? payload.correct_answer.trim() : null;
    if (payload.score_weight !== undefined) updateData.score_weight = Number(payload.score_weight) || 1.0;
    if (payload.order_number !== undefined) updateData.order_number = Number(payload.order_number);

    await db('psb_test_questions').where({ id: questionId }).update(updateData);
    return db('psb_test_questions').where({ id: questionId }).first();
  }

  async deleteTestQuestion(questionId) {
    const q = await db('psb_test_questions').where({ id: questionId }).first();
    if (!q) {
      const error = new Error('Soal tes tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_test_questions').where({ id: questionId }).del();
    return { id: Number(questionId), deleted: true };
  }

  // ============================================================
  // 6. PSB TEST SESSIONS & GRADING
  // ============================================================

  async listTestSessions(query = {}) {
    let q = db('psb_test_sessions')
      .join('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .join('psb_registrants', 'psb_test_sessions.psb_registrant_id', 'psb_registrants.id')
      .select(
        'psb_test_sessions.*',
        'psb_tests.name as test_name',
        'psb_tests.duration_minutes',
        'psb_tests.passing_score',
        'psb_registrants.registration_number',
        'psb_registrants.full_name as registrant_name',
        'psb_registrants.satuan_pendidikan_id'
      );

    if (query.psb_test_id) q = q.where('psb_test_sessions.psb_test_id', query.psb_test_id);
    if (query.psb_registrant_id) q = q.where('psb_test_sessions.psb_registrant_id', query.psb_registrant_id);
    if (query.status) q = q.where('psb_test_sessions.status', query.status);

    return q.orderBy('psb_test_sessions.id', 'desc');
  }

  async getTestSessionById(id) {
    const session = await db('psb_test_sessions')
      .join('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .join('psb_registrants', 'psb_test_sessions.psb_registrant_id', 'psb_registrants.id')
      .where('psb_test_sessions.id', id)
      .select(
        'psb_test_sessions.*',
        'psb_tests.name as test_name',
        'psb_tests.duration_minutes',
        'psb_tests.passing_score',
        'psb_registrants.registration_number',
        'psb_registrants.full_name as registrant_name'
      )
      .first();

    if (!session) {
      const error = new Error('Sesi tes tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const answers = await db('psb_test_answers')
      .join('psb_test_questions', 'psb_test_answers.psb_test_question_id', 'psb_test_questions.id')
      .where({ 'psb_test_answers.psb_test_session_id': id })
      .select(
        'psb_test_answers.*',
        'psb_test_questions.question_type',
        'psb_test_questions.question_text',
        'psb_test_questions.options',
        'psb_test_questions.score_weight'
      );

    return {
      ...session,
      answers: answers.map((a) => ({
        ...a,
        options: typeof a.options === 'string' ? JSON.parse(a.options) : a.options
      }))
    };
  }

  async createTestSession(payload) {
    const { psb_test_id, psb_registrant_id, scheduled_at } = payload;
    if (!psb_test_id || !psb_registrant_id) {
      const error = new Error('psb_test_id dan psb_registrant_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const existing = await db('psb_test_sessions').where({ psb_test_id, psb_registrant_id }).first();
    if (existing) {
      const error = new Error('Calon murid sudah memiliki jadwal penugasan tes ini');
      error.statusCode = 409;
      throw error;
    }

    const [id] = await db('psb_test_sessions').insert({
      psb_test_id,
      psb_registrant_id,
      scheduled_at: scheduled_at || db.fn.now(),
      status: 'scheduled',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Ubah status registrant jadi 'testing'
    await db('psb_registrants').where({ id: psb_registrant_id }).update({
      status: 'testing',
      updated_at: db.fn.now()
    });

    return this.getTestSessionById(id);
  }

  async submitTestSession(sessionId, { answers = [] }) {
    const session = await db('psb_test_sessions').where({ id: sessionId }).first();
    if (!session) {
      const error = new Error('Sesi tes tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const test = await db('psb_tests').where({ id: session.psb_test_id }).first();
    const questions = await db('psb_test_questions').where({ psb_test_id: session.psb_test_id });

    return await db.transaction(async (trx) => {
      let totalScore = 0;
      let hasUngradedEssay = false;

      // Hapus jawaban lama sesi ini jika ada
      await trx('psb_test_answers').where({ psb_test_session_id: sessionId }).del();

      for (const q of questions) {
        const userAnswer = answers.find((a) => Number(a.question_id) === q.id);
        const answerText = userAnswer ? String(userAnswer.answer_text).trim() : '';

        let isCorrect = null;
        let scoreAwarded = null;

        if (q.question_type === 'multiple_choice' || q.question_type === 'fill_in_blank') {
          if (q.correct_answer && answerText) {
            isCorrect = answerText.toLowerCase() === q.correct_answer.toLowerCase();
            scoreAwarded = isCorrect ? Number(q.score_weight) : 0;
            totalScore += scoreAwarded;
          } else {
            isCorrect = false;
            scoreAwarded = 0;
          }
        } else if (q.question_type === 'essay') {
          hasUngradedEssay = true;
          isCorrect = null;
          scoreAwarded = null;
        }

        await trx('psb_test_answers').insert({
          psb_test_session_id: sessionId,
          psb_test_question_id: q.id,
          answer_text: answerText || null,
          is_correct: isCorrect,
          score_awarded: scoreAwarded,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }

      const status = hasUngradedEssay ? 'submitted' : 'graded';
      const isPassed = !hasUngradedEssay && test.passing_score !== null ? totalScore >= Number(test.passing_score) : null;

      await trx('psb_test_sessions').where({ id: sessionId }).update({
        status,
        submitted_at: db.fn.now(),
        total_score: hasUngradedEssay ? null : totalScore,
        is_passed: isPassed !== null ? (isPassed ? 1 : 0) : null,
        updated_at: db.fn.now()
      });

      // Update status pendaftar jika sudah selesai dinilai otomatis
      if (!hasUngradedEssay && isPassed !== null) {
        await trx('psb_registrants').where({ id: session.psb_registrant_id }).update({
          status: isPassed ? 'test_passed' : 'test_failed',
          updated_at: db.fn.now()
        });
      }

      return {
        session_id: Number(sessionId),
        status,
        total_score: hasUngradedEssay ? null : totalScore,
        is_passed: isPassed,
        has_ungraded_essay: hasUngradedEssay,
        message: hasUngradedEssay ? 'Jawaban berhasil dikirim. Menunggu penilaian soal essay.' : 'Tes selesai dan telah dinilai otomatis.'
      };
    });
  }

  async gradeTestSession(sessionId, { answers = [] }) {
    const session = await db('psb_test_sessions').where({ id: sessionId }).first();
    if (!session) {
      const error = new Error('Sesi tes tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const test = await db('psb_tests').where({ id: session.psb_test_id }).first();

    return await db.transaction(async (trx) => {
      for (const a of answers) {
        if (a.answer_id) {
          await trx('psb_test_answers')
            .where({ id: a.answer_id, psb_test_session_id: sessionId })
            .update({
              score_awarded: Number(a.score_awarded) || 0,
              is_correct: Number(a.score_awarded) > 0 ? 1 : 0,
              updated_at: db.fn.now()
            });
        }
      }

      const allAnswers = await trx('psb_test_answers').where({ psb_test_session_id: sessionId });
      const totalScore = allAnswers.reduce((acc, curr) => acc + (Number(curr.score_awarded) || 0), 0);
      const isPassed = test.passing_score !== null ? totalScore >= Number(test.passing_score) : true;

      await trx('psb_test_sessions').where({ id: sessionId }).update({
        status: 'graded',
        total_score: totalScore,
        is_passed: isPassed ? 1 : 0,
        updated_at: db.fn.now()
      });

      await trx('psb_registrants').where({ id: session.psb_registrant_id }).update({
        status: isPassed ? 'test_passed' : 'test_failed',
        updated_at: db.fn.now()
      });

      return {
        session_id: Number(sessionId),
        status: 'graded',
        total_score: totalScore,
        is_passed: isPassed,
        message: 'Penilaian tes PSB berhasil disimpan'
      };
    });
  }

  // ============================================================
  // 7. INTERNAL INTAKE (INTEGRASI DARI WEBSITE UTAMA PPDB)
  // ============================================================

  async intakePublicRegistrant(payload) {
    const {
      school_unit_id,
      school_year,
      registration_path,
      candidate_full_name,
      candidate_birth_place,
      candidate_birth_date,
      candidate_gender,
      candidate_address,
      father_name,
      mother_name,
      parent_contact,
      nisn,
      previous_school_name,
      website_registrant_id
    } = payload;

    if (!school_unit_id || !candidate_full_name) {
      const error = new Error('school_unit_id dan candidate_full_name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // 1. Cari proses PSB yang sedang open untuk unit & tahun ajaran
    let process = await db('psb_processes')
      .join('psb_process_units', 'psb_processes.id', 'psb_process_units.psb_process_id')
      .where('psb_process_units.satuan_pendidikan_id', school_unit_id)
      .where('psb_processes.status', 'open')
      .select('psb_processes.*')
      .first();

    if (!process) {
      process = await db('psb_processes').where({ status: 'open' }).first();
    }

    // Fallback jika belum ada proses open: gunakan proses aktif terbaru atau buat default
    if (!process) {
      process = await db('psb_processes').orderBy('id', 'desc').first();
    }

    if (!process) {
      // Inisialisasi default process jika tabel kosong
      const [newProcId] = await db('psb_processes').insert({
        name: `PSB TP ${school_year || '2026/2027'}`,
        target_academic_year: school_year || '2026/2027',
        context_type: 'satuan',
        status: 'open',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      await db('psb_process_units').insert({
        psb_process_id: newProcId,
        satuan_pendidikan_id: school_unit_id,
        code_prefix: 'PSB',
        target_registrants: 100,
        quota_male: 50,
        quota_female: 50,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      process = await db('psb_processes').where({ id: newProcId }).first();
    }

    // 2. Cari gelombang yang cocok dengan registration_path (jika ada)
    let group = null;
    if (registration_path) {
      group = await db('psb_groups')
        .where({ psb_process_id: process.id })
        .where('name', 'like', `%${registration_path}%`)
        .first();
    }

    // 3. Buat baris psb_registrants baru
    const regNumber = await this.generateRegistrationNumber(process.id, school_unit_id);

    const [registrantId] = await db('psb_registrants').insert({
      psb_process_id: process.id,
      satuan_pendidikan_id: school_unit_id,
      psb_group_id: group ? group.id : null,
      registration_number: regNumber,
      nisn: nisn || null,
      full_name: candidate_full_name.trim(),
      address: candidate_address || null,
      previous_school_name: previous_school_name || null,
      father_name: father_name || null,
      mother_name: mother_name || null,
      parent_contact: parent_contact || null,
      entry_type: 'reguler',
      status: 'registered',
      source: 'public_website',
      website_registrant_ref_id: website_registrant_id || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // 4. Buat Akun Otomatis
    let userAccount = null;
    try {
      userAccount = await this.createRegistrantAccount(registrantId);
    } catch (accErr) {
      console.warn('[PsbService] Auto account generation warning for registrant intake:', accErr.message);
    }

    return {
      psb_registrant_id: registrantId,
      academic_ref_id: registrantId,
      registration_number: regNumber,
      user_account_id: userAccount ? userAccount.user_account_id : null,
      username: userAccount ? userAccount.username : null,
      password: userAccount ? userAccount.password : null,
      message: 'Intake pendaftar PPDB ke modul Akademik berhasil'
    };
  }
}

module.exports = new PsbService();
