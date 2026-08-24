/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('consumable_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('item_code', 50).notNullable();
    table.string('name', 150).notNullable();
    table.string('unit', 30).notNullable();
    table.string('category', 100).nullable();
    table.decimal('minimum_stock', 10, 2).notNullable().defaultTo(0);
    table.decimal('current_stock', 10, 2).notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.unique(['school_unit_id', 'item_code'], { indexName: 'uq_consumable_code' });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('consumable_items');
};
