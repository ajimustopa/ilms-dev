/**
 * Migration: canteen_activity_logs
 * Sesuai erd-kantin.md §2.17 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('canteen_activity_logs', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.bigInteger('actor_user_id').unsigned().nullable();
    table.string('action', 100).notNullable();
    table.string('target_table', 100).nullable();
    table.bigInteger('target_id').unsigned().nullable();
    table.string('note', 255).nullable();
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());

    table.index('school_unit_id', 'idx_cal_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('canteen_activity_logs');
};
