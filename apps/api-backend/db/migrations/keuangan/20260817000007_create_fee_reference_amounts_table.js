/**
 * Migration: create_fee_reference_amounts_table
 * Modul Keuangan - Fitur #6: Nominal Biaya Acuan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('fee_reference_amounts', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('fee_type_id').unsigned().notNullable()
      .references('id').inTable('fee_types')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('grade_level_id').unsigned().notNullable();
    table.decimal('reference_amount', 18, 2).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['fee_type_id', 'school_unit_id', 'grade_level_id'], 'uq_fra');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('fee_reference_amounts');
};
