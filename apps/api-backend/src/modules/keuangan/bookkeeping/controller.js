/**
 * Bookkeeping Controller for Keuangan Module
 */
const bookkeepingService = require('./service');

class BookkeepingController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  listJournalEntries = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await bookkeepingService.listJournalEntries(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar jurnal umum berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getJournalEntryById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await bookkeepingService.getJournalEntryById(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Jurnal tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail jurnal berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createManualJournalEntry = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await bookkeepingService.createManualJournalEntry(schoolUnitId, req.body, req.user?.id);
      if (result.error === 'VALIDATION') {
        return res.status(400).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'UNPROCESSABLE') {
        return res.status(422).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.status(201).json({ success: true, data: result.data, message: 'Jurnal manual berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  };

  listSavingsAccounts = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await bookkeepingService.listSavingsAccounts(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar rekening tabungan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createSavingsAccount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await bookkeepingService.getOrCreateSavingsAccount(schoolUnitId, req.body.owner_type, req.body.owner_id, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Rekening tabungan berhasil dibuat/ditemukan', errors: null });
    } catch (err) { next(err); }
  };

  depositSavings = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await bookkeepingService.depositSavings(schoolUnitId, req.params.id, req.body.amount, req.user?.id);
      if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      if (result.error === 'VALIDATION') return res.status(400).json({ success: false, data: null, message: result.message, errors: null });
      res.json({ success: true, data: result.data, message: 'Setoran tabungan berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  withdrawSavings = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await bookkeepingService.withdrawSavings(schoolUnitId, req.params.id, req.body.amount, req.user?.id);
      if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      if (result.error === 'VALIDATION') return res.status(400).json({ success: false, data: null, message: result.message, errors: null });
      if (result.error === 'UNPROCESSABLE') return res.status(422).json({ success: false, data: null, message: result.message, errors: null });
      res.json({ success: true, data: result.data, message: 'Penarikan tabungan berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  listSavingsTransactions = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await bookkeepingService.listSavingsTransactions(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Riwayat transaksi tabungan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  listFiscalYearClosings = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await bookkeepingService.listFiscalYearClosings(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data, message: 'Daftar riwayat tutup buku tahunan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  closeFiscalYear = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await bookkeepingService.closeFiscalYear(schoolUnitId, req.body.academic_year_id, req.user?.id);
      if (result.error === 'CONFLICT') return res.status(409).json({ success: false, data: null, message: result.message, errors: null });
      if (result.error === 'UNPROCESSABLE') return res.status(422).json({ success: false, data: null, message: result.message, errors: null });
      res.status(201).json({ success: true, data: result.data, message: 'Tutup buku tahunan berhasil diproses', errors: null });
    } catch (err) { next(err); }
  };

  reopenFiscalYear = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await bookkeepingService.reopenFiscalYear(schoolUnitId, req.params.id, req.user?.id);
      if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      res.json({ success: true, data: result.data, message: 'Tahun buku berhasil dibuka kembali', errors: null });
    } catch (err) { next(err); }
  };

  listAuditLogs = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await bookkeepingService.listAuditLogs(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Audit log transaksi keuangan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new BookkeepingController();
