/**
 * Migration: Add void fields to ppdb_registration_payments
 * For Void payment audit compliance and bill balance restoration
 */
exports.up = async function(knex) {
  const hasStatus = await knex.schema.hasColumn('ppdb_registration_payments', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('ppdb_registration_payments', (table) => {
      table.enum('status', ['valid', 'voided']).notNullable().defaultTo('valid').after('notes');
      table.text('void_reason').nullable().after('status');
      table.timestamp('voided_at').nullable().after('void_reason');
      table.bigInteger('voided_by').unsigned().nullable().after('voided_at');
    });
  }
};

exports.down = async function(knex) {
  const hasStatus = await knex.schema.hasColumn('ppdb_registration_payments', 'status');
  if (hasStatus) {
    await knex.schema.alterTable('ppdb_registration_payments', (table) => {
      table.dropColumn('voided_by');
      table.dropColumn('voided_at');
      table.dropColumn('void_reason');
      table.dropColumn('status');
    });
  }
};
