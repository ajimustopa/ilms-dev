/**
 * Migration: canteen_students
 * Sesuai erd-kantin.md §2.9 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('canteen_students', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('student_id').unsigned().notNullable().unique();
    table.string('cached_student_name', 150).nullable();
    table.string('cached_class_group_name', 100).nullable();
    table.string('qr_code', 150).nullable().unique();
    table.decimal('wallet_balance', 12, 2).notNullable().defaultTo(0);
    table.string('child_pin_hash', 255).nullable();
    table.string('parent_pin_hash', 255).nullable();
    table.decimal('custom_daily_limit', 12, 2).nullable();
    table.boolean('is_blocked_by_parent').notNullable().defaultTo(false);
    table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('status_changed_at').nullable();
    table.string('status_note', 255).nullable();
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_cs_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('canteen_students');
};
