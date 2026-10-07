/**
 * Leave Ledger & Balance Service
 * Modul Kepegawaian - Core Aldepos
 * Manages employee_leave_balances (cache) and leave_ledger_entries (append-only ledger)
 * Conforms to SPEC-CUTI-LEMBUR.md §5
 */

const db = require('../../../config/db/kepegawaian');
const { computeEntitlement, computeCarryOver } = require('./entitlementCalculator');
const { todayWIB } = require('./dateHelper');

class LeaveLedgerService {
  /**
   * Ensure active period exists for policy
   */
  async getActivePeriod(policyId = 1, periodKey = null, schoolUnitId = null) {
    let q = db('leave_balance_periods')
      .where({ policy_id: policyId, status: 'open' });

    if (periodKey) {
      q = q.where({ period_key: periodKey });
    }
    if (schoolUnitId) {
      q = q.where(b => {
        b.where({ school_unit_id: schoolUnitId }).orWhereNull('school_unit_id');
      });
    }

    const period = await q.orderBy('id', 'desc').first();
    return period;
  }

  /**
   * Lazily ensure entitlement for an employee in a given period
   */
  async ensureEntitlement(employeeId, periodKey = '2026/2027', trx = null) {
    const runner = trx || db;

    // Fetch employee
    const employee = await runner('employees').where({ id: employeeId }).first();
    if (!employee) {
      const err = new Error('Pegawai tidak ditemukan');
      err.code = 'EMPLOYEE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Default policy
    const policy = await runner('leave_balance_policies').where({ id: 1 }).first();
    if (!policy) return null;

    const period = await runner('leave_balance_periods')
      .where({ policy_id: policy.id, period_key: periodKey })
      .first();
    if (!period) return null;

    // Check if balance record already exists
    let balance = await runner('employee_leave_balances')
      .where({ employee_id: employeeId, period_id: period.id, policy_id: policy.id })
      .first();

    if (balance) {
      return balance;
    }

    // Calculate entitlement using pure function
    const rules = await runner('leave_entitlement_rules')
      .where({ policy_id: policy.id });

    const entitlementRes = computeEntitlement({
      joinDate: employee.join_date,
      employmentStatus: employee.employment_status,
      policy,
      rules,
      period
    });

    const grantedDays = entitlementRes.eligible ? entitlementRes.grantedDays : 0;

    // Insert balance row & initial grant ledger entry in a transaction
    const executeInit = async (t) => {
      const [balId] = await t('employee_leave_balances').insert({
        employee_id: employeeId,
        period_id: period.id,
        policy_id: policy.id,
        granted: grantedDays,
        carry_in: 0,
        adjusted: 0,
        used: 0,
        reserved: 0,
        expired: 0,
        available: grantedDays,
        carry_expires_on: null,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (grantedDays > 0) {
        await t('leave_ledger_entries').insert({
          employee_id: employeeId,
          period_id: period.id,
          policy_id: policy.id,
          bucket: 'current',
          entry_type: 'grant',
          delta_available: grantedDays,
          delta_reserved: 0,
          delta_used: 0,
          effective_date: period.start_date,
          source_type: 'system',
          source_id: period.id,
          idempotency_key: `init:emp:${employeeId}:period:${period.id}:grant`,
          reason: `Hak awal cuti tahunan periode ${period.period_key} (${entitlementRes.code})`,
          created_at: new Date()
        });
      }

      return t('employee_leave_balances').where({ id: balId }).first();
    };

    if (trx) {
      return executeInit(trx);
    } else {
      return db.transaction(executeInit);
    }
  }

  /**
   * Get balances list for HR overview
   */
  async getBalances({ periodKey = '2026/2027', schoolUnitId = null, employeeId = null, q = null, page = 1, perPage = 25 }) {
    const period = await db('leave_balance_periods')
      .where({ period_key: periodKey })
      .first();

    if (!period) {
      return { data: [], total: 0, page, perPage };
    }

    let query = db('employees as e')
      .leftJoin('employee_leave_balances as elb', function() {
        this.on('e.id', '=', 'elb.employee_id')
          .andOn('elb.period_id', '=', db.raw('?', [period.id]));
      })
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .select(
        'e.id as employee_id',
        'e.employee_number as nip',
        'e.full_name as name',
        'e.employment_status',
        'e.join_date',
        'e.school_unit_id',
        'jp.name as position_name',
        'elb.id as balance_id',
        db.raw('COALESCE(elb.granted, 0) as granted'),
        db.raw('COALESCE(elb.carry_in, 0) as carry_in'),
        db.raw('COALESCE(elb.adjusted, 0) as adjusted'),
        db.raw('COALESCE(elb.used, 0) as used'),
        db.raw('COALESCE(elb.reserved, 0) as reserved'),
        db.raw('COALESCE(elb.expired, 0) as expired'),
        db.raw('COALESCE(elb.available, 0) as available'),
        'elb.carry_expires_on'
      );

    if (schoolUnitId) {
      query = query.where('e.school_unit_id', schoolUnitId);
    }
    if (employeeId) {
      query = query.where('e.id', employeeId);
    }
    if (q) {
      query = query.where(b => {
        b.where('e.full_name', 'like', `%${q}%`)
          .orWhere('e.employee_number', 'like', `%${q}%`);
      });
    }

    query = query.where('e.account_status', 'active');

    const countQuery = query.clone().clearSelect().count('e.id as total').first();
    const countRes = await countQuery;
    const total = countRes ? countRes.total : 0;

    const offset = (page - 1) * perPage;
    const rows = await query.orderBy('e.full_name', 'asc').limit(perPage).offset(offset);

    return {
      data: rows.map(r => ({
        ...r,
        granted: parseFloat(r.granted),
        carry_in: parseFloat(r.carry_in),
        adjusted: parseFloat(r.adjusted),
        used: parseFloat(r.used),
        reserved: parseFloat(r.reserved),
        expired: parseFloat(r.expired),
        available: parseFloat(r.available)
      })),
      total,
      page,
      perPage
    };
  }

  /**
   * Get single employee balance
   */
  async getEmployeeBalance(employeeId, periodKey = '2026/2027') {
    let balance = await this.ensureEntitlement(employeeId, periodKey);
    if (!balance) return null;

    return {
      ...balance,
      granted: parseFloat(balance.granted),
      carry_in: parseFloat(balance.carry_in),
      adjusted: parseFloat(balance.adjusted),
      used: parseFloat(balance.used),
      reserved: parseFloat(balance.reserved),
      expired: parseFloat(balance.expired),
      available: parseFloat(balance.available)
    };
  }

  /**
   * Get full ledger statement for an employee
   */
  async getLedger(employeeId, periodId = null) {
    let q = db('leave_ledger_entries as lle')
      .join('leave_balance_periods as lbp', 'lle.period_id', 'lbp.id')
      .where('lle.employee_id', employeeId)
      .select('lle.*', 'lbp.period_key');

    if (periodId) {
      q = q.where('lle.period_id', periodId);
    }

    const entries = await q.orderBy('lle.created_at', 'asc');
    return entries.map(e => ({
      ...e,
      delta_available: parseFloat(e.delta_available),
      delta_reserved: parseFloat(e.delta_reserved),
      delta_used: parseFloat(e.delta_used)
    }));
  }

  /**
   * Reserve balance when a leave request is submitted (SPEC §5.4, §5.5)
   */
  async reserveBalance({ employeeId, days, leaveRequestId, version = 1, reason = 'Pengajuan cuti', actor = null }, trx) {
    const period = await this.getActivePeriod(1);
    if (!period) throw new Error('Periode cuti aktif tidak ditemukan');

    // Lock balance row with FOR UPDATE
    const balance = await trx('employee_leave_balances')
      .where({ employee_id: employeeId, period_id: period.id, policy_id: 1 })
      .forUpdate()
      .first();

    if (!balance) {
      // Lazy init first
      await this.ensureEntitlement(employeeId, period.period_key, trx);
    }

    const currentBal = await trx('employee_leave_balances')
      .where({ employee_id: employeeId, period_id: period.id, policy_id: 1 })
      .forUpdate()
      .first();

    const available = parseFloat(currentBal.available);
    if (available < days) {
      const err = new Error(`Saldo cuti tidak mencukupi (sisa: ${available}, dibutuhkan: ${days})`);
      err.code = 'BALANCE_INSUFFICIENT';
      err.statusCode = 409;
      throw err;
    }

    const idempotencyKey = `leave:${leaveRequestId}:reserve:v${version}`;
    const existingEntry = await trx('leave_ledger_entries')
      .where({ idempotency_key: idempotencyKey })
      .first();
    if (existingEntry) {
      return; // Idempotent
    }

    // Write ledger entry
    await trx('leave_ledger_entries').insert({
      employee_id: employeeId,
      period_id: period.id,
      policy_id: 1,
      bucket: 'current',
      entry_type: 'reserve',
      delta_available: -days,
      delta_reserved: days,
      delta_used: 0,
      effective_date: todayWIB(),
      source_type: 'leave_request',
      source_id: leaveRequestId,
      source_version: version,
      idempotency_key: idempotencyKey,
      reason,
      created_by_user_id: actor ? actor.userId : null,
      created_by_employee_id: actor ? actor.employeeId : null,
      created_at: new Date()
    });

    // Update cache
    await trx('employee_leave_balances')
      .where({ id: currentBal.id })
      .update({
        available: available - days,
        reserved: parseFloat(currentBal.reserved) + days,
        updated_at: new Date()
      });
  }

  /**
   * Commit balance when request is approved
   */
  async commitBalance({ employeeId, days, leaveRequestId, version = 1, reason = 'Persetujuan cuti', actor = null }, trx) {
    const period = await this.getActivePeriod(1);
    const idempotencyKey = `leave:${leaveRequestId}:commit:v${version}`;

    const existing = await trx('leave_ledger_entries')
      .where({ idempotency_key: idempotencyKey })
      .first();
    if (existing) return;

    const currentBal = await trx('employee_leave_balances')
      .where({ employee_id: employeeId, period_id: period.id, policy_id: 1 })
      .forUpdate()
      .first();

    await trx('leave_ledger_entries').insert({
      employee_id: employeeId,
      period_id: period.id,
      policy_id: 1,
      bucket: 'current',
      entry_type: 'commit',
      delta_available: 0,
      delta_reserved: -days,
      delta_used: days,
      effective_date: todayWIB(),
      source_type: 'leave_request',
      source_id: leaveRequestId,
      source_version: version,
      idempotency_key: idempotencyKey,
      reason,
      created_by_user_id: actor ? actor.userId : null,
      created_by_employee_id: actor ? actor.employeeId : null,
      created_at: new Date()
    });

    await trx('employee_leave_balances')
      .where({ id: currentBal.id })
      .update({
        reserved: Math.max(0, parseFloat(currentBal.reserved) - days),
        used: parseFloat(currentBal.used) + days,
        updated_at: new Date()
      });
  }

  /**
   * Release reserved balance when request is rejected or cancelled before approval
   */
  async releaseBalance({ employeeId, days, leaveRequestId, version = 1, reason = 'Penolakan/pembatalan pengajuan', actor = null }, trx) {
    const period = await this.getActivePeriod(1);
    const idempotencyKey = `leave:${leaveRequestId}:release:v${version}`;

    const existing = await trx('leave_ledger_entries')
      .where({ idempotency_key: idempotencyKey })
      .first();
    if (existing) return;

    const currentBal = await trx('employee_leave_balances')
      .where({ employee_id: employeeId, period_id: period.id, policy_id: 1 })
      .forUpdate()
      .first();

    await trx('leave_ledger_entries').insert({
      employee_id: employeeId,
      period_id: period.id,
      policy_id: 1,
      bucket: 'current',
      entry_type: 'release',
      delta_available: days,
      delta_reserved: -days,
      delta_used: 0,
      effective_date: todayWIB(),
      source_type: 'leave_request',
      source_id: leaveRequestId,
      source_version: version,
      idempotency_key: idempotencyKey,
      reason,
      created_by_user_id: actor ? actor.userId : null,
      created_by_employee_id: actor ? actor.employeeId : null,
      created_at: new Date()
    });

    await trx('employee_leave_balances')
      .where({ id: currentBal.id })
      .update({
        available: parseFloat(currentBal.available) + days,
        reserved: Math.max(0, parseFloat(currentBal.reserved) - days),
        updated_at: new Date()
      });
  }

  /**
   * Refund balance when approved leave is cancelled/refunded
   */
  async refundBalance({ employeeId, days, leaveRequestId, reason = 'Pembatalan cuti disetujui', actor = null }, trx) {
    const period = await this.getActivePeriod(1);
    const idempotencyKey = `leave:${leaveRequestId}:refund:${Date.now()}`;

    const currentBal = await trx('employee_leave_balances')
      .where({ employee_id: employeeId, period_id: period.id, policy_id: 1 })
      .forUpdate()
      .first();

    await trx('leave_ledger_entries').insert({
      employee_id: employeeId,
      period_id: period.id,
      policy_id: 1,
      bucket: 'current',
      entry_type: 'refund',
      delta_available: days,
      delta_reserved: 0,
      delta_used: -days,
      effective_date: todayWIB(),
      source_type: 'leave_request',
      source_id: leaveRequestId,
      idempotency_key: idempotencyKey,
      reason,
      created_by_user_id: actor ? actor.userId : null,
      created_by_employee_id: actor ? actor.employeeId : null,
      created_at: new Date()
    });

    await trx('employee_leave_balances')
      .where({ id: currentBal.id })
      .update({
        available: parseFloat(currentBal.available) + days,
        used: Math.max(0, parseFloat(currentBal.used) - days),
        updated_at: new Date()
      });
  }

  /**
   * Manual adjustment by HRD
   */
  async adjustBalance({ employeeId, deltaAvailable, periodId = null, reason, actor }) {
    if (!reason || !reason.trim()) {
      const err = new Error('Alasan penyesuaian saldo wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const delta = parseFloat(deltaAvailable);
    if (isNaN(delta) || delta === 0) {
      const err = new Error('Nilai penyesuaian harus angka bukan nol');
      err.statusCode = 422;
      throw err;
    }

    const period = periodId 
      ? await db('leave_balance_periods').where({ id: periodId }).first()
      : await this.getActivePeriod(1);

    if (!period) throw new Error('Periode saldo tidak ditemukan');

    return db.transaction(async (trx) => {
      let balance = await trx('employee_leave_balances')
        .where({ employee_id: employeeId, period_id: period.id, policy_id: 1 })
        .forUpdate()
        .first();

      if (!balance) {
        balance = await this.ensureEntitlement(employeeId, period.period_key, trx);
      }

      const idempotencyKey = `adjust:emp:${employeeId}:period:${period.id}:${Date.now()}`;

      await trx('leave_ledger_entries').insert({
        employee_id: employeeId,
        period_id: period.id,
        policy_id: 1,
        bucket: 'current',
        entry_type: 'adjust',
        delta_available: delta,
        delta_reserved: 0,
        delta_used: 0,
        effective_date: todayWIB(),
        source_type: 'adjustment',
        idempotency_key: idempotencyKey,
        reason,
        created_by_user_id: actor ? actor.userId : null,
        created_by_employee_id: actor ? actor.employeeId : null,
        created_at: new Date()
      });

      await trx('employee_leave_balances')
        .where({ id: balance.id })
        .update({
          available: parseFloat(balance.available) + delta,
          adjusted: parseFloat(balance.adjusted) + delta,
          updated_at: new Date()
        });

      return trx('employee_leave_balances').where({ id: balance.id }).first();
    });
  }
}

module.exports = new LeaveLedgerService();
