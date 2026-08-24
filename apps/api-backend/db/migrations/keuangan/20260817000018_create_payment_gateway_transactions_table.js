/**
 * Migration: create_payment_gateway_transactions_table
 * Modul Keuangan - Fitur #20: Integrasi Payment Gateway
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('payment_gateway_transactions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('bill_payment_id').unsigned().nullable()
      .references('id').inTable('bill_payments')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('provider', 50).notNullable();
    table.string('provider_reference', 150).notNullable().unique();
    table.string('channel', 50).nullable();
    table.decimal('amount', 18, 2).notNullable();
    table.enum('status', ['pending', 'success', 'failed', 'expired']).notNullable().defaultTo('pending');
    table.json('callback_payload').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['bill_payment_id'], 'idx_pgt_bill_payment');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payment_gateway_transactions');
};
