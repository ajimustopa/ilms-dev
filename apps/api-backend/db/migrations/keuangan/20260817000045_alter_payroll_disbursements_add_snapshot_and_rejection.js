/**
 * Migration: alter_payroll_disbursements_add_snapshot_and_rejection
 * Modul Keuangan - Menambahkan breakdown_snapshot, rejection fields, dan source_payroll_period_id pada payroll_disbursements
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Modifikasi enum status
  await knex.schema.alterTable('payroll_disbursements', (table) => {
    table.dropColumn('status');
  });

  await knex.schema.alterTable('payroll_disbursements', (table) => {
    table.enum('status', ['pending', 'disbursed', 'failed', 'rejected'])
      .notNullable()
      .defaultTo('pending');
    table.json('breakdown_snapshot').nullable();
    table.text('rejection_reason').nullable();
    table.timestamp('rejected_at').nullable();
    table.bigInteger('rejected_by').unsigned().nullable();
    table.bigInteger('source_payroll_period_id').unsigned().nullable();

    table.index(['status'], 'idx_pd_status');
    table.index(['source_payroll_period_id'], 'idx_pd_source_period');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  try {
    await knex.schema.alterTable('payroll_disbursements', (table) => {
      table.dropColumn('source_payroll_period_id');
      table.dropColumn('rejected_by');
      table.dropColumn('rejected_at');
      table.dropColumn('rejection_reason');
      table.dropColumn('breakdown_snapshot');
      table.dropColumn('status');
    });

    await knex.schema.alterTable('payroll_disbursements', (table) => {
      table.enum('status', ['pending', 'disbursed', 'failed'])
        .notNullable()
        .defaultTo('pending');
    });
  } catch (e) {}
};
