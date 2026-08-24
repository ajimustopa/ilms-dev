/**
 * Migration: kitchen_supplier_price_history
 * Modul Dapur: Histori Harga Bahan Supplier & Pemilihan Supplier
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_supplier_price_history', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('supplier_id').unsigned().notNullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.date('price_date').notNullable();
    table.decimal('unit_price', 12, 2).notNullable();
    table.boolean('is_selected').defaultTo(false);
    table.timestamps(true, true);

    table.foreign('supplier_id').references('id').inTable('kitchen_suppliers').onDelete('CASCADE');
    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_supplier_price_history');
};
