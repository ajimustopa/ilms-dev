/**
 * Goods Receipts Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.6–2.7
 */
const db = require('../../../config/db/kantin');
const masterDataService = require('../../keuangan/master-data/service');
const keuanganInternalService = require('../../keuangan/internal/service');
const canteenAccountingService = require('../accounting/service');

class GoodsReceiptsService {
  /**
   * Mengambil konfigurasi default akuntansi penerimaan barang dan opsi dropdown COA/Kas
   */
  async getAccountingConfig(schoolUnitId) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;

    let settings = await db('canteen_goods_receipts_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();

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
    const inventoryCoas = formattedCoas.filter(c =>
      c.account_code === '10301' || c.account_code === '10302' || c.account_code === '50101' ||
      (c.account_name || '').toLowerCase().includes('persediaan') || (c.account_name || '').toLowerCase().includes('bahan') || (c.account_name || '').toLowerCase().includes('pembelian')
    );
    const consignmentInventoryCoas = formattedCoas.filter(c =>
      c.account_code === '10302' || c.account_code === '10301' ||
      (c.account_name || '').toLowerCase().includes('konsinyasi') || (c.account_name || '').toLowerCase().includes('titipan') || (c.account_name || '').toLowerCase().includes('persediaan')
    );
    const consignmentPayableCoas = formattedCoas.filter(c =>
      c.account_code === '20102' || c.account_code === '40501' || c.account_code === '20100' ||
      (c.account_name || '').toLowerCase().includes('konsinyasi') || (c.account_name || '').toLowerCase().includes('vendor') || (c.account_name || '').toLowerCase().includes('utang')
    );
    const tradePayableCoas = formattedCoas.filter(c =>
      c.account_code === '20100' || c.account_code === '20101' || (c.account_name || '').toLowerCase().includes('usaha') || (c.account_name || '').toLowerCase().includes('dagang') || (c.account_name || '').toLowerCase().includes('utang')
    );
    const cashCoas = formattedCoas.filter(c =>
      c.account_code === '10101' || c.account_code === '101' || (c.account_name || '').toLowerCase().includes('kas')
    );
    const bankCoas = formattedCoas.filter(c =>
      c.account_code === '10102' || c.account_code === '102' || (c.account_name || '').toLowerCase().includes('bank') || (c.account_name || '').toLowerCase().includes('bni')
    );

    const defaultTunaiAcc = formattedCashAccounts.find(a => a.is_canteen && !a.bank_account_number) || formattedCashAccounts.find(a => !a.bank_account_number) || formattedCashAccounts[0] || null;
    const defaultBankAcc = formattedCashAccounts.find(a => a.is_canteen && a.bank_account_number) || formattedCashAccounts.find(a => a.bank_account_number) || formattedCashAccounts[0] || null;

    const defaultInventoryCoa = formattedCoas.find(c => c.account_code === '10301') || inventoryCoas[0] || formattedCoas[0] || null;
    const defaultConsignmentInventoryCoa = formattedCoas.find(c => c.account_code === '10302') || consignmentInventoryCoas[0] || defaultInventoryCoa;
    const defaultConsignmentPayableCoa = formattedCoas.find(c => c.account_code === '20102') || formattedCoas.find(c => c.account_code === '40501') || consignmentPayableCoas[0] || formattedCoas[0] || null;
    const defaultTradePayableCoa = formattedCoas.find(c => c.account_code === '20100') || tradePayableCoas[0] || formattedCoas[0] || null;
    const defaultCashCoa = formattedCoas.find(c => c.account_code === '10101') || cashCoas[0] || formattedCoas[0] || null;
    const defaultBankCoa = formattedCoas.find(c => c.account_code === '10102') || bankCoas[0] || formattedCoas[0] || null;

    const resolvedConfig = {
      school_unit_id: effectiveUnitId,
      cash_account_id_tunai: settings?.cash_account_id_tunai || defaultTunaiAcc?.id || null,
      cash_account_name_tunai: settings?.cash_account_name_tunai || defaultTunaiAcc?.display_label || null,
      cash_account_id_bank: settings?.cash_account_id_bank || defaultBankAcc?.id || null,
      cash_account_name_bank: settings?.cash_account_name_bank || defaultBankAcc?.display_label || null,
      inventory_coa_id: settings?.inventory_coa_id || defaultInventoryCoa?.id || null,
      inventory_coa_code: settings?.inventory_coa_code || defaultInventoryCoa?.account_code || null,
      inventory_coa_name: settings?.inventory_coa_name || defaultInventoryCoa?.account_name || null,
      consignment_inventory_coa_id: settings?.consignment_inventory_coa_id || defaultConsignmentInventoryCoa?.id || null,
      consignment_inventory_coa_code: settings?.consignment_inventory_coa_code || defaultConsignmentInventoryCoa?.account_code || null,
      consignment_inventory_coa_name: settings?.consignment_inventory_coa_name || defaultConsignmentInventoryCoa?.account_name || null,
      consignment_payable_coa_id: settings?.consignment_payable_coa_id || defaultConsignmentPayableCoa?.id || null,
      consignment_payable_coa_code: settings?.consignment_payable_coa_code || defaultConsignmentPayableCoa?.account_code || null,
      consignment_payable_coa_name: settings?.consignment_payable_coa_name || defaultConsignmentPayableCoa?.account_name || null,
      trade_payable_coa_id: settings?.trade_payable_coa_id || defaultTradePayableCoa?.id || null,
      trade_payable_coa_code: settings?.trade_payable_coa_code || defaultTradePayableCoa?.account_code || null,
      trade_payable_coa_name: settings?.trade_payable_coa_name || defaultTradePayableCoa?.account_name || null,
      cash_coa_id: settings?.cash_coa_id || defaultCashCoa?.id || null,
      cash_coa_code: settings?.cash_coa_code || defaultCashCoa?.account_code || null,
      cash_coa_name: settings?.cash_coa_name || defaultCashCoa?.account_name || null,
      bank_coa_id: settings?.bank_coa_id || defaultBankCoa?.id || null,
      bank_coa_code: settings?.bank_coa_code || defaultBankCoa?.account_code || null,
      bank_coa_name: settings?.bank_coa_name || defaultBankCoa?.account_name || null,
      fund_source_name: settings?.fund_source_name || 'Pos Pengadaan Stok & Pembelian SBU Kantin',
      auto_journal: settings ? !!settings.auto_journal : true
    };

    return {
      settings: resolvedConfig,
      cash_accounts: formattedCashAccounts,
      coas: {
        all: formattedCoas,
        inventory: inventoryCoas.length > 0 ? inventoryCoas : formattedCoas,
        consignment_inventory: consignmentInventoryCoas.length > 0 ? consignmentInventoryCoas : formattedCoas,
        consignment_payable: consignmentPayableCoas.length > 0 ? consignmentPayableCoas : formattedCoas,
        trade_payable: tradePayableCoas.length > 0 ? tradePayableCoas : formattedCoas,
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
      inventory_coa_id,
      inventory_coa_code,
      inventory_coa_name,
      consignment_inventory_coa_id,
      consignment_inventory_coa_code,
      consignment_inventory_coa_name,
      consignment_payable_coa_id,
      consignment_payable_coa_code,
      consignment_payable_coa_name,
      trade_payable_coa_id,
      trade_payable_coa_code,
      trade_payable_coa_name,
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
      inventory_coa_id: inventory_coa_id ? Number(inventory_coa_id) : null,
      inventory_coa_code: inventory_coa_code || null,
      inventory_coa_name: inventory_coa_name || null,
      consignment_inventory_coa_id: consignment_inventory_coa_id ? Number(consignment_inventory_coa_id) : null,
      consignment_inventory_coa_code: consignment_inventory_coa_code || null,
      consignment_inventory_coa_name: consignment_inventory_coa_name || null,
      consignment_payable_coa_id: consignment_payable_coa_id ? Number(consignment_payable_coa_id) : null,
      consignment_payable_coa_code: consignment_payable_coa_code || null,
      consignment_payable_coa_name: consignment_payable_coa_name || null,
      trade_payable_coa_id: trade_payable_coa_id ? Number(trade_payable_coa_id) : null,
      trade_payable_coa_code: trade_payable_coa_code || null,
      trade_payable_coa_name: trade_payable_coa_name || null,
      cash_coa_id: cash_coa_id ? Number(cash_coa_id) : null,
      cash_coa_code: cash_coa_code || null,
      cash_coa_name: cash_coa_name || null,
      bank_coa_id: bank_coa_id ? Number(bank_coa_id) : null,
      bank_coa_code: bank_coa_code || null,
      bank_coa_name: bank_coa_name || null,
      fund_source_name: fund_source_name || 'Pos Pengadaan Stok & Pembelian SBU Kantin',
      auto_journal: auto_journal !== undefined ? !!auto_journal : true,
      updated_at: db.fn.now()
    };

    const existing = await db('canteen_goods_receipts_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();
    if (existing) {
      await db('canteen_goods_receipts_accounting_settings').where({ school_unit_id: effectiveUnitId }).update(dataToSave);
    } else {
      await db('canteen_goods_receipts_accounting_settings').insert(dataToSave);
    }

    return await this.getAccountingConfig(effectiveUnitId);
  }

  async listBankStatements(schoolUnitId, query = {}) {
    try {
      return await keuanganInternalService.listBankStatements(schoolUnitId, {
        cash_account_id: query.cash_account_id,
        dc_type: 'debit', // Pengeluaran kas/bank
        is_reconciled: false
      });
    } catch (err) {
      console.warn('[Goods Receipts] Gagal memuat rekening koran:', err.message);
      return [];
    }
  }

  async listReceipts(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('goods_receipts')
      .leftJoin('vendors', 'goods_receipts.vendor_id', 'vendors.id');

    if (!isAll) {
      q = q.where('goods_receipts.school_unit_id', schoolUnitId);
    }

    q = q.select(
      'goods_receipts.*',
      'vendors.vendor_name as vendor'
    );

    if (query.receipt_type) {
      q = q.where('goods_receipts.receipt_type', query.receipt_type);
    }
    if (query.status) {
      q = q.where('goods_receipts.status', query.status);
    }
    if (query.vendor_id) {
      q = q.where('goods_receipts.vendor_id', query.vendor_id);
    }

    const receipts = await q.orderBy('goods_receipts.receipt_date', 'desc').orderBy('goods_receipts.id', 'desc');

    // Enrich with items
    const receiptIds = receipts.map(r => r.id);
    const items = receiptIds.length > 0
      ? await db('goods_receipt_items')
          .join('vendor_products', 'goods_receipt_items.vendor_product_id', 'vendor_products.id')
          .whereIn('goods_receipt_items.goods_receipt_id', receiptIds)
          .select(
            'goods_receipt_items.*',
            'vendor_products.product_name',
            'vendor_products.unit'
          )
      : [];

    return receipts.map(r => ({
      ...r,
      total_cost_amount: parseFloat(r.total_cost_amount || 0),
      bank_statement_id: r.bank_statement_id ? Number(r.bank_statement_id) : null,
      items: items.filter(it => it.goods_receipt_id === r.id).map(it => ({
        ...it,
        cost_price: parseFloat(it.cost_price || 0),
        sale_price: parseFloat(it.sale_price || 0),
        subtotal: Number(it.qty || 0) * parseFloat(it.cost_price || 0)
      }))
    }));
  }

  async getReceiptById(schoolUnitId, id) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('goods_receipts')
      .leftJoin('vendors', 'goods_receipts.vendor_id', 'vendors.id')
      .where({ 'goods_receipts.id': id });

    if (!isAll) {
      q = q.where({ 'goods_receipts.school_unit_id': schoolUnitId });
    }

    const receipt = await q.select(
      'goods_receipts.*',
      'vendors.vendor_name as vendor'
    ).first();

    if (!receipt) return null;

    const items = await db('goods_receipt_items')
      .join('vendor_products', 'goods_receipt_items.vendor_product_id', 'vendor_products.id')
      .where({ 'goods_receipt_items.goods_receipt_id': id })
      .select(
        'goods_receipt_items.*',
        'vendor_products.product_name',
        'vendor_products.unit'
      );

    return {
      ...receipt,
      total_cost_amount: parseFloat(receipt.total_cost_amount || 0),
      bank_statement_id: receipt.bank_statement_id ? Number(receipt.bank_statement_id) : null,
      items: items.map(it => ({
        ...it,
        cost_price: parseFloat(it.cost_price || 0),
        sale_price: parseFloat(it.sale_price || 0),
        subtotal: Number(it.qty || 0) * parseFloat(it.cost_price || 0)
      }))
    };
  }

  async createReceipt(schoolUnitId, payload, userId) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;
    const {
      vendor_id = null,
      invoice_number = null,
      receipt_date,
      receipt_type,
      payment_method = 'consignment',
      cash_account_id = null,
      bank_statement_id = null,
      notes = null,
      items = []
    } = payload;

    const normalizedReceiptType = (receipt_type === 'belanja' || receipt_type === 'belanja_sendiri') ? 'belanja_sendiri' : 'titipan';

    // Hitung total nilai modal penerimaan barang
    let totalCostAmount = 0;
    if (Array.isArray(items) && items.length > 0) {
      items.forEach(it => {
        const qty = Number(it.qty || 0);
        const cost = parseFloat(it.cost_price || 0);
        if (qty > 0 && cost > 0) {
          totalCostAmount += (qty * cost);
        }
      });
    }

    // Ambil konfigurasi akuntansi default
    const configData = await this.getAccountingConfig(effectiveUnitId);
    const conf = configData.settings;

    // Tentukan metode pembayaran & Kas Account
    let selectedCashAccount = null;
    if (cash_account_id) {
      selectedCashAccount = configData.cash_accounts.find(c => Number(c.id) === Number(cash_account_id));
    }
    const isBank = payment_method === 'transfer' || payment_method === 'bank' || selectedCashAccount?.account_kind === 'bank';
    const isCredit = payment_method === 'credit' || payment_method === 'tempo';
    const effectivePaymentMethod = normalizedReceiptType === 'titipan' ? 'consignment' : (isCredit ? 'credit' : (isBank ? 'transfer' : 'cash'));

    const finalCashAccId = (normalizedReceiptType === 'belanja_sendiri' && !isCredit)
      ? (cash_account_id ? Number(cash_account_id) : (isBank ? conf.cash_account_id_bank : conf.cash_account_id_tunai))
      : null;
    const finalCashAccName = selectedCashAccount?.display_label || (isBank ? conf.cash_account_name_bank : conf.cash_account_name_tunai) || null;

    // Tentukan Debet & Kredit COA
    let debitCoaId, debitCoaCode, debitCoaName;
    let creditCoaId, creditCoaCode, creditCoaName;

    if (normalizedReceiptType === 'titipan') {
      // Titipan Konsinyasi: DEBET Persediaan Konsinyasi, KREDIT Hutang Konsinyasi Vendor
      debitCoaId = conf.consignment_inventory_coa_id || 1;
      debitCoaCode = conf.consignment_inventory_coa_code || '10302';
      debitCoaName = conf.consignment_inventory_coa_name || 'Persediaan Konsinyasi Titipan';

      creditCoaId = conf.consignment_payable_coa_id || 2;
      creditCoaCode = conf.consignment_payable_coa_code || '20102';
      creditCoaName = conf.consignment_payable_coa_name || 'Hutang Konsinyasi Titipan Vendor';
    } else {
      // Beli Putus / Belanja Sendiri: DEBET Persediaan Barang Dagangan
      debitCoaId = conf.inventory_coa_id || 1;
      debitCoaCode = conf.inventory_coa_code || '10301';
      debitCoaName = conf.inventory_coa_name || 'Persediaan Barang Dagangan Kantin';

      if (isCredit) {
        // KREDIT Hutang Usaha Dagang (Tempo)
        creditCoaId = conf.trade_payable_coa_id || 2;
        creditCoaCode = conf.trade_payable_coa_code || '20100';
        creditCoaName = conf.trade_payable_coa_name || 'Hutang Usaha Dagang Kantin';
      } else if (isBank) {
        // KREDIT Kas Bank
        creditCoaId = conf.bank_coa_id || 2;
        creditCoaCode = conf.bank_coa_code || '10102';
        creditCoaName = conf.bank_coa_name || 'Kas Bank BNI Kantin';
      } else {
        // KREDIT Kas Tunai
        creditCoaId = conf.cash_coa_id || 1;
        creditCoaCode = conf.cash_coa_code || '10101';
        creditCoaName = conf.cash_coa_name || 'Kas Tunai Kasir';
      }
    }

    const fundSourceName = conf.fund_source_name || 'Pos Pengadaan Stok & Pembelian SBU Kantin';
    const txDate = receipt_date || new Date().toISOString().slice(0, 10);

    // Ambil nama vendor untuk memo
    let vendorName = 'Vendor Luar';
    if (vendor_id) {
      const v = await db('vendors').where({ id: vendor_id }).first();
      if (v) vendorName = v.vendor_name;
    }

    // Catat Jurnal Akuntansi SBU Kantin (Double-Entry)
    let sbuJournal = null;
    if (conf.auto_journal && totalCostAmount > 0) {
      try {
        const descType = normalizedReceiptType === 'titipan' ? 'Penerimaan Barang Titipan Konsinyasi' : 'Penerimaan Barang Belanja Sendiri (Beli Putus)';
        const descRef = invoiceNumber ? `[Faktur: ${invoiceNumber}]` : '';
        const memoDebet = `${descType} - ${vendorName} ${descRef}`.trim();
        const memoKredit = normalizedReceiptType === 'titipan'
          ? `Kewajiban Konsinyasi ke ${vendorName}`
          : (isCredit ? `Hutang Dagang Pembelian ke ${vendorName}` : `Pengeluaran Kas/Bank Pembelian Stok - ${vendorName}`);

        sbuJournal = await canteenAccountingService.createJournalEntry(effectiveUnitId, {
          entry_type: 'general',
          entry_date: txDate,
          reference_number: invoiceNumber || (bank_statement_id ? `RK#${bank_statement_id}` : null),
          description: `${descType} ${vendorName} ${descRef}`.trim(),
          lines: [
            {
              coa_account_id: debitCoaId,
              coa_account_code: debitCoaCode,
              coa_account_name: debitCoaName,
              debit: totalCostAmount,
              credit: 0,
              memo: memoDebet
            },
            {
              coa_account_id: creditCoaId,
              coa_account_code: creditCoaCode,
              coa_account_name: creditCoaName,
              debit: 0,
              credit: totalCostAmount,
              memo: memoKredit
            }
          ]
        }, userId);
      } catch (jrnErr) {
        console.warn(`[Goods Receipt] Gagal mencatat jurnal SBU Kantin: ${jrnErr.message}`);
      }
    }

    const journalNumber = sbuJournal?.entry_number || null;
    const journalEntryId = sbuJournal?.id || null;

    const [id] = await db('goods_receipts').insert({
      school_unit_id: effectiveUnitId,
      vendor_id,
      invoice_number,
      receipt_date: txDate,
      receipt_type: normalizedReceiptType,
      total_cost_amount: totalCostAmount,
      payment_method: effectivePaymentMethod,
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
      notes: notes || null,
      status: items.length > 0 ? 'completed' : 'draft',
      created_by: userId || 1
    });

    if (items.length > 0) {
      for (const item of items) {
        await db('goods_receipt_items').insert({
          goods_receipt_id: id,
          vendor_product_id: item.vendor_product_id,
          qty: Number(item.qty),
          cost_price: parseFloat(item.cost_price || 0),
          sale_price: parseFloat(item.sale_price || 0),
          batch_number: item.batch_number ? String(item.batch_number).trim() : null,
          expired_at: item.expired_at || null
        });

        // Tambah current_stock dan perbarui harga di vendor_products
        const productUpdates = {};
        if (item.cost_price !== undefined && !isNaN(item.cost_price)) {
          productUpdates.cost_price = parseFloat(item.cost_price);
        }
        if (item.sale_price !== undefined && !isNaN(item.sale_price)) {
          productUpdates.sale_price = parseFloat(item.sale_price);
        }

        if (Object.keys(productUpdates).length > 0) {
          await db('vendor_products')
            .where({ id: item.vendor_product_id })
            .update(productUpdates);
        }

        await db('vendor_products')
          .where({ id: item.vendor_product_id })
          .increment('current_stock', Number(item.qty));
      }
    }

    return this.getReceiptById(effectiveUnitId, id);
  }

  async addItem(schoolUnitId, receiptId, payload) {
    const receipt = await this.getReceiptById(schoolUnitId, receiptId);

    if (!receipt) return null;

    const { vendor_product_id, qty, cost_price, sale_price, batch_number = null, expired_at = null } = payload;
    const numQty = Number(qty);
    const numCost = parseFloat(cost_price || 0);

    const [itemId] = await db('goods_receipt_items').insert({
      goods_receipt_id: receiptId,
      vendor_product_id,
      qty: numQty,
      cost_price: numCost,
      sale_price: parseFloat(sale_price || 0),
      batch_number: batch_number ? String(batch_number).trim() : null,
      expired_at
    });

    // Update current_stock
    await db('vendor_products')
      .where({ id: vendor_product_id })
      .increment('current_stock', numQty);

    // Update total_cost_amount & status on goods_receipts
    const currentTotal = parseFloat(receipt.total_cost_amount || 0);
    const newTotal = currentTotal + (numQty * numCost);

    await db('goods_receipts')
      .where({ id: receiptId })
      .update({
        total_cost_amount: newTotal,
        status: 'completed',
        updated_at: db.fn.now()
      });

    return this.getReceiptById(schoolUnitId, receiptId);
  }
}

module.exports = new GoodsReceiptsService();
