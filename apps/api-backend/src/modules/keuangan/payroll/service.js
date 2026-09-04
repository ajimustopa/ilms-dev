/**
 * Payroll Disbursement Service for Keuangan Module
 * Covers Feature #25, Anti-Overwrite Protection, Breakdown Snapshot, and Return for Correction
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');
const crossModuleServices = require('../common/crossModuleServices');

class PayrollService {
  async ingestPayrollDisbursement(data) {
    const {
      school_unit_id = 1,
      employee_id,
      period_month,
      period_year,
      amount,
      cash_account_id = 1,
      breakdown_snapshot = null,
      source_payroll_period_id = null
    } = data;

    const targetSchoolUnitId = school_unit_id || data.schoolUnitId || 1;

    // Check if duplicate
    const existing = await db('payroll_disbursements')
      .where({ employee_id, period_year, period_month })
      .first();

    if (existing) {
      // Proteksi Anti-Overwrite: Jika sudah dicairkan, tolak ingest
      if (existing.status === 'disbursed') {
        const error = new Error(`Gaji pegawai ID ${employee_id} untuk periode ${period_month}/${period_year} sudah dicairkan sebelumnya dan tidak dapat ditimpa (Anti-Overwrite).`);
        error.statusCode = 409;
        throw error;
      }

      const previousSnapshot = {
        amount: existing.amount,
        status: existing.status,
        breakdown_snapshot: existing.breakdown_snapshot,
        rejection_reason: existing.rejection_reason
      };

      await db('payroll_disbursements')
        .where({ id: existing.id })
        .update({
          amount,
          breakdown_snapshot: breakdown_snapshot ? JSON.stringify(breakdown_snapshot) : existing.breakdown_snapshot,
          source_payroll_period_id: source_payroll_period_id || existing.source_payroll_period_id,
          status: 'pending',
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          updated_at: db.fn.now()
        });

      const updated = await db('payroll_disbursements').where({ id: existing.id }).first();

      await logFinanceAudit({
        schoolUnitId: existing.school_unit_id || targetSchoolUnitId,
        action: 'RE_INGEST_PAYROLL',
        entityType: 'payroll_disbursement',
        entityId: existing.id,
        dataBefore: previousSnapshot,
        dataAfter: updated
      });

      return {
        ...updated,
        breakdown_snapshot: typeof updated.breakdown_snapshot === 'string' ? JSON.parse(updated.breakdown_snapshot) : updated.breakdown_snapshot
      };
    }

    const [id] = await db('payroll_disbursements').insert({
      school_unit_id: targetSchoolUnitId,
      employee_id,
      period_month,
      period_year,
      amount,
      cash_account_id,
      breakdown_snapshot: breakdown_snapshot ? JSON.stringify(breakdown_snapshot) : null,
      source_payroll_period_id: source_payroll_period_id || null,
      status: 'pending'
    });

    const created = await db('payroll_disbursements').where({ id }).first();

    await logFinanceAudit({
      schoolUnitId: targetSchoolUnitId,
      action: 'INGEST_PAYROLL',
      entityType: 'payroll_disbursement',
      entityId: id,
      dataAfter: created
    });

    return {
      ...created,
      breakdown_snapshot: typeof created.breakdown_snapshot === 'string' ? JSON.parse(created.breakdown_snapshot) : created.breakdown_snapshot
    };
  }

  async listPayrollDisbursements(schoolUnitId, filters = {}) {
    let query = db('payroll_disbursements')
      .leftJoin('cash_accounts', 'payroll_disbursements.cash_account_id', 'cash_accounts.id')
      .where('payroll_disbursements.school_unit_id', schoolUnitId)
      .select(
        'payroll_disbursements.*',
        'cash_accounts.name as cash_account_name'
      );

    if (filters.period_year) {
      query = query.where('payroll_disbursements.period_year', filters.period_year);
    }
    if (filters.period_month) {
      query = query.where('payroll_disbursements.period_month', filters.period_month);
    }
    if (filters.status) {
      query = query.where('payroll_disbursements.status', filters.status);
    }

    const disbursements = await query.orderBy('payroll_disbursements.created_at', 'desc');

    return Promise.all(disbursements.map(async d => {
      const emp = await crossModuleServices.getEmployee(d.employee_id);
      return {
        ...d,
        breakdown_snapshot: typeof d.breakdown_snapshot === 'string' ? JSON.parse(d.breakdown_snapshot) : d.breakdown_snapshot,
        employee_name: emp?.full_name || `Pegawai ID ${d.employee_id}`,
        employee_number: emp?.employee_number || '-'
      };
    }));
  }

  async disbursePayroll(schoolUnitId, id, cashAccountId, userId = null, overrideData = {}) {
    return db.transaction(async (trx) => {
      const disbursement = await trx('payroll_disbursements')
        .where({ id, school_unit_id: schoolUnitId })
        .first();

      if (!disbursement) return { error: 'NOT_FOUND', message: 'Data pencairan gaji tidak ditemukan' };
      if (disbursement.status === 'disbursed') return { error: 'CONFLICT', message: 'Gaji ini sudah dicairkan sebelumnya' };
      if (disbursement.status === 'rejected') return { error: 'UNPROCESSABLE', message: 'Gaji yang berstatus ditolak/dikembalikan tidak dapat dicairkan' };

      const actualCashAccountId = overrideData.override_cash_account_id
        ? Number(overrideData.override_cash_account_id)
        : (cashAccountId || disbursement.cash_account_id);
      const disbursedAt = trx.fn.now();

      await trx('payroll_disbursements')
        .where({ id })
        .update({
          cash_account_id: actualCashAccountId,
          status: 'disbursed',
          disbursed_at: disbursedAt
        });

      // Auto journal via journalEngine
      try {
        await recordJournal({
          schoolUnitId,
          transactionCode: 'payroll_disbursement',
          amount: parseFloat(disbursement.amount),
          sourceType: 'payroll_disbursement',
          sourceId: id,
          description: `Pencairan Gaji Pegawai ID #${disbursement.employee_id} (Periode: ${disbursement.period_month}/${disbursement.period_year})`,
          journalDate: new Date(),
          overrideDebitAccountId: overrideData.override_debit_account_id || null,
          overrideCreditAccountId: overrideData.override_credit_account_id || null,
          overrideCashAccountId: overrideData.override_cash_account_id || null,
          overrideReason: overrideData.override_reason || null,
          userId,
          trx
        });
      } catch (journalErr) {
        if (journalErr.statusCode === 422) throw journalErr;
        console.warn('Auto journal skipped or error:', journalErr.message);
      }

      const updated = await trx('payroll_disbursements').where({ id }).first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'DISBURSE_PAYROLL',
        entityType: 'payroll_disbursement',
        entityId: id,
        dataBefore: disbursement,
        dataAfter: updated,
        trx
      });

      return {
        data: {
          ...updated,
          breakdown_snapshot: typeof updated.breakdown_snapshot === 'string' ? JSON.parse(updated.breakdown_snapshot) : updated.breakdown_snapshot
        }
      };
    });
  }

  /**
   * Reject / Return Payroll Disbursement to Kepegawaian (Kembalikan untuk Koreksi)
   */
  async rejectPayrollDisbursement(schoolUnitId, id, rejectionReason, userId = null) {
    if (!rejectionReason || !String(rejectionReason).trim()) {
      const err = new Error('Alasan penolakan/pengembalian payroll (rejection_reason) wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const disbursement = await db('payroll_disbursements')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!disbursement) {
      const err = new Error('Data pencairan gaji tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (disbursement.status === 'disbursed') {
      const err = new Error('Gaji yang sudah dicairkan tidak dapat ditolak atau dikembalikan');
      err.statusCode = 422;
      throw err;
    }

    if (disbursement.status === 'rejected') {
      const err = new Error('Gaji ini sudah berstatus ditolak/dikembalikan sebelumnya');
      err.statusCode = 422;
      throw err;
    }

    const now = db.fn.now();
    await db('payroll_disbursements')
      .where({ id })
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejected_at: now,
        rejected_by: userId,
        updated_at: now
      });

    const updated = await db('payroll_disbursements').where({ id }).first();

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'REJECT_PAYROLL_DISBURSEMENT',
      entityType: 'payroll_disbursement',
      entityId: id,
      dataBefore: disbursement,
      dataAfter: updated
    });

    // Panggil Kepegawaian internal service untuk mengembalikan item ke draft koreksi
    try {
      const kepegawaianPayrollService = require('../../kepegawaian/payroll/service');
      await kepegawaianPayrollService.returnForCorrection({
        employee_id: disbursement.employee_id,
        period_month: disbursement.period_month,
        period_year: disbursement.period_year,
        rejection_reason: rejectionReason,
        userId
      });
    } catch (crossErr) {
      console.warn('Gagal sinkronisasi status pengembalian ke Kepegawaian:', crossErr.message);
    }

    return {
      ...updated,
      breakdown_snapshot: typeof updated.breakdown_snapshot === 'string' ? JSON.parse(updated.breakdown_snapshot) : updated.breakdown_snapshot
    };
  }
}

module.exports = new PayrollService();
