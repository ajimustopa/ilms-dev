/**
 * Migration: expand_attendance_period_locks_lifecycle
 * Modul Kepegawaian - Siklus Lengkap Penutupan & Penguncian Periode Presensi (Open -> Review -> Locked -> Submitted to Payroll)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('attendance_period_locks');
  if (hasTable) {
    // 1. Ubah kolom status menjadi VARCHAR(30) agar mendukung semua siklus status tanpa batasan enum strict
    await knex.schema.alterTable('attendance_period_locks', (table) => {
      table.string('status', 30).defaultTo('open').alter();
    });

    // 2. Tambah kolom pembukaan kunci (Unlock)
    const hasUnlockedBy = await knex.schema.hasColumn('attendance_period_locks', 'unlocked_by');
    if (!hasUnlockedBy) {
      await knex.schema.alterTable('attendance_period_locks', (table) => {
        table.bigInteger('unlocked_by').unsigned().nullable();
        table.timestamp('unlocked_at').nullable();
        table.text('unlock_reason').nullable();
      });
    }

    // 3. Tambah kolom serah terima ke payroll
    const hasSubmittedToPayroll = await knex.schema.hasColumn('attendance_period_locks', 'submitted_to_payroll_at');
    if (!hasSubmittedToPayroll) {
      await knex.schema.alterTable('attendance_period_locks', (table) => {
        table.timestamp('submitted_to_payroll_at').nullable();
        table.bigInteger('submitted_to_payroll_by').unsigned().nullable();
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('attendance_period_locks');
  if (hasTable) {
    await knex.schema.alterTable('attendance_period_locks', (table) => {
      table.dropColumn('unlocked_by');
      table.dropColumn('unlocked_at');
      table.dropColumn('unlock_reason');
      table.dropColumn('submitted_to_payroll_at');
      table.dropColumn('submitted_to_payroll_by');
    });
  }
};
