/**
 * Foundation Routes Implementation
 */
const express = require('express');
const router = express.Router();
const foundationController = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requirePermission = require('../../../middlewares/requirePermission');

// GET /api/v1/foundation — Terbuka (Public, Authenticated User, & Internal Service)
router.get('/', foundationController.get);

// PUT /api/v1/foundation — Khusus Admin (Super Admin & Admin Yayasan)
router.put(
  '/',
  verifyJwt,
  requirePermission('core.master.foundation.edit'),
  foundationController.update
);

module.exports = router;
