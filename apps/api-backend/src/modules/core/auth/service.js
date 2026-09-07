/**
 * Auth Service Implementation
 * Fitur #1 (Login SSO, Refresh Token, Logout, Sesi) & Fitur #2 (Lupa Password)
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../../config/db/core');

class AuthService {
  /**
   * Helper untuk membuat hash SHA-256 dari refresh token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Helper untuk mengonversi string durasi (mis. '15m', '7d') ke detik
   */
  parseDurationToSeconds(durationStr, defaultSeconds = 900) {
    if (!durationStr) return defaultSeconds;
    if (typeof durationStr === 'number') return durationStr;
    const match = durationStr.match(/^(\d+)([smhd])$/);
    if (!match) return defaultSeconds;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return defaultSeconds;
    }
  }

  /**
   * Mengambil relasi Satuan Pendidikan, Role, dan Permissions milik pengguna
   */
  async getUserPermissionsAndRoles(userId) {
    // 1. Ambil seluruh penugasan sekolah dan role (gunakan leftJoin agar role yayasan/global tanpa school_unit_id tetap terbaca)
    const schoolRoles = await db('user_school_roles')
      .leftJoin('school_units', 'user_school_roles.school_unit_id', 'school_units.id')
      .join('roles', 'user_school_roles.role_id', 'roles.id')
      .where('user_school_roles.user_id', userId)
      .select(
        'user_school_roles.id as user_school_role_id',
        'school_units.id as school_unit_id',
        'school_units.name as school_name',
        'school_units.level as school_level',
        'roles.id as role_id',
        'roles.name as role_name',
        'roles.is_system_role'
      );

    // 2. Ambil permissions untuk setiap role yang dimiliki
    const roleIds = [...new Set(schoolRoles.map((sr) => sr.role_id))];
    let permissions = [];
    if (roleIds.length > 0) {
      permissions = await db('role_permissions')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .whereIn('role_permissions.role_id', roleIds)
        .select('permissions.id', 'permissions.code', 'permissions.module', 'role_permissions.role_id');
    }

    return {
      schoolRoles,
      permissions
    };
  }

  /**
   * Fitur #1: Login SSO (JWT + Refresh Token Hash)
   */
  async login({ username, password, school_unit_id, ip_address, user_agent }) {
    if (!username || !password) {
      const error = new Error('Username dan password wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // 1. Cari user di database
    const user = await db('users').where({ username }).first();

    // 2. Validasi keberadaan user dan status aktif
    if (!user) {
      const error = new Error('Username atau password salah');
      error.statusCode = 401;
      throw error;
    }

    if (user.status !== 'active') {
      const error = new Error('Akun Anda saat ini dinonaktifkan. Hubungi administrator.');
      error.statusCode = 403;
      throw error;
    }

    // 3. Verifikasi hash password (bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // Catat log percobaan gagal
      await db('activity_logs').insert({
        log_type: 'login',
        user_id: user.id,
        school_unit_id: school_unit_id || null,
        application: 'core',
        action: 'login_failed',
        ip_address: ip_address || null,
        occurred_at: db.fn.now()
      });

      const error = new Error('Username atau password salah');
      error.statusCode = 401;
      throw error;
    }

    // 4. Ambil role dan permissions
    const { schoolRoles, permissions } = await this.getUserPermissionsAndRoles(user.id);

    // Tentukan active school unit
    let activeSchoolRole = null;
    if (school_unit_id) {
      activeSchoolRole = schoolRoles.find((sr) => sr.school_unit_id == school_unit_id);
    }
    if (!activeSchoolRole && schoolRoles.length > 0) {
      activeSchoolRole = schoolRoles[0];
    }

    // Filter permissions untuk active role/sekolah atau global roles
    const activeRoleIds = activeSchoolRole ? [activeSchoolRole.role_id] : [...new Set(schoolRoles.map((sr) => sr.role_id))];
    const activePermissions = permissions
      .filter((p) => activeRoleIds.includes(p.role_id))
      .map((p) => p.code);

    // 5. Generate Access Token (JWT - Durasi Pendek mis. 15m)
    const jwtSecret = process.env.CORE_JWT_SECRET || 'default_core_jwt_secret_key';
    const jwtExpiry = process.env.CORE_JWT_EXPIRES_IN || '15m';
    const expiresInSeconds = this.parseDurationToSeconds(jwtExpiry, 900);

    const roleNames = [...new Set(schoolRoles.map((sr) => sr.role_name))];

    const isUniversalAdmin = user.account_type === 'super_admin' ||
      user.account_type === 'admin' ||
      roleNames.includes('super_admin') ||
      roleNames.includes('admin_yayasan');

    const allModuleKeys = [
      'core', 'website-utama', 'kepegawaian', 'akademik', 'keuangan',
      'kesiswaan', 'sarpras', 'perpustakaan', 'cbt', 'bk', 'alumni',
      'ppdb', 'portal_ortu', 'portal_siswa', 'al_quran'
    ];

    const accessibleModules = isUniversalAdmin
      ? allModuleKeys
      : [...new Set(permissions.map((p) => p.module || (p.code && p.code.split('.')[0])).filter(Boolean))];

    const tokenPayload = {
      sub: user.id,
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      account_type: user.account_type,
      ref_type: user.ref_type,
      ref_id: user.ref_id,
      active_school_unit_id: activeSchoolRole?.school_unit_id || null,
      active_role: activeSchoolRole?.role_name || (roleNames[0] || null),
      roles: roleNames,
      modules: accessibleModules,
      school_units: schoolRoles.map((sr) => ({
        id: sr.school_unit_id,
        name: sr.school_name,
        level: sr.school_level,
        role: sr.role_name
      })),
      permissions: activePermissions
    };

    const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: jwtExpiry });

    // 6. Generate Refresh Token (Durasi Panjang mis. 7d & Simpan HASH ke Database)
    const rawRefreshToken = `rt_${crypto.randomBytes(32).toString('hex')}`;
    const refreshTokenHash = this.hashToken(rawRefreshToken);

    const refreshExpiryStr = process.env.CORE_JWT_REFRESH_EXPIRES_IN || '7d';
    const refreshExpirySeconds = this.parseDurationToSeconds(refreshExpiryStr, 604800);
    const expiresAt = new Date(Date.now() + refreshExpirySeconds * 1000);

    await db('refresh_tokens').insert({
      user_id: user.id,
      token_hash: refreshTokenHash,
      user_agent: user_agent || null,
      ip_address: ip_address || null,
      expires_at: expiresAt,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // 7. Update last_login_at di tabel users
    await db('users').where({ id: user.id }).update({
      last_login_at: db.fn.now()
    });

    // 8. Catat log login sukses ke activity_logs
    await db('activity_logs').insert({
      log_type: 'login',
      user_id: user.id,
      school_unit_id: activeSchoolRole?.school_unit_id || null,
      application: 'core',
      action: 'login_success',
      ip_address: ip_address || null,
      occurred_at: db.fn.now()
    });

    // 9. Format response (Pastikan password_hash & token_hash TIDAK PERNAH bocor)
    return {
      token_type: 'Bearer',
      access_token: accessToken,
      expires_in: expiresInSeconds,
      refresh_token: rawRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        account_type: user.account_type,
        ref_type: user.ref_type,
        ref_id: user.ref_id,
        active_school_unit: activeSchoolRole
          ? {
              id: activeSchoolRole.school_unit_id,
              name: activeSchoolRole.school_name,
              level: activeSchoolRole.school_level
            }
          : null,
        roles: schoolRoles.map((sr) => ({
          role_id: sr.role_id,
          role_name: sr.role_name,
          school_unit_id: sr.school_unit_id,
          school_name: sr.school_name
        })),
        modules: accessibleModules,
        permissions: activePermissions
      }
    };
  }

  /**
   * Fitur #1: Refresh Token (Validasi hash, cek revoked & expired)
   */
  async refreshToken({ refresh_token, ip_address, user_agent }) {
    if (!refresh_token) {
      const error = new Error('Refresh token wajib disertakan');
      error.statusCode = 400;
      throw error;
    }

    const tokenHash = this.hashToken(refresh_token);

    // 1. Cari token hash di tabel refresh_tokens
    const session = await db('refresh_tokens')
      .where({ token_hash: tokenHash })
      .whereNull('revoked_at')
      .where('expires_at', '>', new Date())
      .first();

    if (!session) {
      const error = new Error('Refresh token tidak valid atau sudah dicabut');
      error.statusCode = 401;
      throw error;
    }

    // 2. Ambil user terkait
    const user = await db('users').where({ id: session.user_id }).first();
    if (!user || user.status !== 'active') {
      const error = new Error('Pengguna tidak aktif atau tidak ditemukan');
      error.statusCode = 401;
      throw error;
    }

    // 3. Ambil role dan permissions
    const { schoolRoles, permissions } = await this.getUserPermissionsAndRoles(user.id);
    const activeSchoolRole = schoolRoles.length > 0 ? schoolRoles[0] : null;
    const activeRoleIds = activeSchoolRole ? [activeSchoolRole.role_id] : [...new Set(schoolRoles.map((sr) => sr.role_id))];
    const activePermissions = permissions
      .filter((p) => activeRoleIds.includes(p.role_id))
      .map((p) => p.code);

    // 4. Terbitkan Access Token baru
    const jwtSecret = process.env.CORE_JWT_SECRET || 'default_core_jwt_secret_key';
    const jwtExpiry = process.env.CORE_JWT_EXPIRES_IN || '15m';
    const expiresInSeconds = this.parseDurationToSeconds(jwtExpiry, 900);

    const roleNames = [...new Set(schoolRoles.map((sr) => sr.role_name))];

    const tokenPayload = {
      sub: user.id,
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      account_type: user.account_type,
      ref_type: user.ref_type,
      ref_id: user.ref_id,
      active_school_unit_id: activeSchoolRole?.school_unit_id || null,
      active_role: activeSchoolRole?.role_name || (roleNames[0] || null),
      roles: roleNames,
      school_units: schoolRoles.map((sr) => ({
        id: sr.school_unit_id,
        name: sr.school_name,
        level: sr.school_level,
        role: sr.role_name
      })),
      permissions: activePermissions
    };

    const newAccessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: jwtExpiry });

    return {
      token_type: 'Bearer',
      access_token: newAccessToken,
      expires_in: expiresInSeconds,
      refresh_token: refresh_token
    };
  }

  /**
   * Fitur #1: Logout (Revoke refresh token & catat activity log)
   */
  async logout({ refresh_token, user_id, ip_address }) {
    if (refresh_token) {
      const tokenHash = this.hashToken(refresh_token);
      await db('refresh_tokens')
        .where({ token_hash: tokenHash })
        .update({
          revoked_at: db.fn.now(),
          updated_at: db.fn.now()
        });
    }

    if (user_id) {
      await db('activity_logs').insert({
        log_type: 'login',
        user_id: user_id,
        application: 'core',
        action: 'logout',
        ip_address: ip_address || null,
        occurred_at: db.fn.now()
      });
    }

    return true;
  }

  /**
   * Fitur #1: Me / Detail Profil Pengguna
   */
  async getMe(userId) {
    if (!userId) {
      const error = new Error('Pengguna tidak terotentikasi');
      error.statusCode = 401;
      throw error;
    }

    const user = await db('users')
      .where({ id: userId })
      .select('id', 'username', 'full_name', 'account_type', 'ref_type', 'ref_id', 'status', 'last_login_at', 'created_at')
      .first();

    if (!user) {
      const error = new Error('Pengguna tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const { schoolRoles, permissions } = await this.getUserPermissionsAndRoles(user.id);
    const activeSchoolRole = schoolRoles.length > 0 ? schoolRoles[0] : null;
    const roleNames = [...new Set(schoolRoles.map((sr) => sr.role_name))];

    const isUniversalAdmin = user.account_type === 'super_admin' ||
      user.account_type === 'admin' ||
      roleNames.includes('super_admin') ||
      roleNames.includes('admin_yayasan');

    const allModuleKeys = [
      'core', 'website-utama', 'kepegawaian', 'akademik', 'keuangan',
      'kesiswaan', 'sarpras', 'perpustakaan', 'cbt', 'bk', 'alumni',
      'ppdb', 'portal_ortu', 'portal_siswa', 'al_quran'
    ];

    const accessibleModules = isUniversalAdmin
      ? allModuleKeys
      : [...new Set(permissions.map((p) => p.module || (p.code && p.code.split('.')[0])).filter(Boolean))];

    return {
      ...user,
      active_school_unit: activeSchoolRole
        ? {
            id: activeSchoolRole.school_unit_id,
            name: activeSchoolRole.school_name,
            level: activeSchoolRole.school_level
          }
        : null,
      roles: schoolRoles.map((sr) => ({
        role_id: sr.role_id,
        role_name: sr.role_name,
        school_unit_id: sr.school_unit_id,
        school_name: sr.school_name
      })),
      school_roles: schoolRoles.map((sr) => ({
        school_unit_id: sr.school_unit_id,
        school_name: sr.school_name,
        school_level: sr.school_level,
        role_id: sr.role_id,
        role_name: sr.role_name
      })),
      modules: accessibleModules,
      permissions: [...new Set(permissions.map((p) => p.code))]
    };
  }

  /**
   * Fitur #1: Verify Token (Opsi verifikasi sentral)
   */
  async verifyToken(token) {
    if (!token) {
      const error = new Error('Token wajib disertakan');
      error.statusCode = 400;
      throw error;
    }

    const secret = process.env.CORE_JWT_SECRET || 'default_core_jwt_secret_key';
    const decoded = jwt.verify(token, secret);

    return {
      is_valid: true,
      user_id: decoded.id || decoded.sub,
      username: decoded.username,
      account_type: decoded.account_type,
      active_school_unit_id: decoded.active_school_unit_id || null,
      permissions: decoded.permissions || [],
      expires_at: new Date(decoded.exp * 1000).toISOString()
    };
  }

  /**
   * Fitur #2: Pengajuan Lupa Password
   */
  async requestPasswordReset({ username, contact, school_unit_id }) {
    if (!username || !contact) {
      const error = new Error('Username dan nomor kontak/email wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const user = await db('users').where({ username }).first();
    if (!user) {
      const error = new Error('Akun dengan username tersebut tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const [requestId] = await db('password_reset_requests').insert({
      user_id: user.id,
      school_unit_id: school_unit_id || null,
      contact: contact,
      request_status: 'pending',
      requested_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return {
      request_id: requestId,
      username: user.username,
      request_status: 'pending',
      requested_at: new Date().toISOString()
    };
  }

  /**
   * Fitur #2: Daftar Permohonan Reset Password (Admin)
   */
  async listPasswordResets(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 20);
    const offset = (page - 1) * limit;

    let baseQuery = db('password_reset_requests')
      .join('users as target_user', 'password_reset_requests.user_id', 'target_user.id')
      .leftJoin('school_units', 'password_reset_requests.school_unit_id', 'school_units.id')
      .leftJoin('users as admin_user', 'password_reset_requests.processed_by', 'admin_user.id');

    if (query.request_status) {
      baseQuery = baseQuery.where('password_reset_requests.request_status', query.request_status);
    }
    if (query.school_unit_id) {
      baseQuery = baseQuery.where('password_reset_requests.school_unit_id', query.school_unit_id);
    }

    const countResult = await baseQuery.clone().count('password_reset_requests.id as total').first();
    const totalItems = parseInt(countResult.total, 10) || 0;

    const items = await baseQuery
      .select(
        'password_reset_requests.id',
        'password_reset_requests.user_id',
        'target_user.username',
        'target_user.full_name',
        'password_reset_requests.contact',
        'password_reset_requests.school_unit_id',
        'school_units.name as school_name',
        'password_reset_requests.request_status',
        'password_reset_requests.requested_at',
        'password_reset_requests.processed_by',
        'admin_user.username as processed_by_username',
        'password_reset_requests.processed_at'
      )
      .orderBy('password_reset_requests.requested_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / limit) || 1
      }
    };
  }

  /**
   * Fitur #2: Proses Permohonan Reset Password (Admin)
   */
  async processPasswordReset(id, { request_status, temp_password }, adminId) {
    if (!['approved', 'rejected'].includes(request_status)) {
      const error = new Error("Status proses harus 'approved' atau 'rejected'");
      error.statusCode = 422;
      throw error;
    }

    const resetRequest = await db('password_reset_requests').where({ id }).first();
    if (!resetRequest) {
      const error = new Error('Permohonan reset password tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (resetRequest.request_status !== 'pending') {
      const error = new Error(`Permohonan ini sudah diproses sebelumnya dengan status '${resetRequest.request_status}'`);
      error.statusCode = 400;
      throw error;
    }

    // Jika disetujui, update password user
    if (request_status === 'approved') {
      const newPassword = temp_password || 'Password123!';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await db('users').where({ id: resetRequest.user_id }).update({
        password_hash: passwordHash,
        updated_at: db.fn.now()
      });
    }

    // Update status permintaan
    await db('password_reset_requests').where({ id }).update({
      request_status,
      processed_by: adminId || null,
      processed_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return {
      request_id: Number(id),
      request_status,
      processed_by: adminId || null,
      processed_at: new Date().toISOString()
    };
  }
}

module.exports = new AuthService();
