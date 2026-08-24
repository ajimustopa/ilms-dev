/**
 * Migration: kitchen_recipe_steps
 * Modul Dapur: Langkah Proses Masak, Suhu, Sanitasi & Standar Penyajian
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_recipe_steps', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('recipe_id').unsigned().notNullable();
    table.enum('step_type', ['cooking', 'temperature_time', 'sanitation_sop', 'presentation']).defaultTo('cooking');
    table.smallint('step_number').notNullable();
    table.text('instruction').notNullable();
    table.decimal('temperature_celsius', 5, 2).nullable();
    table.integer('duration_minutes').nullable();
    table.timestamps(true, true);

    table.foreign('recipe_id').references('id').inTable('kitchen_recipes').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_recipe_steps');
};
