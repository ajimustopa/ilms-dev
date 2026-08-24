/**
 * Migration: kitchen_purchase_transactions
 * Modul Dapur: Pencatatan Transaksi Belanja, Bukti Transaksi, Retur & Pembelian Darurat
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_purchase_transactions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('transaction_type', ['purchase', 'return', 'emergency']).defaultTo('purchase');
    table.bigInteger('purchase_order_id').unsigned().nullable();
    table.bigInteger('supplier_id').unsigned().notNullable();
    table.date('transaction_date').notNullable();
    table.decimal('total_amount', 14, 2).notNullable();
    table.string('proof_document_url', 255).nullable();
    table.enum('status', ['draft', 'verified']).defaultTo('draft');
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
  return knex.schema.dropTableIfExists('kitchen_purchase_transactions');
};
