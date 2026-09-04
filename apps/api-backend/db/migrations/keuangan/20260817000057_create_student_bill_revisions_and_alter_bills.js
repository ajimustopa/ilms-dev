/**
 * Migration: Create student_bill_revisions and alter student_bills, student_fee_adjustments
 * 
 * 1. Tabel student_bill_revisions (audit trail revisi tagihan pasca terbit)
 * 2. Kolom version, discount_sk_*, discount_*, paid_amount, dan pending_approval di student_bills
 * 3. Kolom sk_number, sk_date, sk_document_url di student_fee_adjustments
 */

exports.up = async function (knex) {
  // 1. Alter student_bills: tambah kolom diskon kasuistik, nomor SK, version, paid_amount, dan status pending_approval
  await knex.schema.alterTable('student_bills', function (table) {
    table.smallint('version').unsigned().notNullable().defaultTo(1).after('due_date');
    table.decimal('paid_amount', 18, 2).notNullable().defaultTo(0.00).after('amount');
    table.enu('discount_type', ['percentage', 'fixed_amount', 'full_waiver']).nullable().after('discount_amount');
    table.decimal('discount_percentage', 5, 2).nullable().after('discount_type');
    table.string('discount_sk_number', 100).nullable().after('discount_percentage');
    table.date('discount_sk_date').nullable().after('discount_sk_number');
    table.string('discount_sk_document_url', 255).nullable().after('discount_sk_date');
    table.text('discount_reason').nullable().after('discount_sk_document_url');
  });

  // Perluas ENUM status di student_bills untuk menampung 'pending_approval'
  await knex.raw(`
    ALTER TABLE student_bills 
    MODIFY COLUMN status ENUM('draft', 'pending_approval', 'unpaid', 'partially_paid', 'paid', 'cancelled', 'written_off') 
    NOT NULL DEFAULT 'draft'
  `);

  // Sinkronisasi awal data paid_amount dari riwayat bill_payments yang sudah ada
  await knex.raw(`
    UPDATE student_bills sb 
    SET sb.paid_amount = COALESCE(
      (SELECT SUM(bp.amount) FROM bill_payments bp WHERE bp.student_bill_id = sb.id),
      0.00
    )
  `);

  // 2. Alter student_fee_adjustments: tambah kolom SK pimpinan/yayasan
  await knex.schema.alterTable('student_fee_adjustments', function (table) {
    table.string('sk_number', 100).nullable().after('reason');
    table.date('sk_date').nullable().after('sk_number');
    table.string('sk_document_url', 255).nullable().after('sk_date');
  });

  // 3. Tabel baru: student_bill_revisions
  await knex.schema.createTable('student_bill_revisions', function (table) {
    table.bigIncrements('id').primary();
    table.bigInteger('student_bill_id').unsigned().notNullable();
    table.smallint('revision_number').unsigned().notNullable().defaultTo(1);
    
    // Nilai sebelum vs sesudah
    table.decimal('previous_amount', 18, 2).notNullable();
    table.decimal('new_amount', 18, 2).notNullable();
    table.decimal('previous_discount_amount', 18, 2).notNullable().defaultTo(0.00);
    table.decimal('new_discount_amount', 18, 2).notNullable().defaultTo(0.00);
    table.date('previous_due_date').notNullable();
    table.date('new_due_date').notNullable();

    // SK Diskon yang menyertai revisi
    table.string('discount_sk_number', 100).nullable();
    table.date('discount_sk_date').nullable();
    table.string('discount_sk_document_url', 255).nullable();
    table.text('discount_reason').nullable();

    // Alasan revisi operasional
    table.text('revision_reason').notNullable();

    // Jurnal penyesuaian akuntansi (storno / credit note adjustment)
    table.bigInteger('adjustment_journal_entry_id').unsigned().nullable();

    // Audit trail
    table.bigInteger('created_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys & Indexes
    table.foreign('student_bill_id')
      .references('id')
      .inTable('student_bills')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');

    table.foreign('adjustment_journal_entry_id')
      .references('id')
      .inTable('journal_entries')
      .onDelete('SET NULL')
      .onUpdate('CASCADE');

    table.index(['student_bill_id', 'revision_number'], 'idx_sbr_bill_rev');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('student_bill_revisions');

  await knex.schema.alterTable('student_fee_adjustments', function (table) {
    table.dropColumn('sk_document_url');
    table.dropColumn('sk_date');
    table.dropColumn('sk_number');
  });

  await knex.schema.alterTable('student_bills', function (table) {
    table.dropColumn('discount_reason');
    table.dropColumn('discount_sk_document_url');
    table.dropColumn('discount_sk_date');
    table.dropColumn('discount_sk_number');
    table.dropColumn('discount_percentage');
    table.dropColumn('discount_type');
    table.dropColumn('paid_amount');
    table.dropColumn('version');
  });

  await knex.raw(`
    ALTER TABLE student_bills 
    MODIFY COLUMN status ENUM('draft', 'unpaid', 'partially_paid', 'paid', 'cancelled', 'written_off') 
    NOT NULL DEFAULT 'draft'
  `);
};
