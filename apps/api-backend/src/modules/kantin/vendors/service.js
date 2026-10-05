/**
 * Vendors Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.3
 */
const db = require('../../../config/db/kantin');

class VendorsService {
  async listVendors(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('vendors');
    if (!isAll) {
      q = q.where('school_unit_id', schoolUnitId);
    }

    if (query.status) {
      q = q.where('status', query.status);
    }
    if (query.vendor_type) {
      q = q.where('vendor_type', query.vendor_type);
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
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('vendors').where({ id });
    if (!isAll) {
      q = q.where({ school_unit_id: schoolUnitId });
    }
    return q.first();
  }

  async createVendor(schoolUnitId, payload) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1;
    const {
      vendor_name,
      vendor_type = 'konsinyasi',
      contact = null,
      address = null,
      canteen_share_pct = 10.00
    } = payload;

    const normalizedType = (vendor_type === 'beli_putus' || vendor_type === 'suplier_grosir' || vendor_type === 'jual_lepas') ? 'beli_putus' : 'konsinyasi';
    const effectiveSharePct = normalizedType === 'beli_putus' ? 0 : (Number(canteen_share_pct) || 0);

    const [id] = await db('vendors').insert({
      school_unit_id: effectiveUnitId,
      vendor_name,
      vendor_type: normalizedType,
      contact,
      address,
      canteen_share_pct: effectiveSharePct,
      status: 'active'
    });
    return this.getVendorById(effectiveUnitId, id);
  }

  async updateVendor(schoolUnitId, id, payload) {
    const vendor = await this.getVendorById(schoolUnitId, id);
    if (!vendor) return null;

    const { vendor_name, vendor_type, contact, address, canteen_share_pct } = payload;
    const nextType = vendor_type !== undefined ? ((vendor_type === 'beli_putus' || vendor_type === 'suplier_grosir' || vendor_type === 'jual_lepas') ? 'beli_putus' : 'konsinyasi') : vendor.vendor_type;
    const nextSharePct = nextType === 'beli_putus' ? 0 : (canteen_share_pct !== undefined ? (Number(canteen_share_pct) || 0) : vendor.canteen_share_pct);

    await db('vendors')
      .where({ id: vendor.id, school_unit_id: vendor.school_unit_id })
      .update({
        vendor_name: vendor_name !== undefined ? vendor_name : vendor.vendor_name,
        vendor_type: nextType,
        contact: contact !== undefined ? contact : vendor.contact,
        address: address !== undefined ? address : vendor.address,
        canteen_share_pct: nextSharePct,
        updated_at: db.fn.now()
      });

    return this.getVendorById(schoolUnitId, id);
  }

  async updateStatus(schoolUnitId, id, payload, user = {}) {
    const vendor = await this.getVendorById(schoolUnitId, id);
    if (!vendor) return null;

    const { status, status_note = null, reason = null } = payload;
    const finalReason = status_note || reason || (status === 'active' ? 'Pengaktifan kembali mitra vendor' : 'Penonaktifan operasional mitra vendor');
    const previousStatus = vendor.status;

    await db('vendors')
      .where({ id, school_unit_id: vendor.school_unit_id })
      .update({
        status,
        status_note: finalReason,
        status_changed_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    // Catat ke tabel riwayat status vendor
    try {
      await db('vendor_status_histories').insert({
        school_unit_id: vendor.school_unit_id,
        vendor_id: vendor.id,
        previous_status: previousStatus,
        new_status: status,
        reason: finalReason,
        changed_by: user.id || null,
        changed_by_name: user.name || user.username || user.full_name || 'Petugas Kantin',
        created_at: new Date()
      });
    } catch (histErr) {
      console.warn('[Vendors] Gagal mencatat vendor_status_histories:', histErr.message);
    }

    // Catat ke canteen_activity_logs
    try {
      await db('canteen_activity_logs').insert({
        school_unit_id: vendor.school_unit_id,
        actor_user_id: user.id || null,
        action: `vendor_status_${status}`,
        target_table: 'vendors',
        target_id: vendor.id,
        note: `Status vendor ${vendor.vendor_name} diubah dari ${previousStatus} menjadi ${status}. Alasan: ${finalReason}`,
        occurred_at: new Date()
      });
    } catch (logErr) {
      console.warn('[Vendors] Gagal mencatat canteen_activity_logs:', logErr.message);
    }

    return this.getVendorById(schoolUnitId, id);
  }

  async listStatusHistories(schoolUnitId, vendorId) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('vendor_status_histories').where({ vendor_id: vendorId });
    if (!isAll) {
      q = q.where({ school_unit_id: schoolUnitId });
    }
    return q.orderBy('created_at', 'desc').orderBy('id', 'desc');
  }
}

module.exports = new VendorsService();
