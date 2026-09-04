/**
 * Migration: 20260902100001_create_rips_program_indicator_links_table.js
 * Modul Manajemen - Relasi Pemilihan Indikator Spesifik per Program RIPS
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('rips_program_indicator_links');
  if (!hasTable) {
    await knex.schema.createTable('rips_program_indicator_links', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('rips_program_id').unsigned().notNullable();
      table.bigInteger('rips_goal_indicator_id').unsigned().notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('rips_program_id', 'fk_rpil_program')
        .references('id')
        .inTable('rips_programs')
        .onDelete('CASCADE');

      table.foreign('rips_goal_indicator_id', 'fk_rpil_indicator')
        .references('id')
        .inTable('rips_goal_indicators')
        .onDelete('CASCADE');

      table.unique(['rips_program_id', 'rips_goal_indicator_id'], 'uniq_program_indicator');
      table.index(['rips_program_id'], 'idx_rpil_program');
      table.index(['rips_goal_indicator_id'], 'idx_rpil_indicator');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('rips_program_indicator_links');
};
