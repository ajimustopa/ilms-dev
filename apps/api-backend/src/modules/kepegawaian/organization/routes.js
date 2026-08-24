/**
 * Organization Routes
 * Modul Kepegawaian - Fitur 2: Organisasi
 */
const express = require('express');
const router = express.Router();
const organizationController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. DUK Pangkat
router.get('/duk-pangkat', authenticate, requirePermission('kepegawaian.statistics.view'), organizationController.getDuk);

// 2. Manajemen Jabatan & Struktur Organisasi
router.get('/job-positions/tree', authenticate, organizationController.getTree);
router.get('/job-positions', authenticate, organizationController.listPositions);
router.post('/job-positions', authenticate, requirePermission('kepegawaian.job_positions.manage'), organizationController.createPosition);
router.put('/job-positions/:id', authenticate, requirePermission('kepegawaian.job_positions.manage'), organizationController.updatePosition);
router.delete('/job-positions/:id', authenticate, requirePermission('kepegawaian.job_positions.manage'), organizationController.deletePosition);

// 3. Riwayat Jabatan & Golongan
router.get('/employees/:id/position-history', authenticate, organizationController.listPositionHistory);
router.post('/employees/:id/position-history', authenticate, requirePermission('kepegawaian.job_positions.manage'), organizationController.addPositionHistory);

// 4. Riwayat Mutasi / Promosi
router.get('/employees/:id/mutations', authenticate, organizationController.listMutations);
router.post('/employees/:id/mutations', authenticate, requirePermission('kepegawaian.job_positions.manage'), organizationController.createMutation);

module.exports = router;
