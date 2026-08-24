/**
 * Migration: create_articles_table
 * Modul Website Utama - Fitur #31: Artikel & Berita oleh Guru / Siswa
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('articles', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('title', 200).notNullable();
    table.string('slug', 220).notNullable().unique();
    table.text('content', 'longtext').notNullable();
    table.string('category', 100).nullable();
    table.enu('status', ['draft', 'in_review', 'published']).notNullable().defaultTo('draft');
    table.bigInteger('author_user_id').unsigned().notNullable();
    table.integer('views_count').unsigned().notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'status'], 'idx_articles_school_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('articles');
};
