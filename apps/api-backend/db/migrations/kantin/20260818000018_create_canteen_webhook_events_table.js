/**
 * Migration: canteen_webhook_events
 * Sesuai erd-kantin.md §2.18 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('canteen_webhook_events', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.string('event_type', 100).notNullable();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.json('payload').notNullable();
    table.timestamp('published_at').notNullable().defaultTo(knex.fn.now());

    table.index('school_unit_id', 'idx_cwe_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('canteen_webhook_events');
};
