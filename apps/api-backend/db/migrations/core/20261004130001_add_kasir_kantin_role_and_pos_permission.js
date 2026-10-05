/**
 * Migration: add_kasir_kantin_role_and_pos_permission
 * Menambahkan Role Khusus 'kasir_kantin' dan Permission 'kantin.pos'
 * Kasir hanya memiliki wewenang untuk melakukan transaksi kasir POS Penjualan Kantin.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Permission baru: kantin.pos
  let posPerm = await knex('permissions').where({ code: 'kantin.pos' }).first();
  if (!posPerm) {
    const [permId] = await knex('permissions').insert({
      code: 'kantin.pos',
      module: 'kantin',
      description: 'Akses Kasir POS Penjualan Kantin (Hanya Transaksi POS)',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
    posPerm = { id: permId || (await knex('permissions').where({ code: 'kantin.pos' }).first()).id };
  }

  // 2. Role baru: kasir_kantin
  let kasirRole = await knex('roles').where({ name: 'kasir_kantin' }).first();
  if (!kasirRole) {
    const [newRoleId] = await knex('roles').insert({
      name: 'kasir_kantin',
      description: 'Kasir POS Kantin (Hanya Akses POS Penjualan)',
      is_system_role: 1,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
    kasirRole = { id: newRoleId || (await knex('roles').where({ name: 'kasir_kantin' }).first()).id };
  }

  // 3. Hubungkan permission kantin.pos ke kasir_kantin
  if (posPerm && kasirRole) {
    const relExists = await knex('role_permissions')
      .where({ role_id: kasirRole.id, permission_id: posPerm.id })
      .first();
    if (!relExists) {
      await knex('role_permissions').insert({
        role_id: kasirRole.id,
        permission_id: posPerm.id,
        created_at: knex.fn.now()
      });
    }
  }

  // 4. Pastikan role pengelola_kantin dan super_admin juga memiliki permission kantin.pos
  const parentRoles = await knex('roles').whereIn('name', ['pengelola_kantin', 'super_admin']).select('id');
  for (const r of parentRoles) {
    const relExists = await knex('role_permissions')
      .where({ role_id: r.id, permission_id: posPerm.id })
      .first();
    if (!relExists) {
      await knex('role_permissions').insert({
        role_id: r.id,
        permission_id: posPerm.id,
        created_at: knex.fn.now()
      });
    }
  }
};

exports.down = async function (knex) {
  const posPerm = await knex('permissions').where({ code: 'kantin.pos' }).first();
  const kasirRole = await knex('roles').where({ name: 'kasir_kantin' }).first();

  if (posPerm) {
    await knex('role_permissions').where({ permission_id: posPerm.id }).del();
    await knex('permissions').where({ id: posPerm.id }).del();
  }
  if (kasirRole) {
    await knex('role_permissions').where({ role_id: kasirRole.id }).del();
    await knex('roles').where({ id: kasirRole.id }).del();
  }
};
