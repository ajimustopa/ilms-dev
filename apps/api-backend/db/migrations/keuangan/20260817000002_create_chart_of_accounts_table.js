/**
 * Migration: create_chart_of_accounts_table
 * Modul Keuangan - Fitur #3: Chart of Accounts (COA) Hierarkis
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('chart_of_accounts', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('account_code', 30).notNullable();
    table.string('account_name', 150).notNullable();
    table.enum('account_group', ['asset', 'liability', 'equity', 'revenue', 'expense']).notNullable();
    table.bigInteger('parent_account_id').unsigned().nullable()
      .references('id').inTable('chart_of_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.integer('level').unsigned().notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'account_code'], 'uq_coa_code');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('chart_of_accounts');
};
