/**
 * Migration: kitchen_master_data
 * Modul Dapur: Master Data Generik (Kategori Bahan, Lokasi Penyimpanan, Alat Dapur, Jenis Makan, Alergen, Jenis Kemasan, Standar Mutu, Hari Besar)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_master_data', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('master_type', [
      'ingredient_category',
      'storage_location',
      'equipment',
      'meal_type',
      'allergen',
      'packaging_type',
      'quality_standard',
      'special_day'
    ]).notNullable();
    table.string('code', 30).notNullable();
    table.string('name', 150).notNullable();
    table.string('category', 100).nullable();
    table.date('period_start').nullable();
    table.date('period_end').nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.text('description').nullable();
    table.timestamps(true, true);

    table.unique(['master_type', 'code']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_master_data');
};
