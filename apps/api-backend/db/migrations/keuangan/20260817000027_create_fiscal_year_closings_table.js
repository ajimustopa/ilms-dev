/**
 * Migration: create_fiscal_year_closings_table
 * Modul Keuangan - Fitur #28: Tutup Buku Tahunan (Fiscal Year Closings)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('fiscal_year_closings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('academic_year_id').unsigned().notNullable();
    table.enum('status', ['open', 'closed']).notNullable().defaultTo('open');
    table.timestamp('closed_at').nullable();
    table.bigInteger('closed_by').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'academic_year_id'], 'uq_closing');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('fiscal_year_closings');
};
