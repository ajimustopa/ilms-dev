/**
 * Migration: create_employee_education_trainings_table
 * Modul Kepegawaian - Fitur: Data Pegawai Detail (Pendidikan, Sertifikasi, Diklat)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employee_education_trainings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.enum('record_type', ['education', 'training', 'certification']).notNullable();
    table.string('education_level', 50).nullable();
    table.string('institution_name', 150).nullable();
    table.specificType('graduation_year', 'year').nullable();
    table.string('training_name', 150).nullable();
    table.string('organizer', 150).nullable();
    table.string('certificate_file_url', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employee_education_trainings');
};
