/**
 * Migration: create_ppdb_selection_schedules_table
 * Modul Website Utama - Fitur #26: Jadwal & Gelombang Seleksi PPDB
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('ppdb_selection_schedules', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('wave_name', 100).notNullable();
    table.date('test_date').notNullable();
    table.string('location_or_link', 255).nullable();
    table.string('test_type', 100).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'test_date'], 'idx_ppdb_sched_school_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('ppdb_selection_schedules');
};
