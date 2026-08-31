/**
 * Migration: 20260828170001_create_rips_goal_indicators_table.js
 * Modul Manajemen - Fitur Multi-Indikator Kuantitatif per Sasaran RIPS
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Create rips_goal_indicators table
  const hasIndicators = await knex.schema.hasTable('rips_goal_indicators');
  if (!hasIndicators) {
    await knex.schema.createTable('rips_goal_indicators', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('rips_goal_id').unsigned().notNullable();
      table.string('code', 50).nullable();
      table.string('name', 255).notNullable();
      table.string('unit', 100).notNullable().defaultTo('%');
      table.decimal('baseline_percent', 6, 2).nullable().defaultTo(0);
      table.decimal('target_percent', 6, 2).nullable().defaultTo(100);
      table.integer('order_index').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('rips_goal_id', 'fk_rgi_goal')
        .references('id')
        .inTable('rips_goals')
        .onDelete('CASCADE');

      table.index(['rips_goal_id'], 'idx_rgi_goal');
    });
  }

  // 2. Seed existing indicator records from rips_goals
  const count = await knex('rips_goal_indicators').count('* as count');
  if (count[0].count === 0) {
    const goals = await knex('rips_goals').select('*');
    for (const g of goals) {
      if (g.indicator_name) {
        await knex('rips_goal_indicators').insert({
          rips_goal_id: g.id,
          code: g.code ? `${g.code}-IND-01` : null,
          name: g.indicator_name,
          unit: g.indicator_unit || '%',
          baseline_percent: g.baseline_percent !== null ? g.baseline_percent : 0,
          target_percent: g.target_percent !== null ? g.target_percent : 100,
          order_index: 1,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        });
      }
    }
  }

  // 3. Make indicator_name and indicator_unit nullable on rips_goals if still exists
  const hasGoals = await knex.schema.hasTable('rips_goals');
  if (hasGoals) {
    await knex.schema.alterTable('rips_goals', (table) => {
      table.string('indicator_name', 255).nullable().alter();
      table.string('indicator_unit', 100).nullable().alter();
      table.decimal('baseline_percent', 6, 2).nullable().alter();
      table.decimal('target_percent', 6, 2).nullable().alter();
    });
  }

  // 4. Add rips_goal_indicator_id on evadir_goal_results if not exists
  const hasEvadir = await knex.schema.hasTable('evadir_goal_results');
  if (hasEvadir) {
    const hasCol = await knex.schema.hasColumn('evadir_goal_results', 'rips_goal_indicator_id');
    if (!hasCol) {
      await knex.schema.alterTable('evadir_goal_results', (table) => {
        table.bigInteger('rips_goal_indicator_id').unsigned().nullable().after('rips_goal_id');
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('rips_goal_indicators');
};
