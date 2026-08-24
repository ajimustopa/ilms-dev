/**
 * Circulation Routes Implementation
 * Modul Perpustakaan: Peminjaman, Pengembalian, Denda, Reservasi, Buku Hilang/Rusak
 */
const express = require('express');
const router = express.Router();
const circulationController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// ==========================================
// 1. PEMINJAMAN & PENGEMBALIAN BUKU (/loans)
// ==========================================
router.get(
  '/loans',
  verifyJwt,
  requirePermission('perpustakaan.loans.view'),
  circulationController.listLoans
);

router.post(
  '/loans',
  verifyJwt,
  requirePermission('perpustakaan.loans.create'),
  circulationController.createLoan
);

router.get(
  '/loans/:id',
  verifyJwt,
  requirePermission('perpustakaan.loans.view'),
  circulationController.getLoanById
);

router.patch(
  '/loans/:id/extend',
  verifyJwt,
  requirePermission('perpustakaan.loans.extend'),
  circulationController.extendLoan
);

router.patch(
  '/loans/:id/return',
  verifyJwt,
  requirePermission('perpustakaan.loans.return'),
  circulationController.returnLoan
);

router.patch(
  '/loans/:id/pay-fine',
  verifyJwt,
  requirePermission('perpustakaan.loans.pay_fine'),
  circulationController.payFine
);

// ==========================================
// 2. RESERVASI BUKU (/reservations)
// ==========================================
router.get(
  '/reservations',
  verifyJwt,
  requirePermission('perpustakaan.reservations.view'),
  circulationController.listReservations
);

router.post(
  '/reservations',
  verifyJwt,
  requirePermission('perpustakaan.reservations.create'),
  circulationController.createReservation
);

router.patch(
  '/reservations/:id/cancel',
  verifyJwt,
  requirePermission('perpustakaan.reservations.manage'),
  circulationController.cancelReservation
);

// ==========================================
// 3. BUKU HILANG & RUSAK (/lost-damaged-reports)
// ==========================================
router.get(
  '/lost-damaged-reports',
  verifyJwt,
  requirePermission('perpustakaan.lost_damaged.view'),
  circulationController.listLostDamagedReports
);

router.post(
  '/lost-damaged-reports',
  verifyJwt,
  requirePermission('perpustakaan.lost_damaged.report'),
  circulationController.createLostDamagedReport
);

router.patch(
  '/lost-damaged-reports/:id/resolve',
  verifyJwt,
  requirePermission('perpustakaan.lost_damaged.resolve'),
  circulationController.resolveLostDamagedReport
);

module.exports = router;
