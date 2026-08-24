/**
 * Migration for Subject is_active status and subject_audit_logs table
 */
const db = require('../src/config/db/akademik');

async function up() {
  console.log('--- Migrating Subject is_active and Audit Logs ---');

  // 1. Add is_active column to subjects table
  const hasIsActive = await db.schema.hasColumn('subjects', 'is_active');
  if (!hasIsActive) {
    await db.schema.alterTable('subjects', (t) => {
      t.boolean('is_active').defaultTo(true).notNullable().index().comment('Status aktif mata pelajaran');
    });
    console.log('Added is_active column to subjects table');
  }

  // 2. Create subject_audit_logs table
  const hasAuditLogs = await db.schema.hasTable('subject_audit_logs');
  if (!hasAuditLogs) {
    await db.schema.createTable('subject_audit_logs', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').nullable().index();
      t.integer('subject_id').notNullable().index();
      t.string('action', 50).notNullable().comment('create | update | toggle_status | delete');
      t.boolean('previous_status').nullable();
      t.boolean('new_status').nullable();
      t.text('reason').nullable().comment('Alasan/keterangan perubahan status');
      t.integer('user_id').nullable();
      t.string('user_name').nullable();
      t.json('meta_data').nullable();
      t.timestamps(true, true);
    });
    console.log('Created subject_audit_logs table');
  }

  console.log('--- Migration Finished Successfully ---');
}

up().then(() => process.exit(0)).catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
