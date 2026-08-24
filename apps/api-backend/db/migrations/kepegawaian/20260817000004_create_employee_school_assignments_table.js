/**
 * Migration: create_employee_school_assignments_table
 * Modul Kepegawaian - Fitur: Penugasan Pegawai Lintas Satuan Pendidikan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employee_school_assignments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('position_id').unsigned().nullable()
      .references('id').inTable('job_positions');
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['employee_id', 'school_unit_id'], 'uq_esa_employee_school');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employee_school_assignments');
};
