/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('book_categories', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('category_name', 150).notNullable().unique();
    table.string('category_code', 30).nullable();
    table.text('description').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('book_categories');
};
