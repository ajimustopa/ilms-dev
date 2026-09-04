/**
 * Migration 51: Add Academic Year dimension to fund_balances, fund_balance_mutations, and expenses
 * Tahap 10 Enhancement: Segregasi kantong dana per tahun ajaran
 */
exports.up = async function(knex) {
  // 1. Alter fund_balances
  const hasFbAy = await knex.schema.hasColumn('fund_balances', 'academic_year_id');
  if (!hasFbAy) {
    await knex.schema.alterTable('fund_balances', function(table) {
      table.bigInteger('academic_year_id').unsigned().notNullable().defaultTo(2).after('fund_ref_id');
    });
  }

  // Drop old unique constraint if exists
  try {
    await knex.schema.alterTable('fund_balances', function(table) {
      table.dropUnique(['school_unit_id', 'fund_type', 'fund_ref_id'], 'uq_fund_balances_unit_type_ref');
    });
  } catch (err) {
    console.warn('Could not drop uq_fund_balances_unit_type_ref:', err.message);
  }

  // Create new unique constraint including academic_year_id
  try {
    await knex.schema.alterTable('fund_balances', function(table) {
      table.unique(
        ['school_unit_id', 'fund_type', 'fund_ref_id', 'academic_year_id'],
        'uq_fund_balances_unit_type_ref_ay'
      );
      table.index(['school_unit_id', 'fund_type', 'academic_year_id'], 'idx_fb_unit_type_ay');
    });
  } catch (err) {
    console.warn('Could not add uq_fund_balances_unit_type_ref_ay:', err.message);
  }

  // 2. Alter fund_balance_mutations
  const hasFbmAy = await knex.schema.hasColumn('fund_balance_mutations', 'academic_year_id');
  if (!hasFbmAy) {
    await knex.schema.alterTable('fund_balance_mutations', function(table) {
      table.bigInteger('academic_year_id').unsigned().notNullable().defaultTo(2).after('fund_balance_id');
      table.index(['academic_year_id'], 'idx_fbm_academic_year');
    });

    // Backfill mutations from fund_balances parent
    await knex.raw(`
      UPDATE fund_balance_mutations fbm
      JOIN fund_balances fb ON fbm.fund_balance_id = fb.id
      SET fbm.academic_year_id = fb.academic_year_id
    `);
  }

  // 3. Alter expenses
  const hasExpAy = await knex.schema.hasColumn('expenses', 'academic_year_id');
  if (!hasExpAy) {
    await knex.schema.alterTable('expenses', function(table) {
      table.bigInteger('academic_year_id').unsigned().nullable().after('school_unit_id');
      table.index(['academic_year_id'], 'idx_expenses_academic_year');
    });

    // Backfill expenses from budget_plans if linked to RAPBS
    await knex.raw(`
      UPDATE expenses e
      JOIN budget_plan_expense_items bpi ON e.budget_plan_expense_item_id = bpi.id
      JOIN budget_plans bp ON bpi.budget_plan_id = bp.id
      SET e.academic_year_id = bp.academic_year_id
      WHERE e.budget_plan_expense_item_id IS NOT NULL
    `);

    // Backfill remaining non-RAPBS expenses with active year (2)
    await knex.raw(`
      UPDATE expenses
      SET academic_year_id = 2
      WHERE academic_year_id IS NULL
    `);
  }
};

exports.down = async function(knex) {
  // 1. Revert expenses
  const hasExpAy = await knex.schema.hasColumn('expenses', 'academic_year_id');
  if (hasExpAy) {
    await knex.schema.alterTable('expenses', function(table) {
      table.dropIndex(['academic_year_id'], 'idx_expenses_academic_year');
      table.dropColumn('academic_year_id');
    });
  }

  // 2. Revert fund_balance_mutations
  const hasFbmAy = await knex.schema.hasColumn('fund_balance_mutations', 'academic_year_id');
  if (hasFbmAy) {
    await knex.schema.alterTable('fund_balance_mutations', function(table) {
      table.dropIndex(['academic_year_id'], 'idx_fbm_academic_year');
      table.dropColumn('academic_year_id');
    });
  }

  // 3. Revert fund_balances
  const hasFbAy = await knex.schema.hasColumn('fund_balances', 'academic_year_id');
  if (hasFbAy) {
    try {
      await knex.schema.alterTable('fund_balances', function(table) {
        table.dropUnique(['school_unit_id', 'fund_type', 'fund_ref_id', 'academic_year_id'], 'uq_fund_balances_unit_type_ref_ay');
        table.dropIndex(['school_unit_id', 'fund_type', 'academic_year_id'], 'idx_fb_unit_type_ay');
        table.unique(['school_unit_id', 'fund_type', 'fund_ref_id'], 'uq_fund_balances_unit_type_ref');
        table.dropColumn('academic_year_id');
      });
    } catch (err) {
      console.warn('Revert fund_balances error:', err.message);
    }
  }
};
