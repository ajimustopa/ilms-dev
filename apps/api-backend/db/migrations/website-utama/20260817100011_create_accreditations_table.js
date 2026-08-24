/**
 * Migration: create_accreditations_table
 * Modul Website Utama - Fitur #24: Informasi Akreditasi & Prestasi Lembaga
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('accreditations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('accreditation_type', 150).notNullable();
    table.string('score', 20).nullable();
    table.specificType('year', 'YEAR').notNullable();
    table.string('certificate_url', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_accreditations_school');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('accreditations');
};
