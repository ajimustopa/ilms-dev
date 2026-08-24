const accessMenusService = require('./service');

class AccessMenusController {
  async listMenus(req, res, next) {
    try {
      const data = await accessMenusService.listMenus();
      res.json({
        success: true,
        data,
        message: null,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getRoleMenuAccess(req, res, next) {
    try {
      const data = await accessMenusService.getRoleMenuAccess(req.params.role_name);
      res.json({
        success: true,
        data,
        message: null,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleMenuAccess(req, res, next) {
    try {
      const { role_name, is_active } = req.body;
      if (!role_name || is_active === undefined) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'role_name dan is_active wajib diisi',
          errors: null
        });
      }
      const data = await accessMenusService.toggleMenuAccess(req.params.id, req.body);
      res.json({
        success: true,
        data,
        message: 'Akses menu berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AccessMenusController();
