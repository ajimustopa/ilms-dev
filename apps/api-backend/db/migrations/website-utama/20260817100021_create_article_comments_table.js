/**
 * Migration: create_article_comments_table
 * Modul Website Utama - Fitur #32: Moderasi Komentar Artikel
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('article_comments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('article_id').unsigned().notNullable()
      .references('id').inTable('articles').onDelete('CASCADE');
    table.string('commenter_name', 150).notNullable();
    table.text('content').notNullable();
    table.enu('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['article_id', 'status'], 'idx_comments_article_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('article_comments');
};
