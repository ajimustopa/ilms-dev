/**
 * Migration: create_password_reset_requests_table
 * Fitur #2: Pengajuan Reset Password ke Admin
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('password_reset_requests', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('school_unit_id').unsigned().nullable()
      .references('id').inTable('school_units')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('contact', 150).notNullable();
    table.enum('request_status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.timestamp('requested_at').notNullable().defaultTo(knex.fn.now());
    table.bigInteger('processed_by').unsigned().nullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('processed_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['user_id'], 'idx_prr_user');
    table.index(['school_unit_id'], 'idx_prr_school_unit');
    table.index(['request_status'], 'idx_prr_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('password_reset_requests');
};
