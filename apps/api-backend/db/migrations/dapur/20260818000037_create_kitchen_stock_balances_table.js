/**
 * Migration: kitchen_stock_balances
 * Modul Dapur: Saldo Stok Bahan Baku Terkini & Nilai Persediaan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_stock_balances', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.bigInteger('storage_location_id').unsigned().notNullable();
    table.string('lot_number', 50).nullable();
    table.date('expiry_date').nullable();
    table.decimal('current_qty', 14, 3).notNullable().defaultTo(0);
    table.bigInteger('unit_id').unsigned().notNullable();
    table.decimal('avg_unit_cost', 14, 2).defaultTo(0);
    table.timestamp('last_received_at').nullable();
    table.timestamp('last_issued_at').nullable();
    table.timestamps(true, true);

    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('CASCADE');
    table.foreign('storage_location_id').references('id').inTable('kitchen_master_data').onDelete('RESTRICT');
    table.foreign('unit_id').references('id').inTable('kitchen_units').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_stock_balances');
};
