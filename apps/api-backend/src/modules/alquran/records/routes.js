/**
 * Records Routes for Alquran Module
 * Sesuai api-contract-alquran.md §2.2 & roles-alquran.md §4 & §5
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/records',
  verifyJwt,
  requirePermission('alquran.records.view'),
  controller.listRecords
);

router.post(
  '/records',
  verifyJwt,
  requirePermission('alquran.records.create'),
  controller.createRecord
);

router.patch(
  '/records/:id/verify',
  verifyJwt,
  requirePermission('alquran.records.verify'),
  controller.verifyRecord
);

module.exports = router;
