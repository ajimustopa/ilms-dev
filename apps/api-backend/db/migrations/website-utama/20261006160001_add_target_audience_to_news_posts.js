/**
 * Migration: add_target_audience_to_news_posts
 * Modul Website Utama - Pemisahan Pengumuman Internal & Publik (Tahap 13 Portal Guru)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('news_posts', 'target_audience');
  if (!hasColumn) {
    await knex.schema.alterTable('news_posts', (table) => {
      table.enu('target_audience', ['public', 'all_internal', 'teachers', 'students'])
        .notNullable()
        .defaultTo('public')
        .after('category');

      table.index(['school_unit_id', 'target_audience', 'status'], 'idx_news_school_audience_status');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('news_posts', 'target_audience');
  if (hasColumn) {
    await knex.schema.alterTable('news_posts', (table) => {
      table.dropIndex(['school_unit_id', 'target_audience', 'status'], 'idx_news_school_audience_status');
      table.dropColumn('target_audience');
    });
  }
};
