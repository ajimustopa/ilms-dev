/**
 * Migration: wallet_transactions
 * Sesuai erd-kantin.md §2.11 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('wallet_transactions', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('canteen_student_id').unsigned().notNullable()
      .references('id').inTable('canteen_students').onDelete('RESTRICT');
    table.enu('transaction_type', ['top_up', 'withdrawal', 'purchase']).notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.decimal('balance_after', 12, 2).notNullable();
    table.enu('payment_method', ['cash', 'transfer', 'qris', 'other']).nullable();
    table.bigInteger('sales_transaction_id').unsigned().nullable()
      .references('id').inTable('sales_transactions').onDelete('SET NULL');
    table.bigInteger('processed_by').unsigned().notNullable();
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_wt_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('wallet_transactions');
};
