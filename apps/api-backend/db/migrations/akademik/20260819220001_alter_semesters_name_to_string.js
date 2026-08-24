/**
 * Migration: alter_semesters_name_to_string
 * Mengubah kolom name pada semesters dari enum menjadi string(50)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('semesters', (table) => {
    table.string('name', 50).notNullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('semesters', (table) => {
    table.enum('name', ['ganjil', 'genap']).notNullable().alter();
  });
};
