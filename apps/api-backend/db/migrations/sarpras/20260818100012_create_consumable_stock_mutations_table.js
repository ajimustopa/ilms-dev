/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('consumable_stock_mutations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('consumable_item_id').unsigned().notNullable()
      .references('id').inTable('consumable_items').onDelete('CASCADE');
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.enum('mutation_type', ['in', 'out']).notNullable();
    table.decimal('quantity', 10, 2).notNullable();
    table.enum('reference_type', ['procurement', 'usage', 'adjustment', 'opname']).nullable();
    table.bigInteger('reference_id').unsigned().nullable();
    table.bigInteger('facility_room_id').unsigned().nullable()
      .references('id').inTable('facility_rooms').onDelete('SET NULL');
    table.bigInteger('mutated_by').unsigned().notNullable(); // Ref Core Service users.id
    table.string('notes', 255).nullable();
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());

    table.index(['consumable_item_id', 'occurred_at'], 'idx_csm_item_time');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('consumable_stock_mutations');
};
