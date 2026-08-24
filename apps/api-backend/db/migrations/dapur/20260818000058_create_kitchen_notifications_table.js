/**
 * Migration: kitchen_notifications
 * Modul Dapur: Notifikasi Tugas, Stok Rendah & Peringatan Kedaluwarsa
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_notifications', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('notification_type', ['task', 'low_stock', 'expiry']).notNullable();
    table.bigInteger('recipient_id').unsigned().notNullable(); // core_user_id
    table.string('reference_type', 50).nullable();
    table.bigInteger('reference_id').unsigned().nullable();
    table.string('message', 255).notNullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_notifications');
};
