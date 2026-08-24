/**
 * Migration: make_semesters_academic_year_id_nullable
 * Mengubah academic_year_id pada tabel semesters menjadi nullable
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Alter academic_year_id to nullable
  await knex.schema.alterTable('semesters', (table) => {
    table.bigInteger('academic_year_id').unsigned().nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('semesters', (table) => {
    table.bigInteger('academic_year_id').unsigned().notNullable().alter();
  });
};
