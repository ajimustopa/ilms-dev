/**
 * Receivables (Piutang & Hak Bagi Hasil) Service
 * Sesuai api-contract-kantin.md Modul 7 & erd-kantin.md §2.14–2.15
 */
const db = require('../../../config/db/kantin');

class ReceivablesService {
  async getCanteenShare(schoolUnitId, query = {}) {
    const { period_start, period_end } = query;

    let itemsQuery = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .where('sales_transactions.school_unit_id', schoolUnitId);

    if (period_start) {
      itemsQuery = itemsQuery.where('sales_transactions.transaction_at', '>=', period_start);
    }
    if (period_end) {
      itemsQuery = itemsQuery.where('sales_transactions.transaction_at', '<=', period_end);
    }

    const rows = await itemsQuery.select(
      'sales_transaction_items.qty',
      'sales_transaction_items.cost_price',
      'sales_transaction_items.sale_price',
      'sales_transaction_items.subtotal_cost',
      'sales_transaction_items.subtotal_price'
    );

    const totalSales = rows.reduce((sum, r) => sum + parseFloat(r.subtotal_price), 0);
    const totalCost = rows.reduce((sum, r) => sum + parseFloat(r.subtotal_cost), 0);
    const canteenProfitShare = totalSales - totalCost;

    // Ambil pembayaran hak kantin yang sudah dicairkan
    let paymentsQuery = db('canteen_fee_payments').where('school_unit_id', schoolUnitId);
    if (period_start) paymentsQuery = paymentsQuery.where('period_start', '>=', period_start);
    if (period_end) paymentsQuery = paymentsQuery.where('period_end', '<=', period_end);
    const paidRow = await paymentsQuery.sum('amount as total_paid').first();
    const totalPaid = paidRow?.total_paid ? parseFloat(paidRow.total_paid) : 0;

    return {
      period_start: period_start || 'Awal',
      period_end: period_end || 'Sekarang',
      total_sales: totalSales,
      total_cost: totalCost,
      canteen_gross_share: canteenProfitShare,
      canteen_paid: totalPaid,
      canteen_receivable: Math.max(0, canteenProfitShare - totalPaid)
    };
  }

  async getCanteenShareDetail(schoolUnitId, query = {}) {
    const { period_start, period_end } = query;

    let q = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where('sales_transactions.school_unit_id', schoolUnitId);

    if (period_start) q = q.where('sales_transactions.transaction_at', '>=', period_start);
    if (period_end) q = q.where('sales_transactions.transaction_at', '<=', period_end);

    const items = await q
      .groupBy('vendor_products.id', 'vendor_products.product_name', 'vendors.vendor_name')
      .select(
        'vendor_products.id as vendor_product_id',
        'vendor_products.product_name',
        'vendors.vendor_name as vendor',
        db.raw('SUM(sales_transaction_items.qty) as total_qty_sold'),
        db.raw('AVG(sales_transaction_items.cost_price) as avg_cost_price'),
        db.raw('AVG(sales_transaction_items.sale_price) as avg_sale_price'),
        db.raw('SUM(sales_transaction_items.subtotal_cost) as total_cost'),
        db.raw('SUM(sales_transaction_items.subtotal_price) as total_sales'),
        db.raw('(SUM(sales_transaction_items.subtotal_price) - SUM(sales_transaction_items.subtotal_cost)) as canteen_profit')
      );

    return items.map(item => ({
      vendor_product_id: item.vendor_product_id,
      product_name: item.product_name,
      vendor: item.vendor,
      total_qty_sold: Number(item.total_qty_sold),
      avg_cost_price: parseFloat(item.avg_cost_price || 0),
      avg_sale_price: parseFloat(item.avg_sale_price || 0),
      total_cost: parseFloat(item.total_cost || 0),
      total_sales: parseFloat(item.total_sales || 0),
      canteen_profit: parseFloat(item.canteen_profit || 0)
    }));
  }

  async getVendorShare(schoolUnitId, query = {}) {
    const { vendor_id, period_start, period_end } = query;

    let q = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
      .join('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where('sales_transactions.school_unit_id', schoolUnitId);

    if (vendor_id) q = q.where('vendors.id', vendor_id);
    if (period_start) q = q.where('sales_transactions.transaction_at', '>=', period_start);
    if (period_end) q = q.where('sales_transactions.transaction_at', '<=', period_end);

    const vendorShares = await q
      .groupBy('vendors.id', 'vendors.vendor_name')
      .select(
        'vendors.id as vendor_id',
        'vendors.vendor_name',
        db.raw('SUM(sales_transaction_items.qty) as total_items_sold'),
        db.raw('SUM(sales_transaction_items.subtotal_price) as total_sales_amount'),
        db.raw('SUM(sales_transaction_items.subtotal_cost) as vendor_gross_share'),
        db.raw('(SUM(sales_transaction_items.subtotal_price) - SUM(sales_transaction_items.subtotal_cost)) as canteen_cut')
      );

    // Hitung juga pembayaran yang sudah dicairkan ke vendor
    const result = [];
    for (const v of vendorShares) {
      let vfp = db('vendor_fee_payments')
        .where({ school_unit_id: schoolUnitId, vendor_id: v.vendor_id });
      if (period_start) vfp = vfp.where('period_start', '>=', period_start);
      if (period_end) vfp = vfp.where('period_end', '<=', period_end);
      const paidRow = await vfp.sum('amount as total_paid').first();
      const totalPaid = paidRow?.total_paid ? parseFloat(paidRow.total_paid) : 0;
      const vendorGross = parseFloat(v.vendor_gross_share || 0);

      result.push({
        vendor_id: v.vendor_id,
        vendor_name: v.vendor_name,
        total_items_sold: Number(v.total_items_sold),
        total_sales_amount: parseFloat(v.total_sales_amount || 0),
        canteen_cut: parseFloat(v.canteen_cut || 0),
        vendor_gross_share: vendorGross,
        vendor_paid: totalPaid,
        vendor_payable: Math.max(0, vendorGross - totalPaid)
      });
    }

    return result;
  }
}

module.exports = new ReceivablesService();
