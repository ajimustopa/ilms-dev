/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('book_copies', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('book_id').unsigned().notNullable()
      .references('id').inTable('books').onDelete('CASCADE');
    table.string('copy_code', 50).nullable().unique();
    table.enum('condition_status', ['good', 'damaged', 'lost']).notNullable().defaultTo('good');
    table.enum('circulation_status', ['available', 'borrowed', 'reserved', 'under_repair']).notNullable().defaultTo('available');
    table.string('shelf_location', 50).nullable();
    table.timestamps(true, true);

    table.index(['book_id', 'circulation_status'], 'idx_copies_book_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('book_copies');
};
