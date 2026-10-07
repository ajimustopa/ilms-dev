/**
 * Actor Helper for Modul Kepegawaian (HRIS)
 * Sesuai SPEC §9.1 & §9.2:
 * Memastikan proteksi IDOR dan verifikasi bahwa pengguna self-service adalah pegawai aktif yang sah.
 */
const db = require('../../../config/db/kepegawaian');

const HR_PERMISSIONS = [
  'kepegawaian.attendances.manage',
  'kepegawaian.attendances.read',
  'kepegawaian.leave_requests.manage',
  'kepegawaian.leave_requests.read',
  'kepegawaian.leave_requests.override',
  'kepegawaian.leave.read',
  'kepegawaian.leave.create',
  'kepegawaian.leave.approve',
  'kepegawaian.leave.adjust',
  'kepegawaian.leave_types.manage',
  'kepegawaian.leave_balances.manage',
  'kepegawaian.leave_balances.read',
  'kepegawaian.overtimes.manage',
  'kepegawaian.overtime.read',
  'kepegawaian.overtime.approve',
  'kepegawaian.manage',
  'kepegawaian.view',
  'superadmin'
];

/**
 * Evaluasi murni (pure function) untuk objek user dan record employee.
 * @param {object} user - Objek JWT user
 * @param {object|null} employeeRecord - Data pegawai dari DB atau null jika tidak ada/bukan pegawai
 * @returns {{
 *   employeeId: number|null,
 *   unitScope: number|null,
 *   permissions: string[],
 *   isHR: boolean,
 *   isInactive: boolean,
 *   employee: object|null
 * }}
 */
function evaluateActor(user = {}, employeeRecord = null) {
  if (!user || typeof user !== 'object') {
    return {
      employeeId: null,
      unitScope: null,
      permissions: [],
      isHR: false,
      isInactive: false,
      employee: null
    };
  }

  // 1. Ekstraksi Permissions
  const permissions = Array.isArray(user.permissions)
    ? [...user.permissions]
    : [];

  // 2. Evaluasi Hak Istimewa HRD / Admin
  const hasHRPermission = permissions.some(p => HR_PERMISSIONS.includes(p));
  const isSuperAdmin = Boolean(
    user.is_super_admin ||
    user.account_type === 'super_admin' ||
    user.account_type === 'admin_yayasan' ||
    user.role === 'super_admin' ||
    user.role === 'admin_yayasan' ||
    user.role === 'hrd' ||
    user.active_role === 'super_admin' ||
    user.active_role === 'admin_yayasan' ||
    user.active_role === 'hrd' ||
    (Array.isArray(user.roles) && user.roles.some(r => ['super_admin', 'admin_yayasan', 'hrd'].includes(r))) ||
    (Array.isArray(user.school_roles) && user.school_roles.some(r => ['super_admin', 'admin_yayasan', 'hrd'].includes(r.role_name || r.name)))
  );

  const isHR = isSuperAdmin || hasHRPermission;

  // 3. Cakupan Satuan Pendidikan (Unit Scope)
  const unitScope =
    (user.active_school_unit_id && Number(user.active_school_unit_id)) ||
    (user.school_unit_id && Number(user.school_unit_id)) ||
    (Array.isArray(user.school_roles) && user.school_roles[0]?.school_unit_id && Number(user.school_roles[0].school_unit_id)) ||
    (employeeRecord && employeeRecord.school_unit_id && Number(employeeRecord.school_unit_id)) ||
    null;

  // 4. Verifikasi Tipe Referensi Akun (HANYA 'staff', 'teacher', atau 'employee')
  const allowedRefTypes = ['staff', 'teacher', 'employee'];
  const isValidRefType = user.ref_type && allowedRefTypes.includes(String(user.ref_type).toLowerCase());

  if (!isValidRefType || !user.ref_id) {
    return {
      employeeId: null,
      unitScope,
      permissions,
      isHR,
      isInactive: false,
      employee: null
    };
  }

  // 5. Verifikasi Data Pegawai
  if (!employeeRecord) {
    return {
      employeeId: null,
      unitScope,
      permissions,
      isHR,
      isInactive: false,
      employee: null
    };
  }

  const isEmployeeActive =
    (employeeRecord.account_status ? employeeRecord.account_status === 'active' : true) &&
    (employeeRecord.status ? employeeRecord.status === 'active' : true);

  if (!isEmployeeActive) {
    return {
      employeeId: null,
      unitScope,
      permissions,
      isHR,
      isInactive: true,
      employee: null
    };
  }

  return {
    employeeId: Number(employeeRecord.id || user.ref_id),
    unitScope,
    permissions,
    isHR,
    isInactive: false,
    employee: employeeRecord
  };
}

/**
 * Resolves the authenticated actor against the kepegawaian database.
 * @param {object} user - req.user
 * @param {object} [customDb] - Knex instance (defaults to kepegawaian db)
 * @returns {Promise<{
 *   employeeId: number|null,
 *   unitScope: number|null,
 *   permissions: string[],
 *   isHR: boolean,
 *   isInactive: boolean,
 *   employee: object|null
 * }>}
 */
async function resolveActor(user = {}, customDb = null) {
  if (!user || typeof user !== 'object') {
    return evaluateActor(user, null);
  }

  const allowedRefTypes = ['staff', 'teacher', 'employee'];
  const isValidRefType = user.ref_type && allowedRefTypes.includes(String(user.ref_type).toLowerCase());

  if (!isValidRefType || !user.ref_id) {
    return evaluateActor(user, null);
  }

  const knex = customDb || db;
  try {
    const employee = await knex('employees').where({ id: user.ref_id }).first();
    return evaluateActor(user, employee || null);
  } catch (err) {
    console.error('Error resolving employee actor in resolveActor:', err.message);
    return evaluateActor(user, null);
  }
}

/**
 * Helper middleware / guard error thrower for self-service actions.
 * @param {object} actor - The resolved actor object
 * @throws {Error} 403 ACTOR_NOT_EMPLOYEE if actor has no valid employeeId and is not HR
 */
function assertEmployeeActor(actor) {
  if (!actor || (!actor.employeeId && !actor.isHR)) {
    const error = new Error('Akun Anda tidak terhubung dengan data pegawai aktif. Akses presensi self-service ditolak.');
    error.statusCode = 403;
    error.code = 'ACTOR_NOT_EMPLOYEE';
    error.errors = [
      {
        code: 'ACTOR_NOT_EMPLOYEE',
        field: 'actor',
        message: 'Akun Anda bukan akun pegawai aktif yang terdaftar di sistem Kepegawaian.'
      }
    ];
    throw error;
  }
}

module.exports = {
  evaluateActor,
  resolveActor,
  assertEmployeeActor,
  HR_PERMISSIONS
};
