/**
 * Migration: add_accounting_and_settings_to_canteen_pos
 * Modul Kantin - Menambahkan konfigurasi default akuntansi POS dan kolom pencatatan jurnal akuntansi otomatis pada sales_transactions
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambahkan kolom akuntansi di sales_transactions
  const hasSalesTable = await knex.schema.hasTable('sales_transactions');
  if (hasSalesTable) {
    await knex.schema.alterTable('sales_transactions', function (table) {
      table.bigInteger('cash_account_id').unsigned().nullable().index();
      table.string('cash_account_name', 150).nullable();
      table.bigInteger('debit_coa_account_id').unsigned().nullable();
      table.string('debit_coa_code', 50).nullable();
      table.string('debit_coa_name', 150).nullable();
      table.bigInteger('credit_vendor_coa_id').unsigned().nullable();
      table.string('credit_vendor_coa_code', 50).nullable();
      table.string('credit_vendor_coa_name', 150).nullable();
      table.bigInteger('credit_income_coa_id').unsigned().nullable();
      table.string('credit_income_coa_code', 50).nullable();
      table.string('credit_income_coa_name', 150).nullable();
      table.bigInteger('bank_statement_id').unsigned().nullable().index();
      table.bigInteger('journal_entry_id').unsigned().nullable().index();
      table.string('fund_source_name', 150).nullable();
    });
  }

  // 2. Buat tabel canteen_pos_accounting_settings untuk menyimpan konfigurasi default yang bisa diedit kasir/manajer
  const hasSettingsTable = await knex.schema.hasTable('canteen_pos_accounting_settings');
  if (!hasSettingsTable) {
    await knex.schema.createTable('canteen_pos_accounting_settings', function (table) {
      table.bigIncrements('id').primary().unsigned();
      table.bigInteger('school_unit_id').unsigned().notNullable().unique();
      table.bigInteger('cash_account_id_tunai').unsigned().nullable();
      table.string('cash_account_name_tunai', 150).nullable();
      table.bigInteger('cash_account_id_bank').unsigned().nullable();
      table.string('cash_account_name_bank', 150).nullable();
      table.bigInteger('debit_wallet_coa_id').unsigned().nullable();
      table.string('debit_wallet_coa_code', 50).nullable();
      table.string('debit_wallet_coa_name', 150).nullable();
      table.bigInteger('credit_vendor_coa_id').unsigned().nullable();
      table.string('credit_vendor_coa_code', 50).nullable();
      table.string('credit_vendor_coa_name', 150).nullable();
      table.bigInteger('credit_income_coa_id').unsigned().nullable();
      table.string('credit_income_coa_code', 50).nullable();
      table.string('credit_income_coa_name', 150).nullable();
      table.string('fund_source_name', 150).defaultTo('Pos Pendapatan & Kas Operasional SBU Kantin');
      table.boolean('auto_journal').defaultTo(true);
      table.timestamps(true, true);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasSettingsTable = await knex.schema.hasTable('canteen_pos_accounting_settings');
  if (hasSettingsTable) {
    await knex.schema.dropTable('canteen_pos_accounting_settings');
  }

  const hasSalesTable = await knex.schema.hasTable('sales_transactions');
  if (hasSalesTable) {
    await knex.schema.alterTable('sales_transactions', function (table) {
      table.dropColumn('cash_account_id');
      table.dropColumn('cash_account_name');
      table.dropColumn('debit_coa_account_id');
      table.dropColumn('debit_coa_code');
      table.dropColumn('debit_coa_name');
      table.dropColumn('credit_vendor_coa_id');
      table.dropColumn('credit_vendor_coa_code');
      table.dropColumn('credit_vendor_coa_name');
      table.dropColumn('credit_income_coa_id');
      table.dropColumn('credit_income_coa_code');
      table.dropColumn('credit_income_coa_name');
      table.dropColumn('bank_statement_id');
      table.dropColumn('journal_entry_id');
      table.dropColumn('fund_source_name');
    });
  }
};
