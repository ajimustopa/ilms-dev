/**
 * Leave Audit Log Helper
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §10.2 (leave_audit_logs)
 */

const db = require('../../../config/db/kepegawaian');

/**
 * Records an audit log entry in leave_audit_logs.
 * @param {object} params
 * @param {object} [params.knex] - Optional knex transaction instance
 * @param {string} params.entityType - 'leave_request', 'overtime', 'employee_profile', 'leave_balance', 'holiday', 'leave_type', etc.
 * @param {number|string} params.entityId - Primary key of the entity
 * @param {string} params.action - 'create', 'update', 'approve', 'reject', 'cancel', 'adjust', 'update_leave_profile', etc.
 * @param {number|string} params.actorUserId - ID of the user performing the action
 * @param {number|string|null} [params.actorEmployeeId] - ID of the employee associated with user (if any)
 * @param {object|null} [params.beforeJson] - State before mutation
 * @param {object|null} [params.afterJson] - State after mutation
 * @param {string|null} [params.reason] - Human-readable reason or note
 * @param {string|null} [params.ip] - IP address of the client
 */
async function recordLeaveAuditLog({
  knex = null,
  entityType,
  entityId,
  action,
  actorUserId,
  actorEmployeeId = null,
  beforeJson = null,
  afterJson = null,
  reason = null,
  ip = null
}) {
  const connection = knex || db;
  try {
    const insertData = {
      entity_type: String(entityType).slice(0, 50),
      entity_id: Number(entityId),
      action: String(action).slice(0, 50),
      actor_user_id: Number(actorUserId),
      actor_employee_id: actorEmployeeId ? Number(actorEmployeeId) : null,
      before_json: beforeJson ? JSON.stringify(beforeJson) : null,
      after_json: afterJson ? JSON.stringify(afterJson) : null,
      reason: reason ? String(reason).slice(0, 500) : null,
      ip: ip ? String(ip).slice(0, 45) : null,
      created_at: new Date()
    };

    await connection('leave_audit_logs').insert(insertData);
  } catch (err) {
    console.error('[LEAVE_AUDIT_LOG_ERROR]', err.message);
    // Non-blocking log failure
  }
}

module.exports = {
  recordLeaveAuditLog
};
