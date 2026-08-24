/**
 * Migration: kitchen_data_imports
 * Modul Dapur: Riwayat & Status Import Data Excel/CSV Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_data_imports', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('import_type', 100).notNullable(); // ingredients, recipes, menus, suppliers, initial_stock
    table.string('file_url', 255).nullable();
    table.integer('imported_rows').nullable().defaultTo(0);
    table.integer('failed_rows').nullable().defaultTo(0);
    table.text('error_log').nullable();
    table.enum('status', ['processing', 'done', 'failed']).defaultTo('processing');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_data_imports');
};
