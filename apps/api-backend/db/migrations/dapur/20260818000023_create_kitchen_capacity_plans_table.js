/**
 * Migration: kitchen_capacity_plans
 * Modul Dapur: Rencana Kapasitas Dapur, Beban Kerja, Kemasan & Tenaga Kerja
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_capacity_plans', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('plan_type', [
      'kitchen_capacity',
      'workload',
      'packaging',
      'labor',
      'student_change_simulation'
    ]).notNullable();
    table.date('plan_date').notNullable();
    table.decimal('value', 14, 2).notNullable();
    table.string('unit', 30).nullable();
    table.text('note').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_capacity_plans');
};
