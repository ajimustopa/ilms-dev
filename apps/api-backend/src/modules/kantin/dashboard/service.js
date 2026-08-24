/**
 * Dashboard Service for Kantin Module
 * Sesuai api-contract-kantin.md Modul 10
 */
const db = require('../../../config/db/kantin');

class DashboardService {
  async getSummary(schoolUnitId) {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // 1. Total modal barang (stok berjalan * cost_price)
    const stockRow = await db('vendor_products')
      .where('vendor_products.school_unit_id', schoolUnitId)
      .count('id as total_products')
      .sum('current_stock as total_stock_items')
      .first();

    // 2. Total penjualan bulan ini
    const salesMonthRow = await db('sales_transactions')
      .where('school_unit_id', schoolUnitId)
      .whereRaw('DATE_FORMAT(transaction_at, "%Y-%m") = ?', [currentMonth])
      .count('id as total_sales_count')
      .sum('total_amount as total_sales_revenue')
      .first();

    // 3. Total pengeluaran operasional bulan ini
    const expensesMonthRow = await db('operational_expenses')
      .where('school_unit_id', schoolUnitId)
      .whereRaw('DATE_FORMAT(expense_date, "%Y-%m") = ?', [currentMonth])
      .sum('amount as total_expenses')
      .first();

    // 4. Saldo total dompet seluruh santri
    const walletRow = await db('canteen_students')
      .where('school_unit_id', schoolUnitId)
      .sum('wallet_balance as total_wallet_balance')
      .count('id as total_students')
      .first();

    // 5. Total piutang hak kantin & vendor
    const itemsRow = await db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .where('sales_transactions.school_unit_id', schoolUnitId)
      .sum('sales_transaction_items.subtotal_price as gross_sales')
      .sum('sales_transaction_items.subtotal_cost as gross_cost')
      .first();

    const grossSales = parseFloat(itemsRow?.gross_sales || 0);
    const grossCost = parseFloat(itemsRow?.gross_cost || 0);
    const canteenProfitShare = grossSales - grossCost;

    const canteenPaidRow = await db('canteen_fee_payments')
      .where('school_unit_id', schoolUnitId)
      .sum('amount as total_paid')
      .first();
    const canteenPaid = parseFloat(canteenPaidRow?.total_paid || 0);

    const vendorPaidRow = await db('vendor_fee_payments')
      .where('school_unit_id', schoolUnitId)
      .sum('amount as total_paid')
      .first();
    const vendorPaid = parseFloat(vendorPaidRow?.total_paid || 0);

    // 6. 5 Transaksi terakhir
    const recentTransactions = await db('sales_transactions')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id')
      .where('sales_transactions.school_unit_id', schoolUnitId)
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
    const lowStockProducts = await db('vendor_products')
      .where('school_unit_id', schoolUnitId)
      .whereRaw('current_stock <= min_stock')
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
      canteen_receivable_balance: Math.max(0, canteenProfitShare - canteenPaid),
      vendor_payable_balance: Math.max(0, grossCost - vendorPaid),
      low_stock_alerts: lowStockProducts,
      recent_transactions: recentTransactions
    };
  }

  async getSalesChart(schoolUnitId, period = '7days') {
    const today = new Date();
    const result = [];

    // Ambil data 7 hari terakhir
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      const row = await db('sales_transactions')
        .where('school_unit_id', schoolUnitId)
        .whereRaw('DATE(transaction_at) = ?', [dateStr])
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
