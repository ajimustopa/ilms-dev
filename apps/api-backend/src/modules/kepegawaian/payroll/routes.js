/**
 * Payroll Routes
 * Modul Kepegawaian - Fitur 4: Penggajian (Payroll)
 */
const express = require('express');
const router = express.Router();
const payrollController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

router.post('/payroll/periods', authenticate, requirePermission('kepegawaian.payroll.manage'), payrollController.createPeriod);
router.post('/payroll/periods/:id/calculate', authenticate, requirePermission('kepegawaian.payroll.manage'), payrollController.calculatePeriod);
router.get('/payroll/periods/:id/items', authenticate, payrollController.listItems);
router.patch('/payroll/items/:id', authenticate, requirePermission('kepegawaian.payroll.manage'), payrollController.updateItem);
router.patch('/payroll/items/:id/verify', authenticate, requirePermission('kepegawaian.payroll.manage'), payrollController.verifyItem);
router.patch('/payroll/periods/:id/status', authenticate, requirePermission('kepegawaian.payroll.manage'), payrollController.updatePeriodStatus);

module.exports = router;
