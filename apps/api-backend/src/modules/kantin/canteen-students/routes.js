const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/canteen-students', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.listStudents);
router.post('/canteen-students/print-cards-pdf', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.printCardsPdf);
router.post('/canteen-students/sync-academic', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.syncAcademic);
router.post('/canteen-students/bulk-generate-qr', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.bulkGenerateQr);
router.get('/canteen-students/:student_id', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.getStudentByStudentId);
router.patch('/canteen-students/:student_id/status', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateStatus);
router.post('/canteen-students/:student_id/generate-qr', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.generateQr);
router.put('/canteen-students/:student_id/qr', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateQr);
router.post('/canteen-students/:student_id/reset-child-pin', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.resetChildPin);
router.post('/canteen-students/bulk-reset-pin', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.bulkResetChildPin);
router.post('/canteen-students/:student_id/reset-parent-pin', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.resetParentPin);

module.exports = router;
