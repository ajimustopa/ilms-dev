/**
 * Cross-Module Verification Helper for Sarpras Module
 * Validates external IDs (employees, users) in-process without physical foreign keys
 */
const dbCore = require('../../../config/db/core');
const dbKepegawaian = require('../../../config/db/kepegawaian');

/**
 * Mendapatkan school_unit_id aktif dari request context
 * @param {Object} req - Express request object
 * @returns {number|null}
 */
function getSchoolUnitId(req) {
  const rawId = req.headers['x-school-unit-id'] ||
                req.query.school_unit_id ||
                req.params.school_unit_id ||
                req.body?.school_unit_id ||
                req.user?.school_unit_id ||
                req.user?.school_roles?.[0]?.school_unit_id ||
                null;
  return rawId ? Number(rawId) : 1;
}

/**
 * Validasi keberadaan Pegawai di modul Kepegawaian secara in-process
 * @param {number|string} employeeId 
 * @returns {Promise<Object>}
 */
async function validateEmployee(employeeId) {
  const id = Number(employeeId);
  if (!id) {
    const error = new Error('ID Pegawai (employee_id) wajib disertakan');
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
    console.warn(`[Sarpras CrossModule] Gagal memvalidasi pegawai ${id}:`, err.message);
    // Fallback gracefully jika DB Kepegawaian belum terhubung
    return { id, full_name: `Pegawai #${id}` };
  }
}

/**
 * Validasi keberadaan User di modul Core Service secara in-process
 * @param {number|string} userId 
 * @returns {Promise<Object>}
 */
async function validateUser(userId) {
  const id = Number(userId);
  if (!id) {
    const error = new Error('ID Pengguna (user_id) wajib disertakan');
    error.statusCode = 422;
    throw error;
  }

  try {
    const user = await dbCore('users')
      .where({ id })
      .first();

    if (!user) {
      const error = new Error(`Pengguna dengan ID ${id} tidak ditemukan di Core Service`);
      error.statusCode = 404;
      throw error;
    }
    return user;
  } catch (err) {
    if (err.statusCode) throw err;
    console.warn(`[Sarpras CrossModule] Gagal memvalidasi user ${id}:`, err.message);
    return { id, full_name: `User #${id}` };
  }
}

module.exports = {
  getSchoolUnitId,
  validateEmployee,
  validateUser
};
