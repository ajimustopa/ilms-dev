/**
 * Migration: add receipt references to product_returns
 * Memungkinkan pelacakan barang diterima kapan (goods receipt) yang diretur
 */
exports.up = function(knex) {
  return knex.schema.alterTable('product_returns', function(table) {
    table.bigInteger('goods_receipt_id').unsigned().nullable().after('vendor_product_id')
      .references('id').inTable('goods_receipts').onDelete('SET NULL');
    table.bigInteger('goods_receipt_item_id').unsigned().nullable().after('goods_receipt_id')
      .references('id').inTable('goods_receipt_items').onDelete('SET NULL');
    table.string('batch_number', 50).nullable().after('goods_receipt_item_id');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('product_returns', function(table) {
    table.dropForeign(['goods_receipt_item_id']);
    table.dropForeign(['goods_receipt_id']);
    table.dropColumn('batch_number');
    table.dropColumn('goods_receipt_item_id');
    table.dropColumn('goods_receipt_id');
  });
};
