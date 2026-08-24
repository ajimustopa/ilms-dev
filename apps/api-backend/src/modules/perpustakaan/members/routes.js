/**
 * Members Routes Implementation
 * Modul Perpustakaan: Data Anggota & Riwayat Peminjaman
 */
const express = require('express');
const router = express.Router();
const membersController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/members',
  verifyJwt,
  requirePermission('perpustakaan.members.view'),
  membersController.listMembers
);

router.post(
  '/members',
  verifyJwt,
  requirePermission('perpustakaan.members.register'),
  membersController.registerMember
);

router.get(
  '/members/:id',
  verifyJwt,
  requirePermission('perpustakaan.members.view'),
  membersController.getMemberById
);

router.patch(
  '/members/:id/status',
  verifyJwt,
  requirePermission('perpustakaan.members.deactivate'),
  membersController.updateMemberStatus
);

router.get(
  '/members/:id/loan-history',
  verifyJwt,
  requirePermission('perpustakaan.members.view'),
  membersController.getMemberLoanHistory
);

module.exports = router;
