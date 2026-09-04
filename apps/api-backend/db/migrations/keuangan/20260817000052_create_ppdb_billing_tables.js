/**
 * Migration 52: Create PPDB Registration Billing & Payment Tables
 * Submodul: ppdb-billing (Tahap 15)
 */
exports.up = async function(knex) {
  // 1. Create table ppdb_registration_bills
  const hasBillsTable = await knex.schema.hasTable('ppdb_registration_bills');
  if (!hasBillsTable) {
    await knex.schema.createTable('ppdb_registration_bills', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.bigInteger('target_academic_year_id').unsigned().notNullable();
      table.bigInteger('psb_registrant_ref_id').unsigned().notNullable();
      table.string('registrant_name_snapshot', 150).notNullable();
      table.string('registration_number_snapshot', 50).nullable();
      table.bigInteger('fee_type_id').unsigned().notNullable();
      table.decimal('amount', 18, 2).notNullable();
      table.enum('status', ['unpaid', 'paid', 'cancelled']).notNullable().defaultTo('unpaid');
      table.bigInteger('linked_student_id').unsigned().nullable();
      table.text('notes').nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamps(true, true);

      // Indexes
      table.index(['school_unit_id'], 'idx_ppdb_bills_unit');
      table.index(['target_academic_year_id'], 'idx_ppdb_bills_target_ay');
      table.index(['psb_registrant_ref_id'], 'idx_ppdb_bills_registrant_ref');
      table.index(['linked_student_id'], 'idx_ppdb_bills_linked_student');
      table.index(['status'], 'idx_ppdb_bills_status');
      table.unique(
        ['school_unit_id', 'psb_registrant_ref_id', 'fee_type_id'],
        'uq_ppdb_bills_unit_reg_fee'
      );
    });
  }

  // 2. Create table ppdb_registration_payments
  const hasPaymentsTable = await knex.schema.hasTable('ppdb_registration_payments');
  if (!hasPaymentsTable) {
    await knex.schema.createTable('ppdb_registration_payments', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('ppdb_registration_bill_id').unsigned().notNullable();
      table.bigInteger('cash_account_id').unsigned().notNullable();
      table.string('receipt_number', 50).notNullable().unique();
      table.decimal('amount_paid', 18, 2).notNullable();
      table.date('payment_date').notNullable();
      table.enum('payment_method', ['cash', 'bank_transfer', 'payment_gateway']).notNullable().defaultTo('cash');
      table.text('notes').nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamps(true, true);

      // Foreign Key & Indexes
      table.foreign('ppdb_registration_bill_id')
        .references('id')
        .inTable('ppdb_registration_bills')
        .onDelete('CASCADE');

      table.index(['cash_account_id'], 'idx_ppdb_payments_cash_acc');
      table.index(['payment_date'], 'idx_ppdb_payments_date');
    });
  }

  // 3. Insert system transaction rule for ppdb_registration_income in transaction_account_mappings
  const hasMappingTable = await knex.schema.hasTable('transaction_account_mappings');
  if (hasMappingTable) {
    const units = [1, 2];
    for (const unitId of units) {
      const existing = await knex('transaction_account_mappings')
        .where({ school_unit_id: unitId, transaction_code: 'ppdb_registration_income' })
        .first();

      if (!existing) {
        await knex('transaction_account_mappings').insert({
          school_unit_id: unitId,
          transaction_code: 'ppdb_registration_income',
          transaction_label: 'Penerimaan Biaya Pendaftaran PPDB',
          is_system: 1,
          is_dynamic_account: 1,
          linked_feature_note: 'Jurnal otomatis saat pembayaran pendaftaran PPDB calon murid dicatat'
        });
      }
    }
  }
};

exports.down = async function(knex) {
  // Delete transaction rules
  await knex('transaction_account_mappings')
    .where({ transaction_code: 'ppdb_registration_income' })
    .del();

  // Drop tables
  await knex.schema.dropTableIfExists('ppdb_registration_payments');
  await knex.schema.dropTableIfExists('ppdb_registration_bills');
};
