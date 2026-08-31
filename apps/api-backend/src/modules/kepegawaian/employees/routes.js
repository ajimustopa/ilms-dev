/**
 * Employees Routes
 * Modul Kepegawaian - Fitur 1.1: CRUD Data Pegawai (Master)
 */
const express = require('express');
const router = express.Router();
const employeesController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// Self-service profile update (Pegawai / Guru)
router.put('/me/profile', authenticate, employeesController.updateMyProfile);
router.put('/profile/self', authenticate, employeesController.updateMyProfile);

router.get('/', authenticate, requirePermission('kepegawaian.employees.view'), employeesController.list);
router.get('/:id/related-data', authenticate, requirePermission('kepegawaian.employees.manage'), employeesController.getRelatedData);
router.get('/:id/status-history', authenticate, requirePermission('kepegawaian.employees.view'), employeesController.getStatusHistory);
router.get('/:id', authenticate, employeesController.getById);
router.post('/', authenticate, requirePermission('kepegawaian.employees.manage'), employeesController.create);
router.put('/:id', authenticate, employeesController.update);
router.patch('/:id/status', authenticate, requirePermission('kepegawaian.employees.manage'), employeesController.updateStatus);
router.delete('/:id', authenticate, requirePermission('kepegawaian.employees.manage'), employeesController.delete);

module.exports = router;


