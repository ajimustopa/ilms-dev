/**
 * Migration: add_nisn_and_previous_school_to_ppdb_registrants
 * Modul Website Utama & PPDB
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('ppdb_registrants', (table) => {
    table.string('nisn', 20).nullable().after('registration_path');
    table.string('previous_school_name', 150).nullable().after('candidate_address');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('ppdb_registrants', (table) => {
    table.dropColumn('nisn');
    table.dropColumn('previous_school_name');
  });
};
