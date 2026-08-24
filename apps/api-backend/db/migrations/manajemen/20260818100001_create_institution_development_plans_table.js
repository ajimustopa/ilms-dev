/**
 * Migration: create_institution_development_plans_table
 * Modul Manajemen - Fitur #190: Rencana Induk Pengembangan Sekolah (RIPS)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('institution_development_plans', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('title', 200).notNullable();
    table.specificType('period_start_year', 'SMALLINT UNSIGNED').notNullable();
    table.specificType('period_end_year', 'SMALLINT UNSIGNED').notNullable();
    table.text('vision').nullable();
    table.text('mission').nullable();
    table.string('document_url', 255).nullable();
    table.enum('status', ['draft', 'active', 'archived']).notNullable().defaultTo('draft');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approved_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_idp_school_unit');
    table.index(['status'], 'idx_idp_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('institution_development_plans');
};
