/**
 * Migration: create_home_highlights_table
 * Modul Website Utama - Fitur #14: Beranda (Highlights / Keunggulan)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('home_highlights', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('title', 150).notNullable();
    table.string('icon', 100).nullable();
    table.text('description').nullable();
    table.string('detail_link_url', 255).nullable();
    table.smallint('display_order').unsigned().notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_highlights_school');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('home_highlights');
};
