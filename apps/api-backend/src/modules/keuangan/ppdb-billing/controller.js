const ppdbBillingService = require('./service');

class PpdbBillingController {
  getSchoolUnitId(req) {
    const rawUnit = req.headers['x-school-unit-id'] || req.query.school_unit_id;
    if (rawUnit === 'all' || rawUnit === 'foundation' || rawUnit === 'undefined' || rawUnit === 'null' || !rawUnit) {
      return 'all';
    }
    const parsed = parseInt(rawUnit, 10);
    return isNaN(parsed) ? 'all' : parsed;
  }

  getUserId(req) {
    return req.user?.id || 1;
  }

  getUserRoles(req) {
    return req.user?.roles || (req.user?.role ? [req.user.role] : ['keuangan']);
  }

  listRegistrationBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.listRegistrationBills(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar tagihan PPDB berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  getRegistrantCandidates = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.getRegistrantCandidates(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar calon murid PSB berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  createRegistrationBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.createRegistrationBill(schoolUnitId, req.body, userId);
      res.status(201).json({
        success: true,
        data,
        message: 'Draf tagihan PPDB berhasil dibuat',
        errors: null
      });
    } catch (err) { next(err); }
  };

  publishRegistrationBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const { bill_ids } = req.body;
      const data = await ppdbBillingService.publishRegistrationBills(schoolUnitId, bill_ids, userId);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  approveRegistrationBillDiscount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const userRoles = this.getUserRoles(req);
      const data = await ppdbBillingService.approveRegistrationBillDiscount(schoolUnitId, req.params.id, userId, userRoles);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  rejectRegistrationBillDiscount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.rejectRegistrationBillDiscount(schoolUnitId, req.params.id, userId, req.body.reason);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  reviseRegistrationBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.reviseRegistrationBill(schoolUnitId, req.params.id, req.body, userId);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  getRegistrationBillRevisions = async (req, res, next) => {
    try {
      const data = await ppdbBillingService.getRegistrationBillRevisions(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Riwayat revisi tagihan PPDB berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  createInstallmentPlan = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const { installments } = req.body;
      const data = await ppdbBillingService.createInstallmentPlan(schoolUnitId, req.params.id, installments, userId);
      res.status(201).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  requestRefund = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.requestRefund(schoolUnitId, req.params.id, req.body, userId);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  approveRefund = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const userRoles = this.getUserRoles(req);
      const data = await ppdbBillingService.approveRefund(schoolUnitId, req.params.id, userId, userRoles);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  rejectRefund = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const userRoles = this.getUserRoles(req);
      const data = await ppdbBillingService.rejectRefund(schoolUnitId, req.params.id, req.body.reason, userId, userRoles);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  processRefund = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const userRoles = this.getUserRoles(req);
      const data = await ppdbBillingService.processRefund(schoolUnitId, req.params.id, req.body, userId, userRoles);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  recordRegistrationPayment = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.recordRegistrationPayment(
        schoolUnitId,
        req.params.id,
        req.body,
        userId
      );
      res.json({
        success: true,
        data,
        message: 'Pembayaran PPDB berhasil dicatat dan diverifikasi',
        errors: null
      });
    } catch (err) { next(err); }
  };

  cancelRegistrationBill = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.cancelRegistrationBill(
        schoolUnitId,
        req.params.id,
        req.body.reason,
        userId
      );
      res.json({
        success: true,
        data,
        message: 'Tagihan PPDB berhasil dibatalkan',
        errors: null
      });
    } catch (err) { next(err); }
  };

  linkStudent = async (req, res, next) => {
    try {
      const { psb_registrant_ref_id, student_id } = req.body;
      const data = await ppdbBillingService.linkStudentAfterPlacement(psb_registrant_ref_id, student_id);
      res.json({
        success: true,
        data,
        message: 'Siswa berhasil ditautkan ke tagihan PPDB',
        errors: null
      });
    } catch (err) { next(err); }
  };

  getReceiptPdf = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.getReceiptData(schoolUnitId, req.params.payment_id);
      if (!data) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Bukti pembayaran tidak ditemukan',
          errors: null
        });
      }
      res.json({
        success: true,
        data,
        message: 'Data kwitansi pembayaran PPDB berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  // Policy Rules Handlers
  listRefundPolicyRules = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.listRefundPolicyRules(schoolUnitId);
      res.json({ success: true, data, message: 'Aturan kebijakan refund PPDB berhasil diambil' });
    } catch (err) { next(err); }
  };

  createRefundPolicyRule = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.createRefundPolicyRule(schoolUnitId, req.body);
      res.status(201).json({ success: true, data, message: 'Aturan kebijakan refund berhasil ditambahkan' });
    } catch (err) { next(err); }
  };

  updateRefundPolicyRule = async (req, res, next) => {
    try {
      const data = await ppdbBillingService.updateRefundPolicyRule(req.params.id, req.body);
      res.json({ success: true, data, message: 'Aturan kebijakan refund berhasil diperbarui' });
    } catch (err) { next(err); }
  };

  deleteRefundPolicyRule = async (req, res, next) => {
    try {
      const data = await ppdbBillingService.deleteRefundPolicyRule(req.params.id);
      res.json({ success: true, data, message: data.message });
    } catch (err) { next(err); }
  };

  // Scholarship Quotas Handlers
  listScholarshipQuotas = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.listScholarshipQuotas(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data, message: 'Daftar kuota beasiswa PPDB berhasil diambil' });
    } catch (err) { next(err); }
  };

  createScholarshipQuota = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.createScholarshipQuota(schoolUnitId, req.body);
      res.status(201).json({ success: true, data, message: 'Kategori kuota beasiswa berhasil ditambahkan' });
    } catch (err) { next(err); }
  };

  updateScholarshipQuota = async (req, res, next) => {
    try {
      const data = await ppdbBillingService.updateScholarshipQuota(req.params.id, req.body);
      res.json({ success: true, data, message: 'Kategori kuota beasiswa berhasil diperbarui' });
    } catch (err) { next(err); }
  };

  deleteScholarshipQuota = async (req, res, next) => {
    try {
      const data = await ppdbBillingService.deleteScholarshipQuota(req.params.id);
      res.json({ success: true, data, message: data.message });
    } catch (err) { next(err); }
  };

  checkScholarshipQuota = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.checkScholarshipQuotaRemaining(schoolUnitId, req.query.quota_id);
      res.json({ success: true, data, message: 'Status ketersediaan kuota beasiswa berhasil diperiksa' });
    } catch (err) { next(err); }
  };

  // Transfer Proofs Queue
  listProofs = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.listProofs(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar antrean bukti transfer PPDB berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  verifyProof = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.verifyRegistrationProof(
        schoolUnitId,
        req.params.id,
        req.body,
        userId
      );
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  rejectProof = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.rejectRegistrationProof(
        schoolUnitId,
        req.params.id,
        req.body.reason,
        userId
      );
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) { next(err); }
  };

  uploadPublicProof = async (req, res, next) => {
    try {
      const data = await ppdbBillingService.uploadPublicRegistrationProof(
        req.params.id,
        req.body
      );
      res.status(201).json({
        success: true,
        data,
        message: 'Bukti transfer pendaftaran berhasil diunggah dan menunggu verifikasi',
        errors: null
      });
    } catch (err) { next(err); }
  };

  getPublicStatus = async (req, res, next) => {
    try {
      const data = await ppdbBillingService.getPublicBillStatus(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Status pendaftaran dan pembayaran PPDB berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  getPublicBankAccounts = async (req, res, next) => {
    try {
      const schoolUnitId = req.query.school_unit_id || 1;
      const data = await ppdbBillingService.getPublicBankAccounts(schoolUnitId);
      res.json({
        success: true,
        data,
        message: 'Daftar rekening bank penerima PPDB berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  createBillInternal = async (req, res, next) => {
    try {
      const data = await ppdbBillingService.createRegistrationBillFromPublic(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Tagihan pendaftaran PPDB berhasil dibuat otomatis',
        errors: null
      });
    } catch (err) { next(err); }
  };

  // ==========================================
  // TAB 1: PENETAPAN BIAYA PPDB (FEE ASSIGNMENTS)
  // ==========================================
  getPpdbFeeAssignments = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.getPpdbFeeAssignments(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Data penetapan biaya PPDB berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  assignPpdbFeeScheme = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.assignPpdbFeeScheme(schoolUnitId, req.body, userId);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) { next(err); }
  };

  adjustPpdbCandidateFee = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.adjustPpdbCandidateFee(schoolUnitId, req.body, userId);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) { next(err); }
  };

  // ==========================================
  // TAB 2: MATRIKS PENAGIHAN PPDB
  // ==========================================
  getPpdbBillsMatrix = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.getPpdbBillsMatrix(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Matriks tagihan PPDB berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  // ==========================================
  // TAB 4: PENGELUARAN PROGRAM PPDB
  // ==========================================
  listPpdbExpenses = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.listPpdbExpenses(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar pengeluaran PPDB berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  createPpdbExpense = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.createPpdbExpense(schoolUnitId, req.body, userId);
      res.status(201).json({ success: true, data, message: 'Pengeluaran PPDB berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  deletePpdbExpense = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const userId = this.getUserId(req);
      const data = await ppdbBillingService.deletePpdbExpense(schoolUnitId, req.params.id, userId);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) { next(err); }
  };
  // ==========================================
  // TAB 5: KARTU BAYAR PPDB (REKAP & INDIVIDUAL)
  // ==========================================
  getPpdbLedgerRecap = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.getPpdbLedgerRecap(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Rekap kartu bayar PPDB berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };

  getPpdbStudentLedger = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await ppdbBillingService.getPpdbStudentLedger(schoolUnitId, req.params.id, req.query);
      res.json({ success: true, data, message: 'Buku pembantu kartu bayar PPDB berhasil dimuat', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new PpdbBillingController();
