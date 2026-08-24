/**
 * Facility Controller Implementation
 */
const facilityService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  createSiteSchema,
  updateSiteSchema,
  createBuildingSchema,
  updateBuildingSchema,
  createRoomSchema,
  updateRoomSchema
} = require('./validators');

class FacilityController {
  // Sites
  async listSites(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await facilityService.listSites(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar lahan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getSiteById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await facilityService.getSiteById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail lahan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createSite(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createSiteSchema.parse(req.body);
      const data = await facilityService.createSite(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Lahan berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateSite(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateSiteSchema.parse(req.body);
      const data = await facilityService.updateSite(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Lahan berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteSite(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await facilityService.deleteSite(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Buildings
  async listBuildings(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await facilityService.listBuildings(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar bangunan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getBuildingById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await facilityService.getBuildingById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail bangunan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createBuilding(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createBuildingSchema.parse(req.body);
      const data = await facilityService.createBuilding(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Bangunan berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateBuilding(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateBuildingSchema.parse(req.body);
      const data = await facilityService.updateBuilding(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Bangunan berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteBuilding(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await facilityService.deleteBuilding(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Rooms
  async listRooms(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await facilityService.listRooms(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar ruangan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getRoomById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await facilityService.getRoomById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail ruangan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createRoom(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createRoomSchema.parse(req.body);
      const data = await facilityService.createRoom(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Ruangan berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRoom(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateRoomSchema.parse(req.body);
      const data = await facilityService.updateRoom(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Ruangan berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteRoom(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await facilityService.deleteRoom(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Internal Service-to-Service
  async listInternalRooms(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id ? Number(req.query.school_unit_id) : null;
      const data = await facilityService.listInternalRooms(schoolUnitId);
      res.json({ success: true, data, message: 'Data ruangan internal berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FacilityController();
