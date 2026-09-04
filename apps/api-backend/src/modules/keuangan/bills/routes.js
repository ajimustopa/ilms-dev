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

// Matrix Penetapan & Penagihan Siswa (Tab 1)
router.get(
  '/student-bills/matrix',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.getBillsMatrix
);
router.post(
  '/student-bills/publish-cell',
  verifyJwt,
  requirePermission('keuangan.bills.generate'),
  controller.publishCellBill
);
router.post(
  '/student-bills/publish-batch',
  verifyJwt,
  requirePermission('keuangan.bills.generate'),
  controller.publishBatchColumnBills
);
router.post(
  '/student-bills/import-column',
  verifyJwt,
  requirePermission('keuangan.bills.generate'),
  controller.importColumnBills
);

// Reminder Logs & Broadcast (Tab 3)
router.get(
  '/student-bills/reminders/logs',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.listReminderLogs
);
router.post(
  '/student-bills/reminders/broadcast',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.broadcastReminders
);

// Reminder Tagihan (Fitur #16)
router.post(
  '/student-bills/:id/reminders',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.sendBillReminder
);
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
  '/student-bills/student-fee-reference',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.getStudentFeeReference
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

// Edit Draft Tagihan Siswa (Sebelum Terbit)
router.patch(
  '/student-bills/:id',
  verifyJwt,
  requirePermission('keuangan.bills.generate'),
  controller.updateDraftBill
);

// Terbitkan Tagihan Siswa (Draft -> Unpaid & Jurnal Piutang)
router.post(
  '/student-bills/publish',
  verifyJwt,
  requirePermission('keuangan.bills.generate'),
  controller.publishBills
);

// Batalkan Tagihan (Fitur #15)
router.patch(
  '/student-bills/:id/cancel',
  verifyJwt,
  requirePermission('keuangan.bills.cancel'),
  controller.cancelBill
);

// Hapus Buku Piutang Macet (Write-Off)
router.post(
  '/student-bills/:id/write-off',
  verifyJwt,
  requirePermission('keuangan.bills.cancel'),
  controller.writeOffBill
);

// Draf Tagihan Manual Individual (Bagian 2)
router.post(
  '/student-bills/manual-draft',
  verifyJwt,
  requirePermission('keuangan.bills.create_manual'),
  controller.createManualDraftBill
);
router.post(
  '/student-bills/manual',
  verifyJwt,
  requirePermission('keuangan.bills.create_manual'),
  controller.createManualDraftBill
);

// Revisi Pasca-Terbit & Riwayat Revisi (Bagian 3)
router.post(
  '/student-bills/:id/revise',
  verifyJwt,
  requirePermission('keuangan.bills.revise'),
  controller.reviseIssuedBill
);
router.get(
  '/student-bills/:id/revisions',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.getBillRevisions
);
// Approval Berjenjang Diskon Kasuistik (Bagian 4)
router.post(
  '/student-bills/:id/approve-discount',
  verifyJwt,
  requirePermission('keuangan.bills.approve_discount_unit'),
  controller.approveBillDiscount
);
router.post(
  '/student-bills/:id/reject-discount',
  verifyJwt,
  requirePermission('keuangan.bills.approve_discount_unit'),
  controller.rejectBillDiscount
);

// Pemicu Generator Bulanan Pola Hibrida (Bagian 5)
router.post(
  '/student-bills/auto-generate/monthly',
  verifyJwt,
  requirePermission('keuangan.bills.generate'),
  controller.autoGenerateMonthlyDraftBills
);

module.exports = router;


