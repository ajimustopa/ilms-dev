/**
 * Migration: kitchen_stock_opname_items
 * Modul Dapur: Rincian Hitung Fisik Stock Opname & Selisih
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_stock_opname_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('stock_opname_id').unsigned().notNullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.bigInteger('storage_location_id').unsigned().notNullable();
    table.string('lot_number', 50).nullable();
    table.decimal('system_qty', 14, 3).notNullable();
    table.decimal('actual_qty', 14, 3).notNullable();
    table.decimal('variance_qty', 14, 3).nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.foreign('stock_opname_id').references('id').inTable('kitchen_stock_opnames').onDelete('CASCADE');
    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('RESTRICT');
    table.foreign('storage_location_id').references('id').inTable('kitchen_master_data').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_stock_opname_items');
};
