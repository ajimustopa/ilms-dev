/**
 * Auth Routes Implementation
 */
const express = require('express');
const router = express.Router();
const authController = require('./controller');
const verifyJwt = require('../../middlewares/verifyJwt');
const requirePermission = require('../../middlewares/requirePermission');

// 1. Endpoint Publik
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/refresh-token', authController.refreshToken); // Alias
router.post('/forgot-password/request', authController.forgotPasswordRequest);
router.post('/verify-token', authController.verifyToken);

// 2. Endpoint Pengguna Terautentikasi (Memerlukan Bearer Token)
router.post('/logout', verifyJwt, authController.logout);
router.get('/me', verifyJwt, authController.getMe);

// 3. Endpoint Penanganan Permohonan Reset Password (Admin)
router.get(
  '/password-resets',
  verifyJwt,
  requirePermission('core.auth.password_resets.view'),
  authController.listPasswordResets
);
router.patch(
  '/password-resets/:id/process',
  verifyJwt,
  requirePermission('core.auth.password_resets.process'),
  authController.processPasswordReset
);

module.exports = router;
