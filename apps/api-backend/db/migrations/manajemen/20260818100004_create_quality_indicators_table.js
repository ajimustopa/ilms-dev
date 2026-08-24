/**
 * Migration: create_quality_indicators_table
 * Modul Manajemen - Fitur #193: Indikator Mutu & KPI
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('quality_indicators', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.string('code', 50).notNullable().unique();
    table.string('name', 200).notNullable();
    table.enum('category', ['akademik', 'keuangan', 'kepegawaian', 'sarpras', 'lainnya']).notNullable();
    table.string('unit_of_measure', 50).nullable();
    table.decimal('target_value', 12, 2).nullable();
    table.string('data_source_module', 50).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_qi_school_unit');
    table.index(['category'], 'idx_qi_category');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('quality_indicators');
};
