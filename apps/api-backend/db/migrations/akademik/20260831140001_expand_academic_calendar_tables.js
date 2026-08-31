/**
 * Migration: expand_academic_calendar_tables
 * Modul Akademik - Fitur: Kalender Pendidikan Berversi (Kaldik Satuan & Yayasan),
 * Master Kategori Warna, Pengesahan Dokumen (SK), dan Integrasi Program RKT Manajemen.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabel calendar_document_versions
  await knex.schema.createTable('calendar_document_versions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.enum('context_type', ['satuan', 'yayasan']).notNullable().defaultTo('satuan');
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('academic_year_label', 20).notNullable(); // mis. "2026/2027"
    table.integer('version_number').notNullable().defaultTo(1);
    table.enum('status', ['draft', 'published']).notNullable().defaultTo('draft');
    table.timestamp('published_at').nullable();
    table.string('published_by', 100).nullable();
    table.string('decree_number', 100).nullable(); // Nomor SK Pengesahan
    table.string('file_url', 255).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['context_type', 'satuan_pendidikan_id', 'academic_year_label'], 'idx_cdv_context_year');
    table.index(['status'], 'idx_cdv_status');
  });

  // 2. Tabel calendar_event_categories
  await knex.schema.createTable('calendar_event_categories', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('name', 100).notNullable();
    table.string('color_hex', 10).notNullable(); // mis. "#10B981"
    table.tinyint('is_active', 1).notNullable().defaultTo(1);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['satuan_pendidikan_id'], 'idx_cec_satuan');
  });

  // 3. Alter academic_calendar_events
  await knex.schema.alterTable('academic_calendar_events', (table) => {
    table.bigInteger('calendar_document_version_id').unsigned().nullable();
    table.bigInteger('category_id').unsigned().nullable();
    table.bigInteger('rkt_activity_id').unsigned().nullable(); // referensi lepas ke manajemen.work_plan_activities.id
    table.string('rkt_program_name_snapshot', 150).nullable(); // cache nama program RKT

    table.index(['calendar_document_version_id'], 'idx_ace_version');
    table.index(['category_id'], 'idx_ace_category');
    table.index(['rkt_activity_id'], 'idx_ace_rkt');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('academic_calendar_events', (table) => {
    table.dropIndex(['calendar_document_version_id'], 'idx_ace_version');
    table.dropIndex(['category_id'], 'idx_ace_category');
    table.dropIndex(['rkt_activity_id'], 'idx_ace_rkt');
    table.dropColumn('calendar_document_version_id');
    table.dropColumn('category_id');
    table.dropColumn('rkt_activity_id');
    table.dropColumn('rkt_program_name_snapshot');
  });

  await knex.schema.dropTableIfExists('calendar_event_categories');
  await knex.schema.dropTableIfExists('calendar_document_versions');
};
