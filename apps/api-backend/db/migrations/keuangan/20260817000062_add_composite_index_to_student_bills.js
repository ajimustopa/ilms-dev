/**
 * Migration 62: Add composite index (school_unit_id, academic_year_id, period_month) to student_bills
 * Optimizes SQL Conditional Pivot queries for collection performance & monthly student ledger
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('student_bills');
  if (hasTable) {
    await knex.schema.alterTable('student_bills', function(table) {
      table.index(['school_unit_id', 'academic_year_id', 'period_month'], 'idx_bills_unit_ay_month');
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('student_bills');
  if (hasTable) {
    await knex.schema.alterTable('student_bills', function(table) {
      table.dropIndex(['school_unit_id', 'academic_year_id', 'period_month'], 'idx_bills_unit_ay_month');
    });
  }
};
