/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('consumable_stock_opnames', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.date('opname_date').notNullable();
    table.bigInteger('conducted_by').unsigned().notNullable(); // Ref Core Service users.id
    table.enum('status', ['draft', 'final']).notNullable().defaultTo('draft');
    table.text('notes').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('consumable_stock_opnames');
};
