/**
 * Migration: create_teaching_journals_table
 * Modul Akademik - Jurnal Mengajar Guru (KBM Harian, Pertemuan ke-N, Topik & Rujukan TP)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('teaching_journals');
  if (!hasTable) {
    await knex.schema.createTable('teaching_journals', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('schedule_id').unsigned().notNullable()
        .references('id').inTable('subject_schedules').onDelete('CASCADE');
      table.date('teaching_date').notNullable();
      table.integer('meeting_number').unsigned().notNullable().defaultTo(1);
      table.text('topic_material').notNullable();
      table.bigInteger('learning_objective_id').unsigned().nullable()
        .references('id').inTable('learning_objectives').onDelete('SET NULL');
      table.text('general_notes').nullable();
      table.bigInteger('teacher_employee_id').unsigned().notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.unique(['schedule_id', 'teaching_date'], 'uq_teaching_journals_schedule_date');
      table.index(['schedule_id', 'teaching_date'], 'idx_tj_schedule_date');
      table.index(['teacher_employee_id', 'teaching_date'], 'idx_tj_teacher_date');
      table.index(['learning_objective_id'], 'idx_tj_learning_objective');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('teaching_journals');
};
