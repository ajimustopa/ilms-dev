/**
 * Procurement Service Implementation
 * Modul Sarpras: Pengadaan (Vendors, Procurements)
 */
const db = require('../../../config/db/sarpras');
const { validateUser } = require('../utils/crossModuleHelper');

class ProcurementService {
  // ==========================================
  // 1. Vendors (Supplier)
  // ==========================================
  async listVendors(schoolUnitId, query = {}) {
    // Vendor bisa spesifik school_unit_id atau yayasan-wide (school_unit_id is null)
    let q = db('vendors').where(builder => {
      builder.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id');
    });

    if (query.category) {
      q = q.where('category', query.category);
    }
    if (query.search) {
      q = q.where('name', 'like', `%${query.search.trim()}%`);
    }

    return q.orderBy('id', 'asc');
  }

  async getVendorById(schoolUnitId, id) {
    const vendor = await db('vendors')
      .where({ id })
      .where(b => b.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id'))
      .first();

    if (!vendor) {
      const err = new Error('Vendor tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return vendor;
  }

  async createVendor(schoolUnitId, payload) {
    const [id] = await db('vendors').insert({
      school_unit_id: schoolUnitId,
      name: payload.name,
      contact: payload.contact || null,
      category: payload.category || null,
      created_at: new Date(),
      updated_at: new Date()
    });
    return this.getVendorById(schoolUnitId, id);
  }

  async updateVendor(schoolUnitId, id, payload) {
    await this.getVendorById(schoolUnitId, id);
    const updateData = { ...payload, updated_at: new Date() };
    delete updateData.id;

    await db('vendors').where({ id }).update(updateData);
    return this.getVendorById(schoolUnitId, id);
  }

  async deleteVendor(schoolUnitId, id) {
    await this.getVendorById(schoolUnitId, id);
    const hasProc = await db('procurements').where({ vendor_id: id }).first();
    if (hasProc) {
      const err = new Error('Vendor tidak dapat dihapus karena masih digunakan dalam riwayat pengadaan');
      err.statusCode = 409;
      throw err;
    }
    await db('vendors').where({ id }).delete();
    return { message: 'Vendor berhasil dihapus' };
  }

  // ==========================================
  // 2. Procurements (Pengadaan Barang)
  // ==========================================
  async listProcurements(schoolUnitId, query = {}) {
    let q = db('procurements')
      .leftJoin('vendors', 'procurements.vendor_id', 'vendors.id')
      .where('procurements.school_unit_id', schoolUnitId)
      .select('procurements.*', 'vendors.name as vendor_name');

    if (query.status) {
      q = q.where('procurements.status', query.status);
    }
    if (query.vendor_id) {
      q = q.where('procurements.vendor_id', query.vendor_id);
    }
    if (query.search) {
      q = q.where('procurements.item_name', 'like', `%${query.search.trim()}%`);
    }

    return q.orderBy('procurements.id', 'desc');
  }

  async getProcurementById(schoolUnitId, id) {
    const proc = await db('procurements')
      .leftJoin('vendors', 'procurements.vendor_id', 'vendors.id')
      .where('procurements.id', id)
      .where('procurements.school_unit_id', schoolUnitId)
      .select('procurements.*', 'vendors.name as vendor_name')
      .first();

    if (!proc) {
      const err = new Error('Data pengadaan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return proc;
  }

  async createProcurement(schoolUnitId, payload, requestedByUserId) {
    await validateUser(requestedByUserId);

    if (payload.vendor_id) {
      const vendor = await db('vendors').where({ id: payload.vendor_id }).first();
      if (!vendor) {
        const err = new Error('Vendor tidak valid');
        err.statusCode = 400;
        throw err;
      }
    }

    const [id] = await db('procurements').insert({
      school_unit_id: schoolUnitId,
      vendor_id: payload.vendor_id || null,
      item_name: payload.item_name,
      quantity: payload.quantity,
      unit: payload.unit || null,
      status: 'diajukan',
      requested_by: requestedByUserId,
      finance_reference_id: payload.finance_reference_id || null,
      created_at: new Date(),
      updated_at: new Date()
    });

    return this.getProcurementById(schoolUnitId, id);
  }

  async approveProcurement(schoolUnitId, id, approvedByUserId) {
    const proc = await this.getProcurementById(schoolUnitId, id);
    if (proc.status !== 'diajukan') {
      const err = new Error(`Pengadaan tidak dapat disetujui karena berstatus ${proc.status}`);
      err.statusCode = 400;
      throw err;
    }

    await validateUser(approvedByUserId);

    await db('procurements').where({ id, school_unit_id: schoolUnitId }).update({
      status: 'disetujui',
      approved_by: approvedByUserId,
      updated_at: new Date()
    });

    return this.getProcurementById(schoolUnitId, id);
  }

  async receiveProcurement(schoolUnitId, id) {
    const proc = await this.getProcurementById(schoolUnitId, id);
    if (proc.status !== 'disetujui') {
      const err = new Error(`Barang pengadaan hanya dapat ditandai diterima bila statusnya sudah disetujui (status saat ini: ${proc.status})`);
      err.statusCode = 400;
      throw err;
    }

    await db('procurements').where({ id, school_unit_id: schoolUnitId }).update({
      status: 'diterima',
      received_at: new Date(),
      updated_at: new Date()
    });

    return this.getProcurementById(schoolUnitId, id);
  }

  // Internal Service-to-Service: Keuangan mengisi finance_reference_id
  async updateFinanceReference(id, payload) {
    const proc = await db('procurements').where({ id }).first();
    if (!proc) {
      const err = new Error('Pengadaan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('procurements').where({ id }).update({
      finance_reference_id: payload.finance_reference_id,
      updated_at: new Date()
    });

    return db('procurements').where({ id }).first();
  }
}

module.exports = new ProcurementService();
