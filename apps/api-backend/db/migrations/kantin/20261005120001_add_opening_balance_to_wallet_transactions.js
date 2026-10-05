/**
 * Migration: add_opening_balance_to_wallet_transactions_enum
 * Modul Kantin - Menambahkan enum 'opening_balance' pada wallet_transactions.transaction_type
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE \`wallet_transactions\` 
    MODIFY COLUMN \`transaction_type\` ENUM('top_up', 'withdrawal', 'purchase', 'opening_balance') NOT NULL
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE \`wallet_transactions\` 
    MODIFY COLUMN \`transaction_type\` ENUM('top_up', 'withdrawal', 'purchase') NOT NULL
  `);
};
