/**
 * Vendors Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.3
 */
const db = require('../../../config/db/kantin');

class VendorsService {
  async listVendors(schoolUnitId, query = {}) {
    let q = db('vendors').where('school_unit_id', schoolUnitId);

    if (query.status) {
      q = q.where('status', query.status);
    }
    if (query.search) {
      q = q.where(function() {
        this.where('vendor_name', 'like', `%${query.search}%`)
            .orWhere('contact', 'like', `%${query.search}%`);
      });
    }

    return q.orderBy('id', 'desc');
  }

  async getVendorById(schoolUnitId, id) {
    return db('vendors').where({ id, school_unit_id: schoolUnitId }).first();
  }

  async createVendor(schoolUnitId, payload) {
    const { vendor_name, contact = null, address = null } = payload;
    const [id] = await db('vendors').insert({
      school_unit_id: schoolUnitId,
      vendor_name,
      contact,
      address,
      status: 'active'
    });
    return this.getVendorById(schoolUnitId, id);
  }

  async updateVendor(schoolUnitId, id, payload) {
    const vendor = await this.getVendorById(schoolUnitId, id);
    if (!vendor) return null;

    const { vendor_name, contact, address } = payload;
    await db('vendors')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        vendor_name: vendor_name !== undefined ? vendor_name : vendor.vendor_name,
        contact: contact !== undefined ? contact : vendor.contact,
        address: address !== undefined ? address : vendor.address,
        updated_at: db.fn.now()
      });

    return this.getVendorById(schoolUnitId, id);
  }

  async updateStatus(schoolUnitId, id, payload) {
    const vendor = await this.getVendorById(schoolUnitId, id);
    if (!vendor) return null;

    const { status, status_note = null } = payload;
    await db('vendors')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status,
        status_note,
        status_changed_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    return this.getVendorById(schoolUnitId, id);
  }
}

module.exports = new VendorsService();
