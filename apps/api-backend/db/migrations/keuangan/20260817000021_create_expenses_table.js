/**
 * Migration: create_expenses_table
 * Modul Keuangan - Fitur #23 & #24: Pencatatan Realisasi Pengeluaran, Edit, & Soft Delete
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('expenses', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('budget_plan_expense_item_id').unsigned().nullable()
      .references('id').inTable('budget_plan_expense_items')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('item_name', 200).notNullable();
    table.string('unit', 30).nullable();
    table.decimal('unit_price', 18, 2).notNullable();
    table.decimal('quantity', 10, 2).notNullable();
    table.decimal('total_amount', 18, 2).notNullable();
    table.string('vendor', 150).nullable();
    table.date('expense_date').notNullable();
    table.string('proof_number', 100).nullable();
    table.text('notes').nullable();
    table.json('previous_data').nullable();
    table.text('deleted_reason').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_expenses_school_unit');
    table.index(['budget_plan_expense_item_id'], 'idx_expenses_budget_item');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('expenses');
};
