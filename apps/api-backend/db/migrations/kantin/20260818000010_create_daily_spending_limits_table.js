/**
 * Migration: daily_spending_limits
 * Sesuai erd-kantin.md §2.10 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('daily_spending_limits', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('limit_name', 100).notNullable();
    table.decimal('limit_amount', 12, 2).notNullable();
    table.date('valid_from').notNullable();
    table.date('valid_until').nullable();
    table.string('note', 255).nullable();
    table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('status_changed_at').nullable();
    table.string('status_note', 255).nullable();
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_dsl_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('daily_spending_limits');
};
