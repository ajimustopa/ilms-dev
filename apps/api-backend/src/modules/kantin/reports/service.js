/**
 * Reports Service for Kantin Module
 * Sesuai api-contract-kantin.md Modul 9
 */
const db = require('../../../config/db/kantin');

class ReportsService {
  async getProductsReport(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let pQuery = db('vendor_products')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .leftJoin('product_categories', 'vendor_products.product_category_id', 'product_categories.id');
    if (!isAll) pQuery = pQuery.where('vendor_products.school_unit_id', schoolUnitId);

    const products = await pQuery.select(
      'vendor_products.*',
      'vendors.vendor_name as vendor',
      'product_categories.category_name as category'
    );

    const result = [];
    for (const p of products) {
      // Total masuk dari goods_receipt_items
      const receivedRow = await db('goods_receipt_items')
        .where({ vendor_product_id: p.id })
        .sum('qty as total_received')
        .first();

      // Total terjual dari sales_transaction_items
      const soldRow = await db('sales_transaction_items')
        .where({ vendor_product_id: p.id })
        .sum('qty as total_sold')
        .sum('subtotal_price as total_revenue')
        .sum('subtotal_cost as total_cost')
        .first();

      // Total retur dari product_returns
      const returnRow = await db('product_returns')
        .where({ vendor_product_id: p.id })
        .sum('qty as total_returned')
        .first();

      const totalReceived = Number(receivedRow?.total_received || 0);
      const totalSold = Number(soldRow?.total_sold || 0);
      const totalReturned = Number(returnRow?.total_returned || 0);
      const totalRevenue = parseFloat(soldRow?.total_revenue || 0);
      const totalCost = parseFloat(soldRow?.total_cost || 0);
      const profit = totalRevenue - totalCost;

      result.push({
        id: p.id,
        barcode: p.barcode,
        product_name: p.product_name,
        category: p.category,
        vendor: p.vendor,
        unit: p.unit,
        current_stock: p.current_stock,
        total_received: totalReceived,
        total_sold: totalSold,
        total_returned: totalReturned,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        canteen_profit: profit
      });
    }

    return result;
  }

  async getVendorsReport(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let vQuery = db('vendors');
    if (!isAll) vQuery = vQuery.where('school_unit_id', schoolUnitId);
    const vendors = await vQuery;

    const result = [];
    for (const v of vendors) {
      // Hitung hak vendor dari sales
      const soldRow = await db('sales_transaction_items')
        .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
        .where('vendor_products.vendor_id', v.id)
        .sum('sales_transaction_items.subtotal_cost as vendor_gross')
        .sum('sales_transaction_items.subtotal_price as total_sales')
        .first();

      // Hitung pembayaran hak vendor
      let paidQuery = db('vendor_fee_payments').where({ vendor_id: v.id });
      if (!isAll) paidQuery = paidQuery.where('school_unit_id', schoolUnitId);
      const paidRow = await paidQuery
        .sum('amount as total_paid')
        .first();

      // Hitung jumlah produk
      const prodRow = await db('vendor_products')
        .where({ vendor_id: v.id })
        .count('id as total_products')
        .first();

      const vendorGross = parseFloat(soldRow?.vendor_gross || 0);
      const totalPaid = parseFloat(paidRow?.total_paid || 0);

      result.push({
        vendor_id: v.id,
        vendor_name: v.vendor_name,
        contact: v.contact,
        status: v.status,
        total_products: Number(prodRow?.total_products || 0),
        total_sales: parseFloat(soldRow?.total_sales || 0),
        vendor_gross_share: vendorGross,
        vendor_paid: totalPaid,
        vendor_payable: Math.max(0, vendorGross - totalPaid)
      });
    }

    return result;
  }

  async getCashReport(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const { date_from, date_to } = query;

    let topUpQ = db('wallet_transactions').where('transaction_type', 'top_up');
    let withdrawQ = db('wallet_transactions').where('transaction_type', 'withdrawal');
    let salesCashQ = db('sales_transactions').where('payment_method', 'cash');
    let expensesQ = db('operational_expenses');
    let canteenFeePaidQ = db('canteen_fee_payments');
    let vendorFeePaidQ = db('vendor_fee_payments');

    if (!isAll) {
      topUpQ = topUpQ.where('school_unit_id', schoolUnitId);
      withdrawQ = withdrawQ.where('school_unit_id', schoolUnitId);
      salesCashQ = salesCashQ.where('school_unit_id', schoolUnitId);
      expensesQ = expensesQ.where('school_unit_id', schoolUnitId);
      canteenFeePaidQ = canteenFeePaidQ.where('school_unit_id', schoolUnitId);
      vendorFeePaidQ = vendorFeePaidQ.where('school_unit_id', schoolUnitId);
    }

    if (date_from) {
      topUpQ = topUpQ.where('occurred_at', '>=', date_from);
      withdrawQ = withdrawQ.where('occurred_at', '>=', date_from);
      salesCashQ = salesCashQ.where('transaction_at', '>=', date_from);
      expensesQ = expensesQ.where('expense_date', '>=', date_from);
      canteenFeePaidQ = canteenFeePaidQ.where('paid_at', '>=', date_from);
      vendorFeePaidQ = vendorFeePaidQ.where('paid_at', '>=', date_from);
    }
    if (date_to) {
      topUpQ = topUpQ.where('occurred_at', '<=', date_to);
      withdrawQ = withdrawQ.where('occurred_at', '<=', date_to);
      salesCashQ = salesCashQ.where('transaction_at', '<=', date_to);
      expensesQ = expensesQ.where('expense_date', '<=', date_to);
      canteenFeePaidQ = canteenFeePaidQ.where('paid_at', '<=', date_to);
      vendorFeePaidQ = vendorFeePaidQ.where('paid_at', '<=', date_to);
    }

    const [topUpRow, withdrawRow, salesCashRow, expRow, cfpRow, vfpRow] = await Promise.all([
      topUpQ.sum('amount as total').first(),
      withdrawQ.sum('amount as total').first(),
      salesCashQ.sum('total_amount as total').first(),
      expensesQ.sum('amount as total').first(),
      canteenFeePaidQ.sum('amount as total').first(),
      vendorFeePaidQ.sum('amount as total').first()
    ]);

    const totalTopUp = parseFloat(topUpRow?.total || 0);
    const totalWithdrawal = parseFloat(withdrawRow?.total || 0);
    const totalCashSales = parseFloat(salesCashRow?.total || 0);
    const totalExpenses = parseFloat(expRow?.total || 0);
    const totalCanteenFeePaid = parseFloat(cfpRow?.total || 0);
    const totalVendorFeePaid = parseFloat(vfpRow?.total || 0);

    const netCashInflow = (totalTopUp + totalCashSales) - (totalWithdrawal + totalExpenses + totalVendorFeePaid);

    return {
      date_from: date_from || 'Awal',
      date_to: date_to || 'Sekarang',
      total_top_up: totalTopUp,
      total_withdrawal: totalWithdrawal,
      total_cash_sales: totalCashSales,
      total_operational_expenses: totalExpenses,
      total_canteen_fee_paid: totalCanteenFeePaid,
      total_vendor_fee_paid: totalVendorFeePaid,
      net_cash_flow: netCashInflow
    };
  }

  async getMonthlyReport(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const month = query.month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    let salesQ = db('sales_transactions')
      .whereRaw('DATE_FORMAT(transaction_at, "%Y-%m") = ?', [month]);
    if (!isAll) salesQ = salesQ.where('school_unit_id', schoolUnitId);
    const salesRow = await salesQ
      .count('id as total_transactions')
      .sum('total_amount as total_revenue')
      .first();

    let expensesQ = db('operational_expenses')
      .whereRaw('DATE_FORMAT(expense_date, "%Y-%m") = ?', [month]);
    if (!isAll) expensesQ = expensesQ.where('school_unit_id', schoolUnitId);
    const expensesRow = await expensesQ
      .sum('amount as total_expenses')
      .first();

    const totalRevenue = parseFloat(salesRow?.total_revenue || 0);
    const totalExpenses = parseFloat(expensesRow?.total_expenses || 0);

    return {
      month,
      total_transactions: Number(salesRow?.total_transactions || 0),
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: totalRevenue - totalExpenses
    };
  }

  async getMonthlySpending(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const month = query.month || new Date().toISOString().slice(0, 7);

    let spendingQ = db('sales_transactions')
      .join('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id')
      .whereRaw('DATE_FORMAT(sales_transactions.transaction_at, "%Y-%m") = ?', [month]);
    if (!isAll) spendingQ = spendingQ.where('sales_transactions.school_unit_id', schoolUnitId);

    const students = await spendingQ
      .groupBy('canteen_students.student_id', 'canteen_students.cached_student_name', 'canteen_students.cached_class_group_name')
      .select(
        'canteen_students.student_id',
        'canteen_students.cached_student_name as student_name',
        'canteen_students.cached_class_group_name as class_group_name',
        db.raw('COUNT(sales_transactions.id) as total_tx'),
        db.raw('SUM(sales_transactions.total_amount) as total_spent')
      )
      .orderBy('total_spent', 'desc');

    return students.map(s => ({
      student_id: s.student_id,
      student_name: s.student_name,
      class_group_name: s.class_group_name,
      total_tx: Number(s.total_tx),
      total_spent: parseFloat(s.total_spent || 0)
    }));
  }
}

module.exports = new ReportsService();
