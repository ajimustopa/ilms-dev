/**
 * Migration: create_extracurriculars_table
 * Modul Akademik - Fitur: Manajemen Ekstrakurikuler (Extracurriculars)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('extracurriculars', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.string('name', 100).notNullable();
    table.bigInteger('supervisor_employee_id').unsigned().nullable();
    table.string('schedule', 150).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['satuan_pendidikan_id'], 'idx_extracurriculars_satuan');
    table.index(['supervisor_employee_id'], 'idx_extracurriculars_supervisor');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('extracurriculars');
};
