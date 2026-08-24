/**
 * Migration: sales_transaction_items
 * Sesuai erd-kantin.md §2.13 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('sales_transaction_items', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('sales_transaction_id').unsigned().notNullable()
      .references('id').inTable('sales_transactions').onDelete('CASCADE');
    table.bigInteger('vendor_product_id').unsigned().notNullable()
      .references('id').inTable('vendor_products').onDelete('RESTRICT');
    table.integer('qty').unsigned().notNullable();
    table.decimal('cost_price', 12, 2).notNullable();
    table.decimal('sale_price', 12, 2).notNullable();
    table.decimal('subtotal_cost', 12, 2).notNullable();
    table.decimal('subtotal_price', 12, 2).notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('sales_transaction_items');
};
