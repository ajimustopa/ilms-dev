/**
 * Migration 60: Align PPDB Billing with Student Bills Lifecycle
 * - Alter ppdb_registration_bills (status enum, academic_year_id, discount, phase, installment, refund)
 * - Create table ppdb_bill_revisions (audit trail revisi tagihan PPDB paralel student_bill_revisions)
 * - Create table ppdb_refund_policy_rules (konfigurasi placeholder kebijakan refund PPDB)
 * - Create table ppdb_scholarship_quotas (konfigurasi placeholder kuota beasiswa PPDB)
 * - Insert transaction rules for ppdb_bill_issued & ppdb_refund_issued
 */
exports.up = async function(knex) {
  // 1. Alter ppdb_registration_bills
  const hasBillsTable = await knex.schema.hasTable('ppdb_registration_bills');
  if (hasBillsTable) {
    // 1.1 Perluas status enum
    await knex.raw(`
      ALTER TABLE ppdb_registration_bills
      MODIFY COLUMN status ENUM('draft', 'pending_approval', 'unpaid', 'partially_paid', 'paid', 'cancelled', 'refunded')
      NOT NULL DEFAULT 'draft'
    `);

    // 1.2 Tambah kolom-kolom baru
    await knex.schema.alterTable('ppdb_registration_bills', function(table) {
      table.bigInteger('academic_year_id').unsigned().nullable().after('school_unit_id');
      table.integer('version').unsigned().notNullable().defaultTo(1).after('amount');
      table.decimal('paid_amount', 18, 2).notNullable().defaultTo(0.00).after('version');

      // Diskon kasuistik
      table.enum('discount_type', ['percentage', 'fixed_amount', 'full_waiver']).nullable().after('paid_amount');
      table.decimal('discount_amount', 18, 2).notNullable().defaultTo(0.00).after('discount_type');
      table.decimal('discount_percentage', 5, 2).nullable().after('discount_amount');
      table.string('discount_sk_number', 100).nullable().after('discount_percentage');
      table.date('discount_sk_date').nullable().after('discount_sk_number');
      table.string('discount_sk_document_url', 255).nullable().after('discount_sk_date');
      table.text('discount_reason').nullable().after('discount_sk_document_url');

      // Approval berjenjang diskon
      table.enum('approval_tier', ['unit', 'yayasan']).nullable().after('discount_reason');
      table.bigInteger('approved_by').unsigned().nullable().after('approval_tier');
      table.timestamp('approved_at').nullable().after('approved_by');
      table.text('rejection_reason').nullable().after('approved_at');

      // Fase & Termin
      table.enum('billing_phase', ['registration_fee', 'enrollment_fee']).notNullable().defaultTo('registration_fee').after('rejection_reason');
      table.smallint('installment_number').unsigned().nullable().after('billing_phase');
      table.smallint('installment_total').unsigned().nullable().after('installment_number');
      table.bigInteger('parent_bill_id').unsigned().nullable().after('installment_total');
      table.boolean('is_installment_parent').notNullable().defaultTo(false).after('parent_bill_id');
      table.bigInteger('scholarship_quota_id').unsigned().nullable().after('is_installment_parent');

      // Refund
      table.enum('refund_status', ['none', 'requested', 'approved', 'rejected', 'processed']).notNullable().defaultTo('none').after('scholarship_quota_id');
      table.decimal('refund_amount', 18, 2).notNullable().defaultTo(0.00).after('refund_status');
      table.string('refund_bank_account_number', 50).nullable().after('refund_amount');
      table.string('refund_bank_account_holder', 150).nullable().after('refund_bank_account_number');
      table.text('refund_reason').nullable().after('refund_bank_account_holder');
      table.bigInteger('refund_approved_by').unsigned().nullable().after('refund_reason');
      table.timestamp('refund_processed_at').nullable().after('refund_approved_by');

      // Index tambahan
      table.index(['academic_year_id'], 'idx_ppdb_bills_academic_year');
      table.index(['billing_phase'], 'idx_ppdb_bills_phase');
      table.index(['parent_bill_id'], 'idx_ppdb_bills_parent');
      table.index(['refund_status'], 'idx_ppdb_bills_refund_status');
    });

    // Foreign key self-reference parent_bill_id
    await knex.raw(`
      ALTER TABLE ppdb_registration_bills
      ADD CONSTRAINT fk_ppdb_bills_parent
      FOREIGN KEY (parent_bill_id) REFERENCES ppdb_registration_bills(id)
      ON DELETE CASCADE
    `);
  }

  // 2. Tabel baru ppdb_bill_revisions
  const hasRevisionsTable = await knex.schema.hasTable('ppdb_bill_revisions');
  if (!hasRevisionsTable) {
    await knex.schema.createTable('ppdb_bill_revisions', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('ppdb_registration_bill_id').unsigned().notNullable();
      table.integer('revision_number').unsigned().notNullable();
      table.decimal('previous_amount', 18, 2).notNullable();
      table.decimal('new_amount', 18, 2).notNullable();
      table.bigInteger('adjustment_journal_entry_id').unsigned().nullable();
      table.string('discount_sk_number', 100).nullable();
      table.date('discount_sk_date').nullable();
      table.string('discount_sk_document_url', 255).nullable();
      table.text('revision_reason').notNullable();
      table.bigInteger('revised_by').unsigned().nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      // Foreign Keys & Indexes
      table.foreign('ppdb_registration_bill_id')
        .references('id')
        .inTable('ppdb_registration_bills')
        .onDelete('RESTRICT');

      table.foreign('adjustment_journal_entry_id')
        .references('id')
        .inTable('journal_entries')
        .onDelete('SET NULL');

      table.index(['ppdb_registration_bill_id'], 'idx_ppdb_rev_bill');
      table.index(['revision_number'], 'idx_ppdb_rev_number');
    });
  }

  // 3. Tabel konfigurasi baru ppdb_refund_policy_rules (PLACEHOLDER)
  const hasRefundPolicyTable = await knex.schema.hasTable('ppdb_refund_policy_rules');
  if (!hasRefundPolicyTable) {
    await knex.schema.createTable('ppdb_refund_policy_rules', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.enum('fee_component', ['registration_fee', 'enrollment_fee']).notNullable();
      table.boolean('is_refundable').notNullable().defaultTo(false);
      table.date('cutoff_date').nullable();
      table.decimal('deduction_percentage', 5, 2).notNullable().defaultTo(0.00);
      table.string('description', 255).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);

      table.index(['school_unit_id', 'fee_component'], 'idx_ppdb_refund_policy_unit_fee');
    });

    // Seed placeholder rules default
    const units = [1, 2];
    for (const unitId of units) {
      await knex('ppdb_refund_policy_rules').insert([
        {
          school_unit_id: unitId,
          fee_component: 'registration_fee',
          is_refundable: false,
          cutoff_date: null,
          deduction_percentage: 100.00,
          description: '[PLACEHOLDER] Biaya formulir & pendaftaran hangus (non-refundable)',
          is_active: true
        },
        {
          school_unit_id: unitId,
          fee_component: 'enrollment_fee',
          is_refundable: true,
          cutoff_date: '2026-05-31',
          deduction_percentage: 10.00,
          description: '[PLACEHOLDER] Pengunduran diri s.d 31 Mei dipotong 10% biaya administrasi',
          is_active: true
        },
        {
          school_unit_id: unitId,
          fee_component: 'enrollment_fee',
          is_refundable: true,
          cutoff_date: '2026-06-30',
          deduction_percentage: 25.00,
          description: '[PLACEHOLDER] Pengunduran diri s.d 30 Juni dipotong 25%',
          is_active: true
        },
        {
          school_unit_id: unitId,
          fee_component: 'enrollment_fee',
          is_refundable: false,
          cutoff_date: '2026-07-01',
          deduction_percentage: 100.00,
          description: '[PLACEHOLDER] Pengunduran diri per 1 Juli ke atas tidak dapat dikembalikan',
          is_active: true
        }
      ]);
    }
  }

  // 4. Tabel konfigurasi baru ppdb_scholarship_quotas (PLACEHOLDER)
  const hasQuotasTable = await knex.schema.hasTable('ppdb_scholarship_quotas');
  if (!hasQuotasTable) {
    await knex.schema.createTable('ppdb_scholarship_quotas', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().notNullable();
      table.string('quota_category', 100).notNullable();
      table.smallint('max_quota').unsigned().notNullable().defaultTo(5);
      table.smallint('used_quota').unsigned().notNullable().defaultTo(0);
      table.string('description', 255).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);

      table.index(['school_unit_id', 'academic_year_id'], 'idx_ppdb_quota_unit_ay');
    });

    // Seed placeholder kuota beasiswa default
    const units = [1, 2];
    for (const unitId of units) {
      await knex('ppdb_scholarship_quotas').insert([
        {
          school_unit_id: unitId,
          academic_year_id: 2,
          quota_category: 'Tahfidz 30 Juz',
          max_quota: 5,
          used_quota: 0,
          description: '[PLACEHOLDER] Beasiswa Penuh 100% Calon Santri Tahfidz 30 Juz',
          is_active: true
        },
        {
          school_unit_id: unitId,
          academic_year_id: 2,
          quota_category: 'Dhuafa & Yatim',
          max_quota: 10,
          used_quota: 0,
          description: '[PLACEHOLDER] Subsidi Keringanan Calon Santri Yatim / Dhuafa Berprestasi',
          is_active: true
        },
        {
          school_unit_id: unitId,
          academic_year_id: 2,
          quota_category: 'Anak Guru & Pegawai',
          max_quota: 5,
          used_quota: 0,
          description: '[PLACEHOLDER] Keringanan Khusus Putra/Putri Pendidik & Tenaga Kependidikan',
          is_active: true
        }
      ]);
    }
  }

  // 5. Insert system transaction rules in transaction_account_mappings
  const hasMappingTable = await knex.schema.hasTable('transaction_account_mappings');
  if (hasMappingTable) {
    const units = [1, 2];
    for (const unitId of units) {
      // Rule 1: Penerbitan Piutang PPDB (ppdb_bill_issued)
      const existingIssued = await knex('transaction_account_mappings')
        .where({ school_unit_id: unitId, transaction_code: 'ppdb_bill_issued' })
        .first();

      if (!existingIssued) {
        await knex('transaction_account_mappings').insert({
          school_unit_id: unitId,
          transaction_code: 'ppdb_bill_issued',
          transaction_label: 'Penerbitan Piutang PPDB Calon Murid',
          debit_account_id: 199, // Piutang Usaha - Siswa
          credit_account_id: null, // Dinamis dari fee_type.related_revenue_account_id
          is_system: 1,
          is_dynamic_account: 1,
          linked_feature_note: 'Jurnal otomatis saat tagihan PPDB disahkan terbit dari draf'
        });
      }

      // Rule 2: Pencairan Pengembalian Dana PPDB (ppdb_refund_issued)
      const existingRefund = await knex('transaction_account_mappings')
        .where({ school_unit_id: unitId, transaction_code: 'ppdb_refund_issued' })
        .first();

      if (!existingRefund) {
        await knex('transaction_account_mappings').insert({
          school_unit_id: unitId,
          transaction_code: 'ppdb_refund_issued',
          transaction_label: 'Pencairan Refund Pembayaran PPDB',
          debit_account_id: null, // Dinamis dari pendapatan PPDB / beban refund
          credit_account_id: null, // Dinamis dari kas/bank pengeluaran
          is_system: 1,
          is_dynamic_account: 1,
          linked_feature_note: 'Jurnal otomatis saat pengembalian dana pembatalan calon murid dicairkan'
        });
      }
    }
  }
};

exports.down = async function(knex) {
  // 1. Delete transaction rules
  await knex('transaction_account_mappings')
    .whereIn('transaction_code', ['ppdb_bill_issued', 'ppdb_refund_issued'])
    .del();

  // 2. Drop tables
  await knex.schema.dropTableIfExists('ppdb_scholarship_quotas');
  await knex.schema.dropTableIfExists('ppdb_refund_policy_rules');
  await knex.schema.dropTableIfExists('ppdb_bill_revisions');

  // 3. Drop columns from ppdb_registration_bills
  const hasBillsTable = await knex.schema.hasTable('ppdb_registration_bills');
  if (hasBillsTable) {
    await knex.raw('ALTER TABLE ppdb_registration_bills DROP FOREIGN KEY fk_ppdb_bills_parent');
    await knex.schema.alterTable('ppdb_registration_bills', function(table) {
      table.dropColumns([
        'academic_year_id',
        'version',
        'paid_amount',
        'discount_type',
        'discount_amount',
        'discount_percentage',
        'discount_sk_number',
        'discount_sk_date',
        'discount_sk_document_url',
        'discount_reason',
        'approval_tier',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'billing_phase',
        'installment_number',
        'installment_total',
        'parent_bill_id',
        'is_installment_parent',
        'scholarship_quota_id',
        'refund_status',
        'refund_amount',
        'refund_bank_account_number',
        'refund_bank_account_holder',
        'refund_reason',
        'refund_approved_by',
        'refund_processed_at'
      ]);
    });
    await knex.raw(`
      ALTER TABLE ppdb_registration_bills
      MODIFY COLUMN status ENUM('unpaid', 'paid', 'cancelled')
      NOT NULL DEFAULT 'unpaid'
    `);
  }
};
