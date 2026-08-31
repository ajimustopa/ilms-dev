/**
 * Migration: 20260829052550_add_sk_fields_to_rips_documents
 * Add SK Number, SK Date, SK Signer, and Goals (Tujuan) to rips_documents & publications
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasRipsDocs = await knex.schema.hasTable('rips_documents');
  if (hasRipsDocs) {
    await knex.schema.table('rips_documents', (table) => {
      table.json('objectives').nullable(); // Daftar Tujuan Strategis
      table.string('sk_number', 100).nullable(); // Nomor SK Pengesahan
      table.date('sk_date').nullable(); // Tanggal SK Pengesahan
      table.string('sk_signer_name', 150).nullable(); // Nama Pejabat Pengesah (cth: Ketua Yayasan / Kepala Sekolah)
      table.string('sk_signer_position', 150).nullable(); // Jabatan Pengesah
      table.string('sk_file_url', 255).nullable(); // File SK / Dokumen Pengesahan
      table.timestamp('ratified_at').nullable(); // Tanggal & Waktu Pengesahan
      table.bigInteger('ratified_by').unsigned().nullable(); // ID User yang mengesahkan
    });
  }

  const hasDocPubs = await knex.schema.hasTable('document_publications');
  if (hasDocPubs) {
    const hasSkSigner = await knex.schema.hasColumn('document_publications', 'sk_signer_name');
    if (!hasSkSigner) {
      await knex.schema.table('document_publications', (table) => {
        table.string('sk_signer_name', 150).nullable();
        table.string('sk_signer_position', 150).nullable();
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasRipsDocs = await knex.schema.hasTable('rips_documents');
  if (hasRipsDocs) {
    await knex.schema.table('rips_documents', (table) => {
      table.dropColumn('objectives');
      table.dropColumn('sk_number');
      table.dropColumn('sk_date');
      table.dropColumn('sk_signer_name');
      table.dropColumn('sk_signer_position');
      table.dropColumn('sk_file_url');
      table.dropColumn('ratified_at');
      table.dropColumn('ratified_by');
    });
  }

  const hasDocPubs = await knex.schema.hasTable('document_publications');
  if (hasDocPubs) {
    const hasSkSigner = await knex.schema.hasColumn('document_publications', 'sk_signer_name');
    if (hasSkSigner) {
      await knex.schema.table('document_publications', (table) => {
        table.dropColumn('sk_signer_name');
        table.dropColumn('sk_signer_position');
      });
    }
  }
};
