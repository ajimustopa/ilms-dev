/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('consumable_stock_opname_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('stock_opname_id').unsigned().notNullable()
      .references('id').inTable('consumable_stock_opnames').onDelete('CASCADE');
    table.bigInteger('consumable_item_id').unsigned().notNullable()
      .references('id').inTable('consumable_items').onDelete('CASCADE');
    table.decimal('system_stock', 10, 2).notNullable();
    table.decimal('physical_stock', 10, 2).notNullable();
    table.decimal('difference', 10, 2).notNullable();
    table.string('notes', 255).nullable();
    table.timestamps(true, true);

    table.unique(['stock_opname_id', 'consumable_item_id'], { indexName: 'uq_opname_item' });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('consumable_stock_opname_items');
};
