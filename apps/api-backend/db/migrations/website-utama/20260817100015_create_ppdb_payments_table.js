/**
 * Migration: create_ppdb_payments_table
 * Modul Website Utama - Fitur #27: Pembayaran Biaya Pendaftaran PPDB
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('ppdb_payments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('registrant_id').unsigned().notNullable()
      .references('id').inTable('ppdb_registrants').onDelete('CASCADE');
    table.decimal('amount', 12, 2).notNullable();
    table.enu('payment_status', ['pending', 'paid', 'failed', 'expired']).notNullable().defaultTo('pending');
    table.string('payment_gateway_name', 50).nullable();
    table.string('payment_gateway_ref', 150).nullable();
    table.timestamp('paid_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['registrant_id', 'payment_status'], 'idx_ppdb_pay_reg_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('ppdb_payments');
};
