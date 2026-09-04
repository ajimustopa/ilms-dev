/**
 * Payroll Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 7) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission, requireApiKey } = require('../../../middlewares/auth');

// Ingest payroll dari modul Kepegawaian (Service-to-Service)
router.post(
  '/internal/payroll-disbursements/ingest',
  requireApiKey,
  controller.ingestPayrollInternal
);

// Daftar & Pencairan Gaji (Fitur #25)
router.get(
  '/payroll-disbursements',
  verifyJwt,
  requirePermission('keuangan.payroll.disburse'),
  controller.listPayrollDisbursements
);

router.post(
  '/payroll-disbursements/:id/disburse',
  verifyJwt,
  requirePermission('keuangan.payroll.disburse'),
  controller.disbursePayroll
);

// Kembalikan Payroll untuk Koreksi ke Kepegawaian
router.post(
  '/payroll-disbursements/:id/reject',
  verifyJwt,
  requirePermission('keuangan.payroll.disburse'),
  controller.rejectPayroll
);

module.exports = router;
