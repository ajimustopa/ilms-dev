/**
 * Employment Statuses Routes
 * Modul Kepegawaian - Master Data Status Kepegawaian Fleksibel
 */
const express = require('express');
const router = express.Router();
const employmentStatusesController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// Daftar status kepegawaian (dapat diakses pengguna terautentikasi untuk dropdown / tabel)
router.get('/', authenticate, employmentStatusesController.list);
router.get('/:id', authenticate, employmentStatusesController.getById);

// Kelola status kepegawaian (Hanya HRD / Admin)
router.post('/', authenticate, requirePermission('kepegawaian.employees.manage'), employmentStatusesController.create);
router.put('/:id', authenticate, requirePermission('kepegawaian.employees.manage'), employmentStatusesController.update);
router.delete('/:id', authenticate, requirePermission('kepegawaian.employees.manage'), employmentStatusesController.delete);

module.exports = router;
