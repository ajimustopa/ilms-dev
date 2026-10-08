/**
 * Leave Ledger & Balance Service
 * Modul Kepegawaian - Core Aldepos
 * Manages employee_leave_balances (cache) and leave_ledger_entries (append-only ledger)
 * Conforms to SPEC-CUTI-LEMBUR.md §5, §10.2, §10.3, §11.3
 */

const db = require('../../../config/db/kepegawaian');
const {
  computeEntitlement,
  computeCarryOver,
  allocateDaysToBuckets,
  rebuildBalanceFromLedger,
  resolvePeriodRange
} = require('./entitlementCalculator');
const { todayWIB, parseDate, formatDate } = require('./dateHelper');
const holidayService = require('./holidayService');
const calendarService = require('../attendance/calendarService');

class LeaveLedgerService {
  /**
   * Check if attendance period is locked for a date (SPEC §2 #24, §8.3)
   */
  async isAttendancePeriodLocked(dateInput, schoolUnitId = null) {
    if (!dateInput) return false;
    let dateStr = dateInput;
    if (dateInput instanceof Date) {
      dateStr = dateInput.toISOString().slice(0, 10);
    } else if (typeof dateInput === 'string' && dateInput.includes('T')) {
      dateStr = dateInput.split('T')[0];
    } else {
      dateStr = String(dateInput);
    }
    const [y, m] = dateStr.split('-').map(Number);
    if (!y || !m) return false;

    const lock = await db('attendance_period_locks')
      .where({ period_year: y, period_month: m })
      .whereIn('status', ['locked', 'submitted_to_payroll'])
      .where(function () {
        if (schoolUnitId) {
          this.whereNull('school_unit_id').orWhere('school_unit_id', schoolUnitId);
        }
      })
      .first();

    return Boolean(lock);
  }
  /**
   * Ensure active period exists for policy & unit
   */
  async getActivePeriod(policyId = 1, periodKey = null, schoolUnitId = null, trx = null) {
    const runner = trx || db;
    let q = runner('leave_balance_periods')
      .where({ policy_id: policyId, status: 'open' });

    if (periodKey) {
      q = q.where({ period_key: periodKey });
    }
    if (schoolUnitId) {
      q = q.where((b) => {
        b.where({ school_unit_id: schoolUnitId }).orWhereNull('school_unit_id');
      });
    }

    const period = await q.orderBy('id', 'desc').first();
    return period;
  }

  /**
   * Lazily ensure period exists for a policy and school unit
   */
  async ensurePeriod(policyId = 1, periodKey = '2026/2027', schoolUnitId = null, trx = null) {
    const runner = trx || db;
    const policy = await runner('leave_balance_policies').where({ id: policyId }).first();
    if (!policy) {
      const err = new Error(`Kebijakan saldo cuti #${policyId} tidak ditemukan`);
      err.statusCode = 404;
      throw err;
    }

    let period = await runner('leave_balance_periods')
      .where({
        policy_id: policy.id,
        period_key: periodKey
      })
      .where((b) => {
        if (schoolUnitId) {
          b.where({ school_unit_id: schoolUnitId }).orWhereNull('school_unit_id');
        } else {
          b.whereNull('school_unit_id');
        }
      })
      .orderBy('id', 'desc')
      .first();

    if (period) return period;

    // Create period if not found
    const { startDate, endDate } = resolvePeriodRange(periodKey, policy.period_start_month || 7);
    const [newId] = await runner('leave_balance_periods').insert({
      policy_id: policy.id,
      school_unit_id: schoolUnitId || null,
      period_key: periodKey,
      start_date: startDate,
      end_date: endDate,
      status: 'open',
      created_at: new Date(),
      updated_at: new Date()
    });

    return runner('leave_balance_periods').where({ id: newId }).first();
  }

  /**
   * Lazily ensure entitlement for an employee in a given period (SPEC §5.2)
   */
  async ensureEntitlement(employeeId, periodKey = '2026/2027', trx = null) {
    const runner = trx || db;

    // 1. Fetch employee
    const employee = await runner('employees').where({ id: employeeId }).first();
    if (!employee) {
      const err = new Error('Pegawai tidak ditemukan');
      err.code = 'EMPLOYEE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // 2. Fetch default annual policy
    const policy = await runner('leave_balance_policies').where({ id: 1 }).first();
    if (!policy) return null;

    // 3. Fetch or create period
    let period = await runner('leave_balance_periods')
      .where({ policy_id: policy.id, period_key: periodKey })
      .first();

    if (!period) {
      period = await this.ensurePeriod(policy.id, periodKey, employee.school_unit_id, runner);
    }

    // 4. Check if balance record already exists
    let balance = await runner('employee_leave_balances')
      .where({ employee_id: employeeId, period_id: period.id, policy_id: policy.id })
      .first();

    if (balance) {
      return balance;
    }

    // 5. Calculate entitlement using pure function
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

    // 6. Insert balance row & initial grant ledger entry in a transaction
    const executeInit = async (t) => {
      // Re-check under lock
      let existingBal = await t('employee_leave_balances')
        .where({ employee_id: employeeId, period_id: period.id, policy_id: policy.id })
        .first();

      if (existingBal) return existingBal;

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
        const idempotencyKey = `init:emp:${employeeId}:period:${period.id}:grant`;
        const existingEntry = await t('leave_ledger_entries')
          .where({ idempotency_key: idempotencyKey })
          .first();

        if (!existingEntry) {
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
            idempotency_key: idempotencyKey,
            reason: `Hak awal cuti tahunan periode ${period.period_key} (${entitlementRes.code})`,
            created_at: new Date()
          });
        }
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
   * Check and expire carry-over balance lazily if carry_expires_on has passed (SPEC §5.3)
   */
  async checkAndExpireCarryOver(employeeId, periodId, trx = null) {
    const runner = trx || db;
    const balance = await runner('employee_leave_balances')
      .where({ employee_id: employeeId, period_id: periodId, policy_id: 1 })
      .first();

    if (!balance || !balance.carry_expires_on) return balance;

    const todayStr = todayWIB();
    if (balance.carry_expires_on >= todayStr) return balance; // Not yet expired

    const carryIn = parseFloat(balance.carry_in) || 0;
    if (carryIn <= 0) return balance;

    // Check ledger entries for carry_over bucket
    const entries = await runner('leave_ledger_entries')
      .where({
        employee_id: employeeId,
        period_id: periodId,
        bucket: 'carry_over'
      });

    let carryDeductions = 0;
    let alreadyExpired = 0;

    for (const e of entries) {
      if (e.entry_type === 'expire') {
        alreadyExpired += Math.abs(parseFloat(e.delta_available) || 0);
      } else if (e.entry_type === 'reserve' || e.entry_type === 'commit' || e.entry_type === 'joint_leave_debit') {
        carryDeductions += Math.abs(parseFloat(e.delta_available) || parseFloat(e.delta_used) || 0);
      }
    }

    const unexpiredRemainingCarry = Math.max(0, carryIn - carryDeductions - alreadyExpired);
    if (unexpiredRemainingCarry <= 0) return balance;

    const idempotencyKey = `expire:emp:${employeeId}:period:${periodId}:carry_over`;

    const executeExpire = async (t) => {
      const existingExpire = await t('leave_ledger_entries')
        .where({ idempotency_key: idempotencyKey })
        .first();

      if (existingExpire) return;

      await t('leave_ledger_entries').insert({
        employee_id: employeeId,
        period_id: periodId,
        policy_id: 1,
        bucket: 'carry_over',
        entry_type: 'expire',
        delta_available: -unexpiredRemainingCarry,
        delta_reserved: 0,
        delta_used: 0,
        effective_date: balance.carry_expires_on,
        source_type: 'system',
        source_id: periodId,
        idempotency_key: idempotencyKey,
        reason: `Kedaluwarsa saldo carry over per ${balance.carry_expires_on}`,
        created_at: new Date()
      });

      await t('employee_leave_balances')
        .where({ id: balance.id })
        .update({
          available: db.raw('GREATEST(0, available - ?)', [unexpiredRemainingCarry]),
          expired: db.raw('expired + ?', [unexpiredRemainingCarry]),
          updated_at: new Date()
        });
    };

    if (trx) {
      await executeExpire(trx);
    } else {
      await db.transaction(executeExpire);
    }

    return runner('employee_leave_balances').where({ id: balance.id }).first();
  }

  /**
   * Get balances list for HR overview with JWT scoping
   */
  async getBalances({ period = null, period_key = null, periodKey = null, school_unit_id = null, schoolUnitId = null, employee_id = null, employeeId = null, q = null, page = 1, per_page = 25, perPage = 25 }, actor = null) {
    const pKey = period || period_key || periodKey || '2026/2027';
    const targetUnitId = school_unit_id || schoolUnitId || null;
    const targetEmpId = employee_id || employeeId || null;
    const pPage = Math.max(1, parseInt(page, 10) || 1);
    const pLimit = Math.max(1, Math.min(100, parseInt(per_page || perPage, 10) || 25));

    const periodRec = await db('leave_balance_periods')
      .where({ period_key: pKey })
      .first();

    if (!periodRec) {
      return { data: [], total: 0, page: pPage, perPage: pLimit };
    }

    let query = db('employees as e')
      .leftJoin('employee_leave_balances as elb', function() {
        this.on('e.id', '=', 'elb.employee_id')
          .andOn('elb.period_id', '=', db.raw('?', [periodRec.id]));
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

    // Apply unit scoping from actor
    if (actor && actor.unitScope !== 'all') {
      if (Array.isArray(actor.unitScope)) {
        query = query.whereIn('e.school_unit_id', actor.unitScope);
      } else if (actor.unitScope) {
        query = query.where('e.school_unit_id', actor.unitScope);
      }
    } else if (targetUnitId) {
      query = query.where('e.school_unit_id', targetUnitId);
    }

    if (targetEmpId) {
      query = query.where('e.id', targetEmpId);
    }

    if (q) {
      query = query.where((b) => {
        b.where('e.full_name', 'like', `%${q}%`)
          .orWhere('e.employee_number', 'like', `%${q}%`);
      });
    }

    query = query.where('e.account_status', 'active');

    const countQuery = query.clone().clearSelect().count('e.id as total').first();
    const countRes = await countQuery;
    const total = countRes ? countRes.total : 0;

    const offset = (pPage - 1) * pLimit;
    const rows = await query.orderBy('e.full_name', 'asc').limit(pLimit).offset(offset);

    return {
      data: rows.map((r) => ({
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
      page: pPage,
      perPage: pLimit
    };
  }

  /**
   * Get single employee balance (ensuring entitlement and expiring carry-over lazily)
   */
  async getEmployeeBalance(employeeId, periodKey = '2026/2027', actor = null) {
    let balance = await this.ensureEntitlement(employeeId, periodKey);
    if (!balance) return null;

    // Check carry-over expiry lazily
    balance = await this.checkAndExpireCarryOver(employeeId, balance.period_id);

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
   * Get full ledger statement for an employee (SPEC §5.4, §11.3)
   * Note: No cross-database joins to Core `users` table
   */
  async getLedgerEntries(employeeId, { period_id = null, periodId = null } = {}, actor = null) {
    const targetPeriodId = period_id || periodId;

    let q = db('leave_ledger_entries as lle')
      .join('leave_balance_periods as lbp', 'lle.period_id', 'lbp.id')
      .where('lle.employee_id', employeeId)
      .select(
        'lle.*',
        'lbp.period_key'
      );

    if (targetPeriodId) {
      q = q.where('lle.period_id', targetPeriodId);
    }

    const entries = await q.orderBy('lle.created_at', 'asc');
    const balance = await this.getEmployeeBalance(employeeId, '2026/2027', actor);

    return {
      employee_id: employeeId,
      balance,
      entries: entries.map((e) => ({
        ...e,
        delta_available: parseFloat(e.delta_available),
        delta_reserved: parseFloat(e.delta_reserved),
        delta_used: parseFloat(e.delta_used)
      }))
    };
  }

  /**
   * Reserve balance when a leave request is submitted (SPEC §5.4, §5.5)
   */
  async reserveBalance({
    employeeId,
    days,
    leaveRequestId,
    version = 1,
    reason = 'Pengajuan cuti',
    actor = null,
    allocations = null
  }, trx) {
    const policy = await trx('leave_balance_policies').where({ id: 1 }).first();
    const period = await this.getActivePeriod(1, null, null, trx);
    if (!period) throw new Error('Periode cuti aktif tidak ditemukan');

    // 1. Lock balance row with FOR UPDATE
    let balance = await trx('employee_leave_balances')
      .where({ employee_id: employeeId, period_id: period.id, policy_id: 1 })
      .forUpdate()
      .first();

    if (!balance) {
      await this.ensureEntitlement(employeeId, period.period_key, trx);
      balance = await trx('employee_leave_balances')
        .where({ employee_id: employeeId, period_id: period.id, policy_id: 1 })
        .forUpdate()
        .first();
    }

    // Expire carry over lazily under lock
    await this.checkAndExpireCarryOver(employeeId, period.id, trx);
    balance = await trx('employee_leave_balances')
      .where({ id: balance.id })
      .forUpdate()
      .first();

    const available = parseFloat(balance.available);
    const allowNegative = policy.allow_negative === 1 || policy.allow_negative === true;
    const negativeLimit = allowNegative ? (parseFloat(policy.negative_limit_days) || 0) : 0;

    if (available - days < -negativeLimit) {
      const err = new Error(`Saldo cuti tidak mencukupi (tersedia: ${available}, dibutuhkan: ${days})`);
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
      .where({ id: balance.id })
      .update({
        available: available - days,
        reserved: parseFloat(balance.reserved) + days,
        updated_at: new Date()
      });
  }

  /**
   * Commit balance when request is approved (SPEC §5.4, §5.5)
   */
  async commitBalance({
    employeeId,
    days,
    leaveRequestId,
    version = 1,
    reason = 'Persetujuan cuti',
    actor = null
  }, trx) {
    const period = await this.getActivePeriod(1, null, null, trx);
    const idempotencyKey = `leave:${leaveRequestId}:commit:v${version}`;

    const existing = await trx('leave_ledger_entries')
      .where({ idempotency_key: idempotencyKey })
      .first();
    if (existing) return; // Idempotent (B10)

    const balance = await trx('employee_leave_balances')
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
      .where({ id: balance.id })
      .update({
        reserved: Math.max(0, parseFloat(balance.reserved) - days),
        used: parseFloat(balance.used) + days,
        updated_at: new Date()
      });
  }

  /**
   * Combined reserve and commit for HR bypass approval in one transaction (SPEC §5.5)
   */
  async reserveAndCommitBalance({
    employeeId,
    days,
    leaveRequestId,
    version = 1,
    reason = 'Persetujuan langsung (Bypass HRD)',
    actor = null
  }, trx) {
    await this.reserveBalance({
      employeeId,
      days,
      leaveRequestId,
      version,
      reason: `Reservasi bypass: ${reason}`,
      actor
    }, trx);

    await this.commitBalance({
      employeeId,
      days,
      leaveRequestId,
      version,
      reason,
      actor
    }, trx);
  }

  /**
   * Release reserved balance when request is rejected or cancelled before approval (SPEC §5.4, B6)
   */
  async releaseBalance({
    employeeId,
    days,
    leaveRequestId,
    version = 1,
    reason = 'Penolakan/pembatalan pengajuan',
    actor = null
  }, trx) {
    const period = await this.getActivePeriod(1, null, null, trx);
    const idempotencyKey = `leave:${leaveRequestId}:release:v${version}`;

    const existing = await trx('leave_ledger_entries')
      .where({ idempotency_key: idempotencyKey })
      .first();
    if (existing) return;

    const balance = await trx('employee_leave_balances')
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
      .where({ id: balance.id })
      .update({
        available: parseFloat(balance.available) + days,
        reserved: Math.max(0, parseFloat(balance.reserved) - days),
        updated_at: new Date()
      });
  }

  /**
   * Refund balance when approved leave is cancelled/refunded (full or partial, B7)
   */
  async refundBalance({
    employeeId,
    days,
    leaveRequestId,
    reason = 'Pembatalan cuti disetujui',
    actor = null
  }, trx) {
    const period = await this.getActivePeriod(1, null, null, trx);
    const idempotencyKey = `leave:${leaveRequestId}:refund:${Date.now()}`;

    const balance = await trx('employee_leave_balances')
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
      .where({ id: balance.id })
      .update({
        available: parseFloat(balance.available) + days,
        used: Math.max(0, parseFloat(balance.used) - days),
        updated_at: new Date()
      });
  }

  /**
   * Manual adjustment by HRD (SPEC §5.4, §11.3)
   */
  async adjustBalance({ employeeId, employee_id = null, deltaAvailable, delta_available = null, periodId = null, period_id = null, reason, actor }) {
    const empId = employeeId || employee_id;
    const deltaVal = deltaAvailable !== undefined ? deltaAvailable : delta_available;
    const pId = periodId || period_id;

    if (!empId) {
      const err = new Error('Field employee_id wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (!reason || !reason.trim()) {
      const err = new Error('Alasan penyesuaian saldo wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const delta = parseFloat(deltaVal);
    if (isNaN(delta) || delta === 0) {
      const err = new Error('Nilai penyesuaian harus angka bukan nol');
      err.statusCode = 422;
      throw err;
    }

    const period = pId
      ? await db('leave_balance_periods').where({ id: pId }).first()
      : await this.getActivePeriod(1);

    if (!period) throw new Error('Periode saldo tidak ditemukan');

    return db.transaction(async (trx) => {
      let balance = await trx('employee_leave_balances')
        .where({ employee_id: empId, period_id: period.id, policy_id: 1 })
        .forUpdate()
        .first();

      if (!balance) {
        balance = await this.ensureEntitlement(empId, period.period_key, trx);
      }

      const idempotencyKey = `adjust:emp:${empId}:period:${period.id}:${Date.now()}`;

      await trx('leave_ledger_entries').insert({
        employee_id: empId,
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
        reason: reason.trim(),
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

  /**
   * Apply joint leave deduction for a holiday (SPEC §5.5, §11.1)
   */
  async applyJointLeaveDeduction(holidayId, actor = null) {
    const holiday = await db('holidays').where({ id: holidayId, deleted_at: null }).first();
    if (!holiday) {
      const err = new Error('Hari libur tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (holiday.is_off_day !== 1 || holiday.deducts_annual_leave !== 1) {
      const err = new Error('Hari libur ini bukan hari libur pemotong cuti tahunan (deducts_annual_leave=1)');
      err.statusCode = 422;
      throw err;
    }

    // Normalize holiday date
    let holidayStartDate = holiday.start_date;
    if (holiday.start_date instanceof Date) {
      holidayStartDate = holiday.start_date.toISOString().slice(0, 10);
    } else if (typeof holiday.start_date === 'string' && holiday.start_date.includes('T')) {
      holidayStartDate = holiday.start_date.split('T')[0];
    } else {
      holidayStartDate = String(holiday.start_date);
    }

    // Check attendance lock on holiday start_date
    const isLocked = await this.isAttendancePeriodLocked(holidayStartDate, holiday.school_unit_id);
    if (isLocked) {
      const err = new Error('Periode presensi untuk tanggal libur ini telah dikunci (PERIOD_LOCKED)');
      err.code = 'PERIOD_LOCKED';
      err.statusCode = 409;
      throw err;
    }

    // Find active period covering this holiday date
    const policy = await db('leave_balance_policies').where({ id: 1 }).first();
    const period = await db('leave_balance_periods')
      .where({ policy_id: policy.id, status: 'open' })
      .where('start_date', '<=', holidayStartDate)
      .where('end_date', '>=', holidayStartDate)
      .first() || await this.getActivePeriod(1);

    if (!period) {
      const err = new Error('Periode cuti aktif tidak ditemukan untuk tanggal libur ini');
      err.statusCode = 404;
      throw err;
    }

    // Get candidate employees
    let empQuery = db('employees').where('account_status', 'active');
    if (holiday.school_unit_id) {
      empQuery = empQuery.where('school_unit_id', holiday.school_unit_id);
    }
    const employees = await empQuery.select('id', 'school_unit_id', 'full_name');

    const results = [];
    let affectedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      // 1. Check if employee was scheduled to work on that day
      const schedule = await calendarService.resolveEmployeeSchedule(emp.id, emp.school_unit_id, holidayStartDate);
      if (schedule.is_off_day || schedule.scheduleState === 'NONWORKDAY' || schedule.scheduleState === 'NO_ASSIGNMENT') {
        skippedCount++;
        results.push({ employee_id: emp.id, name: emp.full_name, status: 'skipped', reason: 'Bukan hari kerja terjadwal' });
        continue;
      }

      // 2. Check if employee already has approved leave on that date (avoid double deduction)
      const hasApprovedLeave = await db('employee_leave_requests')
        .where({ employee_id: emp.id, status: 'approved' })
        .where('start_date', '<=', holidayStartDate)
        .where('end_date', '>=', holidayStartDate)
        .first();

      if (hasApprovedLeave) {
        skippedCount++;
        results.push({ employee_id: emp.id, name: emp.full_name, status: 'skipped', reason: 'Sudah memiliki cuti yang disetujui pada tanggal ini' });
        continue;
      }

      // 3. Check idempotency key: holiday:{id}:emp:{employeeId}
      const idempotencyKey = `holiday:${holiday.id}:emp:${emp.id}`;
      const alreadyDeducted = await db('leave_ledger_entries')
        .where({ idempotency_key: idempotencyKey })
        .first();

      if (alreadyDeducted) {
        skippedCount++;
        results.push({ employee_id: emp.id, name: emp.full_name, status: 'already_applied', reason: 'Pemotongan cuti bersama sudah pernah dilakukan' });
        continue;
      }

      // 4. Apply deduction in transaction
      await db.transaction(async (trx) => {
        let balance = await trx('employee_leave_balances')
          .where({ employee_id: emp.id, period_id: period.id, policy_id: 1 })
          .forUpdate()
          .first();

        if (!balance) {
          balance = await this.ensureEntitlement(emp.id, period.period_key, trx);
        }

        await trx('leave_ledger_entries').insert({
          employee_id: emp.id,
          period_id: period.id,
          policy_id: 1,
          bucket: 'current',
          entry_type: 'joint_leave_debit',
          delta_available: -1.0,
          delta_reserved: 0,
          delta_used: 1.0,
          effective_date: holidayStartDate,
          source_type: 'holiday',
          source_id: holiday.id,
          idempotency_key: idempotencyKey,
          reason: `Pemotongan cuti bersama: ${holiday.name} (${holidayStartDate})`,
          created_by_user_id: actor ? actor.userId : null,
          created_by_employee_id: actor ? actor.employeeId : null,
          created_at: new Date()
        });

        await trx('employee_leave_balances')
          .where({ id: balance.id })
          .update({
            available: parseFloat(balance.available) - 1.0,
            used: parseFloat(balance.used) + 1.0,
            updated_at: new Date()
          });
      });

      affectedCount++;
      results.push({ employee_id: emp.id, name: emp.full_name, status: 'applied', deductedDays: 1.0 });
    }

    return {
      holiday_id: holiday.id,
      holiday_name: holiday.name,
      holiday_date: holidayStartDate,
      affectedEmployeesCount: affectedCount,
      skippedCount,
      results
    };
  }

  /**
   * Bulk assign/recalculate entitlement for all eligible employees (SPEC §5.2, §11.3)
   */
  async bulkAssignEntitlements({ periodKey = '2026/2027', schoolUnitId = null, policyId = 1, actor = null }) {
    let empQuery = db('employees').where('account_status', 'active');
    if (actor && actor.unitScope !== 'all') {
      if (Array.isArray(actor.unitScope)) {
        empQuery = empQuery.whereIn('school_unit_id', actor.unitScope);
      } else if (actor.unitScope) {
        empQuery = empQuery.where('school_unit_id', actor.unitScope);
      }
    } else if (schoolUnitId) {
      empQuery = empQuery.where('school_unit_id', schoolUnitId);
    }

    const employees = await empQuery.select('id', 'full_name', 'employment_status', 'join_date');
    const results = [];

    for (const emp of employees) {
      try {
        const bal = await this.ensureEntitlement(emp.id, periodKey);
        results.push({
          employee_id: emp.id,
          name: emp.full_name,
          granted: parseFloat(bal.granted),
          available: parseFloat(bal.available),
          status: 'success'
        });
      } catch (err) {
        results.push({
          employee_id: emp.id,
          name: emp.full_name,
          status: 'error',
          error: err.message
        });
      }
    }

    return {
      period_key: periodKey,
      total_processed: employees.length,
      results
    };
  }

  /**
   * Close period and compute carry-over into the next period (SPEC §5.3, §11.3)
   */
  async closePeriod(periodId, { dry_run = true, dryRun = true } = {}, actor = null) {
    const isDryRun = dry_run !== undefined ? (dry_run === true || dry_run === 'true' || dry_run === 1) : (dryRun === true || dryRun === 'true' || dryRun === 1);

    const period = await db('leave_balance_periods').where({ id: periodId }).first();
    if (!period) {
      const err = new Error('Periode cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (period.status === 'closed' && !isDryRun) {
      const err = new Error('Periode cuti sudah ditutup sebelumnya');
      err.statusCode = 409;
      throw err;
    }

    const policy = await db('leave_balance_policies').where({ id: period.policy_id }).first();

    // Determine next period key (e.g. 2026/2027 -> 2027/2028; 2026 -> 2027)
    let nextPeriodKey;
    if (period.period_key.includes('/')) {
      const [y1, y2] = period.period_key.split('/').map(Number);
      nextPeriodKey = `${y1 + 1}/${y2 + 1}`;
    } else {
      nextPeriodKey = String(parseInt(period.period_key, 10) + 1);
    }

    const { startDate: nextStartDate, endDate: nextEndDate } = resolvePeriodRange(nextPeriodKey, policy.period_start_month || 7);

    // Get all balances in current period
    const balances = await db('employee_leave_balances')
      .where({ period_id: period.id, policy_id: policy.id });

    const carryOverSummary = [];

    for (const bal of balances) {
      const available = parseFloat(bal.available) || 0;
      const { carryIn, carryExpiresOn } = computeCarryOver({
        remainingCurrentBalance: available,
        policy,
        newPeriodStartDate: nextStartDate
      });

      carryOverSummary.push({
        employee_id: bal.employee_id,
        current_period_available: available,
        carry_in: carryIn,
        carry_expires_on: carryExpiresOn
      });
    }

    if (isDryRun) {
      return {
        dry_run: true,
        period_id: period.id,
        period_key: period.period_key,
        next_period_key: nextPeriodKey,
        next_start_date: nextStartDate,
        next_end_date: nextEndDate,
        employees_count: balances.length,
        total_carry_in_days: carryOverSummary.reduce((sum, item) => sum + item.carry_in, 0),
        carry_overs: carryOverSummary
      };
    }

    // Execute period closure in transaction
    await db.transaction(async (trx) => {
      // 1. Mark current period closed
      await trx('leave_balance_periods')
        .where({ id: period.id })
        .update({
          status: 'closed',
          closed_at: new Date(),
          closed_by: actor ? actor.userId : null,
          updated_at: new Date()
        });

      // 2. Ensure next period exists
      let nextPeriod = await trx('leave_balance_periods')
        .where({ policy_id: policy.id, period_key: nextPeriodKey })
        .first();

      if (!nextPeriod) {
        const [nextPId] = await trx('leave_balance_periods').insert({
          policy_id: policy.id,
          school_unit_id: period.school_unit_id || null,
          period_key: nextPeriodKey,
          start_date: nextStartDate,
          end_date: nextEndDate,
          status: 'open',
          created_at: new Date(),
          updated_at: new Date()
        });
        nextPeriod = await trx('leave_balance_periods').where({ id: nextPId }).first();
      }

      // 3. Apply carry over & grants into next period
      for (const item of carryOverSummary) {
        // Ensure entitlement grant in next period
        await this.ensureEntitlement(item.employee_id, nextPeriodKey, trx);

        if (item.carry_in > 0) {
          const idempotencyKey = `period_close:from:${period.id}:to:${nextPeriod.id}:emp:${item.employee_id}:carry_in`;
          const existingEntry = await trx('leave_ledger_entries')
            .where({ idempotency_key: idempotencyKey })
            .first();

          if (!existingEntry) {
            await trx('leave_ledger_entries').insert({
              employee_id: item.employee_id,
              period_id: nextPeriod.id,
              policy_id: policy.id,
              bucket: 'carry_over',
              entry_type: 'carry_in',
              delta_available: item.carry_in,
              delta_reserved: 0,
              delta_used: 0,
              effective_date: nextStartDate,
              source_type: 'period_close',
              source_id: period.id,
              idempotency_key: idempotencyKey,
              reason: `Carry over sisa cuti periode ${period.period_key} (kedaluwarsa: ${item.carry_expires_on})`,
              created_by_user_id: actor ? actor.userId : null,
              created_by_employee_id: actor ? actor.employeeId : null,
              created_at: new Date()
            });

            await trx('employee_leave_balances')
              .where({ employee_id: item.employee_id, period_id: nextPeriod.id, policy_id: policy.id })
              .update({
                carry_in: item.carry_in,
                carry_expires_on: item.carry_expires_on,
                available: db.raw('available + ?', [item.carry_in]),
                updated_at: new Date()
              });
          }
        }
      }
    });

    return {
      dry_run: false,
      period_id: period.id,
      status: 'closed',
      next_period_key: nextPeriodKey,
      employees_processed: carryOverSummary.length,
      carry_overs: carryOverSummary
    };
  }

  /**
   * Reconcile balances from append-only ledger against cache table (SPEC §5.4, §11.3)
   */
  async reconcileBalances(periodId, { employee_id = null, employeeId = null, dry_run = true, dryRun = true } = {}, actor = null) {
    const isDryRun = dry_run !== undefined ? (dry_run === true || dry_run === 'true' || dry_run === 1) : (dryRun === true || dryRun === 'true' || dryRun === 1);
    const targetEmpId = employee_id || employeeId;

    const period = await db('leave_balance_periods').where({ id: periodId }).first();
    if (!period) {
      const err = new Error('Periode cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let balQuery = db('employee_leave_balances').where({ period_id: period.id });
    if (targetEmpId) {
      balQuery = balQuery.where({ employee_id: targetEmpId });
    }
    const balances = await balQuery;

    const discrepancies = [];

    for (const bal of balances) {
      const entries = await db('leave_ledger_entries')
        .where({ employee_id: bal.employee_id, period_id: period.id });

      const calculated = rebuildBalanceFromLedger(entries);

      const diffAvailable = Math.abs(parseFloat(bal.available) - calculated.available);
      const diffUsed = Math.abs(parseFloat(bal.used) - calculated.used);
      const diffReserved = Math.abs(parseFloat(bal.reserved) - calculated.reserved);
      const diffGranted = Math.abs(parseFloat(bal.granted) - calculated.granted);
      const diffCarryIn = Math.abs(parseFloat(bal.carry_in) - calculated.carry_in);
      const diffAdjusted = Math.abs(parseFloat(bal.adjusted) - calculated.adjusted);
      const diffExpired = Math.abs(parseFloat(bal.expired) - calculated.expired);

      const hasDiscrepancy = (
        diffAvailable > 0.001 ||
        diffUsed > 0.001 ||
        diffReserved > 0.001 ||
        diffGranted > 0.001 ||
        diffCarryIn > 0.001 ||
        diffAdjusted > 0.001 ||
        diffExpired > 0.001
      );

      if (hasDiscrepancy) {
        discrepancies.push({
          employee_id: bal.employee_id,
          cache: {
            granted: parseFloat(bal.granted),
            carry_in: parseFloat(bal.carry_in),
            adjusted: parseFloat(bal.adjusted),
            used: parseFloat(bal.used),
            reserved: parseFloat(bal.reserved),
            expired: parseFloat(bal.expired),
            available: parseFloat(bal.available)
          },
          ledger: {
            granted: calculated.granted,
            carry_in: calculated.carry_in,
            adjusted: calculated.adjusted,
            used: calculated.used,
            reserved: calculated.reserved,
            expired: calculated.expired,
            available: calculated.available,
            isValidInvariant: calculated.isValid
          }
        });

        if (!isDryRun) {
          await db('employee_leave_balances')
            .where({ id: bal.id })
            .update({
              granted: calculated.granted,
              carry_in: calculated.carry_in,
              adjusted: calculated.adjusted,
              used: calculated.used,
              reserved: calculated.reserved,
              expired: calculated.expired,
              available: calculated.available,
              updated_at: new Date()
            });
        }
      }
    }

    return {
      dry_run: isDryRun,
      period_id: period.id,
      period_key: period.period_key,
      total_checked: balances.length,
      discrepancies_count: discrepancies.length,
      discrepancies
    };
  }

  /**
   * Get balance policies (SPEC §11.1)
   */
  async getBalancePolicies() {
    const policies = await db('leave_balance_policies').orderBy('id', 'asc');
    const rules = await db('leave_entitlement_rules').orderBy('priority', 'desc');

    return policies.map((p) => ({
      ...p,
      carry_over_max_days: parseFloat(p.carry_over_max_days),
      negative_limit_days: parseFloat(p.negative_limit_days),
      rules: rules.filter((r) => r.policy_id === p.id).map((r) => ({
        ...r,
        days: parseFloat(r.days)
      }))
    }));
  }

  /**
   * Update balance policy and entitlement rules (SPEC §11.1)
   */
  async updateBalancePolicy(policyId, payload, actor = null) {
    const policy = await db('leave_balance_policies').where({ id: policyId }).first();
    if (!policy) {
      const err = new Error('Kebijakan saldo tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const {
      name,
      period_start_month,
      proration_mode,
      proration_join_day_cutoff,
      rounding,
      min_service_months_for_eligibility,
      carry_over_enabled,
      carry_over_max_days,
      carry_over_expiry_months,
      allow_negative,
      negative_limit_days,
      rules = []
    } = payload;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (period_start_month !== undefined) updateData.period_start_month = parseInt(period_start_month, 10);
    if (proration_mode !== undefined) updateData.proration_mode = proration_mode;
    if (proration_join_day_cutoff !== undefined) updateData.proration_join_day_cutoff = parseInt(proration_join_day_cutoff, 10);
    if (rounding !== undefined) updateData.rounding = rounding;
    if (min_service_months_for_eligibility !== undefined) updateData.min_service_months_for_eligibility = parseInt(min_service_months_for_eligibility, 10);
    if (carry_over_enabled !== undefined) updateData.carry_over_enabled = carry_over_enabled ? 1 : 0;
    if (carry_over_max_days !== undefined) updateData.carry_over_max_days = parseFloat(carry_over_max_days);
    if (carry_over_expiry_months !== undefined) updateData.carry_over_expiry_months = parseInt(carry_over_expiry_months, 10);
    if (allow_negative !== undefined) updateData.allow_negative = allow_negative ? 1 : 0;
    if (negative_limit_days !== undefined) updateData.negative_limit_days = parseFloat(negative_limit_days);
    updateData.updated_at = new Date();

    return db.transaction(async (trx) => {
      await trx('leave_balance_policies').where({ id: policy.id }).update(updateData);

      if (Array.isArray(rules) && rules.length > 0) {
        for (const rule of rules) {
          if (rule.id) {
            await trx('leave_entitlement_rules')
              .where({ id: rule.id, policy_id: policy.id })
              .update({
                days: parseFloat(rule.days) || 0,
                min_service_months: parseInt(rule.min_service_months, 10) || 0,
                priority: parseInt(rule.priority, 10) || 10,
                updated_at: new Date()
              });
          } else if (rule.employment_status) {
            await trx('leave_entitlement_rules').insert({
              policy_id: policy.id,
              employment_status: rule.employment_status,
              days: parseFloat(rule.days) || 0,
              min_service_months: parseInt(rule.min_service_months, 10) || 0,
              priority: parseInt(rule.priority, 10) || 10,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }
      }

      const updated = await trx('leave_balance_policies').where({ id: policy.id }).first();
      const updatedRules = await trx('leave_entitlement_rules').where({ policy_id: policy.id }).orderBy('priority', 'desc');

      return {
        ...updated,
        rules: updatedRules
      };
    });
  }
}

module.exports = new LeaveLedgerService();
