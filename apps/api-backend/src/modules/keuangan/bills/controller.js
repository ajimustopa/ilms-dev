/**
 * Bills Controller for Keuangan Module
 */
const billsService = require('./service');

class BillsController {
  getSchoolUnitId(req) {
    const raw = req.headers['x-school-unit-id'] ||
                req.query.school_unit_id ||
                req.params.school_unit_id ||
                req.body?.school_unit_id ||
                req.user?.school_units?.[0]?.id ||
                1;
    if (typeof raw === 'string') {
      const lower = raw.toLowerCase().trim();
      if (lower === 'smp') return 1;
      if (lower === 'sma') return 2;
      if (lower === 'all' || lower === 'foundation') return null;
      const num = parseInt(raw, 10);
      if (!isNaN(num)) return num;
    }
    return raw;
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

  getStudentFeeReference = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.getStudentFeeReference(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Acuan penetapan biaya siswa berhasil diambil', errors: null });
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
      const result = await billsService.cancelBill(
        schoolUnitId,
        req.params.id,
        req.body.cancel_reason,
        req.user?.id,
        req.body.cancelled_at
      );
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'CONFLICT') {
        return res.status(409).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.json({ success: true, data: result.data, message: 'Tagihan berhasil dibatalkan', errors: null });
    } catch (err) { next(err); }
  };

  sendBillReminder = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await billsService.sendBillReminder(
        schoolUnitId,
        req.params.id,
        req.body.channel || 'whatsapp',
        req.user?.id
      );
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'CONFLICT') {
        return res.status(409).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.json({
        success: true,
        data: result.data,
        message: result.data?.message || 'Pengingat tagihan berhasil dikirim',
        errors: null
      });
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

  updateDraftBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.updateDraftBill(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Draft tagihan berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  publishBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.publishBills(schoolUnitId, req.body, req.user?.id);
      res.json({ success: true, data, message: `Berhasil menerbitkan ${data.published_count} tagihan siswa`, errors: null });
    } catch (err) { next(err); }
  };

  writeOffBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const reason = req.body.reason || req.body.write_off_reason;
      const data = await billsService.writeOffBill(schoolUnitId, req.params.id, reason, req.user?.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) { next(err); }
  };

  createManualDraftBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.createManualDraftBill(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Draf tagihan manual berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  };

  reviseIssuedBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.reviseIssuedBill(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Tagihan berhasil direvisi', errors: null });
    } catch (err) { next(err); }
  };

  getBillRevisions = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.getBillRevisions(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Tagihan tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Riwayat revisi tagihan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  approveBillDiscount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userRoles = req.user?.roles?.map(r => r.name || r) || [];
      const data = await billsService.approveBillDiscount(schoolUnitId, req.params.id, req.user?.id, userRoles);
      res.json({ success: true, data, message: 'Diskon tagihan berhasil disetujui, tagihan kini siap diterbitkan', errors: null });
    } catch (err) { next(err); }
  };

  rejectBillDiscount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userRoles = req.user?.roles?.map(r => r.name || r) || [];
      const reason = req.body.reason || req.body.rejection_reason;
      const data = await billsService.rejectBillDiscount(schoolUnitId, req.params.id, reason, req.user?.id, userRoles);
      res.json({ success: true, data, message: 'Diskon tagihan ditolak dan dikembalikan ke nominal normal', errors: null });
    } catch (err) { next(err); }
  };

  autoGenerateMonthlyDraftBills = async (req, res, next) => {
    try {
      const targetAcademicYearId = req.body.academic_year_id || null;
      const targetMonth = req.body.period_month !== undefined ? req.body.period_month : null;
      const data = await billsService.autoGenerateMonthlyDraftBills(targetAcademicYearId, targetMonth);
      res.json({ success: true, data, message: 'Pemicu otomatisasi draf bulanan selesai dieksekusi', errors: null });
    } catch (err) { next(err); }
  };

  getBillsMatrix = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.getBillsMatrix(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Matriks tagihan siswa berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  publishCellBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.publishCellBill(schoolUnitId, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Tagihan sel berhasil diterbitkan', errors: null });
    } catch (err) { next(err); }
  };

  publishBatchColumnBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.publishBatchColumnBills(schoolUnitId, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Penerbitan tagihan kolom massal selesai', errors: null });
    } catch (err) { next(err); }
  };

  listReminderLogs = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.listReminderLogs(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar riwayat reminder tagihan berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  broadcastReminders = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.broadcastReminders(schoolUnitId, req.body, req.user?.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) { next(err); }
  };

  importColumnBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.importColumnBills(schoolUnitId, req.body, req.user?.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) { next(err); }
  };

  getAlumniBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.getAlumniBills(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar tagihan alumni berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createAlumniManualBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await billsService.createAlumniManualBill(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Tunggakan manual alumni berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new BillsController();
