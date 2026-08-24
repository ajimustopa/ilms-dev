/**
 * Bills (Tagihan) Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 3) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// Generate Massal & Simulasi Preview (Fitur #13)
router.post(
  '/student-bills/generate/preview',
  verifyJwt,
  requirePermission('keuangan.bills.generate'),
  controller.previewBillGeneration
);
router.post(
  '/student-bills/generate',
  verifyJwt,
  requirePermission('keuangan.bills.generate'),
  controller.generateBills
);

// Reminder Tagihan (Fitur #16)
router.post(
  '/student-bills/reminders/run',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.runReminders
);

// Daftar & Detail Tagihan (Fitur #14)
router.get(
  '/student-bills',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.listBills
);
router.get(
  '/student-bills/:id',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.getBillById
);
router.get(
  '/student-bills/:id/reminder-logs',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.getReminderLogs
);

// Batalkan Tagihan (Fitur #15)
router.patch(
  '/student-bills/:id/cancel',
  verifyJwt,
  requirePermission('keuangan.bills.cancel'),
  controller.cancelBill
);

module.exports = router;
