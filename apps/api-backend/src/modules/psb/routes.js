/**
 * PSB (Penerimaan Siswa Baru) Routes
 * apps/api-backend/src/modules/psb/routes.js
 * Prefix: /api/v1/psb
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../middlewares/auth');

// Seluruh rute PSB dilindungi otentikasi JWT
router.use(verifyJwt);

// ==========================================
// 1. Program PSB & Kuota Rombel (L/P)
// ==========================================
router.get(
  '/programs',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listPrograms
);

router.post(
  '/programs',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.createProgram
);

router.get(
  '/programs/:id',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.getProgramById
);

router.put(
  '/programs/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.updateProgram
);

router.delete(
  '/programs/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.deleteProgram
);

// ==========================================
// 2. Gelombang Pendaftaran (Waves / Jalur)
// ==========================================
router.get(
  '/waves',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listWaves
);

router.post(
  '/waves',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.createWave
);

router.put(
  '/waves/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.updateWave
);

router.delete(
  '/waves/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.deleteWave
);

// ==========================================
// 3. Kebijakan Refund Pengunduran Diri
// ==========================================
router.get(
  '/refund-policies',
  requirePermission('psb.view', 'ppdb.view', 'keuangan.ppdb_billing.manage'),
  controller.listRefundPolicies
);

router.post(
  '/refund-policies',
  requirePermission('psb.manage', 'ppdb.manage', 'keuangan.ppdb_billing.manage'),
  controller.createRefundPolicy
);

router.put(
  '/refund-policies/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'keuangan.ppdb_billing.manage'),
  controller.updateRefundPolicy
);

router.delete(
  '/refund-policies/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'keuangan.ppdb_billing.manage'),
  controller.deleteRefundPolicy
);

// ==========================================
// 4. Pendaftaran Calon Murid (Registrants)
// ==========================================
router.get(
  '/registrants',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listRegistrants
);

router.post(
  '/registrants',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.createRegistrant
);

router.get(
  '/registrants/:id',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.getRegistrantById
);

router.put(
  '/registrants/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.updateRegistrant
);

router.delete(
  '/registrants/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.deleteRegistrant
);

router.post(
  '/registrants/:id/create-account',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.createRegistrantAccount
);

router.post(
  '/registrants/:id/declare-prospective',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.declareProspectiveStudent
);

// ==========================================
// 5. Dokumen Persyaratan Digital
// ==========================================
router.get(
  '/registrants/:id/documents',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listDocuments
);

router.post(
  '/registrants/:id/documents',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.addDocument
);

router.put(
  '/registrants/:id/documents/:docId/verify',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.verifyDocument
);

router.delete(
  '/registrants/:id/documents/:docId',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.deleteDocument
);

// ==========================================
// 6. Tagihan & Pembayaran Biaya Pendaftaran
// ==========================================
router.get(
  '/registrants/:id/bill',
  requirePermission('psb.view', 'ppdb.view', 'keuangan.ppdb_billing.manage'),
  controller.getRegistrantBill
);

router.post(
  '/registrants/:id/pay-bill',
  requirePermission('psb.manage', 'ppdb.manage', 'keuangan.ppdb_billing.manage'),
  controller.payRegistrantBill
);

// ==========================================
// 7. Master Tes Seleksi & Bank Soal
// ==========================================
router.get(
  '/tests',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listTests
);

router.post(
  '/tests',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.createTest
);

router.get(
  '/tests/:id',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.getTestById
);

router.put(
  '/tests/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.updateTest
);

router.delete(
  '/tests/:id',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.deleteTest
);

router.get(
  '/tests/:testId/questions',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listTestQuestions
);

router.post(
  '/tests/:testId/questions',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.createTestQuestion
);

router.put(
  '/tests/:testId/questions/:questionId',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.updateTestQuestion
);

router.delete(
  '/tests/:testId/questions/:questionId',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.deleteTestQuestion
);

// ==========================================
// 8. Penjadwalan Sesi Ujian & Kartu Peserta
// ==========================================
router.get(
  '/test-sessions',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listTestSessions
);

router.post(
  '/test-sessions',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.scheduleTestSession
);

router.post(
  '/test-sessions/bulk',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.bulkScheduleTestSessions
);

router.get(
  '/registrants/:id/exam-card',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.getExamCard
);

// ==========================================
// 9. Penilaian Ujian & Skor Komposit
// ==========================================
router.post(
  '/test-sessions/:sessionId/score',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.submitSessionScore
);

router.post(
  '/test-sessions/:sessionId/answers',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.submitSessionAnswers
);

router.get(
  '/registrants/:id/selection-summary',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.getRegistrantSelectionSummary
);

// ==========================================
// 10. Pengumuman Hasil Kelulusan Seleksi
// ==========================================
router.get(
  '/announcements',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listAnnouncements
);

router.post(
  '/announcements/decide',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.decideSelectionResults
);

router.get(
  '/announcements/:id/letter',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.getDecisionLetter
);

// ==========================================
// 11. Tagihan Uang Pangkal & Pembayaran (Keuangan)
// ==========================================
router.post(
  '/registrants/:id/enrollment-bill',
  requirePermission('psb.manage', 'ppdb.manage', 'keuangan.ppdb_billing.manage'),
  controller.createEnrollmentFeeBill
);

router.get(
  '/registrants/:id/enrollment-bill',
  requirePermission('psb.view', 'ppdb.view', 'keuangan.ppdb_billing.manage'),
  controller.getEnrollmentFeeBill
);

router.post(
  '/registrants/:id/pay-enrollment-bill',
  requirePermission('psb.manage', 'ppdb.manage', 'keuangan.ppdb_billing.manage'),
  controller.payEnrollmentFeeBill
);

// ==========================================
// 12. Kuota Rombel & Penempatan Siswa (Akademik)
// ==========================================
router.get(
  '/class-groups/:classGroupId/quota',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.checkClassQuota
);

router.post(
  '/registrants/:id/place-class',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.placeRegistrantInClass
);

router.get(
  '/placements',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listPlacements
);

// ==========================================
// 13. Pengunduran Diri & Refund Pengembalian Dana
// ==========================================
router.get(
  '/registrants/:id/refund-estimate',
  requirePermission('psb.view', 'ppdb.view', 'keuangan.ppdb_billing.manage'),
  controller.calculateRefundEstimate
);

router.post(
  '/registrants/:id/withdraw',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.submitWithdrawal
);

router.get(
  '/withdrawals',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.listWithdrawals
);

router.get(
  '/withdrawals/:id',
  requirePermission('psb.view', 'ppdb.view', 'akademik.psb.read'),
  controller.getWithdrawalById
);

router.put(
  '/withdrawals/:id/review',
  requirePermission('psb.manage', 'ppdb.manage', 'akademik.psb.manage'),
  controller.reviewWithdrawal
);

router.post(
  '/withdrawals/:id/disburse',
  requirePermission('psb.manage', 'ppdb.manage', 'keuangan.ppdb_billing.manage'),
  controller.disburseRefund
);

// ==========================================
// 14. Lookups Lintas Modul (Akademik, Keuangan, Core)
// ==========================================
router.get('/lookups/academic-years', controller.getAcademicYearsLookup);
router.get('/lookups/class-groups', controller.getClassGroupsLookup);
router.get('/lookups/fee-schemes', controller.getFeeSchemesLookup);
router.get('/lookups/cash-accounts', controller.getCashAccountsLookup);
router.get('/lookups/school-units', controller.getSchoolUnitsLookup);

module.exports = router;
