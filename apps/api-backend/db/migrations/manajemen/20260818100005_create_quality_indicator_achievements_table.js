/**
 * Migration: create_quality_indicator_achievements_table
 * Modul Manajemen - Fitur #193: Capaian Indikator Mutu / KPI
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('quality_indicator_achievements', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('quality_indicator_id').unsigned().notNullable();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('period', 20).notNullable();
    table.decimal('actual_value', 12, 2).notNullable();
    table.bigInteger('recorded_by').unsigned().notNullable();
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('quality_indicator_id', 'fk_qia_indicator')
      .references('id')
      .inTable('quality_indicators')
      .onDelete('CASCADE');

    table.unique(['quality_indicator_id', 'school_unit_id', 'period'], 'uq_qia');
    table.index(['school_unit_id'], 'idx_qia_school_unit');
    table.index(['period'], 'idx_qia_period');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('quality_indicator_achievements');
};
