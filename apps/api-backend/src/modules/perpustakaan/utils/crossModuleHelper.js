/**
 * Cross-Module Verification Helper for Perpustakaan Module
 * Validates external IDs (students, employees) in-process without physical foreign keys
 */
const dbAkademik = require('../../../config/db/akademik');
const dbKepegawaian = require('../../../config/db/kepegawaian');

/**
 * Mendapatkan school_unit_id aktif dari request context
 * @param {Object} req - Express request object
 * @returns {number|null}
 */
function getSchoolUnitId(req) {
  const rawId = req.headers?.['x-school-unit-id'] ||
                req.query?.school_unit_id ||
                req.params?.school_unit_id ||
                req.body?.school_unit_id ||
                req.user?.school_unit_id ||
                req.user?.school_roles?.[0]?.school_unit_id ||
                null;
  return rawId ? Number(rawId) : 1;
}

/**
 * Validasi keberadaan Siswa di modul Akademik secara in-process
 * @param {number|string} studentRefId 
 * @returns {Promise<Object>}
 */
async function validateStudent(studentRefId) {
  const id = Number(studentRefId);
  if (!id) {
    const error = new Error('ID Siswa (student_ref_id) wajib disertakan');
    error.statusCode = 422;
    throw error;
  }

  try {
    const student = await dbAkademik('students')
      .where({ id })
      .first();

    if (!student) {
      const error = new Error(`Siswa dengan ID ${id} tidak ditemukan di modul Akademik`);
      error.statusCode = 404;
      throw error;
    }
    return student;
  } catch (err) {
    if (err.statusCode) throw err;
    console.warn(`[Perpustakaan CrossModule] Gagal memvalidasi siswa ${id}:`, err.message);
    // Fallback gracefully jika DB Akademik belum terhubung
    return { id, full_name: `Siswa #${id}` };
  }
}

/**
 * Validasi keberadaan Pegawai di modul Kepegawaian secara in-process
 * @param {number|string} employeeRefId 
 * @returns {Promise<Object>}
 */
async function validateEmployee(employeeRefId) {
  const id = Number(employeeRefId);
  if (!id) {
    const error = new Error('ID Pegawai (employee_ref_id) wajib disertakan');
    error.statusCode = 422;
    throw error;
  }

  try {
    const employee = await dbKepegawaian('employees')
      .where({ id })
      .first();

    if (!employee) {
      const error = new Error(`Pegawai dengan ID ${id} tidak ditemukan di modul Kepegawaian`);
      error.statusCode = 404;
      throw error;
    }
    return employee;
  } catch (err) {
    if (err.statusCode) throw err;
    console.warn(`[Perpustakaan CrossModule] Gagal memvalidasi pegawai ${id}:`, err.message);
    // Fallback gracefully jika DB Kepegawaian belum terhubung
    return { id, full_name: `Pegawai #${id}` };
  }
}

module.exports = {
  getSchoolUnitId,
  validateStudent,
  validateEmployee,
};
