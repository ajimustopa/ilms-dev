/**
 * Legacy Migration Controller for Keuangan Module
 */
const legacyService = require('./service');

class LegacyMigrationController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  getCutoverDate = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await legacyService.getCutoverSetting(schoolUnitId);
      res.json({ success: true, data, message: 'Data cutover date berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  setCutoverDate = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await legacyService.setOrUpdateCutoverDate(schoolUnitId, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Tanggal cutover sistem berhasil disimpan', errors: null });
    } catch (err) { next(err); }
  };

  createLegacyBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await legacyService.createLegacyBill(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Tagihan historis berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  addLegacyPayment = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await legacyService.addLegacyPayment(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Pembayaran historis berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  listLegacyBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await legacyService.listLegacyBills(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar tagihan historis berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new LegacyMigrationController();
