/**
 * Webhooks Routes
 */
const express = require('express');
const router = express.Router();
const webhooksController = require('./controller');
const { authenticate } = require('../../../middlewares/auth');

// Webhook Events Publisher Endpoints
router.get('/events', authenticate, webhooksController.listEvents);
router.get('/events/:id', authenticate, webhooksController.getEventById);
router.post('/deliveries/:id/retry', authenticate, webhooksController.retryDelivery);

// Webhook Subscriber Management Endpoints
router.get('/subscribers', authenticate, webhooksController.listSubscribers);
router.post('/subscribers', authenticate, webhooksController.createSubscriber);
router.put('/subscribers/:id', authenticate, webhooksController.updateSubscriber);
router.post('/subscribers/:id/rotate-secret', authenticate, webhooksController.rotateSecret);
router.delete('/subscribers/:id', authenticate, webhooksController.deleteSubscriber);

module.exports = router;
