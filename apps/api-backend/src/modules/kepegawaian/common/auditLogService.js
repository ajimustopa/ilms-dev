/**
 * Payroll Audit Log Service
 * Modul Kepegawaian - Pencatatan jejak audit siklus payroll
 */
const db = require('../../../config/db/kepegawaian');

async function logPayrollAudit({
  payrollPeriodId,
  payrollItemId = null,
  action,
  performedBy = null,
  dataBefore = null,
  dataAfter = null,
  reason = null,
  trx = null
}) {
  try {
    const logData = {
      payroll_period_id: payrollPeriodId,
      payroll_item_id: payrollItemId || null,
      action,
      performed_by: performedBy || null,
      data_before: dataBefore ? JSON.stringify(dataBefore) : null,
      data_after: dataAfter ? JSON.stringify(dataAfter) : null,
      reason: reason || null,
      created_at: (trx || db).fn.now()
    };

    if (trx) {
      await trx('payroll_audit_logs').insert(logData);
    } else {
      await db('payroll_audit_logs').insert(logData);
    }
  } catch (err) {
    console.error('Failed to log payroll audit:', err.message);
  }
}

async function listPayrollAuditLogs(payrollPeriodId) {
  const logs = await db('payroll_audit_logs')
    .where({ payroll_period_id: payrollPeriodId })
    .orderBy('created_at', 'desc');

  return logs.map(l => ({
    ...l,
    data_before: typeof l.data_before === 'string' ? JSON.parse(l.data_before) : l.data_before,
    data_after: typeof l.data_after === 'string' ? JSON.parse(l.data_after) : l.data_after
  }));
}

module.exports = {
  logPayrollAudit,
  listPayrollAuditLogs
};
