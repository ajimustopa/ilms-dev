/**
 * Migration: create_home_hero_settings_table
 * Modul Website Utama - Fitur #14: Beranda (Hero Section)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('home_hero_settings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('school_name_display', 150).nullable();
    table.string('headline', 255).notNullable();
    table.string('subheadline', 255).nullable();
    table.string('keywords', 255).nullable();
    table.string('cta_button_label', 100).nullable();
    table.string('cta_button_url', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id'], 'uq_hero_school');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('home_hero_settings');
};
