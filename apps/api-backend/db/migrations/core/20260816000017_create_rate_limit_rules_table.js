/**
 * Migration: create_rate_limit_rules_table
 * Fitur #12: Konfigurasi Pembatasan Akses API Gateway (Rate Limiting)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('rate_limit_rules', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('api_client_id').unsigned().nullable()
      .references('id').inTable('api_clients')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('endpoint', 150).notNullable();
    table.integer('limit_per_minute').unsigned().notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['endpoint'], 'idx_rate_limit_rules_endpoint');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('rate_limit_rules');
};
