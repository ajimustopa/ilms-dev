/**
 * Migration: canteen_fee_payments
 * Sesuai erd-kantin.md §2.14 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('canteen_fee_payments', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.bigInteger('paid_by').unsigned().notNullable();
    table.timestamp('paid_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_cfp_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('canteen_fee_payments');
};
