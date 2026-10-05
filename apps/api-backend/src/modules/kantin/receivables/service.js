/**
 * Receivables (Piutang & Hak Bagi Hasil) Service
 * Sesuai api-contract-kantin.md Modul 7 & erd-kantin.md §2.14–2.15
 */
const db = require('../../../config/db/kantin');

class ReceivablesService {
  async getCanteenShare(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const { period_start, period_end } = query;

    let itemsQuery = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .where(function() {
        this.whereNull('sales_transactions.status').orWhere('sales_transactions.status', '!=', 'void');
      });

    if (!isAll) {
      itemsQuery = itemsQuery.where('sales_transactions.school_unit_id', schoolUnitId);
    }

    if (period_start) {
      itemsQuery = itemsQuery.where('sales_transactions.transaction_at', '>=', period_start);
    }
    if (period_end) {
      const endVal = period_end.length === 10 ? `${period_end} 23:59:59` : period_end;
      itemsQuery = itemsQuery.where('sales_transactions.transaction_at', '<=', endVal);
    }

    const rows = await itemsQuery.select(
      'sales_transaction_items.qty',
      'sales_transaction_items.cost_price',
      'sales_transaction_items.sale_price',
      'sales_transaction_items.subtotal_cost',
      'sales_transaction_items.subtotal_price',
      'sales_transactions.id as tx_id',
      'sales_transactions.payment_method',
      'sales_transactions.canteen_fee_payment_id'
    );

    let totalSales = 0;
    let totalCost = 0;
    let totalWalletSales = 0;
    let totalWalletCost = 0;
    let totalCashSales = 0;
    let totalCashCost = 0;

    const seenWalletTx = new Set();
    const seenWalletPendingTx = new Set();
    const seenWalletDisbursedTx = new Set();
    const seenCashTx = new Set();

    let walletPendingSales = 0;
    let walletDisbursedSales = 0;

    for (const r of rows) {
      const sp = parseFloat(r.subtotal_price || 0);
      const sc = parseFloat(r.subtotal_cost || 0);
      totalSales += sp;
      totalCost += sc;

      if (r.payment_method === 'wallet') {
        totalWalletSales += sp;
        totalWalletCost += sc;
        seenWalletTx.add(r.tx_id);

        if (r.canteen_fee_payment_id) {
          seenWalletDisbursedTx.add(r.tx_id);
          walletDisbursedSales += sp;
        } else {
          seenWalletPendingTx.add(r.tx_id);
          walletPendingSales += sp;
        }
      } else {
        totalCashSales += sp;
        totalCashCost += sc;
        seenCashTx.add(r.tx_id);
      }
    }

    const canteenProfitShare = totalSales - totalCost;
    const walletProfitShare = totalWalletSales - totalWalletCost;
    const cashProfitShare = totalCashSales - totalCashCost;

    // Ambil pembayaran hak kantin yang sudah dicairkan / disetor ke kas Keuangan
    let paymentsQuery = db('canteen_fee_payments');
    if (!isAll) {
      paymentsQuery = paymentsQuery.where('school_unit_id', schoolUnitId);
    }
    if (period_start) paymentsQuery = paymentsQuery.where('period_start', '>=', period_start);
    if (period_end) paymentsQuery = paymentsQuery.where('period_end', '<=', period_end);
    const paidRow = await paymentsQuery.sum('amount as total_paid').count('id as total_records').first();
    const totalPaid = paidRow?.total_paid ? parseFloat(paidRow.total_paid) : 0;
    const paidRecordsCount = paidRow?.total_records ? parseInt(paidRow.total_records, 10) : 0;

    // Piutang hak kantin yang perlu ditransfer adalah sejumlah penjualan yang menggunakan dompet siswa yang belum diserahkan
    const walletReceivable = walletPendingSales;

    return {
      period_start: period_start || 'Awal',
      period_end: period_end || 'Sekarang',
      // Total Bruto & HPP
      total_sales: totalSales,
      total_cost: totalCost,
      canteen_gross_share: canteenProfitShare,
      total_canteen_share: canteenProfitShare, // alias untuk frontend
      // Breakdown Dompet Siswa
      total_wallet_sales: totalWalletSales,
      total_wallet_cost: totalWalletCost,
      wallet_canteen_share: walletProfitShare,
      wallet_pending_sales: walletPendingSales,
      wallet_disbursed_sales: walletDisbursedSales,
      wallet_tx_total_count: seenWalletTx.size,
      wallet_tx_pending_count: seenWalletPendingTx.size,
      wallet_tx_disbursed_count: seenWalletDisbursedTx.size,
      // Breakdown Kasir Tunai / QRIS
      total_cash_sales: totalCashSales,
      total_cash_cost: totalCashCost,
      cash_canteen_share: cashProfitShare,
      cash_tx_count: seenCashTx.size,
      // Penyerahan & Sisa Piutang Hak Kantin (Khusus Dompet Siswa)
      canteen_paid: walletDisbursedSales,
      total_canteen_paid: walletDisbursedSales, // alias untuk frontend
      canteen_receivable: walletReceivable, // Piutang hak kantin dari dompet siswa
      wallet_receivable: walletReceivable,
      paid_records_count: seenWalletDisbursedTx.size,
      total_items_count: rows.length
    };
  }

  async getCanteenShareDetail(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const { period_start, period_end, payment_method, disbursement_status, search, view_type } = query;

    let q = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .leftJoin('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id')
      .leftJoin('canteen_fee_payments', 'sales_transactions.canteen_fee_payment_id', 'canteen_fee_payments.id')
      .where(function() {
        this.whereNull('sales_transactions.status').orWhere('sales_transactions.status', '!=', 'void');
      });

    if (!isAll) {
      q = q.where('sales_transactions.school_unit_id', schoolUnitId);
    }

    if (period_start) {
      q = q.where('sales_transactions.transaction_at', '>=', period_start);
    }
    if (period_end) {
      const endVal = period_end.length === 10 ? `${period_end} 23:59:59` : period_end;
      q = q.where('sales_transactions.transaction_at', '<=', endVal);
    }

    if (payment_method && payment_method !== 'all') {
      q = q.where('sales_transactions.payment_method', payment_method);
    }

    if (disbursement_status && disbursement_status !== 'all') {
      if (disbursement_status === 'pending') {
        q = q.where('sales_transactions.payment_method', 'wallet')
             .whereNull('sales_transactions.canteen_fee_payment_id');
      } else if (disbursement_status === 'disbursed') {
        q = q.where('sales_transactions.payment_method', 'wallet')
             .whereNotNull('sales_transactions.canteen_fee_payment_id');
      } else if (disbursement_status === 'direct_cash') {
        q = q.where('sales_transactions.payment_method', '!=', 'wallet');
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      q = q.where(function() {
        this.where('vendor_products.product_name', 'like', term)
          .orWhere('vendors.vendor_name', 'like', term)
          .orWhere('canteen_students.cached_student_name', 'like', term)
          .orWhere('sales_transactions.buyer_name', 'like', term)
          .orWhere('sales_transactions.id', 'like', term)
          .orWhere('canteen_fee_payments.finance_receipt_number', 'like', term);
      });
    }

    if (view_type === 'by_product') {
      const items = await q
        .groupBy('vendor_products.id', 'vendor_products.product_name', 'vendors.vendor_name')
        .select(
          'vendor_products.id as vendor_product_id',
          'vendor_products.product_name',
          'vendors.vendor_name',
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
        vendor_name: item.vendor_name || 'Kantin Mandiri',
        vendor: item.vendor_name || 'Kantin Mandiri',
        total_qty_sold: Number(item.total_qty_sold),
        qty: Number(item.total_qty_sold),
        cost_price: parseFloat(item.avg_cost_price || 0),
        sale_price: parseFloat(item.avg_sale_price || 0),
        total_cost: parseFloat(item.total_cost || 0),
        total_sales: parseFloat(item.total_sales || 0),
        canteen_profit: parseFloat(item.canteen_profit || 0),
        canteen_share_amount: parseFloat(item.canteen_profit || 0)
      }));
    }

    const items = await q
      .select(
        'sales_transaction_items.id as item_id',
        'sales_transactions.id as sales_transaction_id',
        'sales_transactions.transaction_at',
        'sales_transactions.buyer_type',
        'sales_transactions.buyer_name as raw_buyer_name',
        'sales_transactions.payment_method',
        'sales_transactions.status as transaction_status',
        'sales_transactions.cashier_name',
        'sales_transactions.canteen_fee_payment_id',
        'canteen_fee_payments.id as fee_payment_id',
        'canteen_fee_payments.finance_receipt_number',
        'canteen_fee_payments.paid_at as fee_paid_at',
        'canteen_fee_payments.period_start as fee_period_start',
        'canteen_fee_payments.period_end as fee_period_end',
        'canteen_students.cached_student_name',
        'canteen_students.cached_class_group_name',
        'canteen_students.qr_code as student_qr',
        'vendor_products.id as vendor_product_id',
        'vendor_products.product_name',
        'vendors.vendor_name',
        'sales_transaction_items.qty',
        'sales_transaction_items.sale_price',
        'sales_transaction_items.cost_price',
        'sales_transaction_items.subtotal_price',
        'sales_transaction_items.subtotal_cost',
        db.raw('(sales_transaction_items.subtotal_price - sales_transaction_items.subtotal_cost) as canteen_share_amount')
      )
      .orderBy('sales_transactions.transaction_at', 'desc')
      .orderBy('sales_transaction_items.id', 'desc');

    return items.map(item => {
      let displayName = 'Umum';
      if (item.buyer_type === 'student') {
        displayName = item.cached_student_name
          ? (item.cached_class_group_name ? `${item.cached_student_name} (${item.cached_class_group_name})` : item.cached_student_name)
          : 'Santri';
      } else if (item.raw_buyer_name) {
        displayName = item.raw_buyer_name;
      }

      const isWallet = item.payment_method === 'wallet';
      const hasFeePayment = !!(item.canteen_fee_payment_id || item.fee_payment_id);
      
      let disbursementStatus = 'direct_cash';
      let isDisbursed = true;

      if (isWallet) {
        if (hasFeePayment) {
          disbursementStatus = 'disbursed';
          isDisbursed = true;
        } else {
          disbursementStatus = 'pending';
          isDisbursed = false;
        }
      }

      return {
        id: item.item_id,
        item_id: item.item_id,
        sales_transaction_id: item.sales_transaction_id,
        transaction_at: item.transaction_at,
        buyer_type: item.buyer_type,
        buyer_name: displayName,
        cached_student_name: item.cached_student_name,
        cached_class_group_name: item.cached_class_group_name,
        payment_method: item.payment_method,
        transaction_status: item.transaction_status || 'completed',
        cashier_name: item.cashier_name || '-',
        vendor_product_id: item.vendor_product_id,
        product_name: item.product_name,
        vendor_name: item.vendor_name || 'Kantin Mandiri',
        vendor: item.vendor_name || 'Kantin Mandiri',
        qty: Number(item.qty || 0),
        sale_price: parseFloat(item.sale_price || 0),
        cost_price: parseFloat(item.cost_price || 0),
        subtotal_price: parseFloat(item.subtotal_price || 0),
        subtotal_cost: parseFloat(item.subtotal_cost || 0),
        canteen_share_amount: parseFloat(item.canteen_share_amount || 0),
        canteen_profit: parseFloat(item.canteen_share_amount || 0),
        is_wallet: isWallet,
        canteen_fee_payment_id: item.canteen_fee_payment_id || item.fee_payment_id || null,
        finance_receipt_number: item.finance_receipt_number || null,
        fee_paid_at: item.fee_paid_at || null,
        is_disbursed: isDisbursed,
        disbursement_status: disbursementStatus
      };
    });
  }

  async getVendorShare(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const { vendor_id, period_start, period_end, search } = query;

    // 1. Query seluruh item penjualan untuk menghitung metrik makro (vendor titipan vs non-vendor/kantin mandiri)
    let allItemsQuery = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .leftJoin('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where(function() {
        this.whereNull('sales_transactions.status').orWhere('sales_transactions.status', '!=', 'void');
      });

    if (!isAll) {
      allItemsQuery = allItemsQuery.where('sales_transactions.school_unit_id', schoolUnitId);
    }
    if (period_start) {
      allItemsQuery = allItemsQuery.where('sales_transactions.transaction_at', '>=', period_start);
    }
    if (period_end) {
      const endVal = period_end.length === 10 ? `${period_end} 23:59:59` : period_end;
      allItemsQuery = allItemsQuery.where('sales_transactions.transaction_at', '<=', endVal);
    }

    const allItems = await allItemsQuery.select(
      'sales_transaction_items.id as item_id',
      'sales_transaction_items.qty',
      'sales_transaction_items.cost_price',
      'sales_transaction_items.sale_price',
      'sales_transaction_items.subtotal_cost',
      'sales_transaction_items.subtotal_price',
      'sales_transaction_items.vendor_fee_payment_id',
      'vendors.id as vendor_id',
      'vendors.vendor_name',
      'vendors.vendor_type',
      'vendors.contact as phone'
    );

    let totalSalesAmount = 0;
    let totalVendorSales = 0;
    let totalNonVendorSales = 0;
    let totalVendorPending = 0;
    let totalVendorDisbursed = 0;
    let totalCanteenShare = 0;

    let pendingItemsCount = 0;
    let disbursedItemsCount = 0;
    let nonVendorItemsCount = 0;

    const vendorMap = new Map();

    for (const item of allItems) {
      const sp = parseFloat(item.subtotal_price || 0);
      const sc = parseFloat(item.subtotal_cost || 0);
      const margin = sp - sc;
      totalSalesAmount += sp;

      if (item.vendor_id) {
        totalVendorSales += sp;
        totalCanteenShare += margin;

        const isDisbursed = Boolean(item.vendor_fee_payment_id);
        if (isDisbursed) {
          totalVendorDisbursed += sc;
          disbursedItemsCount += 1;
        } else {
          totalVendorPending += sc;
          pendingItemsCount += 1;
        }

        const vKey = item.vendor_id;
        if (!vendorMap.has(vKey)) {
          vendorMap.set(vKey, {
            vendor_id: item.vendor_id,
            vendor_name: item.vendor_name,
            vendor_type: item.vendor_type || 'konsinyasi',
            phone: item.phone || null,
            total_items_sold: 0,
            total_sales_amount: 0,
            vendor_gross_share: 0,
            vendor_paid: 0,
            vendor_payable: 0,
            canteen_cut: 0,
            pending_items_count: 0,
            disbursed_items_count: 0
          });
        }
        const v = vendorMap.get(vKey);
        v.total_items_sold += Number(item.qty || 0);
        v.total_sales_amount += sp;
        v.vendor_gross_share += sc;
        v.canteen_cut += margin;
        if (isDisbursed) {
          v.vendor_paid += sc;
          v.disbursed_items_count += 1;
        } else {
          v.vendor_payable += sc;
          v.pending_items_count += 1;
        }
      } else {
        totalNonVendorSales += sp;
        nonVendorItemsCount += 1;
      }
    }

    let vendors = Array.from(vendorMap.values());

    if (vendor_id && vendor_id !== 'all') {
      vendors = vendors.filter(v => String(v.vendor_id) === String(vendor_id));
    }
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      vendors = vendors.filter(v => (v.vendor_name || '').toLowerCase().includes(term));
    }

    vendors.sort((a, b) => (a.vendor_name || '').localeCompare(b.vendor_name || ''));

    return {
      period_start: period_start || 'Awal',
      period_end: period_end || 'Sekarang',
      // 3 Kartu Utama
      total_vendor_pending: totalVendorPending, // Hak Vendor Belum Diserahkan (Hutang)
      total_vendor_disbursed: totalVendorDisbursed, // Hak Vendor Sudah Diserahkan (Lunas)
      total_non_vendor_sales: totalNonVendorSales, // Penjualan Non-Titipan / Kantin Mandiri
      // Omzet & Margin
      total_sales_amount: totalSalesAmount,
      total_vendor_sales: totalVendorSales,
      total_canteen_share: totalCanteenShare,
      // Counter Item
      pending_items_count: pendingItemsCount,
      disbursed_items_count: disbursedItemsCount,
      non_vendor_items_count: nonVendorItemsCount,
      total_items_count: allItems.length,
      // Breakdown Per Vendor
      vendors
    };
  }

  async getVendorShareDetail(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const { vendor_id, period_start, period_end, payment_method, disbursement_status, search } = query;

    let q = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .leftJoin('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id')
      .leftJoin('vendor_fee_payments', 'sales_transaction_items.vendor_fee_payment_id', 'vendor_fee_payments.id')
      .where(function() {
        this.whereNull('sales_transactions.status').orWhere('sales_transactions.status', '!=', 'void');
      });

    if (!isAll) {
      q = q.where('sales_transactions.school_unit_id', schoolUnitId);
    }

    if (vendor_id && vendor_id !== 'all') {
      if (vendor_id === 'non_vendor') {
        q = q.whereNull('vendors.id');
      } else {
        q = q.where('vendors.id', vendor_id);
      }
    }

    if (period_start) {
      q = q.where('sales_transactions.transaction_at', '>=', period_start);
    }
    if (period_end) {
      const endVal = period_end.length === 10 ? `${period_end} 23:59:59` : period_end;
      q = q.where('sales_transactions.transaction_at', '<=', endVal);
    }

    if (payment_method && payment_method !== 'all') {
      q = q.where('sales_transactions.payment_method', payment_method);
    }

    if (disbursement_status && disbursement_status !== 'all') {
      if (disbursement_status === 'pending') {
        q = q.whereNotNull('vendors.id')
             .whereNull('sales_transaction_items.vendor_fee_payment_id');
      } else if (disbursement_status === 'disbursed') {
        q = q.whereNotNull('vendors.id')
             .whereNotNull('sales_transaction_items.vendor_fee_payment_id');
      } else if (disbursement_status === 'non_vendor') {
        q = q.whereNull('vendors.id');
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      q = q.where(function() {
        this.where('vendor_products.product_name', 'like', term)
          .orWhere('vendors.vendor_name', 'like', term)
          .orWhere('canteen_students.cached_student_name', 'like', term)
          .orWhere('sales_transactions.buyer_name', 'like', term)
          .orWhere('sales_transactions.id', 'like', term)
          .orWhere('vendor_fee_payments.receipt_number', 'like', term)
          .orWhere('vendor_fee_payments.finance_receipt_number', 'like', term);
      });
    }

    const items = await q
      .select(
        'sales_transaction_items.id as item_id',
        'sales_transaction_items.sales_transaction_id',
        'sales_transaction_items.vendor_product_id',
        'sales_transaction_items.qty',
        'sales_transaction_items.sale_price',
        'sales_transaction_items.cost_price',
        'sales_transaction_items.subtotal_price',
        'sales_transaction_items.subtotal_cost',
        'sales_transaction_items.vendor_fee_payment_id',
        'sales_transactions.transaction_at',
        'sales_transactions.buyer_type',
        'sales_transactions.buyer_name as raw_buyer_name',
        'sales_transactions.payment_method',
        'sales_transactions.cashier_name',
        'sales_transactions.status as transaction_status',
        'canteen_students.cached_student_name',
        'canteen_students.cached_class_group_name',
        'vendor_products.product_name',
        'vendors.id as vendor_id',
        'vendors.vendor_name',
        'vendors.vendor_type',
        'vendor_fee_payments.receipt_number as vendor_receipt_number',
        'vendor_fee_payments.finance_receipt_number',
        'vendor_fee_payments.paid_at as vendor_paid_at'
      )
      .orderBy('sales_transactions.transaction_at', 'desc')
      .orderBy('sales_transaction_items.id', 'desc');

    return items.map(item => {
      let displayName = 'Umum';
      if (item.buyer_type === 'student') {
        displayName = item.cached_student_name
          ? (item.cached_class_group_name ? `${item.cached_student_name} (${item.cached_class_group_name})` : item.cached_student_name)
          : 'Santri';
      } else if (item.raw_buyer_name) {
        displayName = item.raw_buyer_name;
      }

      const isVendorItem = Boolean(item.vendor_id);
      const isDisbursed = Boolean(item.vendor_fee_payment_id);
      const subtotalPrice = parseFloat(item.subtotal_price || 0);
      const subtotalCost = parseFloat(item.subtotal_cost || 0);
      const canteenMargin = subtotalPrice - subtotalCost;

      let disbursementStatus = 'non_vendor';
      if (isVendorItem) {
        disbursementStatus = isDisbursed ? 'disbursed' : 'pending';
      }

      return {
        id: item.item_id,
        item_id: item.item_id,
        sales_transaction_id: item.sales_transaction_id,
        transaction_at: item.transaction_at,
        buyer_type: item.buyer_type,
        buyer_name: displayName,
        payment_method: item.payment_method,
        cashier_name: item.cashier_name || '-',
        transaction_status: item.transaction_status || 'completed',
        vendor_product_id: item.vendor_product_id,
        product_name: item.product_name || 'Produk Kantin',
        vendor_id: item.vendor_id || null,
        vendor_name: item.vendor_name || 'Kantin Mandiri (Non-Titipan)',
        vendor_type: item.vendor_type || 'internal',
        is_vendor_item: isVendorItem,
        qty: Number(item.qty || 0),
        sale_price: parseFloat(item.sale_price || 0),
        cost_price: parseFloat(item.cost_price || 0),
        subtotal_price: subtotalPrice,
        subtotal_cost: subtotalCost, // Porsi / hak vendor
        vendor_share_amount: isVendorItem ? subtotalCost : 0,
        canteen_margin: canteenMargin,
        is_disbursed: isDisbursed,
        disbursement_status: disbursementStatus,
        vendor_fee_payment_id: item.vendor_fee_payment_id || null,
        receipt_number: item.vendor_receipt_number || null,
        finance_receipt_number: item.finance_receipt_number || null,
        fee_paid_at: item.vendor_paid_at || null
      };
    });
  }
}

module.exports = new ReceivablesService();
