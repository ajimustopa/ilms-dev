/**
 * Access Menus Service
 * Sesuai api-contract-kantin.md Modul 1 & erd-kantin.md §2.1–2.2
 */
const db = require('../../../config/db/kantin');

class AccessMenusService {
  async listMenus() {
    const menus = await db('access_menus').orderBy('id', 'asc');
    const roleAccess = await db('role_menu_access').orderBy('id', 'asc');

    return menus.map(menu => {
      const roles = roleAccess
        .filter(ra => ra.access_menu_id === menu.id)
        .map(ra => ({
          role_name: ra.role_name,
          is_active: Boolean(ra.is_active)
        }));
      return {
        ...menu,
        roles
      };
    });
  }

  async getRoleMenuAccess(roleName) {
    const roleAccess = await db('role_menu_access')
      .join('access_menus', 'role_menu_access.access_menu_id', 'access_menus.id')
      .where('role_menu_access.role_name', roleName)
      .select(
        'role_menu_access.id',
        'role_menu_access.role_name',
        'role_menu_access.access_menu_id',
        'role_menu_access.is_active',
        'access_menus.menu_key',
        'access_menus.menu_name',
        'access_menus.description'
      )
      .orderBy('access_menus.id', 'asc');

    return roleAccess;
  }

  async toggleMenuAccess(menuId, payload) {
    const { role_name, is_active } = payload;
    const menu = await db('access_menus').where({ id: menuId }).first();
    if (!menu) {
      const err = new Error('Menu tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const existing = await db('role_menu_access')
      .where({ access_menu_id: menuId, role_name })
      .first();

    if (existing) {
      await db('role_menu_access')
        .where({ id: existing.id })
        .update({
          is_active: Boolean(is_active),
          updated_at: db.fn.now()
        });
      return db('role_menu_access').where({ id: existing.id }).first();
    } else {
      const [id] = await db('role_menu_access').insert({
        access_menu_id: menuId,
        role_name,
        is_active: Boolean(is_active)
      });
      return db('role_menu_access').where({ id }).first();
    }
  }
}

module.exports = new AccessMenusService();
