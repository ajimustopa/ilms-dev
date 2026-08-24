/**
 * Migration: kitchen_period_locks
 * Modul Dapur: Kunci Periode Transaksi & Tutup Buku Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_period_locks', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.enum('lock_type', ['period_lock', 'book_closing']).notNullable();
    table.bigInteger('locked_by').unsigned().nullable(); // core_user_id
    table.timestamp('locked_at').nullable();
    table.enum('status', ['open', 'locked']).defaultTo('open');
    table.text('notes').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_period_locks');
};
