/**
 * Cashiers Controller for Kantin Module
 */
const { z } = require('zod');
const service = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

const createCashierSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter').max(50),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  school_unit_id: z.union([z.number(), z.string()]).nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

const updateCashierSchema = z.object({
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter').optional(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  school_unit_id: z.union([z.number(), z.string()]).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional()
});

class CashiersController {
  async listCashiers(req, res, next) {
    try {
      const unitId = getValidatedSchoolUnitId(req);
      const data = await service.listCashiers(unitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar akun kasir kantin berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getCashierById(req, res, next) {
    try {
      const data = await service.getCashierById(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Detail akun kasir berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createCashier(req, res, next) {
    try {
      const validated = createCashierSchema.parse(req.body);
      const ipAddress = req.ip || req.connection.remoteAddress;
      const data = await service.createCashier(validated, req.user, ipAddress);
      return res.status(201).json({
        success: true,
        data,
        message: 'Akun kasir POS berhasil dibuat',
        errors: null
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({
          success: false,
          data: null,
          message: err.errors[0]?.message || 'Validasi data gagal',
          errors: err.errors
        });
      }
      next(err);
    }
  }

  async updateCashier(req, res, next) {
    try {
      const validated = updateCashierSchema.parse(req.body);
      const ipAddress = req.ip || req.connection.remoteAddress;
      const data = await service.updateCashier(req.params.id, validated, req.user, ipAddress);
      return res.json({
        success: true,
        data,
        message: 'Data akun kasir berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({
          success: false,
          data: null,
          message: err.errors[0]?.message || 'Validasi data gagal',
          errors: err.errors
        });
      }
      next(err);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const { status } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const data = await service.toggleStatus(req.params.id, status, req.user, ipAddress);
      return res.json({
        success: true,
        data,
        message: `Status akun kasir berhasil diubah menjadi ${status === 'active' ? 'Aktif' : 'Non-Aktif'}`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteCashier(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await service.deleteCashier(req.params.id, req.user, ipAddress);
      return res.json({
        success: true,
        data: result,
        message: result.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CashiersController();
