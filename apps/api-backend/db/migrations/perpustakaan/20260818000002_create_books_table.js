/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('books', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.enum('material_type', ['book', 'journal', 'ebook', 'magazine', 'cd', 'other']).notNullable().defaultTo('book');
    table.string('title', 255).notNullable();
    table.string('author', 255).nullable();
    table.string('publisher', 150).nullable();
    table.smallint('publish_year').unsigned().nullable();
    table.string('isbn', 30).nullable();
    table.bigInteger('category_id').unsigned().nullable()
      .references('id').inTable('book_categories').onDelete('SET NULL');
    table.string('shelf_location', 50).nullable();
    table.string('cover_image_url', 255).nullable();
    table.integer('total_copies').unsigned().notNullable().defaultTo(0);
    table.enum('source_type', ['purchase', 'donation', 'other']).nullable();
    table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamps(true, true);

    table.index(['title'], 'idx_books_title');
    table.index(['satuan_pendidikan_id', 'material_type'], 'idx_books_school_type');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('books');
};
