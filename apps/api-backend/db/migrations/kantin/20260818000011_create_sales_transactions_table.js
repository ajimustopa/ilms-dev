/**
 * Migration: sales_transactions
 * Sesuai erd-kantin.md §2.12 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('sales_transactions', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.enu('buyer_type', ['student', 'non_student']).notNullable();
    table.bigInteger('canteen_student_id').unsigned().nullable()
      .references('id').inTable('canteen_students').onDelete('SET NULL');
    table.string('buyer_name', 150).nullable();
    table.enu('payment_method', ['wallet', 'cash', 'qris', 'other']).notNullable();
    table.decimal('discount_amount', 12, 2).notNullable().defaultTo(0);
    table.decimal('total_amount', 12, 2).notNullable();
    table.bigInteger('cashier_id').unsigned().notNullable();
    table.timestamp('transaction_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_st_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('sales_transactions');
};
