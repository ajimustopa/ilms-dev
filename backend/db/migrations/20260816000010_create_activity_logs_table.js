/**
 * Migration: create_activity_logs_table
 * Fitur #5 & #13: Audit Log Login, Aktivitas Umum, & Aksi Admin Lintas Aplikasi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('activity_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.enum('log_type', ['login', 'general_activity', 'admin_action']).notNullable();
    table.bigInteger('user_id').unsigned().nullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('school_unit_id').unsigned().nullable()
      .references('id').inTable('school_units')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('application', 100).nullable();
    table.string('action', 100).notNullable();
    table.string('module', 100).nullable();
    table.string('ip_address', 45).nullable();
    table.json('data_before').nullable();
    table.json('data_after').nullable();
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());

    table.index(['log_type', 'occurred_at'], 'idx_activity_logs_type_time');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('activity_logs');
};
