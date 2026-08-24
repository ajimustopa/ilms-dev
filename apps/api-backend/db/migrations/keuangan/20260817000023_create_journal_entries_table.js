/**
 * Migration: create_journal_entries_table
 * Modul Keuangan - Fitur #26: Header Jurnal Otomatis / Manual
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('journal_entries', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('journal_number', 50).notNullable().unique();
    table.date('journal_date').notNullable();
    table.enum('source_type', ['student_bill_payment', 'other_income', 'expense', 'payroll_disbursement', 'manual']).notNullable();
    table.bigInteger('source_id').unsigned().nullable();
    table.text('description').nullable();
    table.boolean('is_manual_correction').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'journal_date'], 'idx_journal_entries_unit_date');
    table.index(['source_type', 'source_id'], 'idx_journal_entries_source');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('journal_entries');
};
