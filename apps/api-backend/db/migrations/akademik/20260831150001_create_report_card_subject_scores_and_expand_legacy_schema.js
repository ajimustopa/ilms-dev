/**
 * Migration: create_report_card_subject_scores_and_expand_legacy_schema
 * Modul Akademik - Fitur: Materialisasi Nilai Akhir Rapor per Mapel,
 * Metadata Sumber Data / Riwayat Rapor Lampau, dan Mode Input Ringkas Riwayat Siswa.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabel report_card_subject_scores (buat jika belum ada)
  const hasSubjectScoresTable = await knex.schema.hasTable('report_card_subject_scores');
  if (!hasSubjectScoresTable) {
    await knex.schema.createTable('report_card_subject_scores', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('report_card_id').unsigned().notNullable()
        .references('id').inTable('report_cards').onDelete('CASCADE').onUpdate('CASCADE');
      table.bigInteger('subject_id').unsigned().notNullable()
        .references('id').inTable('subjects').onDelete('RESTRICT').onUpdate('CASCADE');
      table.decimal('score', 5, 2).notNullable();
      table.decimal('max_score', 5, 2).notNullable().defaultTo(100.00);
      table.string('predikat', 5).nullable(); // mis. "A", "B", "C"
      table.decimal('kkm_snapshot', 5, 2).nullable();
      table.text('notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.unique(['report_card_id', 'subject_id'], 'uq_rcss_report_card_subject');
      table.index(['subject_id'], 'idx_rcss_subject');
    });
  }

  // 2. Tambah kolom data_source & is_legacy pada tabel report_cards
  const hasDataSource = await knex.schema.hasColumn('report_cards', 'data_source');
  if (!hasDataSource) {
    await knex.schema.alterTable('report_cards', (table) => {
      table.enum('data_source', ['generated', 'manual_input', 'bulk_import'])
        .notNullable().defaultTo('generated');
      table.tinyint('is_legacy', 1).notNullable().defaultTo(0);
    });
  }

  // 3. Tambah kolom data_entry_mode pada tabel students
  const hasDataEntryMode = await knex.schema.hasColumn('students', 'data_entry_mode');
  if (!hasDataEntryMode) {
    await knex.schema.alterTable('students', (table) => {
      table.enum('data_entry_mode', ['lengkap', 'ringkas_riwayat'])
        .notNullable().defaultTo('lengkap');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasDataEntryMode = await knex.schema.hasColumn('students', 'data_entry_mode');
  if (hasDataEntryMode) {
    await knex.schema.alterTable('students', (table) => {
      table.dropColumn('data_entry_mode');
    });
  }

  const hasDataSource = await knex.schema.hasColumn('report_cards', 'data_source');
  if (hasDataSource) {
    await knex.schema.alterTable('report_cards', (table) => {
      table.dropColumn('is_legacy');
      table.dropColumn('data_source');
    });
  }

  await knex.schema.dropTableIfExists('report_card_subject_scores');
};
