/**
 * Script untuk mengosongkan seluruh data pegawai dan tabel-tabel anak terkait
 */
const dbKepegawaian = require('../src/config/db/kepegawaian');
const dbCore = require('../src/config/db/core');

async function truncateEmployeeData() {
  console.log('--- Memulai pengosongan data pegawai ---');

  try {
    // 1. Bersihkan di database Kepegawaian
    await dbKepegawaian.raw('SET FOREIGN_KEY_CHECKS = 0;');

    const tablesToClear = [
      'employee_addresses',
      'employee_school_assignments',
      'employee_education_trainings',
      'employee_family_members',
      'employee_publications',
      'employee_work_experiences',
      'employee_warning_letters',
      'employee_organization_activities',
      'employee_document_checklists',
      'employee_bank_accounts',
      'employee_retirement_plans',
      'employee_position_history',
      'employee_mutations',
      'employee_attendances',
      'employee_leave_requests',
      'employee_overtimes',
      'payroll_items',
      'performance_reviews',
      'employees'
    ];

    for (const table of tablesToClear) {
      try {
        await dbKepegawaian(table).truncate();
        console.log(`[OK] Tabel ${table} berhasil dikosongkan.`);
      } catch (err) {
        // Fallback to del() if truncate fails on foreign key
        try {
          await dbKepegawaian(table).del();
          console.log(`[OK] Tabel ${table} berhasil didelete.`);
        } catch (e) {
          console.warn(`[WARN] Gagal mengosongkan ${table}:`, e.message);
        }
      }
    }

    // Reset activated_employee_id pada recruitment_candidates jika ada
    try {
      await dbKepegawaian('recruitment_candidates').update({ activated_employee_id: null });
      console.log(`[OK] recruitment_candidates.activated_employee_id di-reset.`);
    } catch (e) {
      // Abaikan jika tabel belum ada
    }

    await dbKepegawaian.raw('SET FOREIGN_KEY_CHECKS = 1;');

    // 2. Bersihkan akun login staff di Core Service
    try {
      const staffUsers = await dbCore('users').where({ ref_type: 'staff' }).select('id');
      const staffUserIds = staffUsers.map(u => u.id);

      if (staffUserIds.length > 0) {
        await dbCore('user_school_roles').whereIn('user_id', staffUserIds).del();
        await dbCore('users').whereIn('id', staffUserIds).del();
        console.log(`[OK] ${staffUserIds.length} akun login staff Core Service berhasil dibersihkan.`);
      }
    } catch (err) {
      console.warn('[WARN] Gagal membersihkan akun staff di Core Service:', err.message);
    }

    console.log('--- Pengosongan data pegawai SELESAI DENGAN SUKSES! ---');
  } catch (error) {
    console.error('[ERROR] Terjadi kesalahan saat mengosongkan data:', error);
  } finally {
    await dbKepegawaian.destroy();
    await dbCore.destroy();
    process.exit(0);
  }
}

truncateEmployeeData();
