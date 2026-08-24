/**
 * Migration: create_accreditation_reports_table
 * Modul Manajemen - Fitur #196: Laporan Akreditasi & Instrumen Mutu
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('accreditation_reports', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.specificType('accreditation_year', 'SMALLINT UNSIGNED').notNullable();
    table.string('standard_code', 50).notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_ar_school_unit');
    table.index(['accreditation_year'], 'idx_ar_accreditation_year');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('accreditation_reports');
};
