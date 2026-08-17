/**
 * Users Routes
 */
const express = require('express');
const router = express.Router();
const usersController = require('./controller');
const { authenticate, requireApiKey } = require('../../middlewares/auth');

// Internal Endpoints (Dipanggil oleh Akademik/Kepegawaian via API Key)
router.post('/internal/users', requireApiKey, usersController.internalCreate);
router.patch('/internal/users/sync', requireApiKey, usersController.internalSync);

// Self-Service User Endpoints
router.put('/change-password', authenticate, usersController.changePassword);

// Admin User Management Endpoints
router.get('/', authenticate, usersController.list);
router.post('/', authenticate, usersController.createAdmin);
router.get('/:id', authenticate, usersController.getById);
router.patch('/:id/status', authenticate, usersController.updateStatus);
router.post('/:id/reset-password', authenticate, usersController.resetPassword);

module.exports = router;
