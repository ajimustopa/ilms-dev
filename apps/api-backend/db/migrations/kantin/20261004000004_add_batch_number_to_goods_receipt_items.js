/**
 * Migration: add batch_number to goods_receipt_items
 * Mengakomodir pelacakan nomor batch / lot produksi untuk kontrol kelayakan & kadaluarsa
 */
exports.up = function(knex) {
  return knex.schema.table('goods_receipt_items', function(table) {
    table.string('batch_number', 50).nullable().after('sale_price');
  });
};

exports.down = function(knex) {
  return knex.schema.table('goods_receipt_items', function(table) {
    table.dropColumn('batch_number');
  });
};
