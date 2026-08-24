/**
 * Migration: create_bill_payments_table
 * Modul Keuangan - Fitur #17, #18, #19: Pembayaran Tagihan, Edit/Koreksi, & Kwitansi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('bill_payments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_bill_id').unsigned().notNullable()
      .references('id').inTable('student_bills')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('cash_account_id').unsigned().notNullable()
      .references('id').inTable('cash_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('paid_at').notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.enum('payment_method', ['cash', 'transfer', 'gateway']).notNullable();
    table.string('receipt_number', 50).nullable().unique();
    table.text('notes').nullable();
    table.json('previous_data').nullable();
    table.text('correction_reason').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_bill_id'], 'idx_bp_student_bill');
    table.index(['cash_account_id'], 'idx_bp_cash_account');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('bill_payments');
};
