/**
 * Migration 82: Fix bank_statements and bill_payments timestamp ON UPDATE current_timestamp issue
 * 
 * MariaDB automatically applied DEFAULT current_timestamp() ON UPDATE current_timestamp()
 * to bank_statements.transaction_date and bill_payments.paid_at because they were the first
 * TIMESTAMP columns in their tables.
 * This caused transaction_date and paid_at to erroneously change whenever a row was updated
 * (e.g. when reconciling a bank statement or updating references).
 * 
 * This migration:
 * 1. Modifies bank_statements.transaction_date to DATETIME NOT NULL.
 * 2. Modifies bank_statements.updated_at to TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP.
 * 3. Modifies bill_payments.paid_at to DATETIME NOT NULL.
 * 4. Modifies bill_payments.updated_at to TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP.
 * 5. Restores FT24252VDKYN\BNK (ID: 8951) transaction_date to '2024-09-08 00:00:00'.
 */
exports.up = async function(knex) {
  // 1. Alter bank_statements
  await knex.raw(`
    ALTER TABLE \`bank_statements\`
      MODIFY COLUMN \`transaction_date\` DATETIME NOT NULL,
      MODIFY COLUMN \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
  `);

  // 2. Alter bill_payments
  await knex.raw(`
    ALTER TABLE \`bill_payments\`
      MODIFY COLUMN \`paid_at\` DATETIME NOT NULL,
      MODIFY COLUMN \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
  `);

  // 3. Restore FT24252VDKYN\BNK to 2024-09-08
  await knex('bank_statements')
    .where('journal_number', 'like', '%FT24252VDKYN%')
    .update({
      transaction_date: '2024-09-08 00:00:00'
    });
};

exports.down = async function(knex) {
  await knex.raw(`
    ALTER TABLE \`bank_statements\`
      MODIFY COLUMN \`transaction_date\` TIMESTAMP NOT NULL;
  `);
  await knex.raw(`
    ALTER TABLE \`bill_payments\`
      MODIFY COLUMN \`paid_at\` TIMESTAMP NOT NULL;
  `);
};
