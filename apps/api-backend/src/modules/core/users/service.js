/**
 * Users Service Implementation
 * Fitur #1 & #3: Manajemen Pengguna, Provisioning Akun Otomatis & Reset Password
 */
const bcrypt = require('bcryptjs');
const db = require('../../../config/db/core');

class UsersService {
  /**
   * List Users dengan filter search, account_type, status, school_unit_id
   */
  async listUsers(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 50);
    const offset = (page - 1) * limit;

    let baseQuery = db('users');

    if (query.search) {
      baseQuery = baseQuery.where((builder) => {
        builder.where('username', 'like', `%${query.search}%`)
          .orWhere('full_name', 'like', `%${query.search}%`);
      });
    }

    if (query.account_type && query.account_type !== 'all') {
      baseQuery = baseQuery.where('account_type', query.account_type);
    }

    if (query.status && query.status !== 'all') {
      baseQuery = baseQuery.where('status', query.status);
    }

    const countResult = await baseQuery.clone().count('id as total').first();
    const totalItems = parseInt(countResult.total, 10) || 0;

    const users = await baseQuery
      .select('id', 'username', 'full_name', 'account_type', 'ref_type', 'ref_id', 'status', 'last_login_at', 'created_at')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    // Ambil penugasan school_roles untuk setiap user
    const userIds = users.map((u) => u.id);
    let allSchoolRoles = [];
    if (userIds.length > 0) {
      allSchoolRoles = await db('user_school_roles')
        .join('school_units', 'user_school_roles.school_unit_id', 'school_units.id')
        .join('roles', 'user_school_roles.role_id', 'roles.id')
        .whereIn('user_school_roles.user_id', userIds)
        .select(
          'user_school_roles.user_id',
          'user_school_roles.school_unit_id',
          'school_units.name as school_name',
          'user_school_roles.role_id',
          'roles.name as role_name'
        );
    }

    const items = users.map((u) => ({
      ...u,
      school_roles: allSchoolRoles.filter((sr) => sr.user_id === u.id)
    }));

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

  async getUserById(id) {
    const user = await db('users')
      .where({ id })
      .select('id', 'username', 'full_name', 'account_type', 'ref_type', 'ref_id', 'status', 'last_login_at', 'created_at')
      .first();

    if (!user) {
      const error = new Error('Pengguna tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const schoolRoles = await db('user_school_roles')
      .join('school_units', 'user_school_roles.school_unit_id', 'school_units.id')
      .join('roles', 'user_school_roles.role_id', 'roles.id')
      .where('user_school_roles.user_id', id)
      .select(
        'user_school_roles.id as user_school_role_id',
        'school_units.id as school_unit_id',
        'school_units.name as school_name',
        'roles.id as role_id',
        'roles.name as role_name'
      );

    return {
      ...user,
      school_roles: schoolRoles
    };
  }

  /**
   * Membuat user khusus Admin dari UI Core Service
   */
  async createAdminUser(payload, adminUser, ipAddress) {
    if (!payload.username || !payload.password || !payload.full_name) {
      const error = new Error('Username, password, dan nama lengkap wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const existing = await db('users').where({ username: payload.username.trim() }).first();
    if (existing) {
      const error = new Error('Username sudah digunakan');
      error.statusCode = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.password, salt);

    const [userId] = await db('users').insert({
      username: payload.username.trim(),
      password_hash: passwordHash,
      full_name: payload.full_name.trim(),
      account_type: 'admin',
      ref_type: null,
      ref_id: null,
      status: 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Pasang initial roles jika disertakan
    if (payload.roles && Array.isArray(payload.roles)) {
      for (const r of payload.roles) {
        await db('user_school_roles').insert({
          user_id: userId,
          school_unit_id: r.school_unit_id,
          role_id: r.role_id,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    } else if (payload.school_unit_id && payload.role_id) {
      await db('user_school_roles').insert({
        user_id: userId,
        school_unit_id: payload.school_unit_id,
        role_id: payload.role_id,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    const createdUser = await this.getUserById(userId);

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      school_unit_id: payload.school_unit_id || null,
      application: 'core',
      module: 'users',
      action: 'create_admin',
      ip_address: ipAddress || null,
      data_before: null,
      data_after: JSON.stringify(createdUser),
      occurred_at: db.fn.now()
    });

    return createdUser;
  }

  async updateUserStatus(id, status, adminUser, ipAddress) {
    if (!['active', 'inactive'].includes(status)) {
      const error = new Error("Status harus 'active' atau 'inactive'");
      error.statusCode = 422;
      throw error;
    }

    const currentUser = await db('users').where({ id }).first();
    if (!currentUser) {
      const error = new Error('Pengguna tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('users').where({ id }).update({
      status,
      updated_at: db.fn.now()
    });

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'users',
      action: 'toggle_status',
      ip_address: ipAddress || null,
      data_before: JSON.stringify({ status: currentUser.status }),
      data_after: JSON.stringify({ status }),
      occurred_at: db.fn.now()
    });

    return { id: Number(id), username: currentUser.username, status };
  }

  async adminResetPassword(id, newPassword, adminUser, ipAddress) {
    const currentUser = await db('users').where({ id }).first();
    if (!currentUser) {
      const error = new Error('Pengguna tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const pass = newPassword || 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pass, salt);

    await db('users').where({ id }).update({
      password_hash: passwordHash,
      updated_at: db.fn.now()
    });

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'users',
      action: 'reset_password',
      ip_address: ipAddress || null,
      data_before: { username: currentUser.username },
      data_after: { username: currentUser.username, password_reset: true },
      occurred_at: db.fn.now()
    });

    return { id: Number(id), username: currentUser.username };
  }

  async changePassword(userId, { old_password, new_password, confirm_password }) {
    if (!old_password || !new_password) {
      const error = new Error('Password lama dan password baru wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (new_password !== confirm_password) {
      const error = new Error('Konfirmasi password tidak cocok');
      error.statusCode = 422;
      throw error;
    }

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      const error = new Error('Pengguna tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Password lama Anda salah');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await db('users').where({ id: userId }).update({
      password_hash: newHash,
      updated_at: db.fn.now()
    });

    return true;
  }

  /**
   * Internal Service: Buat akun otomatis saat data diinput di modul asal (Akademik / Kepegawaian)
   */
  async internalCreateUser(payload) {
    const { username, password, full_name, account_type, ref_type, ref_id, school_unit_id, role_id } = payload;

    if (!username || !password || !full_name || !account_type) {
      const error = new Error('Data wajib: username, password, full_name, account_type');
      error.statusCode = 422;
      throw error;
    }

    const existing = await db('users').where({ username }).orWhere({ ref_type, ref_id }).first();
    if (existing) {
      const error = new Error('Username atau entitas referensi sudah memiliki akun terdaftar');
      error.statusCode = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [userId] = await db('users').insert({
      username,
      password_hash: passwordHash,
      full_name,
      account_type,
      ref_type: ref_type || null,
      ref_id: ref_id || null,
      status: 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    if (school_unit_id && role_id) {
      await db('user_school_roles').insert({
        user_id: userId,
        school_unit_id,
        role_id,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    return this.getUserById(userId);
  }

  async internalSyncUser(payload) {
    const { ref_type, ref_id, full_name, status } = payload;
    const user = await db('users').where({ ref_type, ref_id }).first();
    if (!user) {
      const error = new Error('Akun referensi tidak ditemukan di Core Service');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (full_name) updateData.full_name = full_name;
    if (status) updateData.status = status;

    await db('users').where({ id: user.id }).update(updateData);
    return this.getUserById(user.id);
  }
}

module.exports = new UsersService();
