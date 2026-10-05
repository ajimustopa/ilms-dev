/**
 * PSB (Penerimaan Siswa Baru) Controller
 * apps/api-backend/src/modules/psb/controller.js
 */
const service = require('./service');

function resolveUnitId(req) {
  const headerUnit = req.headers['x-school-unit-id'] || req.headers['x-school-unit-id'.toLowerCase()];
  const userUnits = req.user?.school_units || [];
  const isSuper = Boolean(
    req.user?.is_super_admin ||
    req.user?.account_type === 'super_admin' ||
    req.user?.account_type === 'admin' ||
    (Array.isArray(req.user?.roles) && (req.user.roles.includes('super_admin') || req.user.roles.includes('admin_yayasan')))
  );

  const unitIds = userUnits
    .map(u => (typeof u === 'object' && u !== null ? Number(u.id) : Number(u)))
    .filter(id => !isNaN(id) && id > 0);

  // Jika konteks adalah 'all' (Pusat Yayasan / Gabungan)
  if (headerUnit === 'all') {
    return null;
  }

  // Jika memilih satuan pendidikan spesifik melalui header
  if (headerUnit && !isNaN(Number(headerUnit))) {
    const requestedId = Number(headerUnit);
    if (isSuper || unitIds.length === 0 || unitIds.includes(requestedId)) {
      return requestedId;
    }
  }

  if (isSuper) {
    return null;
  }

  return unitIds.length > 0 ? unitIds[0] : null;
}

class PsbController {
  // ==========================================
  // 1. Program PSB & Kuota Rombel
  // ==========================================

  async listPrograms(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.listPrograms(unitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar program PSB berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getProgramById(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.getProgramById(req.params.id, unitId);
      return res.json({
        success: true,
        data,
        message: 'Detail program PSB berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createProgram(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const payload = {
        ...req.body,
        satuan_pendidikan_id: req.body.satuan_pendidikan_id || unitId
      };
      const data = await service.createProgram(payload);
      return res.status(201).json({
        success: true,
        data,
        message: 'Program PSB berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateProgram(req, res, next) {
    try {
      const data = await service.updateProgram(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Program PSB berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteProgram(req, res, next) {
    try {
      const force = req.query.force === 'true' || req.body?.force === true;
      const data = await service.deleteProgram(req.params.id, { force });
      return res.json({
        success: true,
        data,
        message: 'Program PSB berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 2. Gelombang Pendaftaran (Waves)
  // ==========================================

  async listWaves(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.listWaves(req.query.program_id, unitId);
      return res.json({
        success: true,
        data,
        message: 'Daftar gelombang pendaftaran berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createWave(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const payload = {
        ...req.body,
        satuan_pendidikan_id: req.body.satuan_pendidikan_id || unitId
      };
      const data = await service.createWave(payload);
      return res.status(201).json({
        success: true,
        data,
        message: 'Gelombang pendaftaran berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateWave(req, res, next) {
    try {
      const data = await service.updateWave(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Gelombang pendaftaran berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteWave(req, res, next) {
    try {
      const data = await service.deleteWave(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Gelombang pendaftaran berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 3. Kebijakan Refund Pengunduran Diri
  // ==========================================

  async listRefundPolicies(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.listRefundPolicies(unitId, req.query.program_id);
      return res.json({
        success: true,
        data,
        message: 'Daftar aturan pengembalian dana berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createRefundPolicy(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const payload = {
        ...req.body,
        satuan_pendidikan_id: req.body.satuan_pendidikan_id || unitId
      };
      const data = await service.createRefundPolicy(payload);
      return res.status(201).json({
        success: true,
        data,
        message: 'Aturan kebijakan refund berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRefundPolicy(req, res, next) {
    try {
      const data = await service.updateRefundPolicy(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Aturan kebijakan refund berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteRefundPolicy(req, res, next) {
    try {
      const data = await service.deleteRefundPolicy(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Aturan kebijakan refund berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 4. Pendaftaran Calon Murid (Registrants)
  // ==========================================

  async listRegistrants(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.listRegistrants(unitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar calon murid berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getRegistrantById(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.getRegistrantById(req.params.id, unitId);
      return res.json({
        success: true,
        data,
        message: 'Detail calon murid berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createRegistrant(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const payload = {
        ...req.body,
        satuan_pendidikan_id: req.body.satuan_pendidikan_id || unitId
      };
      const data = await service.createRegistrant(payload, req.user?.id);
      return res.status(201).json({
        success: true,
        data,
        message: 'Pendaftaran calon murid berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRegistrant(req, res, next) {
    try {
      const data = await service.updateRegistrant(req.params.id, req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: 'Data calon murid berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteRegistrant(req, res, next) {
    try {
      const data = await service.deleteRegistrant(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Data calon murid berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createRegistrantAccount(req, res, next) {
    try {
      const data = await service.createRegistrantAccount(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Akun calon murid berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async declareProspectiveStudent(req, res, next) {
    try {
      const data = await service.declareProspectiveStudent(req.params.id, req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: 'Calon santri berhasil dinyatakan sebagai Calon Siswa (Siap Masuk Rombel)',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 5. Dokumen Persyaratan Digital
  // ==========================================

  async listDocuments(req, res, next) {
    try {
      const data = await service.listDocuments(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Daftar dokumen berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async addDocument(req, res, next) {
    try {
      const data = await service.addDocument(req.params.id, req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Dokumen berhasil diunggah',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyDocument(req, res, next) {
    try {
      const data = await service.verifyDocument(req.params.id, req.params.docId, req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: 'Status dokumen berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteDocument(req, res, next) {
    try {
      const data = await service.deleteDocument(req.params.id, req.params.docId);
      return res.json({
        success: true,
        data,
        message: 'Dokumen berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 6. Tagihan & Pembayaran Biaya Pendaftaran
  // ==========================================

  async getRegistrantBill(req, res, next) {
    try {
      const data = await service.getRegistrantBill(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Tagihan biaya pendaftaran berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async payRegistrantBill(req, res, next) {
    try {
      const data = await service.payRegistrantBill(req.params.id, req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: 'Pembayaran biaya pendaftaran berhasil dicatat di Keuangan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 7. Master Tes Seleksi (psb_tests)
  // ==========================================

  async listTests(req, res, next) {
    try {
      const data = await service.listTests(req.query.psb_process_id);
      return res.json({
        success: true,
        data,
        message: 'Daftar tes seleksi berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getTestById(req, res, next) {
    try {
      const data = await service.getTestById(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Detail tes seleksi berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createTest(req, res, next) {
    try {
      const data = await service.createTest(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Tes seleksi berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateTest(req, res, next) {
    try {
      const data = await service.updateTest(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Tes seleksi berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTest(req, res, next) {
    try {
      const data = await service.deleteTest(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Tes seleksi berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 8. Bank Soal / Rubrik Penilaian
  // ==========================================

  async listTestQuestions(req, res, next) {
    try {
      const data = await service.listTestQuestions(req.params.testId);
      return res.json({
        success: true,
        data,
        message: 'Daftar butir soal / kriteria tes berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createTestQuestion(req, res, next) {
    try {
      const data = await service.createTestQuestion(req.params.testId, req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Butir soal / kriteria tes berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateTestQuestion(req, res, next) {
    try {
      const data = await service.updateTestQuestion(req.params.questionId, req.body);
      return res.json({
        success: true,
        data,
        message: 'Butir soal / kriteria tes berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTestQuestion(req, res, next) {
    try {
      const data = await service.deleteTestQuestion(req.params.questionId);
      return res.json({
        success: true,
        data,
        message: 'Butir soal / kriteria tes berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 9. Penjadwalan Sesi Ujian & Kartu Peserta
  // ==========================================

  async listTestSessions(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.listTestSessions({
        ...req.query,
        satuan_pendidikan_id: req.query.satuan_pendidikan_id || unitId
      });
      return res.json({
        success: true,
        data,
        message: 'Daftar sesi ujian seleksi berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async scheduleTestSession(req, res, next) {
    try {
      const data = await service.scheduleTestSession(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Sesi ujian berhasil dijadwalkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async bulkScheduleTestSessions(req, res, next) {
    try {
      const data = await service.bulkScheduleTestSessions(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: `${data.total_scheduled} peserta berhasil dijadwalkan untuk tes seleksi`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getExamCard(req, res, next) {
    try {
      const data = await service.getExamCard(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Kartu ujian peserta berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 10. Penilaian Seleksi & Skor Komposit
  // ==========================================

  async submitSessionScore(req, res, next) {
    try {
      const data = await service.submitSessionScore(req.params.sessionId, req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: 'Nilai ujian berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async submitSessionAnswers(req, res, next) {
    try {
      const data = await service.submitSessionAnswers(req.params.sessionId, req.body.answers, req.user?.id);
      return res.json({
        success: true,
        data,
        message: 'Jawaban dan nilai butir ujian berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getRegistrantSelectionSummary(req, res, next) {
    try {
      const data = await service.getRegistrantSelectionSummary(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Ringkasan hasil seleksi calon murid berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 11. Pengumuman Hasil Kelulusan & Keputusan
  // ==========================================

  async listAnnouncements(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.listAnnouncements(unitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Data pengumuman hasil seleksi berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async decideSelectionResults(req, res, next) {
    try {
      const data = await service.decideSelectionResults(req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: `${data.total_decided} keputusan seleksi berhasil ditetapkan dan diumumkan`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getDecisionLetter(req, res, next) {
    try {
      const data = await service.getDecisionLetter(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Surat Keputusan Hasil Seleksi berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 12. Tagihan Uang Pangkal & Pembayaran (Keuangan)
  // ==========================================

  async createEnrollmentFeeBill(req, res, next) {
    try {
      const data = await service.createEnrollmentFeeBill(req.params.id, req.body, req.user?.id);
      return res.status(201).json({
        success: true,
        data,
        message: 'Tagihan uang pangkal berhasil diterbitkan di Keuangan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getEnrollmentFeeBill(req, res, next) {
    try {
      const data = await service.getEnrollmentFeeBill(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Data tagihan uang pangkal berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async payEnrollmentFeeBill(req, res, next) {
    try {
      const data = await service.payEnrollmentFeeBill(req.params.id, req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: 'Pembayaran uang pangkal berhasil dicatat di Keuangan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 13. Kuota & Penempatan Siswa ke Rombel Kelas (Akademik)
  // ==========================================

  async checkClassQuota(req, res, next) {
    try {
      const data = await service.checkClassQuota(req.params.classGroupId, req.query.psb_process_id, req.query.gender);
      return res.json({
        success: true,
        data,
        message: 'Informasi kuota rombel berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async placeRegistrantInClass(req, res, next) {
    try {
      const data = await service.placeRegistrantInClass(req.params.id, req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: `Siswa baru berhasil ditempatkan ke rombel ${data.class_group_name}`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listPlacements(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.listPlacements(unitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar penempatan siswa ke rombel berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 14. Kebijakan Refund (psb_refund_policies)
  // ==========================================

  async listRefundPolicies(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.listRefundPolicies(unitId, req.query.psb_process_id);
      return res.json({
        success: true,
        data,
        message: 'Daftar kebijakan refund berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getRefundPolicyById(req, res, next) {
    try {
      const data = await service.getRefundPolicyById(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Detail kebijakan refund berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createRefundPolicy(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const payload = {
        ...req.body,
        satuan_pendidikan_id: req.body.satuan_pendidikan_id || unitId
      };
      const data = await service.createRefundPolicy(payload);
      return res.status(201).json({
        success: true,
        data,
        message: 'Kebijakan refund berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRefundPolicy(req, res, next) {
    try {
      const data = await service.updateRefundPolicy(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Kebijakan refund berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteRefundPolicy(req, res, next) {
    try {
      const data = await service.deleteRefundPolicy(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Kebijakan refund berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 15. Estimasi Refund & Pengunduran Diri (psb_withdrawals)
  // ==========================================

  async calculateRefundEstimate(req, res, next) {
    try {
      const data = await service.calculateRefundEstimate(req.params.id, req.query.withdrawal_date);
      return res.json({
        success: true,
        data,
        message: 'Kalkulasi estimasi refund berhasil dihitung',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async submitWithdrawal(req, res, next) {
    try {
      const data = await service.submitWithdrawal(req.params.id, req.body, req.user?.id);
      return res.status(201).json({
        success: true,
        data,
        message: 'Pengajuan pengunduran diri berhasil diajukan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listWithdrawals(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.listWithdrawals(unitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar pengajuan pengunduran diri berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getWithdrawalById(req, res, next) {
    try {
      const data = await service.getWithdrawalById(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Detail pengajuan pengunduran diri berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async reviewWithdrawal(req, res, next) {
    try {
      const data = await service.reviewWithdrawal(req.params.id, req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: `Pengajuan pengunduran diri berhasil di-${req.body.action === 'approve' ? 'setujui' : 'tolak'}`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async disburseRefund(req, res, next) {
    try {
      const data = await service.disburseRefund(req.params.id, req.body, req.user?.id);
      return res.json({
        success: true,
        data,
        message: 'Pengembalian dana (refund) berhasil dicatat dan dicairkan di Keuangan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 16. Lookups Lintas Modul
  // ==========================================

  async getAcademicYearsLookup(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.getAcademicYearsLookup(unitId);
      return res.json({
        success: true,
        data,
        message: 'Lookup tahun ajaran berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getClassGroupsLookup(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.getClassGroupsLookup(unitId, req.query.academic_year_id);
      return res.json({
        success: true,
        data,
        message: 'Lookup rombel kelas berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getFeeSchemesLookup(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.getFeeSchemesLookup(unitId, req.query.academic_year_id);
      return res.json({
        success: true,
        data,
        message: 'Lookup skema biaya berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getCashAccountsLookup(req, res, next) {
    try {
      const unitId = resolveUnitId(req);
      const data = await service.getCashAccountsLookup(unitId);
      return res.json({
        success: true,
        data,
        message: 'Lookup rekening kas berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getSchoolUnitsLookup(req, res, next) {
    try {
      const data = await service.getSchoolUnitsLookup();
      return res.json({
        success: true,
        data,
        message: 'Lookup satuan pendidikan berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PsbController();
