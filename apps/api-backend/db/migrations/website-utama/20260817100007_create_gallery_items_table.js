/**
 * Migration: create_gallery_items_table
 * Modul Website Utama - Fitur #19: Item Galeri Foto & Video
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('gallery_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('gallery_id').unsigned().notNullable()
      .references('id').inTable('galleries').onDelete('CASCADE');
    table.enu('media_type', ['photo', 'video']).notNullable();
    table.string('media_url', 255).notNullable();
    table.smallint('display_order').unsigned().notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['gallery_id'], 'idx_gallery_items_gallery');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('gallery_items');
};
