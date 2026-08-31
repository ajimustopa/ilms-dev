/**
 * Migration: create_quality_goals_table
 * Modul Manajemen - Fitur 8: Sasaran Mutu
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('quality_goals', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('strategic_goal_id').unsigned().nullable();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.string('code', 50).notNullable().unique();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.string('quality_standard', 150).nullable();
    table.bigInteger('quality_indicator_id').unsigned().nullable();
    table.string('period', 50).notNullable().defaultTo('2026/2027');
    table.decimal('target_value', 12, 2).nullable();
    table.decimal('actual_value', 12, 2).nullable();
    table.decimal('achievement_percentage', 6, 2).nullable();
    table.bigInteger('pic_employee_id').unsigned().nullable();
    table.enum('status', ['achieved', 'pending', 'critical']).notNullable().defaultTo('pending');
    table.bigInteger('created_by').unsigned().nullable();
    table.bigInteger('updated_by').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.foreign('strategic_goal_id', 'fk_qg_sg')
      .references('id')
      .inTable('strategic_goals')
      .onDelete('SET NULL');

    table.foreign('quality_indicator_id', 'fk_qg_qi')
      .references('id')
      .inTable('quality_indicators')
      .onDelete('SET NULL');

    table.index(['school_unit_id'], 'idx_qg_school_unit');
    table.index(['period'], 'idx_qg_period');
    table.index(['status'], 'idx_qg_status');
    table.index(['quality_standard'], 'idx_qg_standard');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('quality_goals');
};
