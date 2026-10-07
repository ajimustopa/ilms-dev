/**
 * Migration: add_pinned_and_attachments_to_news_posts
 * Modul Website Utama - Fitur: Pengumuman Tersemat & Lampiran Dokumen Resmi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasPinned = await knex.schema.hasColumn('news_posts', 'is_pinned');
  if (!hasPinned) {
    await knex.schema.alterTable('news_posts', (table) => {
      table.boolean('is_pinned').defaultTo(false).index();
      table.string('attachment_url', 255).nullable();
      table.string('attachment_name', 150).nullable();
      table.string('attachment_size', 50).nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasPinned = await knex.schema.hasColumn('news_posts', 'is_pinned');
  if (hasPinned) {
    await knex.schema.alterTable('news_posts', (table) => {
      table.dropColumn('attachment_size');
      table.dropColumn('attachment_name');
      table.dropColumn('attachment_url');
      table.dropColumn('is_pinned');
    });
  }
};
