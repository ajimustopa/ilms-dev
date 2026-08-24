/**
 * Migration: add_current_position_id_foreign_key_to_employees_table
 * Modul Kepegawaian - Menambahkan Foreign Key current_position_id pada employees setelah job_positions dibuat
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('employees', (table) => {
    table.foreign('current_position_id', 'fk_employees_position')
      .references('id')
      .inTable('job_positions');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('employees', (table) => {
    table.dropForeign('current_position_id', 'fk_employees_position');
  });
};
