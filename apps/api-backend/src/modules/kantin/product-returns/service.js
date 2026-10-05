/**
 * Product Returns Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.8
 */
const db = require('../../../config/db/kantin');
const masterDataService = require('../../keuangan/master-data/service');
const keuanganInternalService = require('../../keuangan/internal/service');
const canteenAccountingService = require('../accounting/service');

class ProductReturnsService {
  /**
   * Mengambil konfigurasi default akuntansi retur barang dan opsi dropdown COA/Kas
   */
  async getAccountingConfig(schoolUnitId) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;

    let settings = await db('canteen_returns_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();

    let cashAccounts = [];
    let allCoas = [];
    try {
      cashAccounts = await masterDataService.listCashAccounts(effectiveUnitId, { is_active: true });
    } catch (_) {}
    try {
      allCoas = await masterDataService.listChartOfAccounts(effectiveUnitId, false);
    } catch (_) {}

    const formattedCashAccounts = cashAccounts.map(a => ({
      id: a.id,
      name: a.name,
      account_kind: a.account_kind,
      bank_name: a.bank_name,
      bank_account_number: a.bank_account_number,
      is_canteen: (a.name || '').toLowerCase().includes('kantin') || (a.name || '').toLowerCase().includes('operasional'),
      display_label: a.bank_account_number
        ? `${a.name} (${a.bank_name || 'Bank'} - ${a.bank_account_number})`
        : `${a.name} (Kas Tunai)`
    }));

    const formattedCoas = allCoas.map(c => ({
      id: c.id,
      account_code: c.account_code,
      account_name: c.account_name,
      account_group: c.account_group,
      display_label: `[${c.account_code}] ${c.account_name} (${(c.account_group || '').toUpperCase()})`
    }));

    // Klasifikasi Akun
    const consignmentPayableCoas = formattedCoas.filter(c =>
      c.account_code === '20102' || c.account_code === '40501' || c.account_code === '20100' ||
      (c.account_name || '').toLowerCase().includes('konsinyasi') || (c.account_name || '').toLowerCase().includes('vendor') || (c.account_name || '').toLowerCase().includes('utang')
    );
    const consignmentInventoryCoas = formattedCoas.filter(c =>
      c.account_code === '10302' || c.account_code === '10301' ||
      (c.account_name || '').toLowerCase().includes('konsinyasi') || (c.account_name || '').toLowerCase().includes('titipan') || (c.account_name || '').toLowerCase().includes('persediaan')
    );
    const tradePayableCoas = formattedCoas.filter(c =>
      c.account_code === '20100' || c.account_code === '20101' || (c.account_name || '').toLowerCase().includes('usaha') || (c.account_name || '').toLowerCase().includes('dagang') || (c.account_name || '').toLowerCase().includes('utang')
    );
    const inventoryCoas = formattedCoas.filter(c =>
      c.account_code === '10301' || c.account_code === '10302' || c.account_code === '50101' ||
      (c.account_name || '').toLowerCase().includes('persediaan') || (c.account_name || '').toLowerCase().includes('bahan') || (c.account_name || '').toLowerCase().includes('pembelian')
    );
    const lossExpenseCoas = formattedCoas.filter(c =>
      c.account_code === '50102' || c.account_code === '50200' || c.account_code === '50100' || c.account_code === '50300' ||
      (c.account_name || '').toLowerCase().includes('rusak') || (c.account_name || '').toLowerCase().includes('kerugian') || (c.account_name || '').toLowerCase().includes('beban')
    );
    const cashCoas = formattedCoas.filter(c =>
      c.account_code === '10101' || c.account_code === '101' || (c.account_name || '').toLowerCase().includes('kas')
    );
    const bankCoas = formattedCoas.filter(c =>
      c.account_code === '10102' || c.account_code === '102' || (c.account_name || '').toLowerCase().includes('bank') || (c.account_name || '').toLowerCase().includes('bni')
    );

    const defaultTunaiAcc = formattedCashAccounts.find(a => a.is_canteen && !a.bank_account_number) || formattedCashAccounts.find(a => !a.bank_account_number) || formattedCashAccounts[0] || null;
    const defaultBankAcc = formattedCashAccounts.find(a => a.is_canteen && a.bank_account_number) || formattedCashAccounts.find(a => a.bank_account_number) || formattedCashAccounts[0] || null;

    const defaultConsignmentPayableCoa = formattedCoas.find(c => c.account_code === '20102') || formattedCoas.find(c => c.account_code === '40501') || consignmentPayableCoas[0] || formattedCoas[0] || null;
    const defaultConsignmentInventoryCoa = formattedCoas.find(c => c.account_code === '10302') || consignmentInventoryCoas[0] || formattedCoas[0] || null;
    const defaultTradePayableCoa = formattedCoas.find(c => c.account_code === '20100') || tradePayableCoas[0] || formattedCoas[0] || null;
    const defaultInventoryCoa = formattedCoas.find(c => c.account_code === '10301') || inventoryCoas[0] || formattedCoas[0] || null;
    const defaultLossExpenseCoa = formattedCoas.find(c => c.account_code === '50102') || formattedCoas.find(c => c.account_code === '50200') || lossExpenseCoas[0] || formattedCoas[0] || null;
    const defaultCashCoa = formattedCoas.find(c => c.account_code === '10101') || cashCoas[0] || formattedCoas[0] || null;
    const defaultBankCoa = formattedCoas.find(c => c.account_code === '10102') || bankCoas[0] || formattedCoas[0] || null;

    const resolvedConfig = {
      school_unit_id: effectiveUnitId,
      cash_account_id_tunai: settings?.cash_account_id_tunai || defaultTunaiAcc?.id || null,
      cash_account_name_tunai: settings?.cash_account_name_tunai || defaultTunaiAcc?.display_label || null,
      cash_account_id_bank: settings?.cash_account_id_bank || defaultBankAcc?.id || null,
      cash_account_name_bank: settings?.cash_account_name_bank || defaultBankAcc?.display_label || null,
      consignment_payable_coa_id: settings?.consignment_payable_coa_id || defaultConsignmentPayableCoa?.id || null,
      consignment_payable_coa_code: settings?.consignment_payable_coa_code || defaultConsignmentPayableCoa?.account_code || null,
      consignment_payable_coa_name: settings?.consignment_payable_coa_name || defaultConsignmentPayableCoa?.account_name || null,
      consignment_inventory_coa_id: settings?.consignment_inventory_coa_id || defaultConsignmentInventoryCoa?.id || null,
      consignment_inventory_coa_code: settings?.consignment_inventory_coa_code || defaultConsignmentInventoryCoa?.account_code || null,
      consignment_inventory_coa_name: settings?.consignment_inventory_coa_name || defaultConsignmentInventoryCoa?.account_name || null,
      trade_payable_coa_id: settings?.trade_payable_coa_id || defaultTradePayableCoa?.id || null,
      trade_payable_coa_code: settings?.trade_payable_coa_code || defaultTradePayableCoa?.account_code || null,
      trade_payable_coa_name: settings?.trade_payable_coa_name || defaultTradePayableCoa?.account_name || null,
      inventory_coa_id: settings?.inventory_coa_id || defaultInventoryCoa?.id || null,
      inventory_coa_code: settings?.inventory_coa_code || defaultInventoryCoa?.account_code || null,
      inventory_coa_name: settings?.inventory_coa_name || defaultInventoryCoa?.account_name || null,
      loss_expense_coa_id: settings?.loss_expense_coa_id || defaultLossExpenseCoa?.id || null,
      loss_expense_coa_code: settings?.loss_expense_coa_code || defaultLossExpenseCoa?.account_code || null,
      loss_expense_coa_name: settings?.loss_expense_coa_name || defaultLossExpenseCoa?.account_name || null,
      cash_coa_id: settings?.cash_coa_id || defaultCashCoa?.id || null,
      cash_coa_code: settings?.cash_coa_code || defaultCashCoa?.account_code || null,
      cash_coa_name: settings?.cash_coa_name || defaultCashCoa?.account_name || null,
      bank_coa_id: settings?.bank_coa_id || defaultBankCoa?.id || null,
      bank_coa_code: settings?.bank_coa_code || defaultBankCoa?.account_code || null,
      bank_coa_name: settings?.bank_coa_name || defaultBankCoa?.account_name || null,
      fund_source_name: settings?.fund_source_name || 'Pos Pengembalian & Penyesuaian Stok SBU Kantin',
      auto_journal: settings ? !!settings.auto_journal : true
    };

    return {
      settings: resolvedConfig,
      cash_accounts: formattedCashAccounts,
      coas: {
        all: formattedCoas,
        consignment_payable: consignmentPayableCoas.length > 0 ? consignmentPayableCoas : formattedCoas,
        consignment_inventory: consignmentInventoryCoas.length > 0 ? consignmentInventoryCoas : formattedCoas,
        trade_payable: tradePayableCoas.length > 0 ? tradePayableCoas : formattedCoas,
        inventory: inventoryCoas.length > 0 ? inventoryCoas : formattedCoas,
        loss_expense: lossExpenseCoas.length > 0 ? lossExpenseCoas : formattedCoas,
        cash: cashCoas.length > 0 ? cashCoas : formattedCoas,
        bank: bankCoas.length > 0 ? bankCoas : formattedCoas
      }
    };
  }

  async saveAccountingConfig(schoolUnitId, payload) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;
    const {
      cash_account_id_tunai,
      cash_account_name_tunai,
      cash_account_id_bank,
      cash_account_name_bank,
      consignment_payable_coa_id,
      consignment_payable_coa_code,
      consignment_payable_coa_name,
      consignment_inventory_coa_id,
      consignment_inventory_coa_code,
      consignment_inventory_coa_name,
      trade_payable_coa_id,
      trade_payable_coa_code,
      trade_payable_coa_name,
      inventory_coa_id,
      inventory_coa_code,
      inventory_coa_name,
      loss_expense_coa_id,
      loss_expense_coa_code,
      loss_expense_coa_name,
      cash_coa_id,
      cash_coa_code,
      cash_coa_name,
      bank_coa_id,
      bank_coa_code,
      bank_coa_name,
      fund_source_name,
      auto_journal
    } = payload;

    const dataToSave = {
      school_unit_id: effectiveUnitId,
      cash_account_id_tunai: cash_account_id_tunai ? Number(cash_account_id_tunai) : null,
      cash_account_name_tunai: cash_account_name_tunai || null,
      cash_account_id_bank: cash_account_id_bank ? Number(cash_account_id_bank) : null,
      cash_account_name_bank: cash_account_name_bank || null,
      consignment_payable_coa_id: consignment_payable_coa_id ? Number(consignment_payable_coa_id) : null,
      consignment_payable_coa_code: consignment_payable_coa_code || null,
      consignment_payable_coa_name: consignment_payable_coa_name || null,
      consignment_inventory_coa_id: consignment_inventory_coa_id ? Number(consignment_inventory_coa_id) : null,
      consignment_inventory_coa_code: consignment_inventory_coa_code || null,
      consignment_inventory_coa_name: consignment_inventory_coa_name || null,
      trade_payable_coa_id: trade_payable_coa_id ? Number(trade_payable_coa_id) : null,
      trade_payable_coa_code: trade_payable_coa_code || null,
      trade_payable_coa_name: trade_payable_coa_name || null,
      inventory_coa_id: inventory_coa_id ? Number(inventory_coa_id) : null,
      inventory_coa_code: inventory_coa_code || null,
      inventory_coa_name: inventory_coa_name || null,
      loss_expense_coa_id: loss_expense_coa_id ? Number(loss_expense_coa_id) : null,
      loss_expense_coa_code: loss_expense_coa_code || null,
      loss_expense_coa_name: loss_expense_coa_name || null,
      cash_coa_id: cash_coa_id ? Number(cash_coa_id) : null,
      cash_coa_code: cash_coa_code || null,
      cash_coa_name: cash_coa_name || null,
      bank_coa_id: bank_coa_id ? Number(bank_coa_id) : null,
      bank_coa_code: bank_coa_code || null,
      bank_coa_name: bank_coa_name || null,
      fund_source_name: fund_source_name || 'Pos Pengembalian & Penyesuaian Stok SBU Kantin',
      auto_journal: auto_journal !== undefined ? !!auto_journal : true,
      updated_at: db.fn.now()
    };

    const existing = await db('canteen_returns_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();
    if (existing) {
      await db('canteen_returns_accounting_settings').where({ school_unit_id: effectiveUnitId }).update(dataToSave);
    } else {
      await db('canteen_returns_accounting_settings').insert(dataToSave);
    }

    return await this.getAccountingConfig(effectiveUnitId);
  }

  async listBankStatements(schoolUnitId, query = {}) {
    try {
      return await keuanganInternalService.listBankStatements(schoolUnitId, {
        cash_account_id: query.cash_account_id,
        dc_type: 'credit', // Penerimaan dana refund retur
        is_reconciled: false
      });
    } catch (err) {
      console.warn('[Product Returns] Gagal memuat rekening koran:', err.message);
      return [];
    }
  }

  async listReturns(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('product_returns')
      .join('vendor_products', 'product_returns.vendor_product_id', 'vendor_products.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .leftJoin('goods_receipts', 'product_returns.goods_receipt_id', 'goods_receipts.id')
      .leftJoin('goods_receipt_items', 'product_returns.goods_receipt_item_id', 'goods_receipt_items.id');

    if (!isAll) {
      q = q.where('product_returns.school_unit_id', schoolUnitId);
    }

    q = q.select(
      'product_returns.*',
      'vendor_products.product_name',
      'vendor_products.barcode',
      'vendor_products.unit',
      'vendor_products.cost_price as current_cost_price',
      'vendor_products.sale_price as current_sale_price',
      'vendors.vendor_name as vendor',
      'goods_receipts.receipt_date',
      'goods_receipts.invoice_number',
      'goods_receipts.receipt_type as receipt_origin_type',
      'goods_receipt_items.batch_number as item_batch_number',
      'goods_receipt_items.expired_at as item_expired_at'
    );

    if (query.return_type) {
      q = q.where('product_returns.return_type', query.return_type);
    }
    if (query.vendor_product_id) {
      q = q.where('product_returns.vendor_product_id', query.vendor_product_id);
    }

    const rows = await q.orderBy('product_returns.returned_at', 'desc').orderBy('product_returns.id', 'desc');

    return rows.map(r => ({
      ...r,
      total_cost_amount: parseFloat(r.total_cost_amount || (Number(r.qty || 0) * parseFloat(r.current_cost_price || 0)) || 0),
      bank_statement_id: r.bank_statement_id ? Number(r.bank_statement_id) : null
    }));
  }

  async getEligibleReceiptItems(schoolUnitId) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';

    // 1. Ambil semua produk aktif
    let pQ = db('vendor_products')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where('vendor_products.status', 'active');
    if (!isAll) {
      pQ = pQ.where('vendor_products.school_unit_id', schoolUnitId);
    }
    const products = await pQ.select(
      'vendor_products.*',
      'vendors.vendor_name as vendor_name',
      'vendors.vendor_type'
    );

    if (products.length === 0) return [];

    const productIds = products.map(p => p.id);

    // 2. Ambil total penjualan per produk
    const salesSums = await db('sales_transaction_items')
      .whereIn('vendor_product_id', productIds)
      .groupBy('vendor_product_id')
      .select('vendor_product_id')
      .sum('qty as total_sold');

    const salesMap = {};
    salesSums.forEach(s => {
      salesMap[s.vendor_product_id] = Number(s.total_sold || 0);
    });

    // 3. Ambil total retur per produk
    const returnsSums = await db('product_returns')
      .whereIn('vendor_product_id', productIds)
      .groupBy('vendor_product_id')
      .select('vendor_product_id')
      .sum('qty as total_returned');

    const returnsMap = {};
    returnsSums.forEach(r => {
      returnsMap[r.vendor_product_id] = Number(r.total_returned || 0);
    });

    // 4. Ambil semua item penerimaan (goods_receipt_items)
    const receiptItems = await db('goods_receipt_items')
      .join('goods_receipts', 'goods_receipt_items.goods_receipt_id', 'goods_receipts.id')
      .leftJoin('vendors', 'goods_receipts.vendor_id', 'vendors.id')
      .whereIn('goods_receipt_items.vendor_product_id', productIds)
      .select(
        'goods_receipt_items.id as goods_receipt_item_id',
        'goods_receipt_items.goods_receipt_id',
        'goods_receipt_items.vendor_product_id',
        'goods_receipt_items.qty as qty_received',
        'goods_receipt_items.cost_price',
        'goods_receipt_items.sale_price',
        'goods_receipt_items.batch_number',
        'goods_receipt_items.expired_at',
        'goods_receipts.receipt_date',
        'goods_receipts.invoice_number',
        'goods_receipts.receipt_type',
        'vendors.vendor_name as vendor_name'
      )
      .orderBy('goods_receipts.receipt_date', 'desc')
      .orderBy('goods_receipt_items.id', 'desc');

    // 5. Ambil total retur yang sudah tercatat per goods_receipt_item_id
    const itemReturns = await db('product_returns')
      .whereNotNull('goods_receipt_item_id')
      .whereIn('goods_receipt_item_id', receiptItems.map(ri => ri.goods_receipt_item_id))
      .groupBy('goods_receipt_item_id')
      .select('goods_receipt_item_id')
      .sum('qty as total_item_returned');

    const itemReturnsMap = {};
    itemReturns.forEach(ir => {
      itemReturnsMap[ir.goods_receipt_item_id] = Number(ir.total_item_returned || 0);
    });

    // Gabungkan data
    return products.map(prod => {
      const prodReceipts = receiptItems.filter(ri => ri.vendor_product_id === prod.id).map(ri => {
        const itemReturned = itemReturnsMap[ri.goods_receipt_item_id] || 0;
        return {
          ...ri,
          cost_price: parseFloat(ri.cost_price || 0),
          sale_price: parseFloat(ri.sale_price || 0),
          qty_already_returned: itemReturned
        };
      });

      const totalReceived = prodReceipts.reduce((acc, ri) => acc + Number(ri.qty_received || 0), 0);
      const totalSold = salesMap[prod.id] || 0;
      const totalReturned = returnsMap[prod.id] || 0;
      const currentStock = Number(prod.current_stock || 0);

      return {
        product_id: prod.id,
        product_name: prod.product_name,
        barcode: prod.barcode,
        category: prod.category,
        unit: prod.unit || 'pcs',
        cost_price: Number(prod.cost_price || 0),
        sale_price: Number(prod.sale_price || 0),
        vendor_id: prod.vendor_id,
        vendor_name: prod.vendor_name,
        vendor_type: prod.vendor_type,
        current_stock: currentStock,
        total_received: totalReceived,
        total_sold: totalSold,
        total_returned: totalReturned,
        max_returnable: currentStock,
        receipt_batches: prodReceipts
      };
    });
  }

  async createReturn(schoolUnitId, payload, userId) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const {
      vendor_product_id,
      goods_receipt_id = null,
      goods_receipt_item_id = null,
      batch_number = null,
      return_type,
      qty,
      settlement_type = 'consignment_reduction',
      cash_account_id = null,
      bank_statement_id = null,
      note = null
    } = payload;

    let pQuery = db('vendor_products')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where('vendor_products.id', vendor_product_id);
    if (!isAll) {
      pQuery = pQuery.where('vendor_products.school_unit_id', schoolUnitId);
    }
    const product = await pQuery.select(
      'vendor_products.*',
      'vendors.vendor_name as vendor_name',
      'vendors.vendor_type'
    ).first();

    if (!product) {
      const err = new Error('Produk vendor tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const effectiveUnitId = product.school_unit_id || (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1);

    const returnQty = Number(qty);
    if (returnQty <= 0) {
      const err = new Error('Jumlah retur harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    if (returnQty > product.current_stock) {
      const err = new Error(`Jumlah retur (${returnQty} ${product.unit || 'pcs'}) tidak boleh melebihi sisa stok yang tersedia (${product.current_stock} ${product.unit || 'pcs'}).`);
      err.statusCode = 422;
      throw err;
    }

    const normalizedReturnType = (return_type === 'rusak' || return_type === 'expired' || return_type === 'basi') ? 'rusak' : 'sisa';

    // Dapatkan harga beli (HPP) dari batch atau master produk
    let itemCostPrice = parseFloat(product.cost_price || 0);
    if (goods_receipt_item_id) {
      const grItem = await db('goods_receipt_items').where({ id: goods_receipt_item_id }).first();
      if (grItem && grItem.cost_price !== undefined) {
        itemCostPrice = parseFloat(grItem.cost_price || 0);
      }
    }

    const totalCostAmount = returnQty * itemCostPrice;

    // Ambil konfigurasi akuntansi default
    const configData = await this.getAccountingConfig(effectiveUnitId);
    const conf = configData.settings;

    const isConsignment = product.vendor_type !== 'beli_putus';

    let selectedCashAccount = null;
    if (cash_account_id) {
      selectedCashAccount = configData.cash_accounts.find(c => Number(c.id) === Number(cash_account_id));
    }

    // Tentukan Debet & Kredit Akun
    let debitCoaId, debitCoaCode, debitCoaName;
    let creditCoaId, creditCoaCode, creditCoaName;
    let finalSettlementType = settlement_type;

    if (isConsignment) {
      // Retur Titipan: DEBET Hutang Konsinyasi Vendor, KREDIT Persediaan Konsinyasi
      finalSettlementType = 'consignment_reduction';
      debitCoaId = conf.consignment_payable_coa_id || 1;
      debitCoaCode = conf.consignment_payable_coa_code || '20102';
      debitCoaName = conf.consignment_payable_coa_name || 'Hutang Konsinyasi Titipan Vendor';

      creditCoaId = conf.consignment_inventory_coa_id || 2;
      creditCoaCode = conf.consignment_inventory_coa_code || '10302';
      creditCoaName = conf.consignment_inventory_coa_name || 'Persediaan Konsinyasi Titipan';
    } else {
      // Retur Beli Putus / Belanja Mandiri
      creditCoaId = conf.inventory_coa_id || 1;
      creditCoaCode = conf.inventory_coa_code || '10301';
      creditCoaName = conf.inventory_coa_name || 'Persediaan Barang Dagangan Kantin';

      if (settlement_type === 'cash_refund') {
        debitCoaId = conf.cash_coa_id || 1;
        debitCoaCode = conf.cash_coa_code || '10101';
        debitCoaName = conf.cash_coa_name || 'Kas Tunai Kasir';
      } else if (settlement_type === 'bank_refund') {
        debitCoaId = conf.bank_coa_id || 2;
        debitCoaCode = conf.bank_coa_code || '10102';
        debitCoaName = conf.bank_coa_name || 'Kas Bank BNI Kantin';
      } else if (settlement_type === 'write_off_loss' || normalizedReturnType === 'rusak') {
        finalSettlementType = 'write_off_loss';
        debitCoaId = conf.loss_expense_coa_id || 3;
        debitCoaCode = conf.loss_expense_coa_code || '50102';
        debitCoaName = conf.loss_expense_coa_name || 'Beban Kerusakan / Pemusnahan Barang';
      } else {
        // Pengurangan Hutang Dagang Tempo (payable_reduction)
        finalSettlementType = 'payable_reduction';
        debitCoaId = conf.trade_payable_coa_id || 2;
        debitCoaCode = conf.trade_payable_coa_code || '20100';
        debitCoaName = conf.trade_payable_coa_name || 'Hutang Usaha Dagang Kantin';
      }
    }

    const fundSourceName = conf.fund_source_name || 'Pos Pengembalian & Penyesuaian Stok SBU Kantin';
    const finalCashAccId = (finalSettlementType === 'cash_refund' || finalSettlementType === 'bank_refund') ? (cash_account_id ? Number(cash_account_id) : (finalSettlementType === 'bank_refund' ? conf.cash_account_id_bank : conf.cash_account_id_tunai)) : null;
    const finalCashAccName = selectedCashAccount?.display_label || (finalSettlementType === 'bank_refund' ? conf.cash_account_name_bank : (finalSettlementType === 'cash_refund' ? conf.cash_account_name_tunai : null));

    // Catat Jurnal Akuntansi SBU Kantin
    let sbuJournal = null;
    if (conf.auto_journal && totalCostAmount > 0) {
      try {
        const vendorName = product.vendor_name || 'Vendor';
        const typeLabel = normalizedReturnType === 'rusak' ? 'Barang Rusak/Kadaluarsa' : 'Sisa Tak Terjual';
        const descText = `Retur ${typeLabel} - ${product.product_name} (${returnQty} ${product.unit || 'pcs'}) ke ${vendorName}`;

        sbuJournal = await canteenAccountingService.createJournalEntry(effectiveUnitId, {
          entry_type: 'general',
          entry_date: new Date().toISOString().slice(0, 10),
          reference_number: goods_receipt_id ? `GR#${goods_receipt_id}` : (bank_statement_id ? `RK#${bank_statement_id}` : null),
          description: descText,
          lines: [
            {
              coa_account_id: debitCoaId,
              coa_account_code: debitCoaCode,
              coa_account_name: debitCoaName,
              debit: totalCostAmount,
              credit: 0,
              memo: `Pengurangan Kewajiban / Penerimaan Refund Retur - ${product.product_name}`
            },
            {
              coa_account_id: creditCoaId,
              coa_account_code: creditCoaCode,
              coa_account_name: creditCoaName,
              debit: 0,
              credit: totalCostAmount,
              memo: `Pengurangan Persediaan Fisik Barang Retur - ${product.product_name}`
            }
          ]
        }, userId);
      } catch (jrnErr) {
        console.warn(`[Product Return] Gagal mencatat jurnal SBU Kantin: ${jrnErr.message}`);
      }
    }

    const journalNumber = sbuJournal?.entry_number || null;
    const journalEntryId = sbuJournal?.id || null;

    const [id] = await db('product_returns').insert({
      school_unit_id: effectiveUnitId,
      vendor_product_id,
      goods_receipt_id: goods_receipt_id ? Number(goods_receipt_id) : null,
      goods_receipt_item_id: goods_receipt_item_id ? Number(goods_receipt_item_id) : null,
      batch_number: batch_number ? String(batch_number).trim() : null,
      return_type: normalizedReturnType,
      qty: returnQty,
      total_cost_amount: totalCostAmount,
      settlement_type: finalSettlementType,
      cash_account_id: finalCashAccId,
      cash_account_name: finalCashAccName,
      debit_coa_id: debitCoaId,
      debit_coa_code: debitCoaCode,
      debit_coa_name: debitCoaName,
      credit_coa_id: creditCoaId,
      credit_coa_code: creditCoaCode,
      credit_coa_name: creditCoaName,
      fund_source_name: fundSourceName,
      bank_statement_id: bank_statement_id ? Number(bank_statement_id) : null,
      journal_entry_id: journalEntryId,
      journal_number: journalNumber,
      note,
      returned_by: userId || 1,
      returned_at: db.fn.now()
    });

    // Kurangi current_stock di vendor_products
    await db('vendor_products')
      .where({ id: vendor_product_id })
      .decrement('current_stock', returnQty);

    return db('product_returns')
      .join('vendor_products', 'product_returns.vendor_product_id', 'vendor_products.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .leftJoin('goods_receipts', 'product_returns.goods_receipt_id', 'goods_receipts.id')
      .where('product_returns.id', id)
      .select(
        'product_returns.*',
        'vendor_products.product_name',
        'vendor_products.unit',
        'vendors.vendor_name as vendor',
        'goods_receipts.receipt_date',
        'goods_receipts.invoice_number'
      )
      .first();
  }
}

module.exports = new ProductReturnsService();
