/**
 * Migration: kitchen_goods_receipts
 * Modul Dapur: Penerimaan Bahan & Berita Acara Penerimaan (Header)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_goods_receipts', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('receipt_number', 50).nullable().unique();
    table.bigInteger('purchase_order_id').unsigned().nullable();
    table.bigInteger('supplier_id').unsigned().notNullable();
    table.date('receipt_date').notNullable();
    table.bigInteger('received_by').unsigned().notNullable(); // ref pegawai gudang
    table.string('invoice_number', 100).nullable();
    table.enum('status', ['received', 'partial', 'rejected']).defaultTo('received');
    table.string('document_url', 255).nullable();
    table.timestamps(true, true);

    table.foreign('purchase_order_id').references('id').inTable('kitchen_purchase_orders').onDelete('SET NULL');
    table.foreign('supplier_id').references('id').inTable('kitchen_suppliers').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_goods_receipts');
};
