/**
 * Migration M-I: Add leave_request_id to employee_attendances
 * Modul Kepegawaian - Core Aldepos
 * Tables:
 * - employee_attendances (leave_request_id)
 */

exports.up = async function(knex) {
  const hasAttendances = await knex.schema.hasTable('employee_attendances');
  if (hasAttendances) {
    const hasLeaveRequestId = await knex.schema.hasColumn('employee_attendances', 'leave_request_id');
    if (!hasLeaveRequestId) {
      await knex.schema.alterTable('employee_attendances', (table) => {
        table.bigInteger('leave_request_id').unsigned().nullable().after('sub_status');
        table.index(['leave_request_id'], 'idx_attendances_leave_req');
      });
    }
  }
};

exports.down = async function(knex) {
  if (await knex.schema.hasTable('employee_attendances')) {
    const hasLeaveRequestId = await knex.schema.hasColumn('employee_attendances', 'leave_request_id');
    if (hasLeaveRequestId) {
      await knex.schema.alterTable('employee_attendances', (table) => {
        table.dropIndex(['leave_request_id'], 'idx_attendances_leave_req');
        table.dropColumn('leave_request_id');
      });
    }
  }
};
