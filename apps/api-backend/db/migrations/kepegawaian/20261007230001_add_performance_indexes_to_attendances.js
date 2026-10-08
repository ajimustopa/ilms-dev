/**
 * Migration: Add Performance Composite Indexes to employee_attendances & attendance_period_locks
 * Optimizes monthly recap, anomaly detection, absent candidate filtering, and period status lookups
 */
exports.up = async function (knex) {
  const hasAttendances = await knex.schema.hasTable('employee_attendances');
  if (hasAttendances) {
    await knex.schema.alterTable('employee_attendances', (table) => {
      table.index(['school_unit_id', 'attendance_date'], 'idx_att_school_unit_date');
      table.index(['attendance_date'], 'idx_att_date');
      table.index(['school_unit_id', 'clarification_status'], 'idx_att_school_unit_clarification');
      table.index(['school_unit_id', 'is_anomaly', 'anomaly_resolved'], 'idx_att_school_unit_anomaly');
    });
  }

  const hasLocks = await knex.schema.hasTable('attendance_period_locks');
  if (hasLocks) {
    await knex.schema.alterTable('attendance_period_locks', (table) => {
      table.index(['period_year', 'period_month', 'school_unit_id'], 'idx_period_locks_year_month_unit');
    });
  }
};

exports.down = async function (knex) {
  const hasAttendances = await knex.schema.hasTable('employee_attendances');
  if (hasAttendances) {
    await knex.schema.alterTable('employee_attendances', (table) => {
      table.dropIndex(['school_unit_id', 'attendance_date'], 'idx_att_school_unit_date');
      table.dropIndex(['attendance_date'], 'idx_att_date');
      table.dropIndex(['school_unit_id', 'clarification_status'], 'idx_att_school_unit_clarification');
      table.dropIndex(['school_unit_id', 'is_anomaly', 'anomaly_resolved'], 'idx_att_school_unit_anomaly');
    });
  }

  const hasLocks = await knex.schema.hasTable('attendance_period_locks');
  if (hasLocks) {
    await knex.schema.alterTable('attendance_period_locks', (table) => {
      table.dropIndex(['period_year', 'period_month', 'school_unit_id'], 'idx_period_locks_year_month_unit');
    });
  }
};
