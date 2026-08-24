/**
 * Organization Service Implementation
 * Modul Kepegawaian - Fitur 2: Organisasi (DUK Pangkat, Manajemen Jabatan, Riwayat Jabatan, Mutasi/Promosi)
 */
const db = require('../../../config/db/kepegawaian');
const schoolUnitsService = require('../../core/school-units/service');

class OrganizationService {
  // ==========================================
  // 1. DUK Pangkat (Daftar Urut Kepangkatan)
  // Dihitung on-the-fly dari employees + employee_position_history
  // ==========================================
  async getDukPangkat(schoolUnitId) {
    if (!schoolUnitId) {
      const error = new Error('Query parameter school_unit_id wajib disertakan');
      error.statusCode = 422;
      throw error;
    }

    // Ambil seluruh pegawai aktif di sekolah terkait
    const employees = await db('employees')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .where('employees.school_unit_id', schoolUnitId)
      .where('employees.account_status', 'active')
      .select(
        'employees.id as employee_id',
        'employees.employee_number',
        'employees.nip',
        'employees.full_name',
        'employees.academic_title',
        'employees.current_rank as golongan',
        'employees.current_position_id',
        'job_positions.name as position_name'
      );

    // Ambil TMT (effective_date terlama / terbaru aktif) dari employee_position_history
    const empIds = employees.map((e) => e.employee_id);
    let positionHistories = [];
    if (empIds.length > 0) {
      positionHistories = await db('employee_position_history')
        .whereIn('employee_id', empIds)
        .orderBy('effective_date', 'asc');
    }

    const rankWeight = (rank) => {
      if (!rank) return 0;
      const rankOrder = {
        'IV/e': 17, 'IV/d': 16, 'IV/c': 15, 'IV/b': 14, 'IV/a': 13,
        'III/d': 12, 'III/c': 11, 'III/b': 10, 'III/a': 9,
        'II/d': 8, 'II/c': 7, 'II/b': 6, 'II/a': 5,
        'I/d': 4, 'I/c': 3, 'I/b': 2, 'I/a': 1
      };
      return rankOrder[rank.trim()] || 0;
    };

    const dukList = employees.map((emp) => {
      const histories = positionHistories.filter((h) => h.employee_id === emp.employee_id);
      const latestHistory = histories.length > 0 ? histories[histories.length - 1] : null;
      const tmt = latestHistory ? latestHistory.effective_date : null;

      return {
        employee_id: emp.employee_id,
        employee_number: emp.employee_number,
        nip: emp.nip,
        full_name: emp.full_name,
        academic_title: emp.academic_title,
        golongan: emp.golongan || '-',
        position_name: emp.position_name || '-',
        tmt: tmt || '-'
      };
    });

    // Urutkan berdasarkan bobot golongan (desc), lalu TMT (asc), lalu nama
    dukList.sort((a, b) => {
      const weightA = rankWeight(a.golongan);
      const weightB = rankWeight(b.golongan);
      if (weightA !== weightB) return weightB - weightA;
      if (a.tmt && b.tmt && a.tmt !== '-' && b.tmt !== '-') {
        return new Date(a.tmt) - new Date(b.tmt);
      }
      return a.full_name.localeCompare(b.full_name);
    });

    return dukList.map((item, idx) => ({
      urutan: idx + 1,
      ...item
    }));
  }

  // ==========================================
  // 2. Manajemen Jabatan & Struktur Organisasi
  // ==========================================
  async listJobPositions(query = {}) {
    let baseQuery = db('job_positions');
    if (query.school_unit_id) {
      baseQuery = baseQuery.where('school_unit_id', query.school_unit_id);
    }
    return baseQuery.orderBy('level', 'asc').orderBy('id', 'asc');
  }

  async getJobPositionsTree(schoolUnitId = null) {
    let query = db('job_positions');
    if (schoolUnitId) {
      query = query.where('school_unit_id', schoolUnitId);
    }
    const positions = await query.orderBy('level', 'asc').orderBy('id', 'asc');

    // Susun tree rekursif berdasarkan parent_position_id
    const buildTree = (parentId = null) => {
      return positions
        .filter((p) => p.parent_position_id === parentId)
        .map((p) => ({
          ...p,
          children: buildTree(p.id)
        }));
    };

    return buildTree(null);
  }

  async createJobPosition(payload) {
    const { school_unit_id, name, level, parent_position_id } = payload;
    if (!school_unit_id || !name) {
      const error = new Error('Field school_unit_id dan name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    try {
      await schoolUnitsService.getSchoolUnitById(school_unit_id);
    } catch (e) {
      const error = new Error(`Satuan Pendidikan ID ${school_unit_id} tidak valid`);
      error.statusCode = 422;
      throw error;
    }

    if (parent_position_id) {
      const parent = await db('job_positions').where({ id: parent_position_id }).first();
      if (!parent) {
        const error = new Error('parent_position_id tidak valid');
        error.statusCode = 422;
        throw error;
      }
    }

    const [id] = await db('job_positions').insert({
      school_unit_id,
      name: name.trim(),
      level: level ? parseInt(level, 10) : null,
      parent_position_id: parent_position_id || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('job_positions').where({ id }).first();
  }

  async updateJobPosition(id, payload) {
    const existing = await db('job_positions').where({ id }).first();
    if (!existing) {
      const error = new Error('Jabatan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.level !== undefined) updateData.level = payload.level;
    if (payload.parent_position_id !== undefined) {
      if (payload.parent_position_id == id) {
        const error = new Error('Jabatan tidak boleh menjadi atasan bagi dirinya sendiri');
        error.statusCode = 422;
        throw error;
      }
      updateData.parent_position_id = payload.parent_position_id || null;
    }

    await db('job_positions').where({ id }).update(updateData);
    return db('job_positions').where({ id }).first();
  }

  async deleteJobPosition(id) {
    const existing = await db('job_positions').where({ id }).first();
    if (!existing) {
      const error = new Error('Jabatan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Cek apakah masih digunakan di employees.current_position_id
    const usedInEmployees = await db('employees').where({ current_position_id: id }).first();
    if (usedInEmployees) {
      const error = new Error('Jabatan tidak dapat dihapus karena masih digunakan oleh data pegawai aktif');
      error.statusCode = 409;
      throw error;
    }

    // Cek apakah memiliki child position
    const hasChildren = await db('job_positions').where({ parent_position_id: id }).first();
    if (hasChildren) {
      const error = new Error('Jabatan tidak dapat dihapus karena masih menjadi atasan langsung jabatan lain');
      error.statusCode = 409;
      throw error;
    }

    await db('job_positions').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 3. Riwayat Jabatan & Golongan
  // ==========================================
  async listPositionHistory(employeeId) {
    return db('employee_position_history')
      .leftJoin('job_positions', 'employee_position_history.position_id', 'job_positions.id')
      .where('employee_position_history.employee_id', employeeId)
      .select(
        'employee_position_history.*',
        'job_positions.name as position_name'
      )
      .orderBy('employee_position_history.effective_date', 'desc');
  }

  async addPositionHistory(employeeId, payload) {
    const {
      position_id,
      rank,
      document_type,
      document_number,
      validity_years,
      evaluation_note,
      effective_date,
      end_date
    } = payload;
    if (!effective_date) {
      const error = new Error('Field effective_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const employee = await db('employees').where({ id: employeeId }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Tutup end_date riwayat sebelumnya yang masih aktif (end_date NULL)
    await db('employee_position_history')
      .where({ employee_id: employeeId })
      .whereNull('end_date')
      .update({
        end_date: effective_date,
        updated_at: db.fn.now()
      });

    // 2. Tambah record riwayat jabatan baru
    const [historyId] = await db('employee_position_history').insert({
      employee_id: employeeId,
      position_id: position_id || null,
      rank: rank || null,
      document_type: document_type || 'jabatan_internal',
      document_number: document_number || null,
      validity_years: validity_years || null,
      evaluation_note: evaluation_note || null,
      effective_date,
      end_date: end_date || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // 3. Update current_position_id dan current_rank di tabel employees jika document_type='jabatan_internal' atau 'pengangkatan'
    if (position_id !== undefined || rank !== undefined) {
      const empUpdate = { updated_at: db.fn.now() };
      if (position_id !== undefined) empUpdate.current_position_id = position_id;
      if (rank !== undefined) empUpdate.current_rank = rank;
      await db('employees').where({ id: employeeId }).update(empUpdate);
    }

    return db('employee_position_history').where({ id: historyId }).first();
  }

  // ==========================================
  // 4. Riwayat Mutasi / Promosi
  // ==========================================
  async listMutations(employeeId) {
    return db('employee_mutations')
      .leftJoin('job_positions as old_pos', 'employee_mutations.old_position_id', 'old_pos.id')
      .leftJoin('job_positions as new_pos', 'employee_mutations.new_position_id', 'new_pos.id')
      .where('employee_mutations.employee_id', employeeId)
      .select(
        'employee_mutations.*',
        'old_pos.name as old_position_name',
        'new_pos.name as new_position_name'
      )
      .orderBy('employee_mutations.mutation_date', 'desc');
  }

  async createMutation(employeeId, payload) {
    const { mutation_type, old_position_id, new_position_id, mutation_date, notes } = payload;
    if (!mutation_type || !mutation_date) {
      const error = new Error('Field mutation_type dan mutation_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (!['promotion', 'transfer', 'demotion'].includes(mutation_type)) {
      const error = new Error("mutation_type harus 'promotion', 'transfer', atau 'demotion'");
      error.statusCode = 422;
      throw error;
    }

    const employee = await db('employees').where({ id: employeeId }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Catat mutasi
    const [mutationId] = await db('employee_mutations').insert({
      employee_id: employeeId,
      mutation_type,
      old_position_id: old_position_id || employee.current_position_id || null,
      new_position_id: new_position_id || null,
      mutation_date,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // 2. Tambah baris baru di employee_position_history & update employees.current_position_id
    if (new_position_id) {
      await this.addPositionHistory(employeeId, {
        position_id: new_position_id,
        rank: employee.current_rank,
        effective_date: mutation_date
      });
    }

    return db('employee_mutations').where({ id: mutationId }).first();
  }
}

module.exports = new OrganizationService();
