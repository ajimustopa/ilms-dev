/**
 * School Units Routes
 */
const express = require('express');
const router = express.Router();
const schoolUnitsController = require('./controller');
const { authenticate } = require('../../../middlewares/auth');

// School Units Endpoints
router.get('/', schoolUnitsController.list);
router.post('/', authenticate, schoolUnitsController.create);
router.get('/:id', schoolUnitsController.getById);
router.put('/:id', authenticate, schoolUnitsController.update);
router.patch('/:id/status', authenticate, schoolUnitsController.updateStatus);
router.get('/:id/status-history', authenticate, schoolUnitsController.getStatusHistory);

module.exports = router;
