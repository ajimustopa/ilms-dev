/**
 * Migration: Add academic_year_id to student_bills
 */

exports.up = async function (knex) {
  const hasCol = await knex.schema.hasColumn('student_bills', 'academic_year_id');
  if (!hasCol) {
    await knex.schema.alterTable('student_bills', function (table) {
      table.bigInteger('academic_year_id').unsigned().nullable().after('fee_type_id');
      table.index(['academic_year_id'], 'idx_bills_academic_year');
    });
  }
};

exports.down = async function (knex) {
  const hasCol = await knex.schema.hasColumn('student_bills', 'academic_year_id');
  if (hasCol) {
    await knex.schema.alterTable('student_bills', function (table) {
      table.dropIndex(['academic_year_id'], 'idx_bills_academic_year');
      table.dropColumn('academic_year_id');
    });
  }
};
