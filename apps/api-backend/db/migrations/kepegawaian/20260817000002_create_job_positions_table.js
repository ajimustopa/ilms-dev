/**
 * Migration: create_job_positions_table
 * Modul Kepegawaian - Fitur: Manajemen Jabatan & Struktur Organisasi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('job_positions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.integer('level').unsigned().nullable();
    table.bigInteger('parent_position_id').unsigned().nullable()
      .references('id').inTable('job_positions');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('job_positions');
};
