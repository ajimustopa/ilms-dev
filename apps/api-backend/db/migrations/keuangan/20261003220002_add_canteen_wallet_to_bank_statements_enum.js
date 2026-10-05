/**
 * Migration: add_canteen_wallet_to_bank_statements_enum
 * Modul Keuangan - Menambahkan 'canteen_wallet_topup' dan 'canteen_wallet_withdrawal' ke ENUM bank_statements dan bank_statement_references
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE \`bank_statements\` 
    MODIFY COLUMN \`reconciled_reference_type\` ENUM(
      'student_bill_payment',
      'other_income',
      'expense',
      'payroll',
      'cash_transfer',
      'canteen_wallet_topup',
      'canteen_wallet_withdrawal',
      'other'
    ) NULL
  `);

  await knex.raw(`
    ALTER TABLE \`bank_statement_references\` 
    MODIFY COLUMN \`reference_type\` ENUM(
      'student_bill_payment',
      'other_income',
      'expense',
      'payroll',
      'cash_transfer',
      'canteen_wallet_topup',
      'canteen_wallet_withdrawal',
      'other'
    ) NOT NULL
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE \`bank_statements\` 
    MODIFY COLUMN \`reconciled_reference_type\` ENUM(
      'student_bill_payment',
      'other_income',
      'expense',
      'payroll',
      'cash_transfer',
      'other'
    ) NULL
  `);

  await knex.raw(`
    ALTER TABLE \`bank_statement_references\` 
    MODIFY COLUMN \`reference_type\` ENUM(
      'student_bill_payment',
      'other_income',
      'expense',
      'payroll',
      'cash_transfer',
      'other'
    ) NOT NULL
  `);
};
