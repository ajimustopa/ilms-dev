/**
 * Migration: create_student_fee_adjustments_table
 * Modul Keuangan - Fitur #9: Penetapan Biaya Individual & Beasiswa/Keringanan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_fee_adjustments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('student_id').unsigned().notNullable();
    table.bigInteger('fee_type_id').unsigned().notNullable()
      .references('id').inTable('fee_types')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.enum('adjustment_kind', ['override_amount', 'waiver']).notNullable();
    table.decimal('override_amount', 18, 2).nullable();
    table.string('waiver_type', 100).nullable();
    table.decimal('waiver_percentage', 5, 2).nullable();
    table.decimal('waiver_amount', 18, 2).nullable();
    table.text('reason').nullable();
    table.enum('status', ['draft', 'submitted', 'approved', 'rejected']).notNullable().defaultTo('draft');
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approved_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'student_id'], 'idx_sfa_school_student');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_fee_adjustments');
};
