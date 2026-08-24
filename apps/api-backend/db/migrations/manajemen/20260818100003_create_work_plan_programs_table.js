/**
 * Migration: create_work_plan_programs_table
 * Modul Manajemen - Fitur #192: Program Kerja Unit/Bidang
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('work_plan_programs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_work_plan_id').unsigned().nullable();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('unit_name', 150).notNullable();
    table.bigInteger('pic_employee_id').unsigned().notNullable();
    table.string('title', 200).notNullable();
    table.text('description').nullable();
    table.text('target').nullable();
    table.string('budget_estimate_reference', 100).nullable();
    table.enum('status', ['planned', 'ongoing', 'done', 'cancelled']).notNullable().defaultTo('planned');
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('school_work_plan_id', 'fk_wpp_swp')
      .references('id')
      .inTable('school_work_plans')
      .onDelete('SET NULL');

    table.index(['school_unit_id'], 'idx_wpp_school_unit');
    table.index(['pic_employee_id'], 'idx_wpp_pic_employee');
    table.index(['status'], 'idx_wpp_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('work_plan_programs');
};
