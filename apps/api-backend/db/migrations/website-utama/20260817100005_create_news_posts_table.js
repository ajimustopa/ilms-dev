/**
 * Migration: create_news_posts_table
 * Modul Website Utama - Fitur #18: Berita & Pengumuman
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('news_posts', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('title', 200).notNullable();
    table.string('slug', 220).notNullable().unique();
    table.text('content', 'longtext').notNullable();
    table.string('category', 100).nullable();
    table.string('cover_image_url', 255).nullable();
    table.enu('status', ['draft', 'published', 'archived']).notNullable().defaultTo('draft');
    table.timestamp('published_at').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'status'], 'idx_news_school_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('news_posts');
};
