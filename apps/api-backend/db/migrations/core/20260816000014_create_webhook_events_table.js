/**
 * Migration: create_webhook_events_table
 * Fitur #9: Webhook Publisher (Log Event yang Diterbitkan)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('webhook_events', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('event_type', 100).notNullable();
    table.bigInteger('school_unit_id').unsigned().nullable()
      .references('id').inTable('school_units')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.json('payload').notNullable();
    table.timestamp('published_at').notNullable().defaultTo(knex.fn.now());

    table.index(['event_type'], 'idx_webhook_events_type');
    table.index(['published_at'], 'idx_webhook_events_published_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('webhook_events');
};
