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
  entity_type,
  entityId,
  entity_id,
  action,
  actor,
  actorUserId,
  actor_user_id,
  actorEmployeeId = null,
  actor_employee_id = null,
  beforeJson = null,
  before_json = null,
  afterJson = null,
  after_state = null,
  after_json = null,
  before_state = null,
  reason = null,
  ip = null,
  metadata = null,
  school_unit_id = null
}) {
  const connection = knex || db;
  try {
    const finalType = String(entityType || entity_type || 'holiday').slice(0, 50);
    const rawEntityId = entityId !== undefined ? entityId : entity_id;
    const finalEntityId = (rawEntityId !== null && rawEntityId !== undefined && !Number.isNaN(Number(rawEntityId))) ? Number(rawEntityId) : null;

    const rawUserId = actorUserId || actor_user_id || (actor && actor.userId) || 1;
    const finalUserId = !Number.isNaN(Number(rawUserId)) ? Number(rawUserId) : 1;

    const rawEmpId = actorEmployeeId || actor_employee_id || (actor && actor.employeeId) || null;
    const finalEmpId = (rawEmpId !== null && rawEmpId !== undefined && !Number.isNaN(Number(rawEmpId))) ? Number(rawEmpId) : null;

    const bJson = beforeJson || before_json || before_state;
    const aJson = afterJson || after_json || after_state || metadata;

    const insertData = {
      entity_type: finalType,
      entity_id: finalEntityId,
      action: String(action).slice(0, 50),
      actor_user_id: finalUserId,
      actor_employee_id: finalEmpId,
      before_json: bJson ? JSON.stringify(bJson) : null,
      after_json: aJson ? JSON.stringify(aJson) : null,
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
