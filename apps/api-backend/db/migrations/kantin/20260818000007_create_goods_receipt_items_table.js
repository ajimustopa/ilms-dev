/**
 * Migration: goods_receipt_items
 * Sesuai erd-kantin.md §2.7 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('goods_receipt_items', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('goods_receipt_id').unsigned().notNullable()
      .references('id').inTable('goods_receipts').onDelete('CASCADE');
    table.bigInteger('vendor_product_id').unsigned().notNullable()
      .references('id').inTable('vendor_products').onDelete('RESTRICT');
    table.integer('qty').unsigned().notNullable();
    table.decimal('cost_price', 12, 2).notNullable();
    table.decimal('sale_price', 12, 2).notNullable();
    table.date('expired_at').nullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('goods_receipt_items');
};
