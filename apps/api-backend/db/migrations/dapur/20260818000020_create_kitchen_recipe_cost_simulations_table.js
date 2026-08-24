/**
 * Migration: kitchen_recipe_cost_simulations
 * Modul Dapur: Simulasi Biaya Resep per Porsi
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_recipe_cost_simulations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('recipe_id').unsigned().notNullable();
    table.date('simulation_date').notNullable();
    table.decimal('total_cost', 14, 2).notNullable();
    table.decimal('cost_per_portion', 12, 2).notNullable();
    table.string('source_price', 100).nullable();
    table.timestamps(true, true);

    table.foreign('recipe_id').references('id').inTable('kitchen_recipes').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_recipe_cost_simulations');
};
