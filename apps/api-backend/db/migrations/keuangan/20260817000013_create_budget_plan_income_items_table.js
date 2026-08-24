/**
 * Migration: create_budget_plan_income_items_table
 * Modul Keuangan - Fitur #10: Rencana Pemasukan RAPBS
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('budget_plan_income_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('budget_plan_id').unsigned().notNullable()
      .references('id').inTable('budget_plans')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('name', 200).notNullable();
    table.decimal('planned_amount', 18, 2).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['budget_plan_id'], 'idx_bpii_plan');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('budget_plan_income_items');
};
