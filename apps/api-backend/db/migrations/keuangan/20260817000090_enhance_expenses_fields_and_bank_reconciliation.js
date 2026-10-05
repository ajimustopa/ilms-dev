/**
 * Migration 90: enhance_expenses_fields_and_bank_reconciliation
 * Modul Keuangan Enterprise:
 * 1. Menambahkan kolom bank_statement_id, cash_account_id, staff_id, staff_name,
 *    budget_program_id, catalog_item_id, transaction_category_id, payment_method,
 *    is_package, override_debit_account_id, override_credit_account_id, override_reason,
 *    dan proposed_to_rapbs pada tabel expenses.
 * 2. Menjamin integritas pencatatan belanja berbasis RAPBS, katalog, GTK, dan rekonsiliasi bank.
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('expenses');
  if (hasTable) {
    await knex.schema.alterTable('expenses', function(table) {
      // 1. Rekening Kas / Bank Penampung
      table.bigInteger('cash_account_id').unsigned().nullable().after('school_unit_id').index();
      
      // 2. Referensi Mutasi Rekening Koran (Nontunai / Bank)
      table.bigInteger('bank_statement_id').unsigned().nullable().after('cash_account_id').index();

      // 3. Program RKS & Katalog Barang
      table.bigInteger('budget_program_id').unsigned().nullable().after('budget_plan_expense_item_id').index();
      table.bigInteger('catalog_item_id').unsigned().nullable().after('budget_program_id').index();
      table.bigInteger('transaction_category_id').unsigned().nullable().after('catalog_item_id').index();

      // 4. GTK / Pegawai Terkait (PIC Pengeluaran / Penerima Honor / Panitia)
      table.bigInteger('staff_id').unsigned().nullable().after('transaction_category_id').index();
      table.string('staff_name', 255).nullable().after('staff_id');

      // 5. Metode Pembayaran & Sifat Paket
      table.string('payment_method', 30).nullable().defaultTo('cash').after('staff_name').index();
      table.boolean('is_package').defaultTo(false).after('payment_method');
      table.boolean('proposed_to_rapbs').defaultTo(false).after('is_outside_budget');

      // 6. Akun Akuntansi Debit & Kredit (Override / Custom)
      table.bigInteger('override_debit_account_id').unsigned().nullable().after('fund_sources').index();
      table.bigInteger('override_credit_account_id').unsigned().nullable().after('override_debit_account_id').index();
      table.string('override_reason', 255).nullable().after('override_credit_account_id');
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('expenses');
  if (hasTable) {
    await knex.schema.alterTable('expenses', function(table) {
      table.dropColumn('override_reason');
      table.dropColumn('override_credit_account_id');
      table.dropColumn('override_debit_account_id');
      table.dropColumn('proposed_to_rapbs');
      table.dropColumn('is_package');
      table.dropColumn('payment_method');
      table.dropColumn('staff_name');
      table.dropColumn('staff_id');
      table.dropColumn('transaction_category_id');
      table.dropColumn('catalog_item_id');
      table.dropColumn('budget_program_id');
      table.dropColumn('bank_statement_id');
      table.dropColumn('cash_account_id');
    });
  }
};
