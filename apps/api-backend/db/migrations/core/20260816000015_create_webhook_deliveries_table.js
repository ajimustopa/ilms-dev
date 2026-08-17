/**
 * Migration: create_webhook_deliveries_table
 * Fitur #9: Status Pengiriman & Retry Webhook ke Tiap Subscriber
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('webhook_deliveries', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('webhook_event_id').unsigned().notNullable()
      .references('id').inTable('webhook_events')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('webhook_subscriber_id').unsigned().notNullable()
      .references('id').inTable('webhook_subscribers')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.enum('delivery_status', ['pending', 'success', 'failed']).notNullable().defaultTo('pending');
    table.specificType('attempt_count', 'SMALLINT UNSIGNED').notNullable().defaultTo(0);
    table.smallint('response_code').nullable();
    table.timestamp('delivered_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['delivery_status'], 'idx_webhook_deliveries_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('webhook_deliveries');
};
