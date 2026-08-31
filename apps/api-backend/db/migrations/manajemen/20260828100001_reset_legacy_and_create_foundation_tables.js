/**
 * Migration: 20260828100001_reset_legacy_and_create_foundation_tables
 * Modul Manajemen - Rombak Besar:
 * 1. Drop tabel legacy:
 *    - quality_goals
 *    - quality_indicator_achievements
 *    - quality_indicators
 *    - work_plan_activities
 *    - work_plan_programs
 *    - school_work_plans
 *    - strategic_goals
 *    - institution_development_plans
 *    - self_evaluations
 * 2. Buat tabel Fondasi Baru:
 *    - rips_domains (Master Bidang RIPS)
 *    - rips_subdomains (Master Sub-bidang RIPS)
 *    - bsc_aspects (Master Aspek Balanced Scorecard)
 *    - committee_position_types (Master Jenis Jabatan Kepanitiaan)
 *    - document_publications (Tabel generik versioning & penerbitan dokumen)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Disable foreign key checks to safely drop tables in any order
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  // 1. Drop Legacy Tables
  await knex.schema.dropTableIfExists('quality_goals');
  await knex.schema.dropTableIfExists('quality_indicator_achievements');
  await knex.schema.dropTableIfExists('quality_indicators');
  await knex.schema.dropTableIfExists('work_plan_activities');
  await knex.schema.dropTableIfExists('work_plan_programs');
  await knex.schema.dropTableIfExists('school_work_plans');
  await knex.schema.dropTableIfExists('strategic_goals');
  await knex.schema.dropTableIfExists('institution_development_plans');
  await knex.schema.dropTableIfExists('self_evaluations');

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 2. Create Foundation Tables

  // D.1 rips_domains (bidang, master custom): id, name, order_index, timestamps
  const hasRipsDomains = await knex.schema.hasTable('rips_domains');
  if (!hasRipsDomains) {
    await knex.schema.createTable('rips_domains', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('name', 200).notNullable();
      table.integer('order_index').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['order_index'], 'idx_rd_order');
    });
  }

  // D.2 rips_subdomains (sub-bidang, master custom): id, domain_id FK rips_domains cascade, name, order_index, timestamps
  const hasRipsSubdomains = await knex.schema.hasTable('rips_subdomains');
  if (!hasRipsSubdomains) {
    await knex.schema.createTable('rips_subdomains', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('domain_id').unsigned().notNullable();
      table.string('name', 200).notNullable();
      table.integer('order_index').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('domain_id', 'fk_rsd_domain')
        .references('id')
        .inTable('rips_domains')
        .onDelete('CASCADE');

      table.index(['domain_id'], 'idx_rsd_domain');
      table.index(['order_index'], 'idx_rsd_order');
    });
  }

  // D.3 bsc_aspects (aspek BSC, master custom): id, name, description, order_index, timestamps
  const hasBscAspects = await knex.schema.hasTable('bsc_aspects');
  if (!hasBscAspects) {
    await knex.schema.createTable('bsc_aspects', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('name', 150).notNullable();
      table.text('description').nullable();
      table.integer('order_index').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['order_index'], 'idx_bsc_order');
    });

    // Seed default 4 BSC aspects
    await knex('bsc_aspects').insert([
      { name: 'Finansial', description: 'Perspektif kinerja keuangan dan efisiensi anggaran lembaga', order_index: 1 },
      { name: 'Pelanggan & Stakeholder', description: 'Perspektif kepuasan santri, wali santri, dan masyarakat', order_index: 2 },
      { name: 'Proses Bisnis Internal', description: 'Perspektif keunggulan operasional, tata kelola, dan mutu layanan', order_index: 3 },
      { name: 'Pembelajaran & Pertumbuhan', description: 'Perspektif kapasitas SDM, inovasi, kultur, dan teknologi', order_index: 4 },
    ]);
  }

  // D.4 committee_position_types (jenis jabatan kepanitiaan, master custom): id, name, order_index, timestamps
  const hasCommitteePositions = await knex.schema.hasTable('committee_position_types');
  if (!hasCommitteePositions) {
    await knex.schema.createTable('committee_position_types', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('name', 100).notNullable();
      table.integer('order_index').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['order_index'], 'idx_cpt_order');
    });

    // Seed contoh jenis jabatan
    await knex('committee_position_types').insert([
      { name: 'Penanggung Jawab', order_index: 1 },
      { name: 'Ketua', order_index: 2 },
      { name: 'Wakil Ketua', order_index: 3 },
      { name: 'Sekretaris', order_index: 4 },
      { name: 'Bendahara', order_index: 5 },
      { name: 'Koordinator', order_index: 6 },
      { name: 'Anggota', order_index: 7 },
    ]);
  }

  // D.5 document_publications (tabel generik untuk versioning & penerbitan dokumen)
  const hasDocPublications = await knex.schema.hasTable('document_publications');
  if (!hasDocPublications) {
    await knex.schema.createTable('document_publications', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.enum('document_type', ['rips', 'rkjp', 'rkjm', 'rkt', 'evadir']).notNullable();
      table.bigInteger('source_id').unsigned().notNullable();
      table.bigInteger('school_unit_id').unsigned().nullable(); // NULL = level yayasan
      table.integer('version_number').unsigned().notNullable();
      table.string('document_number', 100).nullable(); // nomor SK/dokumen resmi
      table.string('title', 255).notNullable();
      table.json('snapshot_json').nullable(); // freeze seluruh data terkait pada saat diterbitkan
      table.text('change_summary').nullable(); // ringkasan perubahan dari versi sebelumnya
      table.string('file_url', 255).nullable();
      table.enum('status', ['draft_revision', 'published', 'archived']).notNullable().defaultTo('draft_revision');
      table.date('effective_date').nullable();
      table.bigInteger('published_by').unsigned().nullable();
      table.timestamp('published_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.unique(['document_type', 'source_id', 'version_number'], 'uq_doc_pub_type_src_ver');
      table.index(['document_type', 'source_id'], 'idx_doc_pub_source');
      table.index(['school_unit_id'], 'idx_doc_pub_unit');
      table.index(['status'], 'idx_doc_pub_status');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('document_publications');
  await knex.schema.dropTableIfExists('committee_position_types');
  await knex.schema.dropTableIfExists('bsc_aspects');
  await knex.schema.dropTableIfExists('rips_subdomains');
  await knex.schema.dropTableIfExists('rips_domains');
};
