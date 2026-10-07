/**
 * Cleaner Data Uji HRD [DATA_UJI_HRD]
 * Menghapus data uji fiktif dari core_dev dan kepegawaian_dev
 */
const { assertDevDatabase } = require('../../../../config/db/dbGuard');

async function cleanDataUji(coreDb, kepDb) {
  assertDevDatabase(coreDb.client.connectionSettings, 'CLEAN_DATA_UJI_CORE');
  assertDevDatabase(kepDb.client.connectionSettings, 'CLEAN_DATA_UJI_KEPEGAWAIAN');

  console.log('[CLEAN DATA_UJI_HRD] Cleaning test employees and test users...');

  // 1. Clean transactions
  await kepDb('approval_steps').where('entity_id', '>=', 1).del().catch(() => {});
  await kepDb('leave_ledger_entries').where('employee_id', '>=', 1).del().catch(() => {});
  await kepDb('employee_leave_balances').where('employee_id', '>=', 1).del().catch(() => {});
  await kepDb('employee_leave_requests').where('employee_id', '>=', 1).del().catch(() => {});
  await kepDb('employee_overtimes').where('employee_id', '>=', 1).del().catch(() => {});
  await kepDb('employee_attendances').where('employee_id', '>=', 1).del().catch(() => {});
  await kepDb('school_unit_approvers').where('school_unit_id', 1).del().catch(() => {});

  // 2. Clean test employees 1-12
  await kepDb('employees').whereIn('id', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).del().catch(() => {});

  // 3. Clean test users
  await coreDb('user_school_roles').whereIn('user_id', [1, 2, 3, 4, 5, 6]).del().catch(() => {});
  await coreDb('users').whereIn('id', [1, 2, 3, 4, 5, 6]).del().catch(() => {});

  console.log('[CLEAN DATA_UJI_HRD] Cleaned successfully.');
}

module.exports = { cleanDataUji };
