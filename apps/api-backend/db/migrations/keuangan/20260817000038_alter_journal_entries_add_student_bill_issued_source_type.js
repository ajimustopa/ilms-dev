/**
 * Migration: alter_journal_entries_add_student_bill_issued_source_type
 * Modul Keuangan - Menambahkan 'student_bill_issued' ke source_type ENUM pada journal_entries
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE \`journal_entries\` 
    MODIFY COLUMN \`source_type\` ENUM(
      'student_bill_payment', 
      'student_bill_issued', 
      'other_income', 
      'expense', 
      'payroll_disbursement', 
      'opening_balance', 
      'manual'
    ) NOT NULL
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE \`journal_entries\` 
    MODIFY COLUMN \`source_type\` ENUM(
      'student_bill_payment', 
      'other_income', 
      'expense', 
      'payroll_disbursement', 
      'manual'
    ) NOT NULL
  `);
};
