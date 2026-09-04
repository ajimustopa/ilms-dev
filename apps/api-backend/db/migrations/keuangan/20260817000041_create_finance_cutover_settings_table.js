/**
 * Migration: create_finance_cutover_settings_table
 * Modul Keuangan - Pengaturan Tanggal Mulai Pencatatan Sistem (Cutover Date)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('finance_cutover_settings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable().unique();
    table.date('cutover_date').notNullable();
    table.text('notes').nullable();
    table.bigInteger('set_by').unsigned().nullable();
    table.json('previous_data').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_fcs_school_unit');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('finance_cutover_settings');
};
