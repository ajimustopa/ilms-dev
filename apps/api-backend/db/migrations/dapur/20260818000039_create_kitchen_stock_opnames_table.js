/**
 * Migration: kitchen_stock_opnames
 * Modul Dapur: Sesi Stock Opname Gudang (Header)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_stock_opnames', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.date('opname_date').notNullable();
    table.text('notes').nullable();
    table.enum('status', ['draft', 'completed']).defaultTo('draft');
    table.bigInteger('conducted_by').unsigned().nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_stock_opnames');
};
