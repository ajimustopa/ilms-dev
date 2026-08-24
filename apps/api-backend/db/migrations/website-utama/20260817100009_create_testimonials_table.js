/**
 * Migration: create_testimonials_table
 * Modul Website Utama - Fitur #21: Testimoni Alumni, Orang Tua, dan Siswa
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('testimonials', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.enu('role_type', ['alumni', 'parent', 'student']).notNullable();
    table.text('content').notNullable();
    table.string('photo_url', 255).nullable();
    table.boolean('is_visible').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'is_visible'], 'idx_testimonials_school_vis');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('testimonials');
};
