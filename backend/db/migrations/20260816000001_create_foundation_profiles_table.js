/**
 * Migration: create_foundation_profiles_table
 * Fitur #6: Profil Yayasan (Singleton)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('foundation_profiles', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('name', 200).notNullable();
    table.text('address').nullable();
    table.string('phone_number', 30).nullable();
    table.string('email', 150).nullable();
    table.string('chairman_name', 150).nullable();
    table.string('logo', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('foundation_profiles');
};
