/**
 * Bills Controller for Keuangan Module
 */
const billsService = require('./service');

class BillsController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  previewBillGeneration = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.previewBillGeneration(schoolUnitId, req.body);
      res.json({ success: true, data, message: 'Simulasi pembuatan tagihan berhasil', errors: null });
    } catch (err) { next(err); }
  };

  generateBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.generateBills(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Tagihan massal berhasil di-generate', errors: null });
    } catch (err) { next(err); }
  };

  listBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.listBills(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar tagihan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getBillById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.getBillById(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Tagihan tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail tagihan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  cancelBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await billsService.cancelBill(schoolUnitId, req.params.id, req.body.cancel_reason, req.user?.id);
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'CONFLICT') {
        return res.status(409).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.json({ success: true, data: result.data, message: 'Tagihan berhasil dibatalkan', errors: null });
    } catch (err) { next(err); }
  };

  runReminders = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.runReminders(schoolUnitId, req.user?.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) { next(err); }
  };

  getReminderLogs = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.getReminderLogs(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Log reminder tagihan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new BillsController();
