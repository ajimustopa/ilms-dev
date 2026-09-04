/**
 * Other Incomes Controller for Keuangan Module
 */
const otherIncomesService = require('./service');

class OtherIncomesController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  listOtherIncomes = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await otherIncomesService.listOtherIncomes(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar penerimaan non-SPP berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getRapbsIncomeSources = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await otherIncomesService.getRapbsIncomeSources(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data, message: 'Daftar pos sumber pendapatan RAPBS berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getOtherIncomeById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await otherIncomesService.getOtherIncomeById(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data penerimaan tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail penerimaan non-SPP berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createOtherIncome = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await otherIncomesService.createOtherIncome(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Penerimaan non-SPP berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  updateOtherIncome = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await otherIncomesService.updateOtherIncome(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data penerimaan tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Penerimaan non-SPP berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  deleteOtherIncome = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const success = await otherIncomesService.deleteOtherIncome(schoolUnitId, req.params.id, req.user?.id);
      if (!success) return res.status(404).json({ success: false, data: null, message: 'Data penerimaan tidak ditemukan', errors: null });
      res.json({ success: true, data: null, message: 'Penerimaan non-SPP berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new OtherIncomesController();
