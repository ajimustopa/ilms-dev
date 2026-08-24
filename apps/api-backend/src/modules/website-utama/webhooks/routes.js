/**
 * Webhooks Routes for Website Utama Module
 * Base Prefix: /webhooks (akan di-mount ke /api/v1/website-utama/webhooks)
 */
const express = require('express');
const router = express.Router();
const webhookController = require('./controller');
const { verifyWebhookSignature } = require('./middleware');

// POST /webhooks/ppdb-status (dengan verifikasi X-Webhook-Signature)
router.post('/ppdb-status', verifyWebhookSignature, webhookController.handlePpdbStatus);

module.exports = router;
