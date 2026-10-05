/**
 * Migration: expand_psb_schema_quotas_withdrawals_refunds
 * Modul PSB - Penambahan Kuota Rombel (L/P), Pengunduran Diri, Kebijakan Refund, dan Perluasan Biodata Pendaftar
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Alter psb_processes: tambah target_academic_year_id
  const hasTargetAyId = await knex.schema.hasColumn('psb_processes', 'target_academic_year_id');
  if (!hasTargetAyId) {
    await knex.schema.alterTable('psb_processes', (table) => {
      table.bigInteger('target_academic_year_id').unsigned().nullable().after('target_academic_year');
      table.index(['target_academic_year_id'], 'idx_psb_proc_ay_id');
    });
  }

  // 2. Buat tabel psb_process_class_quotas (Kuota per Satuan Pendidikan per Rombel L/P)
  const hasClassQuotasTable = await knex.schema.hasTable('psb_process_class_quotas');
  if (!hasClassQuotasTable) {
    await knex.schema.createTable('psb_process_class_quotas', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('psb_process_id').unsigned().notNullable()
        .references('id').inTable('psb_processes').onDelete('CASCADE');
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.bigInteger('class_group_id').unsigned().notNullable()
        .references('id').inTable('class_groups').onDelete('CASCADE');
      table.smallint('quota_male').unsigned().notNullable().defaultTo(0);
      table.smallint('quota_female').unsigned().notNullable().defaultTo(0);
      table.smallint('total_quota').unsigned().notNullable().defaultTo(0);
      table.string('notes', 255).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.unique(['psb_process_id', 'class_group_id'], 'uq_psb_proc_class');
      table.index(['satuan_pendidikan_id'], 'idx_psb_quota_satuan');
      table.index(['class_group_id'], 'idx_psb_quota_class');
    });
  }

  // 3. Alter psb_groups: tambah wave_number, registration_path, fee_scheme_id, registration_fee_amount
  const hasWaveNumber = await knex.schema.hasColumn('psb_groups', 'wave_number');
  if (!hasWaveNumber) {
    await knex.schema.alterTable('psb_groups', (table) => {
      table.tinyint('wave_number').unsigned().notNullable().defaultTo(1).after('name');
      table.enu('registration_path', ['reguler', 'prestasi', 'afirmasi', 'pindahan']).notNullable().defaultTo('reguler').after('wave_number');
      table.bigInteger('fee_scheme_id').unsigned().nullable().after('registration_path');
      table.decimal('registration_fee_amount', 18, 2).notNullable().defaultTo(0.00).after('fee_scheme_id');
    });
  }

  // 4. Alter psb_registrants: tambah gender, previous_school_address, target_class_group_id, birth details
  const hasGender = await knex.schema.hasColumn('psb_registrants', 'gender');
  if (!hasGender) {
    await knex.schema.alterTable('psb_registrants', (table) => {
      table.enu('gender', ['L', 'P']).nullable().after('full_name');
      table.text('previous_school_address').nullable().after('previous_school_name');
      table.bigInteger('target_class_group_id').unsigned().nullable().after('requested_grade_level_id')
        .references('id').inTable('class_groups').onDelete('SET NULL');
      table.string('birth_place', 100).nullable().after('gender');
      table.date('birth_date').nullable().after('birth_place');
      table.string('parent_nik', 20).nullable().after('mother_name');
      table.string('parent_occupation', 100).nullable().after('parent_nik');
    });
  }

  // 5. Buat tabel psb_refund_policies (Master Kebijakan Persentase Refund per Satuan / Program)
  const hasRefundPoliciesTable = await knex.schema.hasTable('psb_refund_policies');
  if (!hasRefundPoliciesTable) {
    await knex.schema.createTable('psb_refund_policies', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.bigInteger('psb_process_id').unsigned().nullable()
        .references('id').inTable('psb_processes').onDelete('CASCADE');
      table.enu('fee_category', ['registration_fee', 'enrollment_fee']).notNullable();
      table.integer('days_before_cutoff').notNullable().defaultTo(0);
      table.decimal('refund_percentage', 5, 2).notNullable().defaultTo(0.00);
      table.decimal('admin_fee_deduction', 18, 2).notNullable().defaultTo(0.00);
      table.string('description', 255).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['satuan_pendidikan_id', 'fee_category'], 'idx_psb_refund_pol_satuan');
      table.index(['psb_process_id'], 'idx_psb_refund_pol_proc');
    });
  }

  // 6. Buat tabel psb_withdrawals (Pencatatan Siswa Mengundurkan Diri & Permohonan Refund)
  const hasWithdrawalsTable = await knex.schema.hasTable('psb_withdrawals');
  if (!hasWithdrawalsTable) {
    await knex.schema.createTable('psb_withdrawals', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('psb_registrant_id').unsigned().notNullable()
        .references('id').inTable('psb_registrants').onDelete('CASCADE');
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.date('withdrawal_date').notNullable();
      table.enu('reason_category', ['negeri', 'ekonomi', 'domisili', 'kesehatan', 'pondok', 'lainnya']).notNullable().defaultTo('lainnya');
      table.text('reason_detail').nullable();
      table.string('supporting_doc_url', 255).nullable();
      table.boolean('refund_requested').notNullable().defaultTo(false);
      table.decimal('refund_amount', 18, 2).notNullable().defaultTo(0.00);
      table.string('refund_bank_name', 100).nullable();
      table.string('refund_account_number', 50).nullable();
      table.string('refund_account_holder', 150).nullable();
      table.enu('status', ['submitted', 'approved', 'rejected', 'processed']).notNullable().defaultTo('submitted');
      table.bigInteger('approved_by').unsigned().nullable();
      table.datetime('approved_at').nullable();
      table.bigInteger('processed_by').unsigned().nullable();
      table.datetime('processed_at').nullable();
      table.text('rejection_reason').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['psb_registrant_id'], 'idx_psb_withdr_reg');
      table.index(['satuan_pendidikan_id', 'status'], 'idx_psb_withdr_satuan_status');
    });
  }

  // 7. Buat tabel psb_status_logs (Riwayat Transisi Status Pendaftar - Append-Only)
  const hasStatusLogsTable = await knex.schema.hasTable('psb_status_logs');
  if (!hasStatusLogsTable) {
    await knex.schema.createTable('psb_status_logs', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('psb_registrant_id').unsigned().notNullable()
        .references('id').inTable('psb_registrants').onDelete('CASCADE');
      table.string('previous_status', 50).nullable();
      table.string('new_status', 50).notNullable();
      table.bigInteger('action_by_user_id').unsigned().nullable();
      table.string('action_by_name', 150).nullable();
      table.text('notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['psb_registrant_id'], 'idx_psb_log_reg');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('psb_status_logs');
  await knex.schema.dropTableIfExists('psb_withdrawals');
  await knex.schema.dropTableIfExists('psb_refund_policies');

  const hasGender = await knex.schema.hasColumn('psb_registrants', 'gender');
  if (hasGender) {
    await knex.schema.alterTable('psb_registrants', (table) => {
      table.dropForeign(['target_class_group_id']);
      table.dropColumn('target_class_group_id');
      table.dropColumn('previous_school_address');
      table.dropColumn('parent_occupation');
      table.dropColumn('parent_nik');
      table.dropColumn('birth_date');
      table.dropColumn('birth_place');
      table.dropColumn('gender');
    });
  }

  const hasWaveNumber = await knex.schema.hasColumn('psb_groups', 'wave_number');
  if (hasWaveNumber) {
    await knex.schema.alterTable('psb_groups', (table) => {
      table.dropColumn('registration_fee_amount');
      table.dropColumn('fee_scheme_id');
      table.dropColumn('registration_path');
      table.dropColumn('wave_number');
    });
  }

  await knex.schema.dropTableIfExists('psb_process_class_quotas');

  const hasTargetAyId = await knex.schema.hasColumn('psb_processes', 'target_academic_year_id');
  if (hasTargetAyId) {
    await knex.schema.alterTable('psb_processes', (table) => {
      table.dropIndex(['target_academic_year_id'], 'idx_psb_proc_ay_id');
      table.dropColumn('target_academic_year_id');
    });
  }
};
