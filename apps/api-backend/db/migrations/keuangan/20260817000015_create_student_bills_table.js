/**
 * Migration: create_student_bills_table
 * Modul Keuangan - Fitur #13, #14, #15: Tagihan Siswa (Generate Massal, Daftar & Filter, Batalkan)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_bills', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('student_id').unsigned().notNullable();
    table.bigInteger('fee_type_id').unsigned().notNullable()
      .references('id').inTable('fee_types')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.integer('period_month').unsigned().nullable();
    table.integer('period_year').unsigned().notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.date('due_date').notNullable();
    table.enum('status', ['unpaid', 'partially_paid', 'paid', 'cancelled']).notNullable().defaultTo('unpaid');
    table.text('cancel_reason').nullable();
    table.timestamp('cancelled_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id', 'status'], 'idx_bills_student_status');
    table.index(['school_unit_id', 'period_year', 'period_month'], 'idx_bills_period');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_bills');
};
