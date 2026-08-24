/**
 * Migration: create_projects_table
 * Modul Manajemen - Fitur #199: Manajemen Proyek & Kegiatan Sekolah
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('projects', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table.bigInteger('pic_employee_id').unsigned().notNullable();
    table.string('budget_reference', 100).nullable();
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.enum('status', ['planning', 'ongoing', 'completed', 'cancelled']).notNullable().defaultTo('planning');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_projects_school_unit');
    table.index(['pic_employee_id'], 'idx_projects_pic_employee');
    table.index(['status'], 'idx_projects_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('projects');
};
