/**
 * Migration: Add accounting accounts, source_category, and notes to budget_plan_income_items
 */
exports.up = async function(knex) {
  const hasIncomeTable = await knex.schema.hasTable('budget_plan_income_items');
  if (hasIncomeTable) {
    const hasSourceCategory = await knex.schema.hasColumn('budget_plan_income_items', 'source_category');
    if (!hasSourceCategory) {
      await knex.schema.alterTable('budget_plan_income_items', function(table) {
        table.string('source_category', 50).nullable().defaultTo('fee_billing').comment('fee_billing, bos_government, grant_foundation, donation_waqf, business_unit, other');
        table.bigInteger('credit_account_id').unsigned().nullable().index();
        table.bigInteger('cash_account_id').unsigned().nullable().index();
        table.text('notes').nullable();
      });
    }
  }
};

exports.down = async function(knex) {
  const hasIncomeTable = await knex.schema.hasTable('budget_plan_income_items');
  if (hasIncomeTable) {
    const hasSourceCategory = await knex.schema.hasColumn('budget_plan_income_items', 'source_category');
    if (hasSourceCategory) {
      await knex.schema.alterTable('budget_plan_income_items', function(table) {
        table.dropColumn('notes');
        table.dropColumn('cash_account_id');
        table.dropColumn('credit_account_id');
        table.dropColumn('source_category');
      });
    }
  }
};
