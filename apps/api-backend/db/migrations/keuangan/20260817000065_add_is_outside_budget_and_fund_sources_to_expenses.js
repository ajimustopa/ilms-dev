/**
 * Migration 65: Add is_outside_budget and fund_sources to expenses
 * Module: Keuangan - Expense Realization and Non-Budgeted Accomodation
 */
exports.up = async function(knex) {
  const hasOutsideCol = await knex.schema.hasColumn('expenses', 'is_outside_budget');
  if (!hasOutsideCol) {
    await knex.schema.alterTable('expenses', function(table) {
      table.boolean('is_outside_budget').notNullable().defaultTo(false).after('budget_plan_expense_item_id');
      table.index(['is_outside_budget'], 'idx_expenses_is_outside_budget');
    });
  }

  const hasFundSourcesCol = await knex.schema.hasColumn('expenses', 'fund_sources');
  if (!hasFundSourcesCol) {
    await knex.schema.alterTable('expenses', function(table) {
      table.text('fund_sources').nullable().after('fund_source_override_reason');
    });
  }
};

exports.down = async function(knex) {
  const hasFundSourcesCol = await knex.schema.hasColumn('expenses', 'fund_sources');
  if (hasFundSourcesCol) {
    await knex.schema.alterTable('expenses', function(table) {
      table.dropColumn('fund_sources');
    });
  }

  const hasOutsideCol = await knex.schema.hasColumn('expenses', 'is_outside_budget');
  if (hasOutsideCol) {
    await knex.schema.alterTable('expenses', function(table) {
      table.dropIndex(['is_outside_budget'], 'idx_expenses_is_outside_budget');
      table.dropColumn('is_outside_budget');
    });
  }
};
