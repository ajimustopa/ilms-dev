/**
 * Cashiers Management Service (Kantin Module)
 * Pengelolaan akun kasir khusus operasional POS Penjualan Kantin (Role: kasir_kantin)
 */
const bcrypt = require('bcryptjs');
const dbCore = require('../../../config/db/core');
const dbKantin = require('../../../config/db/kantin');

class CashiersService {
  /**
   * List Akun Kasir Kantin
   */
  async listCashiers(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';

    // Cari role kasir_kantin
    const kasirRole = await dbCore('roles').where({ name: 'kasir_kantin' }).first();
    const kasirRoleId = kasirRole ? kasirRole.id : null;

    let baseQuery = dbCore('users')
      .join('user_school_roles', 'users.id', 'user_school_roles.user_id')
      .join('roles', 'user_school_roles.role_id', 'roles.id')
      .leftJoin('school_units', 'user_school_roles.school_unit_id', 'school_units.id')
      .where(function() {
        this.where('roles.name', 'kasir_kantin')
          .orWhere('roles.name', 'kasir');
      });

    if (!isAll) {
      baseQuery = baseQuery.where(function() {
        this.where('user_school_roles.school_unit_id', schoolUnitId)
          .orWhereNull('user_school_roles.school_unit_id');
      });
    }

    if (query.status && query.status !== 'all') {
      baseQuery = baseQuery.where('users.status', query.status);
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      baseQuery = baseQuery.where(function() {
        this.where('users.full_name', 'like', `%${s}%`)
          .orWhere('users.username', 'like', `%${s}%`)
          .orWhere('school_units.name', 'like', `%${s}%`);
      });
    }

    const cashiers = await baseQuery
      .select(
        'users.id',
        'users.username',
        'users.full_name',
        'users.account_type',
        'users.status',
        'users.last_login_at',
        'users.created_at',
        'users.updated_at',
        'user_school_roles.school_unit_id',
        'school_units.name as school_name',
        'roles.name as role_name',
        'roles.description as role_description'
      )
      .orderBy('users.id', 'desc');

    // Hitung statistik transaksi per kasir dari db kantin
    const result = [];
    for (const c of cashiers) {
      let txCount = 0;
      let totalSales = 0;
      try {
        const stats = await dbKantin('sales_transactions')
          .where({ cashier_user_id: c.id })
          .where('payment_status', 'completed')
          .select(
            dbKantin.raw('COUNT(*) as total_count'),
            dbKantin.raw('COALESCE(SUM(final_amount), 0) as total_sales')
          )
          .first();
        if (stats) {
          txCount = Number(stats.total_count) || 0;
          totalSales = parseFloat(stats.total_sales) || 0;
        }
      } catch (err) {
        // Abaikan jika tabel belum ada atau field berbeda
      }

      result.push({
        id: c.id,
        username: c.username,
        full_name: c.full_name,
        account_type: c.account_type,
        status: c.status,
        school_unit_id: c.school_unit_id,
        school_name: c.school_name || 'Pusat Yayasan (Gabungan)',
        role_name: c.role_name,
        role_description: c.role_description,
        total_transactions: txCount,
        total_sales_amount: totalSales,
        last_login_at: c.last_login_at,
        created_at: c.created_at
      });
    }

    return result;
  }

  /**
   * Detail Akun Kasir
   */
  async getCashierById(id) {
    const cashier = await dbCore('users')
      .join('user_school_roles', 'users.id', 'user_school_roles.user_id')
      .join('roles', 'user_school_roles.role_id', 'roles.id')
      .leftJoin('school_units', 'user_school_roles.school_unit_id', 'school_units.id')
      .where('users.id', id)
      .where(function() {
        this.where('roles.name', 'kasir_kantin')
          .orWhere('roles.name', 'kasir');
      })
      .select(
        'users.id',
        'users.username',
        'users.full_name',
        'users.account_type',
        'users.status',
        'users.last_login_at',
        'users.created_at',
        'users.updated_at',
        'user_school_roles.school_unit_id',
        'school_units.name as school_name',
        'roles.id as role_id',
        'roles.name as role_name',
        'roles.description as role_description'
      )
      .first();

    if (!cashier) {
      const error = new Error('Akun kasir tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    let txCount = 0;
    let totalSales = 0;
    try {
      const stats = await dbKantin('sales_transactions')
        .where({ cashier_user_id: cashier.id })
        .where('payment_status', 'completed')
        .select(
          dbKantin.raw('COUNT(*) as total_count'),
          dbKantin.raw('COALESCE(SUM(final_amount), 0) as total_sales')
        )
        .first();
      if (stats) {
        txCount = Number(stats.total_count) || 0;
        totalSales = parseFloat(stats.total_sales) || 0;
      }
    } catch (err) {}

    return {
      ...cashier,
      school_name: cashier.school_name || 'Pusat Yayasan (Gabungan)',
      total_transactions: txCount,
      total_sales_amount: totalSales
    };
  }

  /**
   * Buat Akun Kasir Baru (Hanya akses POS Penjualan)
   */
  async createCashier(payload, adminUser, ipAddress) {
    const { username, password, full_name, school_unit_id, status = 'active' } = payload;

    if (!username || !password || !full_name) {
      const error = new Error('Username, password, dan nama lengkap kasir wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Pastikan username unik
    const existing = await dbCore('users').where({ username: username.trim().toLowerCase() }).first();
    if (existing) {
      const error = new Error(`Username "${username}" sudah terdaftar`);
      error.statusCode = 409;
      throw error;
    }

    // Ambil role kasir_kantin
    let kasirRole = await dbCore('roles').where({ name: 'kasir_kantin' }).first();
    if (!kasirRole) {
      const [newRoleId] = await dbCore('roles').insert({
        name: 'kasir_kantin',
        description: 'Kasir POS Kantin (Hanya Akses POS Penjualan)',
        is_system_role: 1,
        created_at: dbCore.fn.now(),
        updated_at: dbCore.fn.now()
      });
      kasirRole = { id: newRoleId, name: 'kasir_kantin' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const targetSchoolUnitId = school_unit_id && school_unit_id !== 'all' && school_unit_id !== 'foundation'
      ? Number(school_unit_id)
      : null;

    const [userId] = await dbCore('users').insert({
      username: username.trim().toLowerCase(),
      password_hash: passwordHash,
      full_name: full_name.trim(),
      account_type: 'staff',
      status: status || 'active',
      created_at: dbCore.fn.now(),
      updated_at: dbCore.fn.now()
    });

    await dbCore('user_school_roles').insert({
      user_id: userId,
      school_unit_id: targetSchoolUnitId,
      role_id: kasirRole.id,
      created_at: dbCore.fn.now(),
      updated_at: dbCore.fn.now()
    });

    const created = await this.getCashierById(userId);

    try {
      await dbCore('activity_logs').insert({
        log_type: 'admin_action',
        user_id: adminUser?.id || null,
        school_unit_id: targetSchoolUnitId,
        application: 'kantin',
        module: 'cashiers',
        action: 'create_cashier',
        ip_address: ipAddress || null,
        data_before: null,
        data_after: JSON.stringify(created),
        occurred_at: dbCore.fn.now()
      });
    } catch (e) {}

    return created;
  }

  /**
   * Update Data Kasir & Reset Password
   */
  async updateCashier(id, payload, adminUser, ipAddress) {
    const existing = await this.getCashierById(id);

    const { full_name, password, school_unit_id, status } = payload;
    const updateUserData = { updated_at: dbCore.fn.now() };

    if (full_name && full_name.trim()) {
      updateUserData.full_name = full_name.trim();
    }
    if (status && ['active', 'inactive'].includes(status)) {
      updateUserData.status = status;
    }
    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateUserData.password_hash = await bcrypt.hash(password.trim(), salt);
    }

    await dbCore('users').where({ id }).update(updateUserData);

    if (school_unit_id !== undefined) {
      const targetSchoolUnitId = school_unit_id && school_unit_id !== 'all' && school_unit_id !== 'foundation'
        ? Number(school_unit_id)
        : null;

      await dbCore('user_school_roles').where({ user_id: id }).update({
        school_unit_id: targetSchoolUnitId,
        updated_at: dbCore.fn.now()
      });
    }

    const updated = await this.getCashierById(id);

    try {
      await dbCore('activity_logs').insert({
        log_type: 'admin_action',
        user_id: adminUser?.id || null,
        application: 'kantin',
        module: 'cashiers',
        action: 'update_cashier',
        ip_address: ipAddress || null,
        data_before: JSON.stringify(existing),
        data_after: JSON.stringify(updated),
        occurred_at: dbCore.fn.now()
      });
    } catch (e) {}

    return updated;
  }

  /**
   * Toggle Status Kasir (Aktif / Non-Aktif)
   */
  async toggleStatus(id, status, adminUser, ipAddress) {
    const existing = await this.getCashierById(id);

    if (!['active', 'inactive'].includes(status)) {
      const error = new Error("Status harus 'active' atau 'inactive'");
      error.statusCode = 422;
      throw error;
    }

    await dbCore('users').where({ id }).update({
      status,
      updated_at: dbCore.fn.now()
    });

    try {
      await dbCore('activity_logs').insert({
        log_type: 'admin_action',
        user_id: adminUser?.id || null,
        application: 'kantin',
        module: 'cashiers',
        action: 'toggle_cashier_status',
        ip_address: ipAddress || null,
        data_before: JSON.stringify({ status: existing.status }),
        data_after: JSON.stringify({ status }),
        occurred_at: dbCore.fn.now()
      });
    } catch (e) {}

    return this.getCashierById(id);
  }

  /**
   * Hapus Akun Kasir (atau non-aktifkan jika ada riwayat transaksi)
   */
  async deleteCashier(id, adminUser, ipAddress) {
    const existing = await this.getCashierById(id);

    // Cek apakah ada riwayat transaksi penjualan kasir di kantin DB
    let txCount = 0;
    try {
      const countRes = await dbKantin('sales_transactions').where({ cashier_user_id: id }).count('id as total').first();
      txCount = parseInt(countRes?.total, 10) || 0;
    } catch (e) {}

    if (txCount > 0) {
      // Sesuai aturan #3 AGENTS.md: Data uang/transaksi tidak dihapus fisik
      // Non-aktifkan akun kasir agar integritas audit transaksi tetap terjaga
      await dbCore('users').where({ id }).update({
        status: 'inactive',
        updated_at: dbCore.fn.now()
      });

      return {
        id: Number(id),
        soft_deleted: true,
        message: `Akun kasir "${existing.full_name}" memiliki ${txCount} riwayat transaksi dan telah dinon-aktifkan untuk menjaga integritas pembukuan.`
      };
    }

    // Hapus relasi role dan user jika belum ada riwayat transaksi
    await dbCore('user_school_roles').where({ user_id: id }).del();
    await dbCore('users').where({ id }).del();

    try {
      await dbCore('activity_logs').insert({
        log_type: 'admin_action',
        user_id: adminUser?.id || null,
        application: 'kantin',
        module: 'cashiers',
        action: 'delete_cashier',
        ip_address: ipAddress || null,
        data_before: JSON.stringify(existing),
        data_after: null,
        occurred_at: dbCore.fn.now()
      });
    } catch (e) {}

    return {
      id: Number(id),
      soft_deleted: false,
      message: `Akun kasir "${existing.full_name}" berhasil dihapus.`
    };
  }
}

module.exports = new CashiersService();
