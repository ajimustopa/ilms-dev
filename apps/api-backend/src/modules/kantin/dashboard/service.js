/**
 * Dashboard Service for Kantin Module
 * Sesuai api-contract-kantin.md Modul 10
 */
const db = require('../../../config/db/kantin');

class DashboardService {
  async getSummary(schoolUnitId) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const currentMonth = new Date().toISOString().slice(0, 7);

    // 1. Total modal barang (stok berjalan * cost_price)
    let stockQuery = db('vendor_products');
    if (!isAll) stockQuery = stockQuery.where('vendor_products.school_unit_id', schoolUnitId);
    const stockRow = await stockQuery
      .count('id as total_products')
      .sum('current_stock as total_stock_items')
      .first();

    // 2. Total penjualan bulan ini
    let salesMonthQuery = db('sales_transactions')
      .whereRaw('DATE_FORMAT(transaction_at, "%Y-%m") = ?', [currentMonth]);
    if (!isAll) salesMonthQuery = salesMonthQuery.where('school_unit_id', schoolUnitId);
    const salesMonthRow = await salesMonthQuery
      .count('id as total_sales_count')
      .sum('total_amount as total_sales_revenue')
      .first();

    // 3. Total pengeluaran operasional bulan ini
    let expensesMonthQuery = db('operational_expenses')
      .whereRaw('DATE_FORMAT(expense_date, "%Y-%m") = ?', [currentMonth]);
    if (!isAll) expensesMonthQuery = expensesMonthQuery.where('school_unit_id', schoolUnitId);
    const expensesMonthRow = await expensesMonthQuery
      .sum('amount as total_expenses')
      .first();

    // 4. Saldo total dompet seluruh santri
    let walletQuery = db('canteen_students');
    if (!isAll) walletQuery = walletQuery.where('school_unit_id', schoolUnitId);
    const walletRow = await walletQuery
      .sum('wallet_balance as total_wallet_balance')
      .count('id as total_students')
      .first();

    // 5. Total piutang hak kantin & vendor
    let itemsQuery = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .where(function() {
        this.whereNull('sales_transactions.status').orWhere('sales_transactions.status', '!=', 'void');
      });
    if (!isAll) itemsQuery = itemsQuery.where('sales_transactions.school_unit_id', schoolUnitId);
    const itemsRows = await itemsQuery
      .select('sales_transaction_items.subtotal_price', 'sales_transaction_items.subtotal_cost', 'sales_transactions.payment_method');

    let grossSales = 0;
    let grossCost = 0;
    let walletSales = 0;
    for (const r of itemsRows) {
      const sp = parseFloat(r.subtotal_price || 0);
      const sc = parseFloat(r.subtotal_cost || 0);
      grossSales += sp;
      grossCost += sc;
      if (r.payment_method === 'wallet') {
        walletSales += sp;
      }
    }

    let canteenPaidQuery = db('canteen_fee_payments');
    if (!isAll) canteenPaidQuery = canteenPaidQuery.where('school_unit_id', schoolUnitId);
    const canteenPaidRow = await canteenPaidQuery
      .sum('amount as total_paid')
      .first();
    const canteenPaid = parseFloat(canteenPaidRow?.total_paid || 0);

    let vendorPaidQuery = db('vendor_fee_payments');
    if (!isAll) vendorPaidQuery = vendorPaidQuery.where('school_unit_id', schoolUnitId);
    const vendorPaidRow = await vendorPaidQuery
      .sum('amount as total_paid')
      .first();
    const vendorPaid = parseFloat(vendorPaidRow?.total_paid || 0);

    // 6. 5 Transaksi terakhir
    let recentQuery = db('sales_transactions')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id');
    if (!isAll) recentQuery = recentQuery.where('sales_transactions.school_unit_id', schoolUnitId);
    const recentTransactions = await recentQuery
      .select(
        'sales_transactions.id',
        'sales_transactions.buyer_type',
        'sales_transactions.payment_method',
        'sales_transactions.total_amount',
        'sales_transactions.transaction_at',
        'canteen_students.student_id',
        'canteen_students.cached_student_name as student_name'
      )
      .orderBy('sales_transactions.transaction_at', 'desc')
      .limit(5);

    // 7. Produk stok menipis
    let lowStockQuery = db('vendor_products')
      .whereRaw('current_stock <= min_stock');
    if (!isAll) lowStockQuery = lowStockQuery.where('school_unit_id', schoolUnitId);
    const lowStockProducts = await lowStockQuery
      .select('id', 'product_name', 'current_stock', 'min_stock', 'unit')
      .limit(5);

    return {
      total_products: Number(stockRow?.total_products || 0),
      total_stock_items: Number(stockRow?.total_stock_items || 0),
      current_month_sales: parseFloat(salesMonthRow?.total_sales_revenue || 0),
      current_month_tx_count: Number(salesMonthRow?.total_sales_count || 0),
      current_month_expenses: parseFloat(expensesMonthRow?.total_expenses || 0),
      total_student_wallets: parseFloat(walletRow?.total_wallet_balance || 0),
      active_students_count: Number(walletRow?.total_students || 0),
      canteen_receivable_balance: Math.max(0, walletSales - canteenPaid),
      vendor_payable_balance: Math.max(0, grossCost - vendorPaid),
      low_stock_alerts: lowStockProducts,
      recent_transactions: recentTransactions
    };
  }

  async getSalesChart(schoolUnitId, period = '7days') {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const today = new Date();
    const result = [];

    // Ambil data 7 hari terakhir
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      let txQuery = db('sales_transactions')
        .whereRaw('DATE(transaction_at) = ?', [dateStr]);
      if (!isAll) txQuery = txQuery.where('school_unit_id', schoolUnitId);

      const row = await txQuery
        .sum('total_amount as total_sales')
        .count('id as total_tx')
        .first();

      result.push({
        date: dateStr,
        label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
        total_sales: parseFloat(row?.total_sales || 0),
        total_transactions: Number(row?.total_tx || 0)
      });
    }

    return result;
  }
}

module.exports = new DashboardService();
