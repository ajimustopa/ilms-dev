/**
 * Audit Log Service for Keuangan Module
 * Append-only audit logger ke tabel `finance_audit_logs` (Fitur #29)
 */
const db = require('../../../config/db/keuangan');

/**
 * Mencatat log audit operasi keuangan
 * @param {Object} params
 * @param {number|string|null} params.schoolUnitId
 * @param {number|string|null} params.userId
 * @param {string} params.action - misal: 'CREATE_BILL', 'PAY_BILL', 'CORRECT_PAYMENT', 'DELETE_EXPENSE'
 * @param {string} params.entityType - misal: 'student_bill', 'bill_payment', 'expense'
 * @param {number|string|null} params.entityId
 * @param {Object|null} params.dataBefore
 * @param {Object|null} params.dataAfter
 * @param {Object|null} params.trx
 */
async function logFinanceAudit({
  schoolUnitId = null,
  userId = null,
  action,
  entityType,
  entityId = null,
  dataBefore = null,
  dataAfter = null,
  trx = null
}) {
  const runner = trx || db;
  try {
    await runner('finance_audit_logs').insert({
      school_unit_id: schoolUnitId,
      user_id: userId,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      data_before: dataBefore ? JSON.stringify(dataBefore) : null,
      data_after: dataAfter ? JSON.stringify(dataAfter) : null,
      occurred_at: runner.fn.now()
    });
  } catch (err) {
    console.error('Failed to write finance audit log:', err.message);
  }
}

module.exports = {
  logFinanceAudit
};
