/**
 * Migration: alter_chart_of_accounts_7_groups
 * Modul Keuangan - Penyempurnaan 7 Kelompok Akun Standar Nirlaba & Saldo Normal
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Perluas ENUM account_group sementara agar mencakup nilai lama dan nilai baru
  await knex.raw(`
    ALTER TABLE chart_of_accounts 
    MODIFY COLUMN account_group ENUM(
      'asset', 'liability', 'equity', 'revenue', 'expense',
      'harta', 'piutang', 'inventaris', 'utang', 'modal', 'pendapatan', 'biaya'
    ) NOT NULL
  `);

  // 2. Migrasikan data lama ke 7 kelompok nirlaba baru
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'harta' WHERE account_group = 'asset'`);
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'utang' WHERE account_group = 'liability'`);
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'modal' WHERE account_group = 'equity'`);
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'pendapatan' WHERE account_group = 'revenue'`);
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'biaya' WHERE account_group = 'expense'`);

  // 3. Batasi ENUM menjadi 7 kelompok nirlaba saja
  await knex.raw(`
    ALTER TABLE chart_of_accounts 
    MODIFY COLUMN account_group ENUM(
      'harta', 'piutang', 'inventaris', 'utang', 'modal', 'pendapatan', 'biaya'
    ) NOT NULL
  `);

  // 4. Tambahkan kolom fisik normal_balance ENUM('debit','credit')
  const hasColumn = await knex.schema.hasColumn('chart_of_accounts', 'normal_balance');
  if (!hasColumn) {
    await knex.raw(`
      ALTER TABLE chart_of_accounts 
      ADD COLUMN normal_balance ENUM('debit', 'credit') NOT NULL DEFAULT 'debit' AFTER account_group
    `);
  }

  // 5. Update nilai normal_balance berdasarkan kelompok akun
  await knex.raw(`
    UPDATE chart_of_accounts 
    SET normal_balance = 'debit' 
    WHERE account_group IN ('harta', 'piutang', 'inventaris', 'biaya')
  `);
  await knex.raw(`
    UPDATE chart_of_accounts 
    SET normal_balance = 'credit' 
    WHERE account_group IN ('utang', 'modal', 'pendapatan')
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // 1. Perluas ENUM kembali
  await knex.raw(`
    ALTER TABLE chart_of_accounts 
    MODIFY COLUMN account_group ENUM(
      'asset', 'liability', 'equity', 'revenue', 'expense',
      'harta', 'piutang', 'inventaris', 'utang', 'modal', 'pendapatan', 'biaya'
    ) NOT NULL
  `);

  // 2. Petakan kembali kelompok nirlaba ke 5 kelompok generik
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'asset' WHERE account_group IN ('harta', 'piutang', 'inventaris')`);
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'liability' WHERE account_group = 'utang'`);
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'equity' WHERE account_group = 'modal'`);
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'revenue' WHERE account_group = 'pendapatan'`);
  await knex.raw(`UPDATE chart_of_accounts SET account_group = 'expense' WHERE account_group = 'biaya'`);

  // 3. Batasi kembali ENUM ke 5 kelompok
  await knex.raw(`
    ALTER TABLE chart_of_accounts 
    MODIFY COLUMN account_group ENUM(
      'asset', 'liability', 'equity', 'revenue', 'expense'
    ) NOT NULL
  `);

  // 4. Hapus kolom normal_balance jika ada
  const hasColumn = await knex.schema.hasColumn('chart_of_accounts', 'normal_balance');
  if (hasColumn) {
    await knex.schema.table('chart_of_accounts', (table) => {
      table.dropColumn('normal_balance');
    });
  }
};
