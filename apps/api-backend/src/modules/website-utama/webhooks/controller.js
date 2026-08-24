/**
 * Webhook Controller for Website Utama Module
 */
const webhookService = require('./service');

class WebsiteUtamaWebhookController {
  async handlePpdbStatus(req, res, next) {
    try {
      const data = await webhookService.handlePpdbStatusChanged(req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Status pendaftaran PPDB berhasil diperbarui dari webhook Akademik',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WebsiteUtamaWebhookController();
