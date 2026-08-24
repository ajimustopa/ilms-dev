/**
 * Employment Statuses Service Implementation
 * Modul Kepegawaian - Master Data Status Kepegawaian Fleksibel
 */
const db = require('../../../config/db/kepegawaian');

class EmploymentStatusesService {
  /**
   * Daftar seluruh status kepegawaian (dengan filter & search)
   */
  async listStatuses(query = {}) {
    let baseQuery = db('employment_statuses');

    if (query.is_active !== undefined) {
      const isActive = query.is_active === 'true' || query.is_active === true || query.is_active === 1 || query.is_active === '1';
      baseQuery = baseQuery.where('is_active', isActive);
    }

    if (query.category) {
      baseQuery = baseQuery.where('category', query.category);
    }

    if (query.search) {
      baseQuery = baseQuery.where((b) => {
        b.where('name', 'like', `%${query.search}%`)
          .orWhere('code', 'like', `%${query.search}%`)
          .orWhere('description', 'like', `%${query.search}%`);
      });
    }

    const statuses = await baseQuery
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');

    // Hitung juga jumlah pegawai yang sedang memakai status ini
    const usageCounts = await db('employees')
      .groupBy('employment_status')
      .select('employment_status', db.raw('COUNT(*) as total_employees'));

    const countMap = {};
    usageCounts.forEach((u) => {
      countMap[u.employment_status] = parseInt(u.total_employees, 10);
    });

    return statuses.map((s) => ({
      ...s,
      is_active: Boolean(s.is_active),
      employee_count: countMap[s.code] || 0
    }));
  }

  /**
   * Detail satu status kepegawaian
   */
  async getStatusById(id) {
    const status = await db('employment_statuses').where({ id }).first();
    if (!status) {
      const error = new Error('Status kepegawaian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return {
      ...status,
      is_active: Boolean(status.is_active)
    };
  }

  /**
   * Tambah status kepegawaian baru
   */
  async createStatus(payload) {
    const { code, name, category, description, is_active, sort_order } = payload;

    if (!code || !name) {
      const error = new Error('Field code dan name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const cleanCode = code.trim().toLowerCase().replace(/\s+/g, '_');

    // Cek duplikasi kode
    const existing = await db('employment_statuses').where({ code: cleanCode }).first();
    if (existing) {
      const error = new Error(`Kode status '${cleanCode}' sudah digunakan`);
      error.statusCode = 409;
      throw error;
    }

    const [id] = await db('employment_statuses').insert({
      code: cleanCode,
      name: name.trim(),
      category: category || 'umum',
      description: description || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      sort_order: sort_order !== undefined ? parseInt(sort_order, 10) : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getStatusById(id);
  }

  /**
   * Update status kepegawaian
   */
  async updateStatus(id, payload) {
    const existing = await db('employment_statuses').where({ id }).first();
    if (!existing) {
      const error = new Error('Status kepegawaian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };

    if (payload.code && payload.code.trim().toLowerCase() !== existing.code) {
      const newCode = payload.code.trim().toLowerCase().replace(/\s+/g, '_');
      const duplicate = await db('employment_statuses').where({ code: newCode }).whereNot({ id }).first();
      if (duplicate) {
        const error = new Error(`Kode status '${newCode}' sudah digunakan`);
        error.statusCode = 409;
        throw error;
      }
      // Update cascade ke employees jika kode berubah
      await db('employees').where({ employment_status: existing.code }).update({ employment_status: newCode });
      updateData.code = newCode;
    }

    if (payload.name) updateData.name = payload.name.trim();
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.is_active !== undefined) updateData.is_active = Boolean(payload.is_active);
    if (payload.sort_order !== undefined) updateData.sort_order = parseInt(payload.sort_order, 10);

    await db('employment_statuses').where({ id }).update(updateData);
    return this.getStatusById(id);
  }

  /**
   * Hapus status kepegawaian
   */
  async deleteStatus(id) {
    const existing = await db('employment_statuses').where({ id }).first();
    if (!existing) {
      const error = new Error('Status kepegawaian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Cek apakah ada pegawai yang sedang menggunakan status ini
    const usedCount = await db('employees').where({ employment_status: existing.code }).count('id as total').first();
    const count = parseInt(usedCount.total, 10);
    if (count > 0) {
      const error = new Error(`Status '${existing.name}' tidak dapat dihapus karena masih digunakan oleh ${count} pegawai. Silakan nonaktifkan status ini.`);
      error.statusCode = 409;
      throw error;
    }

    await db('employment_statuses').where({ id }).del();
    return { id: Number(id), deleted: true };
  }
}

module.exports = new EmploymentStatusesService();
