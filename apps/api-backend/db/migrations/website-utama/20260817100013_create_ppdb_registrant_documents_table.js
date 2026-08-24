/**
 * Migration: create_ppdb_registrant_documents_table
 * Modul Website Utama - Fitur #25: Dokumen Berkas Persyaratan PPDB
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('ppdb_registrant_documents', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('registrant_id').unsigned().notNullable()
      .references('id').inTable('ppdb_registrants').onDelete('CASCADE');
    table.string('document_type', 100).notNullable();
    table.string('file_url', 255).notNullable();
    table.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['registrant_id', 'document_type'], 'idx_ppdb_docs_reg_type');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('ppdb_registrant_documents');
};
