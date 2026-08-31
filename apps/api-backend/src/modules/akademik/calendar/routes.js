/**
 * Calendar Routes
 * Modul Akademik - Rute Kalender Pendidikan Berversi, Kategori & Integrasi RKT
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Dokumen Versi Kaldik
router.get(
  '/calendar-document-versions',
  authenticate,
  controller.listDocumentVersions
);
router.post(
  '/calendar-document-versions',
  authenticate,
  requirePermission('akademik.academic_years.manage'),
  controller.createDocumentVersion
);
router.put(
  '/calendar-document-versions/:id/publish',
  authenticate,
  requirePermission('akademik.academic_years.manage'),
  controller.publishDocumentVersion
);

// 2. Master Kategori & Warna Kaldik
router.get(
  '/calendar-event-categories',
  authenticate,
  controller.listCategories
);
router.post(
  '/calendar-event-categories',
  authenticate,
  requirePermission('akademik.academic_years.manage'),
  controller.createCategory
);
router.put(
  '/calendar-event-categories/:id',
  authenticate,
  requirePermission('akademik.academic_years.manage'),
  controller.updateCategory
);
router.delete(
  '/calendar-event-categories/:id',
  authenticate,
  requirePermission('akademik.academic_years.manage'),
  controller.deleteCategory
);

// 3. Kegiatan Kalender Pendidikan
router.get(
  '/calendar-events/rkt-programs',
  authenticate,
  controller.getRktPrograms
);
router.get(
  '/calendar-events',
  authenticate,
  controller.listCalendarEvents
);
router.post(
  '/calendar-events',
  authenticate,
  requirePermission('akademik.academic_years.manage'),
  controller.createCalendarEvent
);
router.put(
  '/calendar-events/:id',
  authenticate,
  requirePermission('akademik.academic_years.manage'),
  controller.updateCalendarEvent
);
router.delete(
  '/calendar-events/:id',
  authenticate,
  requirePermission('akademik.academic_years.manage'),
  controller.deleteCalendarEvent
);

module.exports = router;
