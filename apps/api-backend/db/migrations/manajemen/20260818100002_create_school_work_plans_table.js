/**
 * Migration: create_school_work_plans_table
 * Modul Manajemen - Fitur #191: Rencana Kerja Sekolah Tahunan (RKS)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('school_work_plans', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('institution_development_plan_id').unsigned().nullable();
    table.bigInteger('academic_year_id').unsigned().nullable();
    table.string('title', 200).notNullable();
    table.text('program_focus').nullable();
    table.string('budget_ceiling_reference', 100).nullable();
    table.enum('status', ['draft', 'submitted', 'approved', 'archived']).notNullable().defaultTo('draft');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approved_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('institution_development_plan_id', 'fk_swp_idp')
      .references('id')
      .inTable('institution_development_plans')
      .onDelete('SET NULL');

    table.index(['school_unit_id'], 'idx_swp_school_unit');
    table.index(['academic_year_id'], 'idx_swp_academic_year');
    table.index(['status'], 'idx_swp_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('school_work_plans');
};
