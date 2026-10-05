/**
 * Reports Controller for Keuangan Module
 * Supports JSON (default) and PDF streaming (?format=pdf)
 */
const reportsService = require('./service');
const crossModuleServices = require('../common/crossModuleServices');
const pdfGenerator = require('./pdfGenerator');
const classStudentLedgerExport = require('./classStudentLedgerExport');

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
      const data = await reportsService.getTrialBalance(schoolUnitId, req.query);

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
      const data = await reportsService.getIncomeStatement(schoolUnitId, req.query);

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
      const data = await reportsService.getCashFlow(schoolUnitId, req.query);

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
      const data = await reportsService.getBalanceSheet(schoolUnitId, req.query);

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

  // 7. Kartu Bayar Siswa (Student Ledger)
  getStudentLedger = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getStudentLedger(schoolUnitId, req.params.student_id, req.query);

      if (req.query.format === 'pdf') {
        const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);
        const studentNameClean = (data.student?.name || 'siswa').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const filename = `kartu-bayar-${studentNameClean}-${new Date().toISOString().slice(0, 10)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const doc = pdfGenerator.generateStudentLedgerPdf(data, schoolUnit, req.user);
        doc.pipe(res);
        return;
      }

      res.json({ success: true, data, message: 'Data kartu bayar siswa berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getClassStudentLedger = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getClassStudentLedger(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Data rekap tagihan siswa per kelas berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getCollectionPerformance = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getCollectionPerformance(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Data analisis kinerja penerimaan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getStudentLedgerPdf = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getStudentLedger(schoolUnitId, req.params.student_id, req.query);
      const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);
      const studentNameClean = (data.student?.name || 'siswa').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `kartu-bayar-${studentNameClean}-${new Date().toISOString().slice(0, 10)}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const doc = pdfGenerator.generateStudentLedgerPdf(data, schoolUnit, req.user);
      doc.pipe(res);
    } catch (err) { next(err); }
  };

  listAcademicYears = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const ays = await crossModuleServices.listAcademicYears({ satuan_pendidikan_id: schoolUnitId });
      res.json({ success: true, data: ays, message: 'Daftar tahun ajaran berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  listClassGroups = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const classes = await crossModuleServices.listClassGroups(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data: classes, message: 'Daftar rombel berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  getStudentLedgerFilterOptions = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
      const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
      const queryObj = targetUnit ? { satuan_pendidikan_id: targetUnit } : {};

      const [cohorts, gradeLevels] = await Promise.all([
        crossModuleServices.listCohorts(queryObj).catch(() => []),
        crossModuleServices.listGradeLevels(queryObj).catch(() => [])
      ]);

      res.json({
        success: true,
        data: {
          cohorts,
          grade_levels: gradeLevels
        },
        message: 'Opsi filter kartu bayar siswa berhasil dimuat',
        errors: null
      });
    } catch (err) { next(err); }
  };

  listCohorts = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
      const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
      const queryObj = targetUnit ? { satuan_pendidikan_id: targetUnit } : {};
      const cohorts = await crossModuleServices.listCohorts(queryObj).catch(() => []);
      res.json({ success: true, data: cohorts, message: 'Daftar angkatan berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  listGradeLevels = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
      const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
      const queryObj = targetUnit ? { satuan_pendidikan_id: targetUnit } : {};
      const gradeLevels = await crossModuleServices.listGradeLevels(queryObj).catch(() => []);
      res.json({ success: true, data: gradeLevels, message: 'Daftar tingkat kelas berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  exportClassStudentLedgerExcel = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getClassStudentLedger(schoolUnitId, { ...req.query, no_pagination: true });
      const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);
      const buffer = classStudentLedgerExport.generateExcel(data, schoolUnit);

      const filename = `rekap-penagihan-siswa-${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) { next(err); }
  };

  exportClassStudentLedgerPdf = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getClassStudentLedger(schoolUnitId, { ...req.query, no_pagination: true });
      const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);

      const filename = `laporan-kinerja-penagihan-${new Date().toISOString().slice(0, 10)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const doc = classStudentLedgerExport.generatePdf(data, schoolUnit, req.user);
      doc.pipe(res);
    } catch (err) { next(err); }
  };

  notifyOverdueBill = async (req, res, next) => {
    try {
      const { student_id } = req.params;
      const { bill_ids, notes } = req.body || {};
      const userId = req.user?.id || 1;

      console.log(`[Stub Notifikasi Overdue] Pengingat tagihan santri #${student_id} (Bills: ${JSON.stringify(bill_ids || [])}) dikirim oleh User #${userId}. Catatan: ${notes || '-'}`);
      res.json({
        success: true,
        data: {
          student_id: Number(student_id),
          queued: true,
          status: 'stub_logged',
          timestamp: new Date().toISOString()
        },
        message: 'Pengingat tunggakan tagihan berhasil dicatat ke antrean notifikasi (Stub Modul Komunikasi)',
        errors: null
      });
    } catch (err) { next(err); }
  };

  // ============================================================
  // LAPORAN EKSEKUTIF MANAJERIAL
  // ============================================================

  getExecutiveHealth = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getExecutiveHealth(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data, message: 'Indikator kesehatan keuangan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getFinancialProjection = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getFinancialProjection(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data, message: 'Proyeksi keuangan tahun ajaran berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getFundSourceMonthlyFlow = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getFundSourceMonthlyFlow(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data, message: 'Aliran kas bulanan per sumber dana berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getProgramExpensesMatrix = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getProgramExpensesMatrix(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data, message: 'Matriks pengeluaran per program berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new ReportsController();

