/**
 * Migration: expand_renstra_and_create_strategic_goals
 * Modul Manajemen - Fitur 1: Renstra Lembaga (RIPS) & Sasaran Strategis (Strategic Goals)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Perluas tabel institution_development_plans jika kolom belum ada
  const hasCode = await knex.schema.hasColumn('institution_development_plans', 'code');
  if (!hasCode) {
    await knex.schema.alterTable('institution_development_plans', (table) => {
      table.string('code', 50).nullable().after('id');
      table.text('description').nullable().after('mission');
      table.bigInteger('updated_by').unsigned().nullable().after('created_by');
      table.bigInteger('school_unit_id').unsigned().nullable().alter();
    });
  }

  // 2. Buat tabel strategic_goals jika belum ada
  const hasTable = await knex.schema.hasTable('strategic_goals');
  if (!hasTable) {
    await knex.schema.createTable('strategic_goals', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('institution_development_plan_id').unsigned().notNullable();
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.string('code', 50).notNullable();
      table.string('name', 250).notNullable();
      table.string('perspective', 100).nullable();
      table.text('description').nullable();
      table.text('target_description').nullable();
      table.integer('order_index').notNullable().defaultTo(1);
      table.enum('status', ['active', 'archived']).notNullable().defaultTo('active');
      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('institution_development_plan_id', 'fk_sg_idp')
        .references('id')
        .inTable('institution_development_plans')
        .onDelete('CASCADE');

      table.index(['institution_development_plan_id'], 'idx_sg_renstra');
      table.index(['school_unit_id'], 'idx_sg_unit');
      table.index(['status'], 'idx_sg_status');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('strategic_goals');
  const hasCode = await knex.schema.hasColumn('institution_development_plans', 'code');
  if (hasCode) {
    await knex.schema.alterTable('institution_development_plans', (table) => {
      table.dropColumn('code');
      table.dropColumn('description');
      table.dropColumn('updated_by');
    });
  }
};
