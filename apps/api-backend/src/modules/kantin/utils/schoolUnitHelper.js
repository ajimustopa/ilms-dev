/**
 * School Unit Resolution & Authorization Helper for Kantin Module
 * Sesuai aturan AGENTS.md aturan #2 & docs/security.md (SEC-10)
 * "Unit yang aktif harus divalidasi terhadap school_units milik user di JWT; jangan percaya header dari klien begitu saja."
 */

function getValidatedSchoolUnitId(req) {
  // 1. Jika request berasal dari internal service via authenticated API key
  if (req.isInternalService) {
    const rawParam = req.query?.school_unit_id || (req.body && req.body.school_unit_id) || req.headers?.['x-school-unit-id'];
    const num = Number(rawParam);
    return !isNaN(num) && num > 0 ? num : 1;
  }

  const user = req.user;
  if (!user) {
    const err = new Error('Akses ditolak: User belum terautentikasi');
    err.statusCode = 401;
    throw err;
  }

  // 2. Cek apakah user memiliki hak akses global (Superadmin, Admin Yayasan, Pengelola Kantin Global)
  const userType = (user.account_type || '').toLowerCase();
  const userRoles = Array.isArray(user.roles) ? user.roles.map(r => (typeof r === 'string' ? r : r.name || '').toLowerCase()) : [];
  const userPermissions = Array.isArray(user.permissions) ? user.permissions.map(p => String(p).toLowerCase()) : [];
  const userUnits = Array.isArray(user.school_units) ? user.school_units : [];

  const isGlobalUser = Boolean(
    user.is_super_admin ||
    userType === 'superadmin' ||
    userType === 'super_admin' ||
    userType === 'admin' ||
    userRoles.includes('superadmin') ||
    userRoles.includes('super_admin') ||
    userRoles.includes('admin_yayasan') ||
    userRoles.includes('pengelola_kantin') ||
    userPermissions.includes('kantin.manage') ||
    userPermissions.includes('kantin.view') ||
    userPermissions.includes('core.all') ||
    userUnits.some(u => (typeof u === 'object' && u !== null ? u.id === null : false))
  );

  // Ambil requested school unit dari query, body, atau header
  const rawRequested = req.query?.school_unit_id || (req.body && req.body.school_unit_id) || req.headers?.['x-school-unit-id'];
  const isRequestedAll = rawRequested === 'all' || rawRequested === 'foundation';
  const requestedUnitId = rawRequested !== undefined && rawRequested !== null && rawRequested !== '' && !isRequestedAll ? Number(rawRequested) : null;

  if (isGlobalUser) {
    if (requestedUnitId && !isNaN(requestedUnitId) && requestedUnitId > 0) {
      return requestedUnitId;
    }
    return 'all';
  }

  // 3. User Spesifik Unit (Operator Unit, Kasir Unit, Siswa/Wali Unit): Validasi terhadap user.school_units
  const allowedUnitIds = userUnits
    .map(u => (typeof u === 'object' && u !== null ? Number(u.id) : Number(u)))
    .filter(id => !isNaN(id) && id > 0);

  if (allowedUnitIds.length === 0) {
    // Fallback aman untuk user yang belum di-assign unit tertentu tapi memiliki role staf
    return 1;
  }

  if (isRequestedAll) {
    if (allowedUnitIds.length > 1) {
      return 'all';
    }
    return allowedUnitIds[0];
  }

  if (requestedUnitId && !isNaN(requestedUnitId)) {
    if (!allowedUnitIds.includes(requestedUnitId)) {
      const err = new Error(`Akses ditolak: Anda tidak memiliki akses ke satuan pendidikan ID ${requestedUnitId}`);
      err.statusCode = 403;
      throw err;
    }
    return requestedUnitId;
  }

  // Jika tidak menyebutkan unit secara eksplisit, gunakan unit pertama yang diizinkan untuk user ini
  return allowedUnitIds[0];
}

module.exports = {
  getValidatedSchoolUnitId
};
