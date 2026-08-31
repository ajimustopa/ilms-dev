/**
 * Reports Controller for Keuangan Module
 * Supports JSON (default) and PDF streaming (?format=pdf)
 */
const reportsService = require('./service');
const crossModuleServices = require('../common/crossModuleServices');
const pdfGenerator = require('./pdfGenerator');

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

      if (req.query.format === 'pdf') {
        const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);
        const periodStr = req.query.period_from && req.query.period_to
          ? `${req.query.period_from} s/d ${req.query.period_to}`
          : (req.query.period || 'Semua Periode');
        const filename = `buku-besar-${new Date().toISOString().slice(0, 10)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = pdfGenerator.generateGeneralLedgerPdf(data, schoolUnit, req.user, periodStr);
        doc.pipe(res);
        return;
      }

      res.json({ success: true, data, message: 'Laporan buku besar berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getTrialBalance = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getTrialBalance(schoolUnitId, req.query.period);

      if (req.query.format === 'pdf') {
        const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);
        const filename = `neraca-saldo-${data.period || new Date().toISOString().slice(0, 10)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = pdfGenerator.generateTrialBalancePdf(data, schoolUnit, req.user);
        doc.pipe(res);
        return;
      }

      res.json({ success: true, data, message: 'Laporan neraca saldo berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getIncomeStatement = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getIncomeStatement(schoolUnitId, req.query.period);

      if (req.query.format === 'pdf') {
        const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);
        const filename = `laba-rugi-surplus-defisit-${data.period || new Date().toISOString().slice(0, 10)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = pdfGenerator.generateIncomeStatementPdf(data, schoolUnit, req.user);
        doc.pipe(res);
        return;
      }

      res.json({ success: true, data, message: 'Laporan surplus/defisit berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getCashFlow = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getCashFlow(schoolUnitId, req.query.period);

      if (req.query.format === 'pdf') {
        const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);
        const filename = `arus-kas-${data.period || new Date().toISOString().slice(0, 10)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = pdfGenerator.generateCashFlowPdf(data, schoolUnit, req.user);
        doc.pipe(res);
        return;
      }

      res.json({ success: true, data, message: 'Laporan arus kas berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getBalanceSheet = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getBalanceSheet(schoolUnitId, req.query.period);

      if (req.query.format === 'pdf') {
        const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);
        const filename = `neraca-keuangan-${data.period || new Date().toISOString().slice(0, 10)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = pdfGenerator.generateBalanceSheetPdf(data, schoolUnit, req.user);
        doc.pipe(res);
        return;
      }

      res.json({ success: true, data, message: 'Laporan neraca berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new ReportsController();
