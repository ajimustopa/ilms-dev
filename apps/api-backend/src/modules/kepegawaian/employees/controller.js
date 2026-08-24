/**
 * Employees Controller Implementation
 * Modul Kepegawaian - Fitur 1.1: CRUD Data Pegawai (Master)
 */
const employeesService = require('./service');

class EmployeesController {
  async list(req, res, next) {
    try {
      const result = await employeesService.listEmployees(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pegawai berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const user = req.user;
      let isPrivileged = false;
      if (user) {
        if (user.is_super_admin || user.account_type === 'super_admin' || user.account_type === 'admin') isPrivileged = true;
        if (['super_admin', 'admin_yayasan', 'hrd'].includes(user.active_role)) isPrivileged = true;
        const roles = Array.isArray(user.roles) ? user.roles : (user.user_school_roles || []);
        if (roles.some(r => ['super_admin', 'admin_yayasan', 'hrd'].includes(typeof r === 'string' ? r : r.role_name || r.name))) {
          isPrivileged = true;
        }
        if (!isPrivileged && user.permissions?.some(p => ['kepegawaian.employees.view', 'kepegawaian.view', 'kepegawaian.manage'].includes(p))) {
          isPrivileged = true;
        }
        if (!isPrivileged && user.id) {
          try {
            const coreDb = require('../../../config/db/core');
            const dbRoles = await coreDb('user_school_roles')
              .join('roles', 'user_school_roles.role_id', 'roles.id')
              .where('user_school_roles.user_id', user.id)
              .select('roles.name as role_name');
            if (dbRoles.some(r => ['super_admin', 'admin_yayasan', 'hrd'].includes(r.role_name))) {
              isPrivileged = true;
            }
          } catch (dbErr) {}
        }
      }

      // Validasi self-service jika role pegawai biasa non-privileged
      if (user && user.ref_type === 'staff' && user.ref_id && !isPrivileged) {
        if (String(user.ref_id) !== String(req.params.id)) {
          return res.status(403).json({
            success: false,
            data: null,
            message: 'Akses ditolak. Anda hanya dapat melihat data kepegawaian Anda sendiri.',
            errors: null
          });
        }
      }

      const result = await employeesService.getEmployeeById(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail pegawai berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const result = await employeesService.createEmployee(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pegawai berhasil ditambahkan dan akun Core Service dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await employeesService.updateEmployee(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data pegawai berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const result = await employeesService.updateAccountStatus(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status pegawai berhasil diubah dan dicatat ke riwayat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getStatusHistory(req, res, next) {
    try {
      const result = await employeesService.getAccountStatusHistory(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Riwayat status pegawai berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getRelatedData(req, res, next) {
    try {
      const result = await employeesService.getRelatedData(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data terkait pegawai berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await employeesService.deleteEmployee(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: result.message || 'Data pegawai berhasil dihapus permanen',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EmployeesController();

