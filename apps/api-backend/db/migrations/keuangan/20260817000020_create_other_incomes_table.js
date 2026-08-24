/**
 * Migration: create_other_incomes_table
 * Modul Keuangan - Fitur #22: CRUD Penerimaan Non-SPP (Other Incomes)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('other_incomes', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('academic_year_id').unsigned().notNullable();
    table.bigInteger('transaction_category_id').unsigned().notNullable()
      .references('id').inTable('transaction_categories')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('cash_account_id').unsigned().notNullable()
      .references('id').inTable('cash_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.decimal('amount', 18, 2).notNullable();
    table.date('received_at').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'academic_year_id'], 'idx_other_incomes_unit_year');
    table.index(['transaction_category_id'], 'idx_other_incomes_category');
    table.index(['cash_account_id'], 'idx_other_incomes_cash_account');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('other_incomes');
};
