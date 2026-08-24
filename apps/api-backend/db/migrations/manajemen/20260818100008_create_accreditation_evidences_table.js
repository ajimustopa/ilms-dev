/**
 * Migration: create_accreditation_evidences_table
 * Modul Manajemen - Fitur #196: Bukti & Dokumen Akreditasi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('accreditation_evidences', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('accreditation_report_id').unsigned().notNullable();
    table.text('evidence_description').notNullable();
    table.string('file_url', 255).nullable();
    table.decimal('score', 5, 2).nullable();
    table.bigInteger('verified_by').unsigned().nullable();
    table.timestamp('verified_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('accreditation_report_id', 'fk_ae_report')
      .references('id')
      .inTable('accreditation_reports')
      .onDelete('CASCADE');

    table.index(['accreditation_report_id'], 'idx_ae_report');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('accreditation_evidences');
};
