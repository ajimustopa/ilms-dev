/**
 * Webhooks Controller Implementation
 */
const webhooksService = require('./service');

class WebhooksController {
  async listEvents(req, res, next) {
    try {
      const result = await webhooksService.listEvents(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar webhook events berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getEventById(req, res, next) {
    try {
      const result = await webhooksService.getEventById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail webhook event dan status pengiriman berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async retryDelivery(req, res, next) {
    try {
      const result = await webhooksService.retryDelivery(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengiriman webhook dijadwalkan ulang',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listSubscribers(req, res, next) {
    try {
      const result = await webhooksService.listSubscribers(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar subscriber webhook berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getSubscriberById(req, res, next) {
    try {
      const result = await webhooksService.getSubscriberById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail subscriber webhook berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createSubscriber(req, res, next) {
    try {
      const result = await webhooksService.createSubscriber(
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'Subscriber webhook berhasil didaftarkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSubscriber(req, res, next) {
    try {
      const result = await webhooksService.updateSubscriber(
        req.params.id,
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data subscriber webhook berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async rotateSecret(req, res, next) {
    try {
      const result = await webhooksService.rotateSecret(
        req.params.id,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Secret key webhook berhasil dirotasi',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSubscriber(req, res, next) {
    try {
      await webhooksService.deleteSubscriber(
        req.params.id,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: null,
        message: 'Subscriber webhook berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WebhooksController();
