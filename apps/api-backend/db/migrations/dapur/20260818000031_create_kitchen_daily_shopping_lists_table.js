/**
 * Migration: kitchen_daily_shopping_lists
 * Modul Dapur: Daftar & Checklist Belanja Harian
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_daily_shopping_lists', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.date('list_date').notNullable();
    table.enum('status', ['open', 'checked', 'done']).defaultTo('open');
    table.json('items').nullable(); // daftar item belanja harian
    table.text('notes').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_daily_shopping_lists');
};
