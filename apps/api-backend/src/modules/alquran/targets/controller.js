/**
 * Targets Controller for Alquran Module
 */
const targetsService = require('./service');

class TargetsController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  listTargets = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await targetsService.listTargets(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar target hafalan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createTarget = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const { class_ref_id, target_type, target_value } = req.body;

      if (!class_ref_id || !target_type || target_value === undefined) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'Validasi gagal: class_ref_id, target_type, dan target_value wajib diisi',
          errors: [{ field: 'class_ref_id', message: 'Field wajib' }]
        });
      }

      const data = await targetsService.createTarget(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Target hafalan berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  };

  updateTarget = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await targetsService.updateTarget(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Target hafalan tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Target hafalan berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  deleteTarget = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const success = await targetsService.deleteTarget(schoolUnitId, req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, data: null, message: 'Target hafalan tidak ditemukan', errors: null });
      }
      res.json({ success: true, data: null, message: 'Target hafalan berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new TargetsController();
