/**
 * Migration: create_student_class_history_table
 * Modul Akademik - Riwayat Rombel Siswa (Append-Only Lifecycle Audit Trail)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('student_class_history', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable();
    table.bigInteger('academic_year_id').unsigned().notNullable();
    table.bigInteger('class_group_id').unsigned().notNullable();
    table.bigInteger('grade_level_id').unsigned().notNullable();
    table.enum('enrollment_type', ['psb_placement', 'promotion', 'transfer', 'manual']).notNullable().defaultTo('manual');
    table.string('decision', 100).nullable(); // Mis. "Naik ke Kelas 8", "Tinggal Kelas", "Penempatan Santri Baru", "Mutasi Masuk"
    table.timestamp('recorded_at').defaultTo(knex.fn.now());
    table.string('recorded_by', 100).nullable();

    table.index(['student_id'], 'idx_sch_student');
    table.index(['academic_year_id', 'class_group_id'], 'idx_sch_acad_class');
    table.index(['grade_level_id'], 'idx_sch_grade');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('student_class_history');
};
