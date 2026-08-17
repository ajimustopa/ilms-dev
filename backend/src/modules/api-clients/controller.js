/**
 * API Clients Controller Implementation
 */
const apiClientsService = require('./service');

class ApiClientsController {
  async listClients(req, res, next) {
    try {
      const result = await apiClientsService.listClients(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar API client berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createClient(req, res, next) {
    try {
      const result = await apiClientsService.createClient(
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'API client berhasil dibuat. Simpan API key Anda dengan aman.',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateClientStatus(req, res, next) {
    try {
      const result = await apiClientsService.updateClientStatus(
        req.params.id,
        req.body.status,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status API client berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listRateLimitRules(req, res, next) {
    try {
      const result = await apiClientsService.listRateLimitRules(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar aturan rate limit berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createRateLimitRule(req, res, next) {
    try {
      const result = await apiClientsService.createRateLimitRule(
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'Aturan rate limit berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRateLimitRule(req, res, next) {
    try {
      const result = await apiClientsService.updateRateLimitRule(
        req.params.id,
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Aturan rate limit berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteRateLimitRule(req, res, next) {
    try {
      await apiClientsService.deleteRateLimitRule(
        req.params.id,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: null,
        message: 'Aturan rate limit berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ApiClientsController();
