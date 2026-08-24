/**
 * Migration: create_journal_entry_lines_table
 * Modul Keuangan - Fitur #26: Baris Jurnal Debit/Kredit (Buku Besar & Neraca)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('journal_entry_lines', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('journal_entry_id').unsigned().notNullable()
      .references('id').inTable('journal_entries')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('chart_of_account_id').unsigned().notNullable()
      .references('id').inTable('chart_of_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.enum('entry_side', ['debit', 'credit']).notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['chart_of_account_id', 'entry_side'], 'idx_jel_account');
    table.index(['journal_entry_id'], 'idx_jel_entry');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('journal_entry_lines');
};
