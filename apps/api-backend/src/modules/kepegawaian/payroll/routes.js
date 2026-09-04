/**
 * Payroll Routes
 * Modul Kepegawaian - Fitur 4: Penggajian (Payroll)
 * 
 * Izin Granular:
 * - kepegawaian.payroll.calculate: buat periode & jalankan kalkulasi
 * - kepegawaian.payroll.edit_items: edit rincian manual komponen gaji
 * - kepegawaian.payroll.lock_and_send: verifikasi final, kunci periode & kirim ke keuangan
 */
const express = require('express');
const router = express.Router();
const payrollController = require('./controller');
const { authenticate, requirePermission, requireApiKey } = require('../../../middlewares/auth');

// 1. Kalkulasi & Periode
router.post(
  '/payroll/periods',
  authenticate,
  requirePermission('kepegawaian.payroll.calculate'),
  payrollController.createPeriod
);

router.post(
  '/payroll/periods/:id/calculate',
  authenticate,
  requirePermission('kepegawaian.payroll.calculate'),
  payrollController.calculatePeriod
);

// 2. Daftar Item Slip Gaji
router.get(
  '/payroll/periods/:id/items',
  authenticate,
  payrollController.listItems
);

// 3. Edit Manual Komponen Gaji per Pegawai
router.patch(
  '/payroll/items/:id',
  authenticate,
  requirePermission('kepegawaian.payroll.edit_items'),
  payrollController.updateItem
);

// 4. Verifikasi Slip Gaji per Pegawai
router.patch(
  '/payroll/items/:id/verify',
  authenticate,
  requirePermission('kepegawaian.payroll.lock_and_send'),
  payrollController.verifyItem
);

// 5. Kunci Periode Payroll (Locked)
router.post(
  '/payroll/periods/:id/lock',
  authenticate,
  requirePermission('kepegawaian.payroll.lock_and_send'),
  payrollController.lockPeriod
);

// 6. Serah Terima ke Keuangan (Ingest ke payroll_disbursements)
router.post(
  '/payroll/periods/:id/send-to-finance',
  authenticate,
  requirePermission('kepegawaian.payroll.lock_and_send'),
  payrollController.sendToFinance
);

// 7. Internal Service-to-Service: Kembalikan untuk Koreksi dari Keuangan
router.post(
  '/internal/payroll-items/:employee_id/:period_year/:period_month/return-for-correction',
  requireApiKey,
  payrollController.returnForCorrectionInternal
);

// 8. Update Status Manual (Admin / Fallback)
router.patch(
  '/payroll/periods/:id/status',
  authenticate,
  requirePermission('kepegawaian.payroll.lock_and_send'),
  payrollController.updatePeriodStatus
);

// 9. Audit Trail Riwayat Payroll
router.get(
  '/payroll/periods/:id/audit-logs',
  authenticate,
  payrollController.getAuditLogs
);

module.exports = router;
