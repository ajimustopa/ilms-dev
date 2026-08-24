/**
 * Migration: operational_expenses
 * Sesuai erd-kantin.md §2.16 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('operational_expenses', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('expense_name', 150).notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.date('expense_date').notNullable();
    table.string('note', 255).nullable();
    table.bigInteger('recorded_by').unsigned().notNullable();
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_oe_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('operational_expenses');
};
