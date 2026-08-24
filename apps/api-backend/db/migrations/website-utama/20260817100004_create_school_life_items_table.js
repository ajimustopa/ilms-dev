/**
 * Migration: create_school_life_items_table
 * Modul Website Utama - Fitur #17: Kehidupan Sekolah
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('school_life_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.enu('category', ['facility', 'extracurricular', 'school_rule', 'achievement']).notNullable();
    table.string('title', 150).notNullable();
    table.text('description').nullable();
    table.string('photo_url', 255).nullable();
    table.bigInteger('sarpras_ref_id').unsigned().nullable();
    table.enu('status', ['draft', 'published']).notNullable().defaultTo('draft');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'category'], 'idx_school_life_cat');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('school_life_items');
};
