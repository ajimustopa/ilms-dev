/**
 * Migration: 20260828110001_create_institution_profile_tables
 * Modul Manajemen - Fitur Profil Lembaga:
 * 1. legal_document_types (Master Custom)
 * 2. institution_legal_documents (Dokumen Legalitas Yayasan & Satuan Pendidikan)
 * 3. institution_letterheads (Kop Surat & Template HTML)
 * 4. institution_stamps (Cap Stempel Basah / Digital)
 * 5. institution_signatures (Specimen Tanda Tangan Pejabat)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. legal_document_types (master custom)
  const hasLegalDocTypes = await knex.schema.hasTable('legal_document_types');
  if (!hasLegalDocTypes) {
    await knex.schema.createTable('legal_document_types', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('name', 150).notNullable();
      table.tinyint('requires_expiry', 1).notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['name'], 'idx_ldt_name');
    });

    // Seed master custom legal document types
    await knex('legal_document_types').insert([
      { name: 'Akta Notaris Pendirian Yayasan', requires_expiry: 0 },
      { name: 'SK Kemenkumham', requires_expiry: 0 },
      { name: 'NPWP Yayasan', requires_expiry: 0 },
      { name: 'Izin Operasional Sekolah', requires_expiry: 1 },
      { name: 'NPSN', requires_expiry: 0 },
      { name: 'Piagam Akreditasi', requires_expiry: 1 },
      { name: 'Sertifikat Tanah/Bangunan', requires_expiry: 0 },
    ]);
  }

  // 2. institution_legal_documents
  const hasLegalDocs = await knex.schema.hasTable('institution_legal_documents');
  if (!hasLegalDocs) {
    await knex.schema.createTable('institution_legal_documents', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.enum('owner_type', ['foundation', 'school_unit']).notNullable();
      table.bigInteger('owner_id').unsigned().notNullable(); // ID foundation / school_unit dari core
      table.bigInteger('legal_document_type_id').unsigned().notNullable();
      table.string('document_number', 100).nullable();
      table.string('issuing_authority', 150).nullable();
      table.date('issued_date').nullable();
      table.date('expiry_date').nullable();
      table.string('file_url', 255).nullable();
      table.enum('status', ['berlaku', 'kadaluarsa', 'dalam_proses']).notNullable().defaultTo('berlaku');
      table.text('notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('legal_document_type_id', 'fk_ild_type')
        .references('id')
        .inTable('legal_document_types')
        .onDelete('RESTRICT');

      table.index(['owner_type', 'owner_id'], 'idx_ild_owner');
      table.index(['status'], 'idx_ild_status');
      table.index(['expiry_date'], 'idx_ild_expiry');
    });
  }

  // 3. institution_letterheads (kop surat)
  const hasLetterheads = await knex.schema.hasTable('institution_letterheads');
  if (!hasLetterheads) {
    await knex.schema.createTable('institution_letterheads', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.enum('owner_type', ['foundation', 'school_unit']).notNullable();
      table.bigInteger('owner_id').unsigned().notNullable();
      table.string('name', 150).notNullable();
      table.string('logo_file_url', 255).nullable();
      table.text('header_html').nullable();
      table.tinyint('is_default', 1).notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['owner_type', 'owner_id'], 'idx_ilh_owner');
      table.index(['is_default'], 'idx_ilh_default');
    });
  }

  // 4. institution_stamps (cap stempel)
  const hasStamps = await knex.schema.hasTable('institution_stamps');
  if (!hasStamps) {
    await knex.schema.createTable('institution_stamps', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.enum('owner_type', ['foundation', 'school_unit']).notNullable();
      table.bigInteger('owner_id').unsigned().notNullable();
      table.string('name', 150).notNullable();
      table.enum('stamp_type', ['basah', 'digital']).notNullable().defaultTo('digital');
      table.string('image_file_url', 255).notNullable();
      table.tinyint('is_default', 1).notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['owner_type', 'owner_id'], 'idx_ist_owner');
      table.index(['is_default'], 'idx_ist_default');
    });
  }

  // 5. institution_signatures (specimen tanda tangan pejabat)
  const hasSignatures = await knex.schema.hasTable('institution_signatures');
  if (!hasSignatures) {
    await knex.schema.createTable('institution_signatures', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.enum('owner_type', ['foundation', 'school_unit']).notNullable();
      table.bigInteger('owner_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().nullable(); // referensi pegawai di Kepegawaian
      table.string('position_title', 150).notNullable(); // Jabatan tercetak (mis. "Kepala Sekolah", "Ketua Yayasan")
      table.string('signature_image_url', 255).nullable();
      table.tinyint('is_default', 1).notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['owner_type', 'owner_id'], 'idx_isg_owner');
      table.index(['employee_id'], 'idx_isg_employee');
      table.index(['is_default'], 'idx_isg_default');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('institution_signatures');
  await knex.schema.dropTableIfExists('institution_stamps');
  await knex.schema.dropTableIfExists('institution_letterheads');
  await knex.schema.dropTableIfExists('institution_legal_documents');
  await knex.schema.dropTableIfExists('legal_document_types');
};
