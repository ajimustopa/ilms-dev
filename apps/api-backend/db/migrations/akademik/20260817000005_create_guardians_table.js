/**
 * Migration: create_guardians_table
 * Modul Akademik - Fitur: Data Orang Tua / Wali (Guardians)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('guardians', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('full_name', 150).notNullable();
    table.string('occupation', 100).nullable();
    table.string('phone', 30).nullable();
    table.string('email', 150).nullable();
    table.text('address').nullable();
    table.bigInteger('user_id').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['user_id'], 'idx_guardians_user_id');
    table.index(['phone'], 'idx_guardians_phone');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('guardians');
};
