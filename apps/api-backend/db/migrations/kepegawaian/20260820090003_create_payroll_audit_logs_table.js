/**
 * Migration: create_payroll_audit_logs_table
 * Modul Kepegawaian - Tabel audit log perubahan payroll (siklus penetapan, koreksi, penguncian, pengiriman)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('payroll_audit_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('payroll_period_id').unsigned().notNullable()
      .references('id').inTable('payroll_periods')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('payroll_item_id').unsigned().nullable();
    table.string('action', 50).notNullable(); // CREATE_PERIOD, CALCULATE, EDIT_ITEM, VERIFY_ITEM, LOCK_PERIOD, SEND_TO_FINANCE
    table.bigInteger('performed_by').unsigned().nullable();
    table.json('data_before').nullable();
    table.json('data_after').nullable();
    table.text('reason').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['payroll_period_id'], 'idx_pal_period');
    table.index(['payroll_item_id'], 'idx_pal_item');
    table.index(['action'], 'idx_pal_action');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('payroll_audit_logs');
};
