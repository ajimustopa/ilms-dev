/**
 * External References Stub Helper for Dapur Module
 *
 * Catatan:
 * Modul Dapur memiliki relasi logis tanpa FK fisik langsung ke modul lain
 * (Kepegawaian untuk staff/pic, Akademik untuk siswa/kelompok santri, Keuangan untuk pos anggaran).
 *
 * File ini menyediakan helper/stub resolver sementara agar modul Dapur
 * dapat dikembangkan, diuji, dan dijalankan end-to-end tanpa blocking.
 */

// TODO [INTEGRASI LINTAS MODUL]:
// Ganti pemanggilan stub di bawah ini dengan pemanggilan internal service/RPC yang sesungguhnya:
// 1. Kepegawaian Internal Service: getEmployeeBrief(picId) / getStaffUser(coreUserId)
// 2. Akademik Internal Service: getStudentBrief(studentId) / getStudentGroup(groupId)
// 3. Keuangan Internal Service: getBudgetAccount(financeRefId)

/**
 * Mendapatkan nama atau profil ringkas staf dapur / pegawai
 * @param {number|string} staffRefId - ID pegawai (Kepegawaian) atau core_user_id (Core Service)
 * @returns {Promise<{ id: number, name: string, role: string }>}
 */
async function getStaffName(staffRefId) {
  if (!staffRefId) return null;
  const id = Number(staffRefId);

  try {
    // TODO: Ganti dengan require('../../kepegawaian/internal/service') jika sudah terintegrasi
    return {
      id,
      name: `Staf #${id}`,
      role: 'Petugas Dapur',
    };
  } catch (err) {
    // Fallback data dummy
    return {
      id,
      name: `Staf #${id}`,
      role: 'Petugas Dapur',
    };
  }
}

/**
 * Mendapatkan nama kelompok santri / asrama / rombel
 * @param {number|string} groupRefId - ID kelompok santri (kitchen_student_groups atau ref Akademik)
 * @returns {Promise<{ id: number, name: string, group_type: string }>}
 */
async function getStudentGroupName(groupRefId) {
  if (!groupRefId) return null;
  const id = Number(groupRefId);

  try {
    // TODO: Ganti dengan require('../../akademik/internal/service') jika mengambil rombel/kelas riil
    return {
      id,
      name: `Kelompok #${id}`,
      group_type: 'asrama',
    };
  } catch (err) {
    return {
      id,
      name: `Kelompok #${id}`,
      group_type: 'asrama',
    };
  }
}

/**
 * Mendapatkan data ringkas santri / siswa
 * @param {number|string} studentRefId - ID santri dari modul Akademik
 * @returns {Promise<{ id: number, name: string, nis: string, class_name: string }>}
 */
async function getStudentBrief(studentRefId) {
  if (!studentRefId) return null;
  const id = Number(studentRefId);

  try {
    // TODO: Ganti dengan pemanggilan akademikInternalService.getStudentBrief(id)
    return {
      id,
      name: `Santri #${id}`,
      nis: `NIS-${id.toString().padStart(4, '0')}`,
      class_name: `Kelas ${id}`,
    };
  } catch (err) {
    return {
      id,
      name: `Santri #${id}`,
      nis: `NIS-${id}`,
      class_name: 'Asrama',
    };
  }
}

/**
 * Mendapatkan referensi pos anggaran keuangan
 * @param {number|string} financeRefId - ID pos anggaran dari modul Keuangan
 * @returns {Promise<{ id: number, account_code: string, account_name: string }>}
 */
async function getFinanceAccount(financeRefId) {
  if (!financeRefId) return null;
  const id = Number(financeRefId);

  try {
    // TODO: Ganti dengan pemanggilan keuanganInternalService.getAccount(id)
    return {
      id,
      account_code: `ACC-${id}`,
      account_name: `Pos Anggaran Dapur #${id}`,
    };
  } catch (err) {
    return {
      id,
      account_code: `ACC-${id}`,
      account_name: `Pos Anggaran Dapur #${id}`,
    };
  }
}

module.exports = {
  getStaffName,
  getStudentGroupName,
  getStudentBrief,
  getFinanceAccount,
};
