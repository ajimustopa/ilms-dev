/**
 * Migration: kitchen_service_status
 * Modul Dapur: Status & Pengumuman Operasional Pelayanan Makan Santri Harian
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_service_status', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.date('service_date').notNullable();
    table.bigInteger('meal_type_id').unsigned().nullable(); // ref kitchen_master_data (meal_type)
    table.enum('status', [
      'normal',
      'delayed',
      'emergency_menu',
      'closed_holiday',
      'fasting'
    ]).defaultTo('normal');
    table.text('announcement_message').nullable();
    table.text('note').nullable();
    table.timestamps(true, true);

    table.foreign('meal_type_id').references('id').inTable('kitchen_master_data').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_service_status');
};
