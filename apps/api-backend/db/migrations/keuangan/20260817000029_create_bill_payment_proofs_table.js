/**
 * Migration: create_bill_payment_proofs_table
 * Modul Keuangan - Fitur Bukti Transfer Manual / Verifikasi Pembayaran Orang Tua
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('bill_payment_proofs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('student_bill_id').unsigned().notNullable()
      .references('id').inTable('student_bills')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('submitted_by_ref_id').unsigned().nullable();
    table.string('proof_file_url', 255).notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.date('transfer_date').notNullable();
    table.string('bank_name', 100).nullable();
    table.string('sender_account_name', 150).nullable();
    table.text('notes').nullable();
    table.enum('status', ['pending', 'verified', 'rejected']).notNullable().defaultTo('pending');
    table.bigInteger('verified_by').unsigned().nullable();
    table.timestamp('verified_at').nullable();
    table.text('rejection_reason').nullable();
    table.bigInteger('bill_payment_id').unsigned().nullable()
      .references('id').inTable('bill_payments')
      .onDelete('SET NULL').onUpdate('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'status'], 'idx_payment_proofs_unit_status');
    table.index(['student_bill_id'], 'idx_payment_proofs_bill');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('bill_payment_proofs');
};
