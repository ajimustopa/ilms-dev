/**
 * Migration: create_finance_audit_logs_table
 * Modul Keuangan - Fitur #29: Audit Trail Transaksi Keuangan (Append-Only)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('finance_audit_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.bigInteger('user_id').unsigned().nullable();
    table.string('action', 100).notNullable();
    table.string('entity_type', 100).notNullable();
    table.bigInteger('entity_id').unsigned().nullable();
    table.json('data_before').nullable();
    table.json('data_after').nullable();
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());

    table.index(['entity_type', 'occurred_at'], 'idx_fal_entity');
    table.index(['school_unit_id'], 'idx_finance_audit_logs_school_unit');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('finance_audit_logs');
};
