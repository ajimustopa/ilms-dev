/**
 * Canteen Integration Routes for Keuangan Module
 * Mounted under /api/v1/keuangan/canteen
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt } = require('../../../middlewares/auth');

// Semua rute memerlukan otentikasi JWT
router.use(verifyJwt);

// 1. Dashboard & Rekonsiliasi Triangulasi
router.get('/canteen/overview', controller.getOverview);

// 2. Data Siswa & Transaksi Dompet
router.get('/canteen/students', controller.listStudents);
router.get('/canteen/wallet-transactions', controller.listWalletTransactions);
router.post('/canteen/wallet-transactions/top-up', controller.topUpWallet);
router.post('/canteen/wallet-transactions/withdrawal', controller.withdrawWallet);
router.put('/canteen/wallet-transactions/:id', controller.updateWalletTransaction);
router.get('/canteen/wallet-transactions/:id/revisions', controller.listWalletRevisions);

// 3. Referensi Kas & Mutasi Rekening Koran
router.get('/canteen/cash-accounts', controller.listCashAccounts);
router.get('/canteen/bank-statements', controller.listBankStatements);

// 4. Hak Kantin & Pencairan (Disbursement)
router.get('/canteen/canteen-share', controller.getCanteenShare);
router.get('/canteen/canteen-share/detail', controller.getCanteenShareDetail);
router.get('/canteen/canteen-fee-payments', controller.listCanteenFeePayments);
router.post('/canteen/canteen-fee-payments', controller.createCanteenFeePayment);

// 5. Hak Vendor & Pembayaran (Payouts)
router.get('/canteen/vendor-shares', controller.getVendorShares);
router.get('/canteen/vendor-fee-payments', controller.listVendorFeePayments);
router.post('/canteen/vendor-fee-payments', controller.createVendorFeePayment);

// 6. Mutasi Kas Dompet
router.post('/canteen/cash-transfers', controller.createCanteenCashTransfer);

module.exports = router;
