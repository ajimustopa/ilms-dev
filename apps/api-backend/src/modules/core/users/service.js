/**
 * Users Service Implementation
 * Fitur #1 & #3: Manajemen Pengguna, Provisioning Akun Otomatis, Reset Password,
 * Penetapan Hak Akses Ganda (Pilihan Role Baku & Kustom Matrix Aplikasi)
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

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      baseQuery = baseQuery.where((builder) => {
        builder.where('users.username', 'like', `%${s}%`)
          .orWhere('users.full_name', 'like', `%${s}%`)
          .orWhereExists(function() {
            this.select('*')
              .from('user_school_roles')
              .leftJoin('roles', 'user_school_roles.role_id', 'roles.id')
              .leftJoin('school_units', 'user_school_roles.school_unit_id', 'school_units.id')
              .whereRaw('user_school_roles.user_id = users.id')
              .andWhere(function() {
                this.where('roles.name', 'like', `%${s}%`)
                  .orWhere('roles.description', 'like', `%${s}%`)
                  .orWhere('school_units.name', 'like', `%${s}%`);
              });
          });
      });
    }

    if (query.account_type && query.account_type !== 'all') {
      baseQuery = baseQuery.where('users.account_type', query.account_type);
    }

    if (query.status && query.status !== 'all') {
      baseQuery = baseQuery.where('users.status', query.status);
    }

    if (query.school_unit_id && query.school_unit_id !== 'all') {
      if (query.school_unit_id === 'yayasan') {
        baseQuery = baseQuery.whereExists(function() {
          this.select('*')
            .from('user_school_roles')
            .whereRaw('user_school_roles.user_id = users.id')
            .whereNull('user_school_roles.school_unit_id');
        });
      } else {
        baseQuery = baseQuery.whereExists(function() {
          this.select('*')
            .from('user_school_roles')
            .whereRaw('user_school_roles.user_id = users.id')
            .where('user_school_roles.school_unit_id', query.school_unit_id);
        });
      }
    }

    // Filter Khusus Tab Akun (Guru, Staff, Siswa, Ortu)
    if (query.tab && query.tab !== 'all') {
      if (query.tab === 'guru') {
        baseQuery = baseQuery.where((builder) => {
          builder.where('users.account_type', 'teacher')
            .orWhereExists(function() {
              this.select('*').from('user_school_roles')
                .join('roles', 'user_school_roles.role_id', 'roles.id')
                .whereRaw('user_school_roles.user_id = users.id')
                .whereIn('roles.name', ['guru', 'wali_kelas', 'waka_kurikulum', 'guru_bk', 'pelatih_ekskul', 'guru_tamu']);
            });
        });
      } else if (query.tab === 'staff') {
        baseQuery = baseQuery.where((builder) => {
          builder.whereIn('users.account_type', ['staff', 'admin'])
            .whereNotExists(function() {
              this.select('*').from('user_school_roles')
                .join('roles', 'user_school_roles.role_id', 'roles.id')
                .whereRaw('user_school_roles.user_id = users.id')
                .whereIn('roles.name', ['guru', 'wali_kelas', 'waka_kurikulum', 'guru_bk', 'pelatih_ekskul', 'guru_tamu']);
            });
        });
      } else if (query.tab === 'siswa') {
        baseQuery = baseQuery.where((builder) => {
          builder.where('users.account_type', 'student')
            .orWhereExists(function() {
              this.select('*').from('user_school_roles')
                .join('roles', 'user_school_roles.role_id', 'roles.id')
                .whereRaw('user_school_roles.user_id = users.id')
                .where('roles.name', 'siswa');
            });
        });
      } else if (query.tab === 'ortu') {
        baseQuery = baseQuery.where((builder) => {
          builder.where('users.account_type', 'parent')
            .orWhereExists(function() {
              this.select('*').from('user_school_roles')
                .join('roles', 'user_school_roles.role_id', 'roles.id')
                .whereRaw('user_school_roles.user_id = users.id')
                .where('roles.name', 'wali_santri');
            });
        });
      }
    }

    const countResult = await baseQuery.clone().count('id as total').first();
    const totalItems = parseInt(countResult.total, 10) || 0;

    const users = await baseQuery
      .select('id', 'username', 'full_name', 'account_type', 'ref_type', 'ref_id', 'status', 'last_login_at', 'created_at')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    // Ambil penugasan school_roles untuk setiap user (gunakan leftJoin agar school_unit_id: null tetap muncul)
    const userIds = users.map((u) => u.id);
    let allSchoolRoles = [];
    if (userIds.length > 0) {
      allSchoolRoles = await db('user_school_roles')
        .leftJoin('school_units', 'user_school_roles.school_unit_id', 'school_units.id')
        .leftJoin('roles', 'user_school_roles.role_id', 'roles.id')
        .whereIn('user_school_roles.user_id', userIds)
        .select(
          'user_school_roles.id as user_school_role_id',
          'user_school_roles.user_id',
          'user_school_roles.school_unit_id',
          db.raw('COALESCE(school_units.name, "Yayasan / Lintas Seluruh Satuan Pendidikan") as school_name'),
          'user_school_roles.role_id',
          'roles.name as role_name',
          'roles.description as role_description'
        );
    }

    const items = users.map((u) => ({
      ...u,
      school_roles: allSchoolRoles.filter((sr) => sr.user_id === u.id)
    }));

    // Hitung ringkasan badge per tab
    let tabBaseQuery = db('users');
    if (query.school_unit_id && query.school_unit_id !== 'all') {
      if (query.school_unit_id === 'yayasan') {
        tabBaseQuery = tabBaseQuery.whereExists(function() {
          this.select('*').from('user_school_roles').whereRaw('user_school_roles.user_id = users.id').whereNull('user_school_roles.school_unit_id');
        });
      } else {
        tabBaseQuery = tabBaseQuery.whereExists(function() {
          this.select('*').from('user_school_roles').whereRaw('user_school_roles.user_id = users.id').where('user_school_roles.school_unit_id', query.school_unit_id);
        });
      }
    }

    const [allTab, guruTab, staffTab, siswaTab] = await Promise.all([
      tabBaseQuery.clone().count('id as total').first(),
      tabBaseQuery.clone().where((b) => {
        b.where('users.account_type', 'teacher')
          .orWhereExists(function() {
            this.select('*').from('user_school_roles')
              .join('roles', 'user_school_roles.role_id', 'roles.id')
              .whereRaw('user_school_roles.user_id = users.id')
              .whereIn('roles.name', ['guru', 'wali_kelas', 'waka_kurikulum', 'guru_bk', 'pelatih_ekskul', 'guru_tamu']);
          });
      }).count('id as total').first(),
      tabBaseQuery.clone().where((b) => {
        b.whereIn('users.account_type', ['staff', 'admin'])
          .whereNotExists(function() {
            this.select('*').from('user_school_roles')
              .join('roles', 'user_school_roles.role_id', 'roles.id')
              .whereRaw('user_school_roles.user_id = users.id')
              .whereIn('roles.name', ['guru', 'wali_kelas', 'waka_kurikulum', 'guru_bk', 'pelatih_ekskul', 'guru_tamu']);
          });
      }).count('id as total').first(),
      tabBaseQuery.clone().where((b) => {
        b.where('users.account_type', 'student')
          .orWhereExists(function() {
            this.select('*').from('user_school_roles')
              .join('roles', 'user_school_roles.role_id', 'roles.id')
              .whereRaw('user_school_roles.user_id = users.id')
              .where('roles.name', 'siswa');
          });
      }).count('id as total').first()
    ]);

    return {
      items,
      tab_counts: {
        all: parseInt(allTab.total, 10) || 0,
        guru: parseInt(guruTab.total, 10) || 0,
        staff: parseInt(staffTab.total, 10) || 0,
        siswa: parseInt(siswaTab.total, 10) || 0
      },
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
      .leftJoin('school_units', 'user_school_roles.school_unit_id', 'school_units.id')
      .leftJoin('roles', 'user_school_roles.role_id', 'roles.id')
      .where('user_school_roles.user_id', id)
      .select(
        'user_school_roles.id as user_school_role_id',
        'user_school_roles.school_unit_id',
        db.raw('COALESCE(school_units.name, "Yayasan / Lintas Seluruh Satuan Pendidikan") as school_name'),
        'roles.id as role_id',
        'roles.name as role_name',
        'roles.description as role_description'
      );

    // Ambil detail permissions jika ada role
    const roleIds = schoolRoles.map((sr) => sr.role_id).filter(Boolean);
    let permissions = [];
    if (roleIds.length > 0) {
      permissions = await db('role_permissions')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .whereIn('role_permissions.role_id', roleIds)
        .select('permissions.id', 'permissions.code', 'permissions.module', 'permissions.description');
    }

    return {
      ...user,
      school_roles: schoolRoles,
      permissions
    };
  }

  /**
   * Membuat user baru dari UI Core Service
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
      account_type: payload.account_type || 'admin',
      ref_type: payload.ref_type || null,
      ref_id: payload.ref_id || null,
      status: 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Terapkan hak akses
    await this.applyUserAccess(userId, payload);

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

  /**
   * Helper penetapan hak akses (Baku vs Kustom Matrix)
   */
  async applyUserAccess(userId, payload) {
    const { assignment_method, role_id, school_unit_id, school_unit_ids, school_scope_type, app_permissions, roles } = payload;
    
    // Tentukan list satuan pendidikan sasaran
    let targetSchoolUnitIds = [];
    if (school_scope_type === 'yayasan') {
      targetSchoolUnitIds = [null];
    } else if (Array.isArray(school_unit_ids) && school_unit_ids.length > 0) {
      targetSchoolUnitIds = school_unit_ids
        .map((id) => (id && id !== 'all' && id !== 'yayasan' ? Number(id) : null))
        .filter((id) => id !== null);
      if (targetSchoolUnitIds.length === 0) {
        targetSchoolUnitIds = [null];
      }
    } else if (school_unit_id && school_unit_id !== 'all' && school_unit_id !== 'yayasan') {
      targetSchoolUnitIds = [Number(school_unit_id)];
    } else {
      targetSchoolUnitIds = [null];
    }

    // Bersihkan penugasan lama
    await db('user_school_roles').where({ user_id: userId }).del();

    if (assignment_method === 'custom' && app_permissions && typeof app_permissions === 'object') {
      // METODE 2: Kustom Hak Akses Matrix Per Aplikasi
      const customRoleName = `custom_user_${userId}`;
      let customRole = await db('roles').where({ name: customRoleName }).first();

      if (!customRole) {
        const [newRoleId] = await db('roles').insert({
          name: customRoleName,
          description: `Peran Kustom untuk User ID ${userId}`,
          is_system_role: false,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        customRole = { id: newRoleId, name: customRoleName };
      }

      // Hapus permission lama di custom role
      await db('role_permissions').where({ role_id: customRole.id }).del();

      // Kumpulkan kode permission yang dipilih
      const selectedCodes = [];
      for (const [moduleName, accessType] of Object.entries(app_permissions)) {
        if (accessType === 'view') {
          selectedCodes.push(`${moduleName}.view`);
        } else if (accessType === 'admin') {
          selectedCodes.push(`${moduleName}.view`, `${moduleName}.manage`);
        }
      }

      if (selectedCodes.length > 0) {
        const matchedPerms = await db('permissions').whereIn('code', selectedCodes).select('id');
        const rolePermInserts = matchedPerms.map((p) => ({
          role_id: customRole.id,
          permission_id: p.id,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        }));
        if (rolePermInserts.length > 0) {
          await db('role_permissions').insert(rolePermInserts);
        }
      }

      for (const unitId of targetSchoolUnitIds) {
        await db('user_school_roles').insert({
          user_id: userId,
          school_unit_id: unitId,
          role_id: customRole.id,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    } else {
      // METODE 1: Pilih Role yang Sudah Ditetapkan (Preset Standar)
      if (roles && Array.isArray(roles) && roles.length > 0) {
        for (const r of roles) {
          await db('user_school_roles').insert({
            user_id: userId,
            school_unit_id: r.school_unit_id ? Number(r.school_unit_id) : null,
            role_id: Number(r.role_id),
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
      } else if (role_id) {
        for (const unitId of targetSchoolUnitIds) {
          await db('user_school_roles').insert({
            user_id: userId,
            school_unit_id: unitId,
            role_id: Number(role_id),
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
      }
    }
  }

  /**
   * Mengatur ulang hak akses pengguna
   */
  async updateUserAccess(userId, payload, adminUser, ipAddress) {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      const error = new Error('Pengguna tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const before = await this.getUserById(userId);
    await this.applyUserAccess(userId, payload);
    const after = await this.getUserById(userId);

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      school_unit_id: payload.school_unit_id || null,
      application: 'core',
      module: 'users',
      action: 'update_user_access',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(before),
      data_after: JSON.stringify(after),
      occurred_at: db.fn.now()
    });

    return after;
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
   * Internal Service: Buat akun otomatis saat data diinput di modul asal
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

    if (role_id) {
      await db('user_school_roles').insert({
        user_id: userId,
        school_unit_id: school_unit_id || null,
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
