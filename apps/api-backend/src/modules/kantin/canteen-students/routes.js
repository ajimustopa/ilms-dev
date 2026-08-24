const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/canteen-students', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.listStudents);
router.get('/canteen-students/:student_id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.getStudentByStudentId);
router.patch('/canteen-students/:student_id/status', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateStatus);
router.post('/canteen-students/:student_id/generate-qr', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.generateQr);
router.put('/canteen-students/:student_id/qr', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateQr);
router.post('/canteen-students/:student_id/reset-child-pin', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.resetChildPin);
router.post('/canteen-students/:student_id/reset-parent-pin', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.resetParentPin);

module.exports = router;
