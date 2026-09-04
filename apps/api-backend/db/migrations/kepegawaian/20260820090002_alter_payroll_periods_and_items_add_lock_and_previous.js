/**
 * Migration: alter_payroll_periods_and_items_add_lock_and_previous
 * Modul Kepegawaian - Menambahkan status 'locked' dan kolom penguncian pada payroll_periods, serta previous_data pada payroll_items
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Ubah enum status dan tambah kolom locked_by/locked_at pada payroll_periods
  await knex.schema.alterTable('payroll_periods', (table) => {
    table.dropColumn('status');
  });

  await knex.schema.alterTable('payroll_periods', (table) => {
    table.enum('status', ['draft', 'calculated', 'verified', 'locked', 'sent_to_finance'])
      .notNullable()
      .defaultTo('draft');
    table.bigInteger('locked_by').unsigned().nullable();
    table.timestamp('locked_at').nullable();
  });

  // 2. Tambah kolom previous_data pada payroll_items
  await knex.schema.alterTable('payroll_items', (table) => {
    table.json('previous_data').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  try {
    await knex.schema.alterTable('payroll_items', (table) => {
      table.dropColumn('previous_data');
    });

    await knex.schema.alterTable('payroll_periods', (table) => {
      table.dropColumn('locked_at');
      table.dropColumn('locked_by');
      table.dropColumn('status');
    });

    await knex.schema.alterTable('payroll_periods', (table) => {
      table.enum('status', ['draft', 'calculated', 'verified', 'sent_to_finance'])
        .notNullable()
        .defaultTo('draft');
    });
  } catch (e) {}
};
