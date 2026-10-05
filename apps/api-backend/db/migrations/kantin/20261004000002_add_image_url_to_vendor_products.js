/**
 * Migration: add_image_url_to_vendor_products
 * Modul Kantin
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('vendor_products', function(table) {
    table.text('image_url').nullable().after('barcode');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('vendor_products', function(table) {
    table.dropColumn('image_url');
  });
};
