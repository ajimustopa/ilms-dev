/**
 * Migration: create_employee_attendances_table
 * Modul Kepegawaian - Fitur: Presensi/Absensi Pegawai
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employee_attendances', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.date('attendance_date').notNullable();
    table.time('check_in_time').nullable();
    table.time('check_out_time').nullable();
    table.enum('status', ['present', 'sick', 'permitted', 'absent']).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['employee_id', 'attendance_date'], 'uq_attendance_employee_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employee_attendances');
};
