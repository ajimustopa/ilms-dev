/**
 * Migration: add_entry_academic_year_to_students
 * Modul Akademik - Menambahkan entry_academic_year_id pada tabel students
 */
exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('students', 'entry_academic_year_id');
  if (!hasColumn) {
    await knex.schema.alterTable('students', (table) => {
      table.bigInteger('entry_academic_year_id').unsigned().nullable().after('status');
      table.index(['entry_academic_year_id'], 'idx_students_entry_ay');
    });
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('students', 'entry_academic_year_id');
  if (hasColumn) {
    await knex.schema.alterTable('students', (table) => {
      table.dropIndex(['entry_academic_year_id'], 'idx_students_entry_ay');
      table.dropColumn('entry_academic_year_id');
    });
  }
};
