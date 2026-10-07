/**
 * Employee Profile Completeness Service (Join Date & Direct Supervisor)
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #28, §10.1, §11.1
 */

const db = require('../../../config/db/kepegawaian');
const { recordLeaveAuditLog } = require('./leaveAuditHelper');
const { isUnitInScope } = require('../common/actorHelper');
const { todayWIB } = require('./dateHelper');

function formatDbDate(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.slice(0, 10);
  return todayWIB(val);
}

/**
 * Detects if assigning proposedSupervisorId to employeeId would form a cycle in supervisor hierarchy.
 * E.g., A -> B -> C -> A
 * @param {object} knex - Knex instance
 * @param {number} employeeId - Target employee ID
 * @param {number|null} proposedSupervisorId - Proposed supervisor ID
 * @returns {Promise<boolean>} - True if cycle detected, false otherwise
 */
async function detectSupervisorCycle(knex, employeeId, proposedSupervisorId) {
  if (!proposedSupervisorId) return false;
  const empId = Number(employeeId);
  const supId = Number(proposedSupervisorId);

  if (empId === supId) return true;

  let currentId = supId;
  const visited = new Set([empId]);

  while (currentId) {
    if (visited.has(Number(currentId))) {
      return true; // Cycle detected
    }
    visited.add(Number(currentId));

    const sup = await knex('employees')
      .where({ id: currentId })
      .select('direct_supervisor_employee_id')
      .first();

    if (!sup || !sup.direct_supervisor_employee_id) {
      break;
    }
    currentId = sup.direct_supervisor_employee_id;
  }

  return false;
}

/**
 * Get employee profile list with completeness status
 */
async function getEmployeeProfiles(query = {}, actor = {}) {
  let baseQuery = db('employees as e')
    .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
    .leftJoin('employees as sup', 'e.direct_supervisor_employee_id', 'sup.id')
    .select(
      'e.id',
      'e.school_unit_id',
      'e.employee_number',
      'e.nip',
      'e.nik',
      'e.full_name',
      'e.gender',
      'e.marital_status',
      'e.employment_status',
      'e.account_status',
      'e.join_date',
      'e.direct_supervisor_employee_id',
      'sup.full_name as direct_supervisor_name',
      'jp.name as current_position_name',
      'jp.level as position_level'
    );

  // Scoping unit
  if (actor.unitScope && Array.isArray(actor.unitScope) && actor.unitScope.length > 0) {
    baseQuery = baseQuery.whereIn('e.school_unit_id', actor.unitScope);
  } else if (typeof actor.unitScope === 'number') {
    baseQuery = baseQuery.where('e.school_unit_id', actor.unitScope);
  }

  if (query.school_unit_id) {
    const targetUnit = Number(query.school_unit_id);
    if (!isUnitInScope(actor.unitScope, targetUnit)) {
      const err = new Error('Akses ke satuan pendidikan di luar cakupan Anda ditolak');
      err.statusCode = 403;
      err.code = 'FORBIDDEN_SCOPE';
      throw err;
    }
    baseQuery = baseQuery.where('e.school_unit_id', targetUnit);
  }

  if (query.employment_status) {
    baseQuery = baseQuery.where('e.employment_status', query.employment_status);
  }

  if (query.q) {
    const q = `%${query.q.trim()}%`;
    baseQuery = baseQuery.where((builder) => {
      builder.where('e.full_name', 'like', q)
        .orWhere('e.employee_number', 'like', q)
        .orWhere('e.nip', 'like', q)
        .orWhere('e.nik', 'like', q);
    });
  }

  if (query.completeness === 'complete') {
    baseQuery = baseQuery.whereNotNull('e.join_date')
      .andWhere((b) => b.whereNotNull('e.direct_supervisor_employee_id').orWhere('jp.level', 1));
  } else if (query.completeness === 'incomplete') {
    baseQuery = baseQuery.where((b) => {
      b.whereNull('e.join_date')
        .orWhere(b2 => b2.whereNull('e.direct_supervisor_employee_id').where((b3) => b3.whereNull('jp.level').orWhere('jp.level', '>', 1)));
    });
  }

  // Count total
  const countQuery = baseQuery.clone().clearSelect().count('e.id as total');
  const countRes = await countQuery;
  const total = countRes[0]?.total ? Number(countRes[0].total) : 0;

  const page = Math.max(1, parseInt(query.page || 1, 10));
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page || 50, 10)));
  const offset = (page - 1) * perPage;

  const rows = await baseQuery
    .orderBy('e.school_unit_id', 'asc')
    .orderBy('e.full_name', 'asc')
    .limit(perPage)
    .offset(offset);

  const formatted = rows.map((r) => {
    const isTopLevel = r.position_level === 1;
    const hasJoinDate = Boolean(r.join_date);
    const hasSupervisor = Boolean(r.direct_supervisor_employee_id || isTopLevel);
    const isComplete = hasJoinDate && hasSupervisor;

    return {
      id: r.id,
      school_unit_id: r.school_unit_id,
      employee_number: r.employee_number,
      nip: r.nip,
      nik: r.nik,
      full_name: r.full_name,
      gender: r.gender,
      marital_status: r.marital_status,
      employment_status: r.employment_status,
      account_status: r.account_status,
      join_date: formatDbDate(r.join_date),
      direct_supervisor_employee_id: r.direct_supervisor_employee_id,
      direct_supervisor_name: r.direct_supervisor_name,
      current_position_name: r.current_position_name,
      position_level: r.position_level,
      is_complete: isComplete,
      missing_fields: [
        !hasJoinDate ? 'join_date' : null,
        !hasSupervisor ? 'direct_supervisor_employee_id' : null
      ].filter(Boolean)
    };
  });

  return {
    data: formatted,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage)
    }
  };
}

/**
 * Update employee profile completeness (join_date & direct_supervisor_employee_id)
 */
async function updateEmployeeProfile(employeeId, payload, actor, reqMeta = {}) {
  const empId = Number(employeeId);
  if (!empId || isNaN(empId)) {
    const err = new Error('ID pegawai tidak valid');
    err.statusCode = 422;
    err.code = 'INVALID_EMPLOYEE_ID';
    throw err;
  }

  const employee = await db('employees').where({ id: empId }).first();
  if (!employee) {
    const err = new Error('Data pegawai tidak ditemukan');
    err.statusCode = 404;
    err.code = 'EMPLOYEE_NOT_FOUND';
    throw err;
  }

  // Scoping check
  if (!isUnitInScope(actor.unitScope, employee.school_unit_id)) {
    const err = new Error('Anda tidak memiliki hak akses untuk mengubah data pegawai di unit ini');
    err.statusCode = 403;
    err.code = 'FORBIDDEN_SCOPE';
    throw err;
  }

  const { join_date, direct_supervisor_employee_id, reason } = payload;
  const updateFields = {};

  // Validate join_date
  if (join_date !== undefined) {
    if (join_date === null || join_date === '') {
      updateFields.join_date = null;
    } else {
      if (typeof join_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(join_date)) {
        const err = new Error('Format tanggal masuk (join_date) harus YYYY-MM-DD');
        err.statusCode = 422;
        err.code = 'INVALID_DATE_FORMAT';
        throw err;
      }
      const d = new Date(`${join_date}T00:00:00Z`);
      if (isNaN(d.getTime())) {
        const err = new Error('Tanggal masuk (join_date) tidak valid');
        err.statusCode = 422;
        err.code = 'INVALID_DATE';
        throw err;
      }
      updateFields.join_date = join_date;
    }
  }

  // Validate direct_supervisor_employee_id
  if (direct_supervisor_employee_id !== undefined) {
    if (direct_supervisor_employee_id === null || direct_supervisor_employee_id === '' || direct_supervisor_employee_id === 0) {
      updateFields.direct_supervisor_employee_id = null;
    } else {
      const supId = Number(direct_supervisor_employee_id);
      if (isNaN(supId) || supId <= 0) {
        const err = new Error('ID atasan langsung tidak valid');
        err.statusCode = 422;
        err.code = 'INVALID_SUPERVISOR_ID';
        throw err;
      }

      // Check self assignment
      if (supId === empId) {
        const err = new Error('Pegawai tidak dapat menjadi atasan langsung bagi dirinya sendiri');
        err.statusCode = 422;
        err.code = 'SELF_SUPERVISOR_FORBIDDEN';
        throw err;
      }

      // Check supervisor exists and same unit
      const supervisor = await db('employees').where({ id: supId }).first();
      if (!supervisor || supervisor.account_status !== 'active') {
        const err = new Error('Atasan langsung yang dipilih tidak ditemukan atau sudah tidak aktif');
        err.statusCode = 422;
        err.code = 'SUPERVISOR_NOT_ACTIVE';
        throw err;
      }

      if (Number(supervisor.school_unit_id) !== Number(employee.school_unit_id)) {
        const err = new Error('Atasan langsung harus berada dalam satuan pendidikan yang sama');
        err.statusCode = 422;
        err.code = 'SUPERVISOR_DIFFERENT_UNIT';
        throw err;
      }

      // Check cycle
      const hasCycle = await detectSupervisorCycle(db, empId, supId);
      if (hasCycle) {
        const err = new Error('Penetapan atasan langsung ini akan membentuk siklus hierarki (hirarki melingkar) yang tidak valid');
        err.statusCode = 422;
        err.code = 'SUPERVISOR_CYCLE_DETECTED';
        throw err;
      }

      updateFields.direct_supervisor_employee_id = supId;
    }
  }

  if (Object.keys(updateFields).length === 0) {
    const err = new Error('Tidak ada data kelengkapan profil yang diubah');
    err.statusCode = 422;
    err.code = 'NO_CHANGES';
    throw err;
  }

  updateFields.updated_at = new Date();

  const beforeState = {
    join_date: employee.join_date ? (typeof employee.join_date === 'string' ? employee.join_date.slice(0, 10) : new Date(employee.join_date).toISOString().slice(0, 10)) : null,
    direct_supervisor_employee_id: employee.direct_supervisor_employee_id
  };

  // Perform transactional update
  await db.transaction(async (trx) => {
    await trx('employees').where({ id: empId }).update(updateFields);

    await recordLeaveAuditLog({
      knex: trx,
      entityType: 'employee_profile',
      entityId: empId,
      action: 'update_leave_profile',
      actorUserId: actor.userId || 0,
      actorEmployeeId: actor.employeeId || null,
      beforeJson: beforeState,
      afterJson: {
        join_date: updateFields.join_date !== undefined ? updateFields.join_date : beforeState.join_date,
        direct_supervisor_employee_id: updateFields.direct_supervisor_employee_id !== undefined ? updateFields.direct_supervisor_employee_id : beforeState.direct_supervisor_employee_id
      },
      reason: reason || 'Pembaruan profil kelengkapan cuti & atasan langsung pegawai',
      ip: reqMeta.ip || null
    });
  });

  const updatedEmployee = await db('employees as e')
    .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
    .leftJoin('employees as sup', 'e.direct_supervisor_employee_id', 'sup.id')
    .where('e.id', empId)
    .select(
      'e.id',
      'e.school_unit_id',
      'e.employee_number',
      'e.full_name',
      'e.employment_status',
      'e.join_date',
      'e.direct_supervisor_employee_id',
      'sup.full_name as direct_supervisor_name',
      'jp.name as current_position_name'
    )
    .first();

  return {
    ...updatedEmployee,
    join_date: formatDbDate(updatedEmployee.join_date)
  };
}

module.exports = {
  detectSupervisorCycle,
  getEmployeeProfiles,
  updateEmployeeProfile
};
