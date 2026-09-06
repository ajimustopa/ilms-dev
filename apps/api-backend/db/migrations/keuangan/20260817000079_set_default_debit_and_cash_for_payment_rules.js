/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const bsiCoa = await knex('chart_of_accounts').where('account_code', '10201').first();
  const bsiCash = await knex('cash_accounts').where('bank_account_number', '5114411440').first();

  if (bsiCoa && bsiCash) {
    await knex('transaction_account_mappings')
      .where('transaction_type', 'penambahan_kas')
      .orWhere('transaction_code', 'like', '%payment%')
      .orWhere('transaction_code', 'like', '%ppdb%')
      .orWhere('transaction_code', 'like', '%income%')
      .update({
        debit_account_id: bsiCoa.id,
        default_cash_account_id: bsiCash.id
      });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // No rollback needed
};
