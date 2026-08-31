/**
 * Migration: 20260828120001_create_rips_tables
 * Modul Manajemen - Fitur RIPS Terintegrasi (Dokumen Induk, Sasaran, Program & Upaya, M2M Links)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. rips_documents
  const hasRipsDocs = await knex.schema.hasTable('rips_documents');
  if (!hasRipsDocs) {
    await knex.schema.createTable('rips_documents', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('school_unit_id').unsigned().nullable(); // NULL = RIPS tingkat yayasan
      table.string('name', 200).notNullable();
      table.text('vision').nullable();
      table.json('mission').nullable();
      table.text('description').nullable();
      table.integer('current_version').unsigned().notNullable().defaultTo(1);
      table.enum('status', ['draft', 'published']).notNullable().defaultTo('draft');
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['school_unit_id'], 'idx_rdoc_unit');
      table.index(['status'], 'idx_rdoc_status');
    });
  }

  // 2. rips_goals
  const hasRipsGoals = await knex.schema.hasTable('rips_goals');
  if (!hasRipsGoals) {
    await knex.schema.createTable('rips_goals', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('rips_document_id').unsigned().notNullable();
      table.bigInteger('domain_id').unsigned().notNullable();
      table.bigInteger('subdomain_id').unsigned().nullable();
      table.bigInteger('bsc_aspect_id').unsigned().notNullable();
      table.string('code', 50).notNullable().unique();
      table.string('title', 255).notNullable(); // nama sasaran
      table.string('indicator_name', 255).notNullable(); // indikator sasaran
      table.string('indicator_unit', 100).notNullable(); // satuan indikator
      table.decimal('baseline_percent', 6, 2).nullable();
      table.decimal('target_percent', 6, 2).nullable();
      table.integer('order_index').notNullable().defaultTo(0);
      table.enum('status', ['draft', 'active', 'achieved', 'delayed']).notNullable().defaultTo('draft');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('rips_document_id', 'fk_rg_doc')
        .references('id')
        .inTable('rips_documents')
        .onDelete('CASCADE');

      table.foreign('domain_id', 'fk_rg_domain')
        .references('id')
        .inTable('rips_domains')
        .onDelete('RESTRICT');

      table.foreign('subdomain_id', 'fk_rg_subdomain')
        .references('id')
        .inTable('rips_subdomains')
        .onDelete('SET NULL');

      table.foreign('bsc_aspect_id', 'fk_rg_bsc')
        .references('id')
        .inTable('bsc_aspects')
        .onDelete('RESTRICT');

      table.index(['rips_document_id'], 'idx_rg_doc');
      table.index(['domain_id'], 'idx_rg_domain');
      table.index(['bsc_aspect_id'], 'idx_rg_bsc');
      table.index(['order_index'], 'idx_rg_order');
      table.index(['status'], 'idx_rg_status');
    });
  }

  // 3. rips_programs
  const hasRipsPrograms = await knex.schema.hasTable('rips_programs');
  if (!hasRipsPrograms) {
    await knex.schema.createTable('rips_programs', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('rips_document_id').unsigned().notNullable();
      table.string('code', 50).notNullable().unique();
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      table.tinyint('is_flagship', 1).notNullable().defaultTo(0);
      table.integer('order_index').notNullable().defaultTo(0);
      table.enum('status', ['draft', 'active', 'completed']).notNullable().defaultTo('draft');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('rips_document_id', 'fk_rp_doc')
        .references('id')
        .inTable('rips_documents')
        .onDelete('CASCADE');

      table.index(['rips_document_id'], 'idx_rp_doc');
      table.index(['is_flagship'], 'idx_rp_flagship');
      table.index(['order_index'], 'idx_rp_order');
      table.index(['status'], 'idx_rp_status');
    });
  }

  // 4. rips_program_goal_links (M2M)
  const hasRipsLinks = await knex.schema.hasTable('rips_program_goal_links');
  if (!hasRipsLinks) {
    await knex.schema.createTable('rips_program_goal_links', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('rips_program_id').unsigned().notNullable();
      table.bigInteger('rips_goal_id').unsigned().notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('rips_program_id', 'fk_rpgl_program')
        .references('id')
        .inTable('rips_programs')
        .onDelete('CASCADE');

      table.foreign('rips_goal_id', 'fk_rpgl_goal')
        .references('id')
        .inTable('rips_goals')
        .onDelete('CASCADE');

      table.unique(['rips_program_id', 'rips_goal_id'], 'uq_rpgl_program_goal');
      table.index(['rips_program_id'], 'idx_rpgl_program');
      table.index(['rips_goal_id'], 'idx_rpgl_goal');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('rips_program_goal_links');
  await knex.schema.dropTableIfExists('rips_programs');
  await knex.schema.dropTableIfExists('rips_goals');
  await knex.schema.dropTableIfExists('rips_documents');
};
