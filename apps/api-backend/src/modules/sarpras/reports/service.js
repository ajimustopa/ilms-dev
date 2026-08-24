/**
 * Reports & Dashboard Service Implementation
 * Modul Sarpras: Laporan Kondisi & Penyusutan Aset, Dashboard KPI
 */
const db = require('../../../config/db/sarpras');

class ReportsService {
  async getAssetConditionReport(schoolUnitId, query = {}) {
    let q = db('assets').where('school_unit_id', schoolUnitId);

    if (query.category) {
      q = q.where('category', query.category);
    }
    if (query.status) {
      q = q.where('status', query.status);
    }

    const items = await q.select(
      'id',
      'asset_code',
      'name',
      'category',
      'condition',
      'acquisition_value',
      'acquisition_date',
      'status'
    ).orderBy('id', 'asc');

    // Agregat kondisi
    const summary = {
      total_assets: items.length,
      baik: items.filter(i => i.condition === 'baik').length,
      rusak_ringan: items.filter(i => i.condition === 'rusak_ringan').length,
      rusak_berat: items.filter(i => i.condition === 'rusak_berat').length
    };

    return {
      summary,
      assets: items
    };
  }

  async getAssetDepreciationReport(schoolUnitId, query = {}) {
    const usefulLifeYearsDefault = Number(query.useful_life_years) || 5;
    const now = new Date();

    const assets = await db('assets')
      .where('school_unit_id', schoolUnitId)
      .where('status', 'active')
      .whereNotNull('acquisition_value')
      .select('id', 'asset_code', 'name', 'category', 'acquisition_value', 'acquisition_date');

    const depreciationList = assets.map(asset => {
      const acqValue = Number(asset.acquisition_value) || 0;
      const acqDate = asset.acquisition_date ? new Date(asset.acquisition_date) : null;
      
      let ageMonths = 0;
      if (acqDate && !isNaN(acqDate.getTime())) {
        ageMonths = Math.max(0, (now.getFullYear() - acqDate.getFullYear()) * 12 + (now.getMonth() - acqDate.getMonth()));
      }

      const usefulLifeMonths = usefulLifeYearsDefault * 12;
      const monthlyDepreciation = usefulLifeMonths > 0 ? acqValue / usefulLifeMonths : 0;
      const accumulatedDepreciation = Math.min(acqValue, monthlyDepreciation * ageMonths);
      const bookValue = Math.max(0, acqValue - accumulatedDepreciation);

      return {
        id: asset.id,
        asset_code: asset.asset_code,
        name: asset.name,
        category: asset.category,
        acquisition_value: acqValue,
        acquisition_date: asset.acquisition_date,
        useful_life_years: usefulLifeYearsDefault,
        age_in_months: ageMonths,
        annual_depreciation: monthlyDepreciation * 12,
        accumulated_depreciation: Math.round(accumulatedDepreciation * 100) / 100,
        book_value: Math.round(bookValue * 100) / 100
      };
    });

    const totalAcquisition = depreciationList.reduce((sum, item) => sum + item.acquisition_value, 0);
    const totalAccumulatedDepreciation = depreciationList.reduce((sum, item) => sum + item.accumulated_depreciation, 0);
    const totalBookValue = depreciationList.reduce((sum, item) => sum + item.book_value, 0);

    return {
      summary: {
        total_assets: depreciationList.length,
        useful_life_years: usefulLifeYearsDefault,
        total_acquisition_value: totalAcquisition,
        total_accumulated_depreciation: Math.round(totalAccumulatedDepreciation * 100) / 100,
        total_book_value: Math.round(totalBookValue * 100) / 100
      },
      depreciation_list: depreciationList
    };
  }

  async getDashboardSummary(schoolUnitId) {
    const [sitesCount] = await db('facility_sites').where({ school_unit_id: schoolUnitId }).count('id as count');
    const [buildingsCount] = await db('facility_buildings').where({ school_unit_id: schoolUnitId }).count('id as count');
    const [roomsCount] = await db('facility_rooms').where({ school_unit_id: schoolUnitId }).count('id as count');
    const [assetsCount] = await db('assets').where({ school_unit_id: schoolUnitId, status: 'active' }).count('id as count');
    const [pendingBookingsCount] = await db('facility_bookings').where({ school_unit_id: schoolUnitId, status: 'pending' }).count('id as count');
    const [activeMaintenanceCount] = await db('maintenance_requests').where({ school_unit_id: schoolUnitId }).whereIn('repair_status', ['dilaporkan', 'diproses']).count('id as count');
    const lowStockItems = await db('consumable_items').where({ school_unit_id: schoolUnitId }).whereRaw('current_stock <= minimum_stock').count('id as count');

    return {
      total_sites: parseInt(sitesCount.count, 10) || 0,
      total_buildings: parseInt(buildingsCount.count, 10) || 0,
      total_rooms: parseInt(roomsCount.count, 10) || 0,
      total_active_assets: parseInt(assetsCount.count, 10) || 0,
      pending_bookings: parseInt(pendingBookingsCount.count, 10) || 0,
      active_maintenance_tickets: parseInt(activeMaintenanceCount.count, 10) || 0,
      low_stock_consumables: parseInt(lowStockItems[0].count, 10) || 0
    };
  }
}

module.exports = new ReportsService();
