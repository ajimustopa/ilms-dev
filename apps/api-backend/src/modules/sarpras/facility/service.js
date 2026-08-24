/**
 * Facility Service Implementation
 * Modul Sarpras: Lokasi & Denah (Sites, Buildings, Rooms)
 */
const db = require('../../../config/db/sarpras');

class FacilityService {
  // ==========================================
  // 1. Sites (Lahan)
  // ==========================================
  async listSites(schoolUnitId, query = {}) {
    let q = db('facility_sites').where({ school_unit_id: schoolUnitId });
    if (query.search) {
      q = q.where('name', 'like', `%${query.search.trim()}%`);
    }
    return q.orderBy('id', 'asc');
  }

  async getSiteById(schoolUnitId, id) {
    const site = await db('facility_sites').where({ id, school_unit_id: schoolUnitId }).first();
    if (!site) {
      const err = new Error('Lahan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    const buildings = await db('facility_buildings').where({ facility_site_id: id });
    return { ...site, buildings };
  }

  async createSite(schoolUnitId, payload) {
    const [id] = await db('facility_sites').insert({
      school_unit_id: schoolUnitId,
      name: payload.name,
      address: payload.address || null,
      land_area_m2: payload.land_area_m2 || null,
      ownership_status: payload.ownership_status || null,
      certificate_number: payload.certificate_number || null,
      notes: payload.notes || null,
      created_at: new Date(),
      updated_at: new Date()
    });
    return this.getSiteById(schoolUnitId, id);
  }

  async updateSite(schoolUnitId, id, payload) {
    await this.getSiteById(schoolUnitId, id);
    const updateData = { ...payload, updated_at: new Date() };
    delete updateData.id;
    delete updateData.school_unit_id;

    await db('facility_sites').where({ id, school_unit_id: schoolUnitId }).update(updateData);
    return this.getSiteById(schoolUnitId, id);
  }

  async deleteSite(schoolUnitId, id) {
    await this.getSiteById(schoolUnitId, id);
    const hasBuildings = await db('facility_buildings').where({ facility_site_id: id }).first();
    if (hasBuildings) {
      const err = new Error('Lahan tidak dapat dihapus karena masih memiliki data bangunan');
      err.statusCode = 409;
      throw err;
    }
    await db('facility_sites').where({ id, school_unit_id: schoolUnitId }).delete();
    return { message: 'Lahan berhasil dihapus' };
  }

  // ==========================================
  // 2. Buildings (Bangunan)
  // ==========================================
  async listBuildings(schoolUnitId, query = {}) {
    let q = db('facility_buildings')
      .join('facility_sites', 'facility_buildings.facility_site_id', 'facility_sites.id')
      .where('facility_buildings.school_unit_id', schoolUnitId)
      .select('facility_buildings.*', 'facility_sites.name as site_name');

    if (query.site_id) {
      q = q.where('facility_buildings.facility_site_id', query.site_id);
    }
    if (query.search) {
      q = q.where('facility_buildings.name', 'like', `%${query.search.trim()}%`);
    }
    return q.orderBy('facility_buildings.id', 'asc');
  }

  async getBuildingById(schoolUnitId, id) {
    const building = await db('facility_buildings')
      .join('facility_sites', 'facility_buildings.facility_site_id', 'facility_sites.id')
      .where('facility_buildings.id', id)
      .where('facility_buildings.school_unit_id', schoolUnitId)
      .select('facility_buildings.*', 'facility_sites.name as site_name')
      .first();

    if (!building) {
      const err = new Error('Bangunan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    const rooms = await db('facility_rooms').where({ facility_building_id: id });
    return { ...building, rooms };
  }

  async createBuilding(schoolUnitId, payload) {
    // Validasi keberadaan site
    const site = await db('facility_sites').where({ id: payload.facility_site_id, school_unit_id: schoolUnitId }).first();
    if (!site) {
      const err = new Error('Lahan (facility_site_id) tidak valid untuk satuan pendidikan ini');
      err.statusCode = 400;
      throw err;
    }

    const [id] = await db('facility_buildings').insert({
      facility_site_id: payload.facility_site_id,
      school_unit_id: schoolUnitId,
      name: payload.name,
      building_function: payload.building_function || null,
      floor_count: payload.floor_count || null,
      building_area_m2: payload.building_area_m2 || null,
      construction_year: payload.construction_year || null,
      condition: payload.condition || 'baik',
      created_at: new Date(),
      updated_at: new Date()
    });
    return this.getBuildingById(schoolUnitId, id);
  }

  async updateBuilding(schoolUnitId, id, payload) {
    await this.getBuildingById(schoolUnitId, id);
    const updateData = { ...payload, updated_at: new Date() };
    delete updateData.id;
    delete updateData.school_unit_id;

    await db('facility_buildings').where({ id, school_unit_id: schoolUnitId }).update(updateData);
    return this.getBuildingById(schoolUnitId, id);
  }

  async deleteBuilding(schoolUnitId, id) {
    await this.getBuildingById(schoolUnitId, id);
    const hasRooms = await db('facility_rooms').where({ facility_building_id: id }).first();
    if (hasRooms) {
      const err = new Error('Bangunan tidak dapat dihapus karena masih memiliki data ruangan');
      err.statusCode = 409;
      throw err;
    }
    await db('facility_buildings').where({ id, school_unit_id: schoolUnitId }).delete();
    return { message: 'Bangunan berhasil dihapus' };
  }

  // ==========================================
  // 3. Rooms (Ruangan)
  // ==========================================
  async listRooms(schoolUnitId, query = {}) {
    let q = db('facility_rooms')
      .join('facility_buildings', 'facility_rooms.facility_building_id', 'facility_buildings.id')
      .join('facility_sites', 'facility_buildings.facility_site_id', 'facility_sites.id')
      .where('facility_rooms.school_unit_id', schoolUnitId)
      .select(
        'facility_rooms.*',
        'facility_buildings.name as building_name',
        'facility_sites.name as site_name'
      );

    if (query.building_id) {
      q = q.where('facility_rooms.facility_building_id', query.building_id);
    }
    if (query.room_type) {
      q = q.where('facility_rooms.room_type', query.room_type);
    }
    if (query.condition) {
      q = q.where('facility_rooms.condition', query.condition);
    }
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(b => b.where('facility_rooms.room_name', 'like', s).orWhere('facility_rooms.room_code', 'like', s));
    }
    return q.orderBy('facility_rooms.id', 'asc');
  }

  async getRoomById(schoolUnitId, id) {
    const room = await db('facility_rooms')
      .join('facility_buildings', 'facility_rooms.facility_building_id', 'facility_buildings.id')
      .join('facility_sites', 'facility_buildings.facility_site_id', 'facility_sites.id')
      .where('facility_rooms.id', id)
      .where('facility_rooms.school_unit_id', schoolUnitId)
      .select(
        'facility_rooms.*',
        'facility_buildings.name as building_name',
        'facility_sites.name as site_name'
      )
      .first();

    if (!room) {
      const err = new Error('Ruangan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    const assets = await db('assets').where({ facility_room_id: id, status: 'active' });
    return { ...room, assets };
  }

  async createRoom(schoolUnitId, payload) {
    // Validasi bangunan
    const building = await db('facility_buildings').where({ id: payload.facility_building_id, school_unit_id: schoolUnitId }).first();
    if (!building) {
      const err = new Error('Bangunan (facility_building_id) tidak valid');
      err.statusCode = 400;
      throw err;
    }

    // Cek kode unik di bangunan
    const existing = await db('facility_rooms')
      .where({ facility_building_id: payload.facility_building_id, room_code: payload.room_code })
      .first();
    if (existing) {
      const err = new Error(`Kode ruangan '${payload.room_code}' sudah digunakan di bangunan ini`);
      err.statusCode = 409;
      throw err;
    }

    const [id] = await db('facility_rooms').insert({
      facility_building_id: payload.facility_building_id,
      school_unit_id: schoolUnitId,
      room_code: payload.room_code,
      room_name: payload.room_name,
      room_type: payload.room_type,
      floor_number: payload.floor_number || null,
      area_m2: payload.area_m2 || null,
      capacity: payload.capacity || null,
      condition: payload.condition || 'baik',
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_at: new Date(),
      updated_at: new Date()
    });
    return this.getRoomById(schoolUnitId, id);
  }

  async updateRoom(schoolUnitId, id, payload) {
    await this.getRoomById(schoolUnitId, id);
    const updateData = { ...payload, updated_at: new Date() };
    delete updateData.id;
    delete updateData.school_unit_id;

    await db('facility_rooms').where({ id, school_unit_id: schoolUnitId }).update(updateData);
    return this.getRoomById(schoolUnitId, id);
  }

  async deleteRoom(schoolUnitId, id) {
    await this.getRoomById(schoolUnitId, id);
    const hasAssets = await db('assets').where({ facility_room_id: id }).first();
    if (hasAssets) {
      const err = new Error('Ruangan tidak dapat dihapus karena masih memiliki aset terdaftar');
      err.statusCode = 409;
      throw err;
    }
    await db('facility_rooms').where({ id, school_unit_id: schoolUnitId }).delete();
    return { message: 'Ruangan berhasil dihapus' };
  }

  // ==========================================
  // 4. Internal Rooms (Service-to-Service: Akademik)
  // ==========================================
  async listInternalRooms(schoolUnitId) {
    let q = db('facility_rooms')
      .join('facility_buildings', 'facility_rooms.facility_building_id', 'facility_buildings.id')
      .where('facility_rooms.is_active', true);

    if (schoolUnitId) {
      q = q.where('facility_rooms.school_unit_id', schoolUnitId);
    }

    return q.select(
      'facility_rooms.id',
      'facility_rooms.school_unit_id',
      'facility_rooms.room_code',
      'facility_rooms.room_name',
      'facility_rooms.room_type',
      'facility_rooms.capacity',
      'facility_rooms.condition',
      'facility_buildings.name as building_name'
    ).orderBy('facility_rooms.id', 'asc');
  }
}

module.exports = new FacilityService();
