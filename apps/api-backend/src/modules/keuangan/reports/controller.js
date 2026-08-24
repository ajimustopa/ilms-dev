/**
 * Reports Controller for Keuangan Module
 */
const reportsService = require('./service');

class ReportsController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  getBudgetRealization = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getBudgetRealizationReport(schoolUnitId, req.query.budget_plan_id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data realisasi anggaran tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Laporan realisasi RAPBS berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getGeneralLedger = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getGeneralLedger(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Laporan buku besar berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getTrialBalance = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getTrialBalance(schoolUnitId, req.query.period);
      res.json({ success: true, data, message: 'Laporan neraca saldo berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getIncomeStatement = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getIncomeStatement(schoolUnitId, req.query.period);
      res.json({ success: true, data, message: 'Laporan surplus/defisit berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getCashFlow = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getCashFlow(schoolUnitId, req.query.period);
      res.json({ success: true, data, message: 'Laporan arus kas berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getBalanceSheet = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getBalanceSheet(schoolUnitId, req.query.period);
      res.json({ success: true, data, message: 'Laporan neraca berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new ReportsController();
