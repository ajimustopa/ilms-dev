/**
 * Migration: Make attendance_id nullable in attendance_audit_logs
 * Allows logging period-level actions (e.g. PERIOD_LOCKED, PERIOD_UNLOCKED, PERIOD_SUBMITTED_TO_PAYROLL)
 */
exports.up = async function (knex) {
  const hasAuditLogs = await knex.schema.hasTable('attendance_audit_logs');
  if (hasAuditLogs) {
    await knex.schema.alterTable('attendance_audit_logs', (table) => {
      table.bigInteger('attendance_id').unsigned().nullable().alter();
    });
  }
};

exports.down = async function (knex) {
  const hasAuditLogs = await knex.schema.hasTable('attendance_audit_logs');
  if (hasAuditLogs) {
    await knex.schema.alterTable('attendance_audit_logs', (table) => {
      table.bigInteger('attendance_id').unsigned().notNullable().alter();
    });
  }
};
