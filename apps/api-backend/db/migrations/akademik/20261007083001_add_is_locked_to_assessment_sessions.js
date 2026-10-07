/**
 * Migration: Add is_locked, locked_at, locked_by_employee_id to assessment_sessions
 * Modul: Akademik
 */
exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('assessment_sessions', 'is_locked');
  if (!hasCol) {
    await knex.schema.table('assessment_sessions', (t) => {
      t.boolean('is_locked').defaultTo(false).index().comment('Status penguncian oleh kurikulum');
      t.timestamp('locked_at').nullable();
      t.integer('locked_by_employee_id').nullable().index();
    });
  }
};

exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('assessment_sessions', 'is_locked');
  if (hasCol) {
    await knex.schema.table('assessment_sessions', (t) => {
      t.dropColumn('locked_by_employee_id');
      t.dropColumn('locked_at');
      t.dropColumn('is_locked');
    });
  }
};
