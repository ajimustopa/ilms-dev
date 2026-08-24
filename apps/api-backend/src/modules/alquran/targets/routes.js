/**
 * Targets Routes for Alquran Module
 * Sesuai api-contract-alquran.md §2.1 & roles-alquran.md §4 & §5
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/targets',
  verifyJwt,
  requirePermission('alquran.targets.view'),
  controller.listTargets
);

router.post(
  '/targets',
  verifyJwt,
  requirePermission('alquran.targets.manage'),
  controller.createTarget
);

router.put(
  '/targets/:id',
  verifyJwt,
  requirePermission('alquran.targets.manage'),
  controller.updateTarget
);

router.delete(
  '/targets/:id',
  verifyJwt,
  requirePermission('alquran.targets.manage'),
  controller.deleteTarget
);

module.exports = router;
