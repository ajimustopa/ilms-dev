/**
 * Migration: add_vendor_type_to_vendors
 * Modul Kantin
 * Menambahkan tipe vendor: 'konsinyasi' (titip jual / bagi hasil) & 'beli_putus' (jual lepas / suplier grosir)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('vendors', function(table) {
    table.enu('vendor_type', ['konsinyasi', 'beli_putus'])
      .notNullable()
      .defaultTo('konsinyasi')
      .after('vendor_name');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('vendors', function(table) {
    table.dropColumn('vendor_type');
  });
};
