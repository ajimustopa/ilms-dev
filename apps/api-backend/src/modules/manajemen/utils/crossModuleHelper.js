/**
 * Cross-Module Verification Helper for Manajemen Module
 * Validates external IDs (employees, students) in-process without physical foreign keys
 */
const dbKepegawaian = require('../../../config/db/kepegawaian');
const dbAkademik = require('../../../config/db/akademik');

function getSchoolUnitId(req) {
  const rawId =
    req.headers?.['x-school-unit-id'] ||
    req.query?.school_unit_id ||
    req.params?.school_unit_id ||
    req.body?.school_unit_id ||
    req.user?.school_unit_id ||
    req.user?.school_roles?.[0]?.school_unit_id ||
    null;
  return rawId ? Number(rawId) : 1;
}

function getUserId(req) {
  return req.user?.id || req.user?.sub || 1;
}

async function validateEmployee(employeeId) {
  const id = Number(employeeId);
  if (!id) return null;

  try {
    const employee = await dbKepegawaian('employees').where({ id }).first();
    if (!employee) {
      const err = new Error(`Pegawai dengan ID ${id} tidak ditemukan di modul Kepegawaian`);
      err.statusCode = 404;
      throw err;
    }
    return employee;
  } catch (err) {
    if (err.statusCode) throw err;
    console.warn(`[Manajemen CrossModule] Gagal memvalidasi pegawai ${id}:`, err.message);
    return { id, full_name: `Pegawai #${id}` };
  }
}

async function validateStudent(studentId) {
  const id = Number(studentId);
  if (!id) return null;

  try {
    const student = await dbAkademik('students').where({ id }).first();
    if (!student) {
      const err = new Error(`Siswa dengan ID ${id} tidak ditemukan di modul Akademik`);
      err.statusCode = 404;
      throw err;
    }
    return student;
  } catch (err) {
    if (err.statusCode) throw err;
    console.warn(`[Manajemen CrossModule] Gagal memvalidasi siswa ${id}:`, err.message);
    return { id, full_name: `Siswa #${id}` };
  }
}

module.exports = {
  getSchoolUnitId,
  getUserId,
  validateEmployee,
  validateStudent,
};
