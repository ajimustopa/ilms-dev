/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('book_reservations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('book_id').unsigned().notNullable()
      .references('id').inTable('books').onDelete('CASCADE');
    table.bigInteger('member_id').unsigned().notNullable()
      .references('id').inTable('library_members').onDelete('CASCADE');
    table.enum('reservation_status', ['waiting', 'ready_to_pickup', 'fulfilled', 'cancelled', 'expired']).notNullable().defaultTo('waiting');
    table.timestamp('reserved_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('notified_at').nullable();
    table.timestamp('expires_at').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('book_reservations');
};
