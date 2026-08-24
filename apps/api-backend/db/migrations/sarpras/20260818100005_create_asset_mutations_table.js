/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('asset_mutations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('asset_id').unsigned().notNullable()
      .references('id').inTable('assets').onDelete('CASCADE');
    table.bigInteger('from_room_id').unsigned().nullable()
      .references('id').inTable('facility_rooms').onDelete('SET NULL');
    table.bigInteger('to_room_id').unsigned().notNullable()
      .references('id').inTable('facility_rooms').onDelete('RESTRICT');
    table.bigInteger('mutated_by').unsigned().notNullable(); // Ref Core Service users.id
    table.string('reason', 255).nullable();
    table.timestamp('mutated_at').notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('asset_mutations');
};
