/**
 * Migration: add_pricing_to_vendor_products_and_canteen_share_to_vendors
 * Modul Kantin
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('vendor_products', function(table) {
      table.decimal('cost_price', 12, 2).notNullable().defaultTo(0).after('unit');
      table.decimal('sale_price', 12, 2).notNullable().defaultTo(0).after('cost_price');
    })
    .alterTable('vendors', function(table) {
      table.decimal('canteen_share_pct', 5, 2).notNullable().defaultTo(10.00).after('address');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('vendors', function(table) {
      table.dropColumn('canteen_share_pct');
    })
    .alterTable('vendor_products', function(table) {
      table.dropColumn('sale_price');
      table.dropColumn('cost_price');
    });
};
