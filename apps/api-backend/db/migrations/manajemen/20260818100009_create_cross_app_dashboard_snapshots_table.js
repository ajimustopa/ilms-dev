/**
 * Migration: create_cross_app_dashboard_snapshots_table
 * Modul Manajemen - Fitur #201: Snapshot Dashboard Eksekutif Lintas Modul
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('cross_app_dashboard_snapshots', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.date('snapshot_date').notNullable();
    table.json('metrics').notNullable();
    table.string('generated_by', 50).notNullable().defaultTo('system');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'snapshot_date'], 'uq_cads');
    table.index(['snapshot_date'], 'idx_cads_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cross_app_dashboard_snapshots');
};
