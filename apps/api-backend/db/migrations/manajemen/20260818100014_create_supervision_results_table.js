/**
 * Migration: create_supervision_results_table
 * Modul Manajemen - Fitur #197: Hasil & Rekomendasi Supervisi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('supervision_results', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('supervision_schedule_id').unsigned().notNullable();
    table.string('aspect', 150).notNullable();
    table.decimal('score', 5, 2).nullable();
    table.text('findings').nullable();
    table.text('recommendations').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('supervision_schedule_id', 'fk_sr_schedule')
      .references('id')
      .inTable('supervision_schedules')
      .onDelete('CASCADE');

    table.index(['supervision_schedule_id'], 'idx_sr_schedule');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('supervision_results');
};
