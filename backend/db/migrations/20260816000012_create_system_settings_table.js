/**
 * Migration: create_system_settings_table
 * Fitur #8: Pengaturan Sistem (Site Settings & Multi-Unit Override)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('system_settings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable()
      .references('id').inTable('school_units')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('setting_key', 150).notNullable();
    table.text('setting_value').nullable();
    table.string('description', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'setting_key'], 'uq_system_settings');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('system_settings');
};
