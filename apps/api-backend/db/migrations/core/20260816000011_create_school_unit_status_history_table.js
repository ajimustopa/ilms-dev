/**
 * Migration: create_school_unit_status_history_table
 * Fitur #7: Riwayat Perubahan Status Satuan Pendidikan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('school_unit_status_history', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable()
      .references('id').inTable('school_units')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.boolean('new_status').notNullable();
    table.text('reason').nullable();
    table.bigInteger('changed_by').unsigned().notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('changed_at').notNullable().defaultTo(knex.fn.now());

    table.index(['school_unit_id'], 'idx_susth_school_unit');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('school_unit_status_history');
};
