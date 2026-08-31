/**
 * Report Cards Routes
 * Modul Akademik - Fitur: Rapor Siswa & Materialisasi Nilai Akhir
 */
const express = require('express');
const router = express.Router();
const reportCardsController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Template & Impor Excel
router.get(
  '/report-cards/import-template',
  authenticate,
  reportCardsController.getImportTemplate
);
router.post(
  '/report-cards/import',
  authenticate,
  requirePermission('akademik.report_cards.generate'),
  reportCardsController.importReportCards
);

// 2. Input Manual Nilai Rapor (Legacy / Riwayat Lampau)
router.post(
  '/report-cards/legacy-entry',
  authenticate,
  requirePermission('akademik.report_cards.generate'),
  reportCardsController.createLegacyEntry
);

// 3. Generate & List Rapor
router.get(
  '/report-cards',
  authenticate,
  requirePermission('akademik.report_cards.read'),
  reportCardsController.list
);
router.post(
  '/report-cards/generate',
  authenticate,
  requirePermission('akademik.report_cards.generate'),
  reportCardsController.generate
);

// 4. Detail & Update Catatan Rapor
router.get(
  '/report-cards/:id',
  authenticate,
  requirePermission('akademik.report_cards.read'),
  reportCardsController.getById
);
router.put(
  '/report-cards/:id/note',
  authenticate,
  requirePermission('akademik.report_cards.generate'),
  reportCardsController.updateNote
);

// 5. Riwayat Rapor Siswa Lintas Semester
router.get(
  '/students/:id/report-card-history',
  authenticate,
  requirePermission('akademik.report_cards.read'),
  reportCardsController.getStudentReportCardHistory
);

module.exports = router;
