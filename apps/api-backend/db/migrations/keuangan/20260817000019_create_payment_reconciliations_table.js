/**
 * Migration: create_payment_reconciliations_table
 * Modul Keuangan - Fitur #21: Rekonsiliasi Pembayaran PPDB & Kantin
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('payment_reconciliations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.enum('source_module', ['website_ppdb', 'kantin']).notNullable();
    table.string('source_reference', 150).notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.timestamp('reconciled_at').nullable();
    table.enum('status', ['pending', 'matched', 'discrepancy']).notNullable().defaultTo('pending');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['source_module', 'source_reference'], 'uq_reconciliation');
    table.index(['school_unit_id'], 'idx_payment_reconciliations_school_unit');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payment_reconciliations');
};
