/**
 * Migration: 20260828130001_create_long_term_planning_tables
 * Modul Manajemen - Fitur RKJP (8 Tahun) & RKJM (4 Tahun) Berbagi Target Tahunan (annual_program_targets)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. annual_program_targets
  const hasTargets = await knex.schema.hasTable('annual_program_targets');
  if (!hasTargets) {
    await knex.schema.createTable('annual_program_targets', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('rips_program_id').unsigned().notNullable();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.string('academic_year', 20).notNullable(); // e.g. "2026/2027"
      table.decimal('target_percent', 6, 2).nullable(); // NULL = program tidak dilaksanakan pada tahun tersebut
      table.text('notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('rips_program_id', 'fk_apt_program')
        .references('id')
        .inTable('rips_programs')
        .onDelete('CASCADE');

      table.unique(['rips_program_id', 'school_unit_id', 'academic_year'], 'uq_apt_program_unit_year');
      table.index(['school_unit_id', 'academic_year'], 'idx_apt_unit_year');
      table.index(['rips_program_id'], 'idx_apt_program');
    });
  }

  // 2. long_term_work_plans (dokumen RKJP & RKJM)
  const hasPlans = await knex.schema.hasTable('long_term_work_plans');
  if (!hasPlans) {
    await knex.schema.createTable('long_term_work_plans', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.enum('plan_type', ['rkjp', 'rkjm']).notNullable();
      table.bigInteger('parent_rkjp_id').unsigned().nullable(); // diisi untuk baris rkjm, menunjuk RKJP induk
      table.string('title', 200).notNullable();
      table.specificType('start_year', 'SMALLINT UNSIGNED').notNullable();
      table.specificType('end_year', 'SMALLINT UNSIGNED').notNullable();
      table.specificType('sequence_order', 'TINYINT UNSIGNED').nullable(); // 1 atau 2 untuk RKJM
      table.integer('current_version').unsigned().notNullable().defaultTo(1);
      table.enum('status', ['draft', 'published', 'archived']).notNullable().defaultTo('draft');
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('parent_rkjp_id', 'fk_ltwp_parent')
        .references('id')
        .inTable('long_term_work_plans')
        .onDelete('CASCADE');

      table.index(['school_unit_id', 'plan_type'], 'idx_ltwp_unit_type');
      table.index(['parent_rkjp_id'], 'idx_ltwp_parent');
      table.index(['status'], 'idx_ltwp_status');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('long_term_work_plans');
  await knex.schema.dropTableIfExists('annual_program_targets');
};
