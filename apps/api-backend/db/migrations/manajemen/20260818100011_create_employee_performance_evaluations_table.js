/**
 * Migration: create_employee_performance_evaluations_table
 * Modul Manajemen - Fitur #194: Evaluasi Kinerja Pegawai Lanjutan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employee_performance_evaluations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('base_performance_review_id').unsigned().nullable();
    table.bigInteger('evaluator_employee_id').unsigned().notNullable();
    table.string('period', 20).notNullable();
    table.decimal('total_score', 5, 2).nullable();
    table.enum('category', ['sangat_baik', 'baik', 'cukup', 'kurang']).nullable();
    table.enum('status', ['draft', 'submitted', 'approved']).notNullable().defaultTo('draft');
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['employee_id', 'period'], 'uq_epe');
    table.index(['school_unit_id'], 'idx_epe_school_unit');
    table.index(['evaluator_employee_id'], 'idx_epe_evaluator');
    table.index(['status'], 'idx_epe_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employee_performance_evaluations');
};
