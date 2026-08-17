/**
 * System Settings Routes
 */
const express = require('express');
const router = express.Router();
const systemSettingsController = require('./controller');
const { authenticate } = require('../../../middlewares/auth');

// System Settings Endpoints
router.get('/', authenticate, systemSettingsController.list);
router.get('/:key', authenticate, systemSettingsController.getByKey);
router.post('/', authenticate, systemSettingsController.create);
router.put('/:id', authenticate, systemSettingsController.update);
router.delete('/:id', authenticate, systemSettingsController.delete);

module.exports = router;
