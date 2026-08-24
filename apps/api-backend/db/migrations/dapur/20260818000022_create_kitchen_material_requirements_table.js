/**
 * Migration: kitchen_material_requirements
 * Modul Dapur: Perhitungan Kebutuhan Bahan (Kotor & Bersih setelah Stok)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_material_requirements', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('period_type', ['per_menu', 'weekly', 'monthly']).notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.decimal('gross_qty', 14, 3).notNullable();
    table.decimal('stock_qty', 14, 3).nullable().defaultTo(0);
    table.decimal('net_qty', 14, 3).notNullable();
    table.text('substitution_note').nullable();
    table.boolean('is_urgent').defaultTo(false);
    table.timestamps(true, true);

    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_material_requirements');
};
