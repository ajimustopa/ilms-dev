/**
 * Migration: create_budget_plans_table
 * Modul Keuangan - Fitur #10 & #11: Penyusunan & Revisi RAPBS (Budget Plans)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('budget_plans', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('academic_year_id').unsigned().notNullable();
    table.integer('version').unsigned().notNullable().defaultTo(1);
    table.enum('status', ['draft', 'published']).notNullable().defaultTo('draft');
    table.timestamp('published_at').nullable();
    table.text('revision_reason').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'academic_year_id', 'version'], 'uq_budget_plan_version');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('budget_plans');
};
