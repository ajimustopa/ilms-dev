/**
 * Migration: kitchen_production_batches
 * Modul Dapur: Work Order & Batch Produksi Masak
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_production_batches', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('production_schedule_id').unsigned().nullable();
    table.string('batch_code', 50).notNullable().unique();
    table.bigInteger('menu_id').unsigned().notNullable();
    table.integer('planned_portion').notNullable();
    table.integer('actual_portion').nullable();
    table.bigInteger('pic_id').unsigned().nullable(); // ref Kepegawaian (koki utama)
    table.enum('status', [
      'draft',
      'in_progress',
      'paused',
      'completed',
      'verified',
      'released',
      'rejected'
    ]).defaultTo('draft');
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamps(true, true);

    table.foreign('production_schedule_id').references('id').inTable('kitchen_production_schedules').onDelete('SET NULL');
    table.foreign('menu_id').references('id').inTable('kitchen_menus').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_production_batches');
};
