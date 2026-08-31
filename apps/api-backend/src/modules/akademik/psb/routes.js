/**
 * PSB (Penerimaan Murid Baru) Routes
 * Modul Akademik
 * Prefix: /api/v1/akademik/...
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, requirePermission, requireApiKey } = require('../../../middlewares/auth');

// ============================================================
// 1. PSB Processes & Units CRUD + Dashboard
// ============================================================
router.get(
  '/psb-processes',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.listProcesses
);

router.post(
  '/psb-processes',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.createProcess
);

router.get(
  '/psb-processes/:id',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.getProcessById
);

router.put(
  '/psb-processes/:id',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.updateProcess
);

router.delete(
  '/psb-processes/:id',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.deleteProcess
);

router.get(
  '/psb-processes/:id/units',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.getProcessUnits
);

router.put(
  '/psb-processes/:id/units',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.updateProcessUnits
);

router.get(
  '/psb-processes/:id/dashboard',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.getProcessDashboard
);

// ============================================================
// 2. PSB Groups (Gelombang / Jalur Pendaftaran)
// ============================================================
router.get(
  '/psb-groups',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.listGroups
);

router.post(
  '/psb-groups',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.createGroup
);

router.get(
  '/psb-groups/:id',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.getGroupById
);

router.put(
  '/psb-groups/:id',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.updateGroup
);

router.delete(
  '/psb-groups/:id',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.deleteGroup
);

// ============================================================
// 3. PSB Registrants (Calon Murid, Dokumen, Akun & Penempatan)
// ============================================================
router.get(
  '/psb-registrants',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.listRegistrants
);

router.post(
  '/psb-registrants',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.createRegistrant
);

router.get(
  '/psb-registrants/:id',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.getRegistrantById
);

router.put(
  '/psb-registrants/:id',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.updateRegistrant
);

router.delete(
  '/psb-registrants/:id',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.deleteRegistrant
);

router.post(
  '/psb-registrants/:id/create-account',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.createRegistrantAccount
);

router.post(
  '/psb-registrants/:id/place',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.placeRegistrant
);

// Dokumen Calon Murid
router.get(
  '/psb-registrants/:id/documents',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.listDocuments
);

router.post(
  '/psb-registrants/:id/documents',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.addDocument
);

router.put(
  '/psb-registrants/:id/documents/:docId/verify',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.verifyDocument
);

router.delete(
  '/psb-registrants/:id/documents/:docId',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.deleteDocument
);

// ============================================================
// 4. PSB Tests & Questions (Bank Soal Tes PSB)
// ============================================================
router.get(
  '/psb-tests',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.listTests
);

router.post(
  '/psb-tests',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.createTest
);

router.get(
  '/psb-tests/:id',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.getTestById
);

router.put(
  '/psb-tests/:id',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.updateTest
);

router.delete(
  '/psb-tests/:id',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.deleteTest
);

router.post(
  '/psb-tests/:id/questions',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.createTestQuestion
);

router.put(
  '/psb-test-questions/:questionId',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.updateTestQuestion
);

router.delete(
  '/psb-test-questions/:questionId',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.deleteTestQuestion
);

// ============================================================
// 5. PSB Test Sessions & Grading
// ============================================================
router.get(
  '/psb-test-sessions',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.listTestSessions
);

router.post(
  '/psb-test-sessions',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.createTestSession
);

router.get(
  '/psb-test-sessions/:id',
  authenticate,
  requirePermission('akademik.psb.read'),
  controller.getTestSessionById
);

router.post(
  '/psb-test-sessions/:id/submit',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.submitTestSession
);

router.put(
  '/psb-test-sessions/:id/grade',
  authenticate,
  requirePermission('akademik.psb.manage'),
  controller.gradeTestSession
);

// ============================================================
// 6. Internal Service-to-Service Route (X-API-Key)
// ============================================================
router.post(
  '/internal/psb/intake',
  requireApiKey,
  controller.intakePublicRegistrant
);

module.exports = router;
