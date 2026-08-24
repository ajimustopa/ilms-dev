/**
 * Circulation Controller Implementation
 * Modul Perpustakaan: Peminjaman, Pengembalian, Denda, Reservasi, Buku Hilang/Rusak
 */
const circulationService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  createLoanSchema,
  returnLoanSchema,
  payFineSchema,
  createReservationSchema,
  createLostDamagedReportSchema,
  resolveLostDamagedSchema,
} = require('./validators');

class CirculationController {
  // ==========================================
  // PEMINJAMAN BUKU
  // ==========================================

  async listLoans(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await circulationService.listLoans(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar transaksi peminjaman berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getLoanById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await circulationService.getLoanById(schoolUnitId, req.params.id);
      res.json({
        success: true,
        data,
        message: 'Detail peminjaman buku berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createLoan(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createLoanSchema.parse(req.body);
      const borrowedByUserId = req.user?.id || req.user?.sub || null;
      const data = await circulationService.createLoan(schoolUnitId, parsed, borrowedByUserId);
      res.status(201).json({
        success: true,
        data,
        message: 'Peminjaman buku berhasil dicatat',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async extendLoan(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await circulationService.extendLoan(schoolUnitId, req.params.id);
      res.json({
        success: true,
        data,
        message: 'Masa peminjaman buku berhasil diperpanjang 7 hari',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async returnLoan(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const returnedToUserId = req.user?.id || req.user?.sub || null;
      const data = await circulationService.returnLoan(schoolUnitId, req.params.id, returnedToUserId);
      res.json({
        success: true,
        data,
        message: 'Pengembalian buku berhasil diproses',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async payFine(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await circulationService.payFine(schoolUnitId, req.params.id);
      res.json({
        success: true,
        data,
        message: 'Pembayaran denda berhasil diverifikasi',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // RESERVASI BUKU
  // ==========================================

  async listReservations(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await circulationService.listReservations(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar reservasi buku berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createReservation(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createReservationSchema.parse(req.body);
      const data = await circulationService.createReservation(schoolUnitId, parsed);
      res.status(201).json({
        success: true,
        data,
        message: 'Antrean reservasi buku berhasil dibuat',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelReservation(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await circulationService.cancelReservation(schoolUnitId, req.params.id);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // BUKU HILANG & RUSAK
  // ==========================================

  async listLostDamagedReports(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await circulationService.listLostDamagedReports(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar laporan buku hilang/rusak berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createLostDamagedReport(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createLostDamagedReportSchema.parse(req.body);
      const reportedByUserId = req.user?.id || req.user?.sub || null;
      const data = await circulationService.createLostDamagedReport(schoolUnitId, parsed, reportedByUserId);
      res.status(201).json({
        success: true,
        data,
        message: 'Laporan buku hilang/rusak berhasil dicatat',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async resolveLostDamagedReport(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = resolveLostDamagedSchema.parse(req.body);
      const data = await circulationService.resolveLostDamagedReport(schoolUnitId, req.params.id, parsed);
      res.json({
        success: true,
        data,
        message: 'Laporan buku hilang/rusak berhasil diselesaikan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CirculationController();
