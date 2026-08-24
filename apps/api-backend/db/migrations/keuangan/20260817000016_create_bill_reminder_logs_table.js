/**
 * Migration: create_bill_reminder_logs_table
 * Modul Keuangan - Fitur #16: Reminder Tagihan Otomatis (Append-Only)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('bill_reminder_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_bill_id').unsigned().notNullable()
      .references('id').inTable('student_bills')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('channel', 30).notNullable();
    table.timestamp('sent_at').notNullable().defaultTo(knex.fn.now());

    table.index(['student_bill_id'], 'idx_brl_student_bill');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('bill_reminder_logs');
};
