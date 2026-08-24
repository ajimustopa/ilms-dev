/**
 * Migration: create_employee_account_status_logs_table
 * Modul Kepegawaian - Riwayat Perubahan Status Akun Pegawai (Active, Inactive, Resigned, Retired)
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('employee_account_status_logs');
  if (!hasTable) {
    await knex.schema.createTable('employee_account_status_logs', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('employee_id').unsigned().notNullable()
        .references('id').inTable('employees').onDelete('CASCADE');
      table.string('previous_status', 30).notNullable();
      table.string('new_status', 30).notNullable();
      table.date('effective_date').nullable();
      table.text('reason').notNullable();
      table.bigInteger('changed_by_user_id').unsigned().nullable();
      table.string('changed_by_name', 150).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['employee_id'], 'idx_emp_status_logs_emp_id');
      table.index(['created_at'], 'idx_emp_status_logs_created_at');
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('employee_account_status_logs');
};
