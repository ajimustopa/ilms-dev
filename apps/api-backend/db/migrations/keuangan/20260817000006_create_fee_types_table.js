/**
 * Migration: create_fee_types_table
 * Modul Keuangan - Fitur #5: Master Jenis Biaya Pendidikan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('fee_types', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('fee_group_id').unsigned().nullable()
      .references('id').inTable('fee_groups')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('name', 150).notNullable();
    table.enum('billing_pattern', ['monthly', 'yearly', 'incidental']).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_fee_types_school_unit');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('fee_types');
};
