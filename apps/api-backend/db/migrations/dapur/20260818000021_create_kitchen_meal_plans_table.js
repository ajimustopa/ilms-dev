/**
 * Migration: kitchen_meal_plans
 * Modul Dapur: Rencana & Forecast Porsi Makan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_meal_plans', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('menu_id').unsigned().notNullable();
    table.date('plan_date').notNullable();
    table.bigInteger('student_group_id').unsigned().nullable();
    table.integer('forecast_portion').notNullable().defaultTo(0);
    table.integer('buffer_portion').notNullable().defaultTo(0);
    table.enum('status', ['draft', 'confirmed']).defaultTo('draft');
    table.timestamps(true, true);

    table.foreign('menu_id').references('id').inTable('kitchen_menus').onDelete('CASCADE');
    table.foreign('student_group_id').references('id').inTable('kitchen_student_groups').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_meal_plans');
};
