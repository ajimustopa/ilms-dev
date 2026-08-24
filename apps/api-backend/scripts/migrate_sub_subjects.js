/**
 * Migration adding parent_subject_id and jp_allocation_mode to subjects table
 */
const db = require('../src/config/db/akademik');

async function up() {
  console.log('--- Migrating Sub-Subjects Support ---');

  const hasParentId = await db.schema.hasColumn('subjects', 'parent_subject_id');
  if (!hasParentId) {
    await db.schema.alterTable('subjects', (t) => {
      t.integer('parent_subject_id').nullable().index().comment('ID mapel induk jika ini adalah sub-mapel');
    });
    console.log('Added parent_subject_id to subjects table');
  }

  const hasJpMode = await db.schema.hasColumn('subjects', 'jp_allocation_mode');
  if (!hasJpMode) {
    await db.schema.alterTable('subjects', (t) => {
      t.string('jp_allocation_mode', 30).defaultTo('standalone').comment('standalone | included_in_parent | separate');
    });
    console.log('Added jp_allocation_mode to subjects table');
  }

  console.log('--- Sub-Subjects Migration Finished Successfully ---');
}

up().then(() => process.exit(0)).catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
