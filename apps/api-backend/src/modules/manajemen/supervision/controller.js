/**
 * Supervision Controller Implementation
 */
const supervisionService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');

class SupervisionController {
  async listSchedules(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await supervisionService.listSchedules(schoolUnitId, req.query, req.user);
      res.json({ success: true, data, message: 'Daftar jadwal supervisi berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getScheduleById(req, res, next) {
    try {
      const data = await supervisionService.getScheduleById(req.params.id);
      res.json({ success: true, data, message: 'Detail jadwal supervisi berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createSchedule(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await supervisionService.createSchedule({ ...req.body, school_unit_id: schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Jadwal supervisi berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateScheduleStatus(req, res, next) {
    try {
      const data = await supervisionService.updateScheduleStatus(req.params.id, req.body.status);
      res.json({ success: true, data, message: 'Status supervisi berhasil diubah', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async addResult(req, res, next) {
    try {
      const data = await supervisionService.addResult(req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'Hasil supervisi berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getResults(req, res, next) {
    try {
      const data = await supervisionService.getResults(req.params.id);
      res.json({ success: true, data, message: 'Hasil supervisi berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SupervisionController();
