/**
 * Migration: kitchen_stock_movements (Append-Only)
 * Modul Dapur: Riwayat Mutasi Stok, Pemakaian, Penyesuaian, Pemusnahan & Retur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_stock_movements', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('movement_type', [
      'in_receipt',
      'out_production',
      'out_waste',
      'out_disposal',
      'adjustment',
      'transfer_in',
      'transfer_out',
      'internal_return'
    ]).notNullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.bigInteger('from_location_id').unsigned().nullable();
    table.bigInteger('storage_location_id').unsigned().notNullable();
    table.string('lot_number', 50).nullable();
    table.decimal('qty', 14, 3).notNullable(); // (+ / -)
    table.string('reference_type', 50).nullable();
    table.bigInteger('reference_id').unsigned().nullable();
    table.bigInteger('moved_by').unsigned().nullable();
    table.timestamp('moved_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now()); // append-only, no updated_at

    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('CASCADE');
    table.foreign('storage_location_id').references('id').inTable('kitchen_master_data').onDelete('RESTRICT');
    table.foreign('from_location_id').references('id').inTable('kitchen_master_data').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_stock_movements');
};
