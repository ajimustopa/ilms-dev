/**
 * Internal Routes
 * Modul Kepegawaian - Fitur 6: Endpoint Data Pegawai & Struktur Jabatan untuk Konsumsi Modul Lain
 */
const express = require('express');
const router = express.Router();
const kepegawaianInternalController = require('./controller');
const { requireApiKey } = require('../../../middlewares/auth');

router.get('/internal/employees', requireApiKey, kepegawaianInternalController.listEmployees);
router.get('/internal/employees/:id', requireApiKey, kepegawaianInternalController.getEmployeeById);
router.get('/internal/job-positions/tree', requireApiKey, kepegawaianInternalController.getJobPositionsTree);

module.exports = router;
