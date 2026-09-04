/**
 * Migration: alter_bill_reminder_logs_add_details
 * Modul Keuangan - Menambahkan detail pesan, penerima, dan status pengiriman pada log reminder
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasMsg = await knex.schema.hasColumn('bill_reminder_logs', 'message');
  if (!hasMsg) {
    await knex.schema.alterTable('bill_reminder_logs', (table) => {
      table.string('recipient_name', 150).nullable().after('channel');
      table.string('phone_or_email', 100).nullable().after('recipient_name');
      table.text('message').nullable().after('phone_or_email');
      table.string('status', 30).notNullable().defaultTo('delivered').after('message');
      table.bigInteger('created_by').unsigned().nullable().after('status');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasMsg = await knex.schema.hasColumn('bill_reminder_logs', 'message');
  if (hasMsg) {
    await knex.schema.alterTable('bill_reminder_logs', (table) => {
      table.dropColumn('created_by');
      table.dropColumn('status');
      table.dropColumn('message');
      table.dropColumn('phone_or_email');
      table.dropColumn('recipient_name');
    });
  }
};
