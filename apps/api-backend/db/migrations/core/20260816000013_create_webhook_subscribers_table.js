/**
 * Migration: create_webhook_subscribers_table
 * Fitur #10: Manajemen Aplikasi Pelanggan Webhook
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('webhook_subscribers', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('application_name', 100).notNullable();
    table.string('endpoint_url', 255).notNullable();
    table.json('subscribed_events').notNullable();
    table.string('secret_key', 255).notNullable();
    table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['status'], 'idx_webhook_subscribers_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('webhook_subscribers');
};
