/**
 * Roles & Permissions Service Implementation
 * Fitur #4: Master Role & Permission RBAC
 */
const db = require('../../../config/db/core');

class RolesService {
  async listRoles(query = {}) {
    let baseQuery = db('roles');

    if (query.search) {
      baseQuery = baseQuery.where((builder) => {
        builder.where('name', 'like', `%${query.search}%`)
          .orWhere('description', 'like', `%${query.search}%`);
      });
    }

    const roles = await baseQuery.orderBy('id', 'asc');
    const roleIds = roles.map((r) => r.id);

    let rolePerms = [];
    if (roleIds.length > 0) {
      rolePerms = await db('role_permissions')
        .whereIn('role_id', roleIds)
        .select('role_id', 'permission_id');
    }

    return roles.map((r) => {
      const perms = rolePerms.filter((rp) => rp.role_id === r.id).map((rp) => rp.permission_id);
      return {
        ...r,
        permissions: perms,
        total_permissions: perms.length
      };
    });
  }

  async getRoleById(id) {
    const role = await db('roles').where({ id }).first();
    if (!role) {
      const error = new Error('Role tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const permissions = await db('role_permissions')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where('role_permissions.role_id', id)
      .select('permissions.id', 'permissions.code', 'permissions.module', 'permissions.description');

    return {
      ...role,
      permissions
    };
  }

  async createRole(payload, adminUser, ipAddress) {
    if (!payload.name) {
      const error = new Error("Field 'name' role wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const existing = await db('roles').where({ name: payload.name.trim() }).first();
    if (existing) {
      const error = new Error(`Role dengan nama '${payload.name}' sudah ada`);
      error.statusCode = 409;
      throw error;
    }

    const [roleId] = await db('roles').insert({
      name: payload.name.trim(),
      description: payload.description ? payload.description.trim() : null,
      is_system_role: false,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    if (payload.permission_ids && Array.isArray(payload.permission_ids)) {
      const inserts = payload.permission_ids.map((pId) => ({
        role_id: roleId,
        permission_id: pId,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }));
      if (inserts.length > 0) {
        await db('role_permissions').insert(inserts);
      }
    }

    const createdRole = await this.getRoleById(roleId);

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'roles',
      action: 'create_role',
      ip_address: ipAddress || null,
      data_before: null,
      data_after: JSON.stringify(createdRole),
      occurred_at: db.fn.now()
    });

    return createdRole;
  }

  async updateRole(id, payload, adminUser, ipAddress) {
    const currentRole = await this.getRoleById(id);
    if (!currentRole) {
      const error = new Error('Role tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (!currentRole.is_system_role && payload.name) {
      updateData.name = payload.name.trim();
    }
    if (payload.description !== undefined) {
      updateData.description = payload.description ? payload.description.trim() : null;
    }

    await db('roles').where({ id }).update(updateData);

    if (payload.permission_ids && Array.isArray(payload.permission_ids)) {
      await db('role_permissions').where({ role_id: id }).delete();
      const inserts = payload.permission_ids.map((pId) => ({
        role_id: id,
        permission_id: pId,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }));
      if (inserts.length > 0) {
        await db('role_permissions').insert(inserts);
      }
    }

    const updatedRole = await this.getRoleById(id);

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'roles',
      action: 'update_role',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(currentRole),
      data_after: JSON.stringify(updatedRole),
      occurred_at: db.fn.now()
    });

    return updatedRole;
  }

  async deleteRole(id, adminUser, ipAddress) {
    const role = await db('roles').where({ id }).first();
    if (!role) {
      const error = new Error('Role tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (role.is_system_role) {
      const error = new Error('System Role bawaan sistem tidak boleh dihapus');
      error.statusCode = 400;
      throw error;
    }

    await db('role_permissions').where({ role_id: id }).delete();
    await db('user_school_roles').where({ role_id: id }).delete();
    await db('roles').where({ id }).delete();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'roles',
      action: 'delete_role',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(role),
      data_after: null,
      occurred_at: db.fn.now()
    });

    return true;
  }

  async listPermissions(query = {}) {
    let baseQuery = db('permissions');
    if (query.module) {
      baseQuery = baseQuery.where('module', query.module);
    }
    return baseQuery.orderBy('id', 'asc');
  }

  async assignUserSchoolRoles(userId, { school_unit_id, role_ids }) {
    if (!school_unit_id || !role_ids || !Array.isArray(role_ids)) {
      const error = new Error('school_unit_id dan role_ids (array) wajib disertakan');
      error.statusCode = 422;
      throw error;
    }

    await db('user_school_roles')
      .where({ user_id: userId, school_unit_id })
      .delete();

    const inserts = role_ids.map((rId) => ({
      user_id: userId,
      school_unit_id,
      role_id: rId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }));

    if (inserts.length > 0) {
      await db('user_school_roles').insert(inserts);
    }

    return { user_id: Number(userId), school_unit_id, assigned_roles: role_ids };
  }

  async removeUserSchoolRole(userId, userSchoolRoleId) {
    await db('user_school_roles').where({ id: userSchoolRoleId, user_id: userId }).delete();
    return true;
  }
}

module.exports = new RolesService();
