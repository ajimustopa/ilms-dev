/**
 * Migration: add receipt & expiry tracking to sales_transaction_items
 * Memastikan barang yang terjual tercatat asal penerimaan (kapan diterima) & tanggal kadaluarsanya
 */
exports.up = function(knex) {
  return knex.schema.alterTable('sales_transaction_items', function(table) {
    table.bigInteger('goods_receipt_id').unsigned().nullable().after('vendor_product_id')
      .references('id').inTable('goods_receipts').onDelete('SET NULL');
    table.bigInteger('goods_receipt_item_id').unsigned().nullable().after('goods_receipt_id')
      .references('id').inTable('goods_receipt_items').onDelete('SET NULL');
    table.string('batch_number', 50).nullable().after('goods_receipt_item_id');
    table.date('expired_at').nullable().after('batch_number');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('sales_transaction_items', function(table) {
    table.dropForeign(['goods_receipt_item_id']);
    table.dropForeign(['goods_receipt_id']);
    table.dropColumn('expired_at');
    table.dropColumn('batch_number');
    table.dropColumn('goods_receipt_item_id');
    table.dropColumn('goods_receipt_id');
  });
};
