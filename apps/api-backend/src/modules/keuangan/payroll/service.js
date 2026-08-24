/**
 * Payroll Disbursement Service for Keuangan Module
 * Covers Feature #25
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
      cash_account_id = 1
    } = data;

    // Check if duplicate
    const existing = await db('payroll_disbursements')
      .where({ employee_id, period_year, period_month })
      .first();

    if (existing) {
      await db('payroll_disbursements')
        .where({ id: existing.id })
        .update({ amount, status: 'pending' });
      return db('payroll_disbursements').where({ id: existing.id }).first();
    }

    const [id] = await db('payroll_disbursements').insert({
      school_unit_id,
      employee_id,
      period_month,
      period_year,
      amount,
      cash_account_id,
      status: 'pending'
    });

    return db('payroll_disbursements').where({ id }).first();
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
        employee_name: emp?.full_name || `Pegawai ID ${d.employee_id}`,
        employee_number: emp?.employee_number || '-'
      };
    }));
  }

  async disbursePayroll(schoolUnitId, id, cashAccountId, userId = null) {
    return db.transaction(async (trx) => {
      const disbursement = await trx('payroll_disbursements')
        .where({ id, school_unit_id: schoolUnitId })
        .first();

      if (!disbursement) return { error: 'NOT_FOUND', message: 'Data pencairan gaji tidak ditemukan' };
      if (disbursement.status === 'disbursed') return { error: 'CONFLICT', message: 'Gaji ini sudah dicairkan sebelumnya' };

      const actualCashAccountId = cashAccountId || disbursement.cash_account_id;
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
          trx
        });
      } catch (journalErr) {
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

      return { data: updated };
    });
  }
}

module.exports = new PayrollService();
