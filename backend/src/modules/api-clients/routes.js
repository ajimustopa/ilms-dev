/**
 * API Clients & Rate Limiting Routes
 */
const express = require('express');
const router = express.Router();
const apiClientsController = require('./controller');
const { authenticate } = require('../../middlewares/auth');

// API Clients Endpoints
router.get('/api-clients', authenticate, apiClientsController.listClients);
router.post('/api-clients', authenticate, apiClientsController.createClient);
router.patch('/api-clients/:id/status', authenticate, apiClientsController.updateClientStatus);

// Rate Limit Rules Endpoints
router.get('/rate-limit-rules', authenticate, apiClientsController.listRateLimitRules);
router.post('/rate-limit-rules', authenticate, apiClientsController.createRateLimitRule);
router.put('/rate-limit-rules/:id', authenticate, apiClientsController.updateRateLimitRule);
router.delete('/rate-limit-rules/:id', authenticate, apiClientsController.deleteRateLimitRule);

module.exports = router;
