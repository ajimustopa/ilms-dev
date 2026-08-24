/**
 * Migration: kitchen_goods_receipt_items
 * Modul Dapur: Detail Pemeriksaan Kuantitas, Kualitas, Suhu, Lot & Expiry Penerimaan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_goods_receipt_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('goods_receipt_id').unsigned().notNullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.decimal('ordered_qty', 12, 3).notNullable();
    table.decimal('received_qty', 12, 3).notNullable();
    table.decimal('rejected_qty', 12, 3).defaultTo(0);
    table.bigInteger('unit_id').unsigned().notNullable();
    table.string('lot_number', 50).nullable();
    table.date('expiry_date').nullable();
    table.bigInteger('storage_location_id').unsigned().nullable();
    table.decimal('temperature_celsius', 5, 2).nullable();
    table.enum('quality_status', ['pass', 'fail', 'conditional']).defaultTo('pass');
    table.text('rejection_reason').nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.foreign('goods_receipt_id').references('id').inTable('kitchen_goods_receipts').onDelete('CASCADE');
    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('RESTRICT');
    table.foreign('unit_id').references('id').inTable('kitchen_units').onDelete('RESTRICT');
    table.foreign('storage_location_id').references('id').inTable('kitchen_master_data').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_goods_receipt_items');
};
