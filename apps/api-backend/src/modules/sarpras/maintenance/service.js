/**
 * Maintenance Service Implementation
 * Modul Sarpras: Pemeliharaan & Perbaikan (Maintenance Requests)
 */
const db = require('../../../config/db/sarpras');
const { validateEmployee } = require('../utils/crossModuleHelper');

class MaintenanceService {
  async listRequests(schoolUnitId, user, query = {}) {
    let q = db('maintenance_requests')
      .leftJoin('assets', 'maintenance_requests.asset_id', 'assets.id')
      .leftJoin('facility_rooms', 'maintenance_requests.facility_room_id', 'facility_rooms.id')
      .where('maintenance_requests.school_unit_id', schoolUnitId)
      .select(
        'maintenance_requests.*',
        'assets.name as asset_name',
        'assets.asset_code',
        'facility_rooms.room_name'
      );

    const isSpecialAdmin = user.account_type === 'admin' || user.role_name === 'super_admin' || user.role_name === 'admin_sarpras';
    if (!isSpecialAdmin && user.ref_type === 'employee' && user.ref_id) {
      q = q.where('maintenance_requests.reported_by', user.ref_id);
    } else if (query.reported_by) {
      q = q.where('maintenance_requests.reported_by', query.reported_by);
    }

    if (query.repair_status) {
      q = q.where('maintenance_requests.repair_status', query.repair_status);
    }
    if (query.asset_id) {
      q = q.where('maintenance_requests.asset_id', query.asset_id);
    }
    if (query.room_id) {
      q = q.where('maintenance_requests.facility_room_id', query.room_id);
    }

    return q.orderBy('maintenance_requests.id', 'desc');
  }

  async getRequestById(schoolUnitId, id) {
    const request = await db('maintenance_requests')
      .leftJoin('assets', 'maintenance_requests.asset_id', 'assets.id')
      .leftJoin('facility_rooms', 'maintenance_requests.facility_room_id', 'facility_rooms.id')
      .where('maintenance_requests.id', id)
      .where('maintenance_requests.school_unit_id', schoolUnitId)
      .select(
        'maintenance_requests.*',
        'assets.name as asset_name',
        'assets.asset_code',
        'facility_rooms.room_name'
      )
      .first();

    if (!request) {
      const err = new Error('Laporan pemeliharaan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return request;
  }

  async createRequest(schoolUnitId, payload) {
    await validateEmployee(payload.reported_by);

    if (payload.asset_id) {
      const asset = await db('assets').where({ id: payload.asset_id, school_unit_id: schoolUnitId }).first();
      if (!asset) {
        const err = new Error('Aset (asset_id) tidak valid');
        err.statusCode = 400;
        throw err;
      }
    }

    if (payload.facility_room_id) {
      const room = await db('facility_rooms').where({ id: payload.facility_room_id, school_unit_id: schoolUnitId }).first();
      if (!room) {
        const err = new Error('Ruangan (facility_room_id) tidak valid');
        err.statusCode = 400;
        throw err;
      }
    }

    const [id] = await db('maintenance_requests').insert({
      school_unit_id: schoolUnitId,
      asset_id: payload.asset_id || null,
      facility_room_id: payload.facility_room_id || null,
      reported_by: payload.reported_by,
      damage_report: payload.damage_report,
      repair_status: 'dilaporkan',
      created_at: new Date(),
      updated_at: new Date()
    });

    return this.getRequestById(schoolUnitId, id);
  }

  async updateRequest(schoolUnitId, id, payload) {
    await this.getRequestById(schoolUnitId, id);
    const updateData = { ...payload, updated_at: new Date() };
    delete updateData.id;
    delete updateData.school_unit_id;
    delete updateData.reported_by;

    await db('maintenance_requests').where({ id, school_unit_id: schoolUnitId }).update(updateData);
    return this.getRequestById(schoolUnitId, id);
  }

  async closeRequest(schoolUnitId, id, payload) {
    await this.getRequestById(schoolUnitId, id);
    const updateData = {
      repair_status: 'ditutup',
      closed_at: new Date(),
      updated_at: new Date()
    };
    if (payload.cost !== undefined) {
      updateData.cost = payload.cost;
    }

    await db('maintenance_requests').where({ id, school_unit_id: schoolUnitId }).update(updateData);
    const updated = await this.getRequestById(schoolUnitId, id);
    return { request: updated, message: 'Tiket perbaikan berhasil ditutup' };
  }
}

module.exports = new MaintenanceService();
