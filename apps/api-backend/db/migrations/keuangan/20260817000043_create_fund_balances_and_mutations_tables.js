/**
 * Migration: create_fund_balances_and_mutations_tables
 * Modul Keuangan - Lapisan Pelaporan Saldo per Sumber Dana (Fund Balances & Mutations)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabel Saldo per Kantong Sumber Dana (fund_balances)
  await knex.schema.createTable('fund_balances', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.enum('fund_type', ['fee_type', 'transaction_category', 'opening_pool']).notNullable();
    table.bigInteger('fund_ref_id').unsigned().notNullable().defaultTo(0); // 0 untuk opening_pool
    table.decimal('balance', 18, 2).notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'fund_type', 'fund_ref_id'], 'uq_fund_balances_unit_type_ref');
    table.index(['school_unit_id', 'fund_type'], 'idx_fb_unit_type');
  });

  // 2. Tabel Mutasi Pergerakan Dana (fund_balance_mutations)
  await knex.schema.createTable('fund_balance_mutations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('fund_balance_id').unsigned().notNullable()
      .references('id').inTable('fund_balances')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.enum('direction', ['in', 'out']).notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.string('source_table', 50).notNullable();
    table.bigInteger('source_id').unsigned().nullable();
    table.decimal('balance_before', 18, 2).notNullable().defaultTo(0);
    table.decimal('balance_after', 18, 2).notNullable().defaultTo(0);
    table.text('notes').nullable();
    table.bigInteger('created_by').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['fund_balance_id'], 'idx_fbm_fund_balance');
    table.index(['source_table', 'source_id'], 'idx_fbm_source');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('fund_balance_mutations');
  await knex.schema.dropTableIfExists('fund_balances');
};
