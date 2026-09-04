/**
 * Migration: Add approval columns to student_bills for multi-tier discount approval
 */

exports.up = async function (knex) {
  const hasTier = await knex.schema.hasColumn('student_bills', 'approval_tier');
  if (!hasTier) {
    await knex.schema.alterTable('student_bills', function (table) {
      table.enu('approval_tier', ['unit', 'yayasan']).nullable().after('status');
      table.bigInteger('approved_by').unsigned().nullable().after('approval_tier');
      table.timestamp('approved_at').nullable().after('approved_by');
      table.text('rejection_reason').nullable().after('approved_at');
    });
  }
};

exports.down = async function (knex) {
  const hasTier = await knex.schema.hasColumn('student_bills', 'approval_tier');
  if (hasTier) {
    await knex.schema.alterTable('student_bills', function (table) {
      table.dropColumn('rejection_reason');
      table.dropColumn('approved_at');
      table.dropColumn('approved_by');
      table.dropColumn('approval_tier');
    });
  }
};
