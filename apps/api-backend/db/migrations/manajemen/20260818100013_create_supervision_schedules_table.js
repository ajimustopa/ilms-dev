/**
 * Migration: create_supervision_schedules_table
 * Modul Manajemen - Fitur #197: Jadwal Supervisi Akademik & Manajerial
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('supervision_schedules', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('supervisor_employee_id').unsigned().notNullable();
    table.bigInteger('supervised_employee_id').unsigned().notNullable();
    table.enum('supervision_type', ['akademik', 'manajerial']).notNullable();
    table.bigInteger('class_group_id').unsigned().nullable();
    table.date('scheduled_date').notNullable();
    table.enum('status', ['scheduled', 'done', 'cancelled']).notNullable().defaultTo('scheduled');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_ss_school_unit');
    table.index(['supervisor_employee_id'], 'idx_ss_supervisor');
    table.index(['supervised_employee_id'], 'idx_ss_supervised');
    table.index(['scheduled_date'], 'idx_ss_date');
    table.index(['status'], 'idx_ss_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('supervision_schedules');
};
