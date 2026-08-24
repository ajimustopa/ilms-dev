/**
 * Migration: create_employees_table
 * Modul Kepegawaian - Fitur: Data Induk Pegawai
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employees', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('employee_number', 50).notNullable().unique();
    table.string('nip', 30).nullable();
    table.string('nuptk', 30).nullable().unique();
    table.string('full_name', 150).notNullable();
    table.string('academic_title', 100).nullable();
    table.string('birth_place', 100).nullable();
    table.date('birth_date').nullable();
    table.enum('gender', ['male', 'female']).notNullable();
    table.string('religion', 50).nullable();
    table.enum('marital_status', ['single', 'married', 'divorced', 'widowed']).nullable();
    table.text('address').nullable();
    table.string('phone_number', 30).nullable();
    table.string('email', 150).nullable();
    table.string('photo_url', 255).nullable();
    table.bigInteger('current_position_id').unsigned().nullable();
    table.string('current_rank', 100).nullable();
    table.enum('employment_status', ['pns', 'gtt', 'ptt']).notNullable();
    table.enum('account_status', ['active', 'inactive', 'resigned', 'retired']).notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_employees_school_unit');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employees');
};
