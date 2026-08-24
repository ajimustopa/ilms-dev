/**
 * Dapur Dashboard & Reports Service
 */
const db = require('../../../config/db-dapur');

class DapurReportsService {
  async getDashboardSummary(schoolUnitId) {
    // 1. Total Bahan Baku
    let ingQuery = db('kitchen_ingredients');
    if (schoolUnitId) {
      ingQuery = ingQuery.where(function () {
        this.where('satuan_pendidikan_id', schoolUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    const [{ totalIngredients }] = await ingQuery.count({ totalIngredients: '*' });

    // 2. Total Supplier
    const [{ totalSuppliers }] = await db('kitchen_suppliers').count({ totalSuppliers: '*' });

    // 3. Total Menu Aktif
    const [{ totalMenus }] = await db('kitchen_menus').count({ totalMenus: '*' });

    // 4. Total Resep Terstandar
    const [{ totalRecipes }] = await db('kitchen_recipes').count({ totalRecipes: '*' });

    // 5. Status Layanan Hari Ini
    const today = new Date().toISOString().slice(0, 10);
    const serviceStatus = await db('kitchen_service_status')
      .where('service_date', today)
      .first();

    // 6. Recent Ingredients
    const recentIngredients = await db('kitchen_ingredients as i')
      .leftJoin('kitchen_master_data as m', 'i.category_id', 'm.id')
      .leftJoin('kitchen_units as u', 'i.base_unit_id', 'u.id')
      .select('i.id', 'i.code', 'i.name', 'm.name as category_name', 'u.code as unit_code', 'i.min_stock', 'i.status')
      .orderBy('i.id', 'desc')
      .limit(5);

    // 7. Recent Menus
    const recentMenus = await db('kitchen_menus')
      .select('id', 'name', 'menu_type', 'menu_date', 'status', 'is_favorite')
      .orderBy('id', 'desc')
      .limit(5);

    return {
      metrics: {
        total_ingredients: parseInt(totalIngredients) || 0,
        total_suppliers: parseInt(totalSuppliers) || 0,
        total_menus: parseInt(totalMenus) || 0,
        total_recipes: parseInt(totalRecipes) || 0,
      },
      service_status: serviceStatus || {
        service_date: today,
        status: 'normal',
        announcement_message: 'Pelayanan makan santri berjalan normal sesuai jadwal menu harian.',
      },
      recent_ingredients: recentIngredients,
      recent_menus: recentMenus,
    };
  }
}

module.exports = new DapurReportsService();
