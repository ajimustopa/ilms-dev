/**
 * Migration: kitchen_waste_records
 * Modul Dapur: Pencatatan Sampah Dapur, Bahan Rusak, Kedaluwarsa, Hilang & Makanan Terbuang
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_waste_records', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('waste_type', [
      'damaged_ingredient',
      'expired_ingredient',
      'lost_ingredient',
      'wasted_food'
    ]).notNullable();
    table.bigInteger('ingredient_id').unsigned().nullable();
    table.bigInteger('menu_id').unsigned().nullable();
    table.decimal('qty', 12, 3).nullable();
    table.bigInteger('unit_id').unsigned().nullable();
    table.decimal('estimated_loss_value', 14, 2).nullable();
    table.string('classification', 100).nullable();
    table.text('root_cause').nullable();
    table.date('recorded_date').notNullable();
    table.bigInteger('recorded_by').unsigned().nullable();
    table.timestamps(true, true);

    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('SET NULL');
    table.foreign('menu_id').references('id').inTable('kitchen_menus').onDelete('SET NULL');
    table.foreign('unit_id').references('id').inTable('kitchen_units').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_waste_records');
};
