/**
 * Migration: create_employee_family_members_table
 * Modul Kepegawaian - Fitur: Data Keluarga Pegawai
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employee_family_members', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.enum('relation', ['spouse', 'child']).notNullable();
    table.string('name', 150).notNullable();
    table.date('birth_date').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employee_family_members');
};
