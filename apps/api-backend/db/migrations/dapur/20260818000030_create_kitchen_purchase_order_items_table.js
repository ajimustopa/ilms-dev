/**
 * Migration: kitchen_purchase_order_items
 * Modul Dapur: Item Rincian Purchase Order
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_purchase_order_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('purchase_order_id').unsigned().notNullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.decimal('qty', 12, 3).notNullable();
    table.bigInteger('unit_id').unsigned().notNullable();
    table.decimal('unit_price', 12, 2).notNullable();
    table.decimal('total_price', 14, 2).nullable();
    table.timestamps(true, true);

    table.foreign('purchase_order_id').references('id').inTable('kitchen_purchase_orders').onDelete('CASCADE');
    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('RESTRICT');
    table.foreign('unit_id').references('id').inTable('kitchen_units').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_purchase_order_items');
};
