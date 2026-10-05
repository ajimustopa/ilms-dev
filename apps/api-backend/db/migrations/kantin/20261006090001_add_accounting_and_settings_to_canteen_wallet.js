/**
 * Migration: add_accounting_and_settings_to_canteen_wallet
 * Modul Kantin - Menambahkan konfigurasi default akuntansi Dompet Santri dan kolom pencatatan jurnal akuntansi otomatis pada wallet_transactions
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambahkan kolom akuntansi di wallet_transactions
  const hasWalletTable = await knex.schema.hasTable('wallet_transactions');
  if (hasWalletTable) {
    await knex.schema.alterTable('wallet_transactions', function (table) {
      table.string('cash_account_name', 150).nullable();
      table.bigInteger('debit_coa_id').unsigned().nullable();
      table.string('debit_coa_code', 50).nullable();
      table.string('debit_coa_name', 150).nullable();
      table.bigInteger('credit_coa_id').unsigned().nullable();
      table.string('credit_coa_code', 50).nullable();
      table.string('credit_coa_name', 150).nullable();
      table.string('fund_source_name', 150).nullable();
    });
  }

  // 2. Buat tabel canteen_wallet_accounting_settings untuk menyimpan konfigurasi default yang bisa diedit
  const hasSettingsTable = await knex.schema.hasTable('canteen_wallet_accounting_settings');
  if (!hasSettingsTable) {
    await knex.schema.createTable('canteen_wallet_accounting_settings', function (table) {
      table.bigIncrements('id').primary().unsigned();
      table.bigInteger('school_unit_id').unsigned().notNullable().unique();
      table.bigInteger('cash_account_id_tunai').unsigned().nullable();
      table.string('cash_account_name_tunai', 150).nullable();
      table.bigInteger('cash_account_id_bank').unsigned().nullable();
      table.string('cash_account_name_bank', 150).nullable();
      table.bigInteger('wallet_liability_coa_id').unsigned().nullable();
      table.string('wallet_liability_coa_code', 50).nullable();
      table.string('wallet_liability_coa_name', 150).nullable();
      table.bigInteger('cash_coa_id').unsigned().nullable();
      table.string('cash_coa_code', 50).nullable();
      table.string('cash_coa_name', 150).nullable();
      table.bigInteger('bank_coa_id').unsigned().nullable();
      table.string('bank_coa_code', 50).nullable();
      table.string('bank_coa_name', 150).nullable();
      table.string('fund_source_name', 150).defaultTo('Pos Dana Titipan Dompet Santri / SBU Kantin');
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
  const hasSettingsTable = await knex.schema.hasTable('canteen_wallet_accounting_settings');
  if (hasSettingsTable) {
    await knex.schema.dropTable('canteen_wallet_accounting_settings');
  }

  const hasWalletTable = await knex.schema.hasTable('wallet_transactions');
  if (hasWalletTable) {
    await knex.schema.alterTable('wallet_transactions', function (table) {
      table.dropColumn('cash_account_name');
      table.dropColumn('debit_coa_id');
      table.dropColumn('debit_coa_code');
      table.dropColumn('debit_coa_name');
      table.dropColumn('credit_coa_id');
      table.dropColumn('credit_coa_code');
      table.dropColumn('credit_coa_name');
      table.dropColumn('fund_source_name');
    });
  }
};
