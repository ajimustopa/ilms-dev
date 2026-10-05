/**
 * Vendor Fee Payments Service
 * Sesuai api-contract-kantin.md Modul 7, erd-kantin.md §2.15, & aturan in-process modul Keuangan
 */
const db = require('../../../config/db/kantin');
const masterDataService = require('../../keuangan/master-data/service');
const keuanganInternalService = require('../../keuangan/internal/service');
const expensesService = require('../../keuangan/expenses/service');
const canteenAccountingService = require('../accounting/service');

class VendorFeePaymentsService {
  /**
   * Mengambil konfigurasi default akuntansi penyerahan hak vendor dan opsi dropdown
   */
  async getAccountingConfig(schoolUnitId) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;

    let settings = await db('canteen_vendor_fee_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();

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
    const payableCoas = formattedCoas.filter(c =>
      c.account_code === '20102' || c.account_code === '20100' || c.account_code === '201' ||
      (c.account_name || '').toLowerCase().includes('konsinyasi') || (c.account_name || '').toLowerCase().includes('vendor') || (c.account_name || '').toLowerCase().includes('titipan') || (c.account_name || '').toLowerCase().includes('hutang')
    );
    const costCoas = formattedCoas.filter(c =>
      c.account_code === '50100' || c.account_code === '501' || c.account_code === '502' ||
      (c.account_name || '').toLowerCase().includes('hpp') || (c.account_name || '').toLowerCase().includes('beban')
    );
    const cashCoas = formattedCoas.filter(c =>
      c.account_code === '10101' || c.account_code === '101' || (c.account_name || '').toLowerCase().includes('kas')
    );
    const bankCoas = formattedCoas.filter(c =>
      c.account_code === '10102' || c.account_code === '102' || (c.account_name || '').toLowerCase().includes('bank')
    );

    const defaultTunaiAcc = formattedCashAccounts.find(a => a.is_canteen && !a.bank_account_number) || formattedCashAccounts.find(a => !a.bank_account_number) || formattedCashAccounts[0] || null;
    const defaultBankAcc = formattedCashAccounts.find(a => a.is_canteen && a.bank_account_number) || formattedCashAccounts.find(a => a.bank_account_number) || formattedCashAccounts[0] || null;

    // Debet default: Hutang Konsinyasi Vendor / Beban HPP Konsinyasi
    const defaultDebitCoa = formattedCoas.find(c => c.account_code === '20102') || payableCoas[0] || formattedCoas.find(c => c.account_code === '50100') || costCoas[0] || formattedCoas[0] || null;
    // Kredit default: Kas Tunai / Kas Bank Kantin
    const defaultCreditCoa = formattedCoas.find(c => c.account_code === '10101') || cashCoas[0] || formattedCoas[0] || null;

    const resolvedConfig = {
      school_unit_id: effectiveUnitId,
      auto_journal_enabled: settings?.auto_journal_enabled !== undefined ? !!settings.auto_journal_enabled : true,
      default_fund_source_name: settings?.default_fund_source_name || 'Kantin Sekolah',
      default_cash_account_id: settings?.default_cash_account_id || defaultTunaiAcc?.id || null,
      default_bank_account_id: settings?.default_bank_account_id || defaultBankAcc?.id || null,
      debit_coa_id: settings?.debit_coa_id || defaultDebitCoa?.id || null,
      debit_coa_code: defaultDebitCoa?.account_code || '20102',
      debit_coa_name: defaultDebitCoa?.account_name || 'Hutang Konsinyasi Mitra Vendor',
      credit_coa_id: settings?.credit_coa_id || defaultCreditCoa?.id || null,
      credit_coa_code: defaultCreditCoa?.account_code || '10101',
      credit_coa_name: defaultCreditCoa?.account_name || 'Kas Operasional / Kas Tunai',
      default_bank_statement_id: settings?.default_bank_statement_id || null
    };

    return {
      settings: resolvedConfig,
      coa_accounts: formattedCoas,
      cash_accounts: formattedCashAccounts.filter(a => !a.bank_account_number),
      bank_accounts: formattedCashAccounts.filter(a => !!a.bank_account_number),
      fund_sources: [
        { id: 'kantin_sekolah', name: 'Kantin Sekolah' },
        { id: 'operasional_sekolah', name: 'Operasional Sekolah' },
        { id: 'dana_yayasan', name: 'Dana Usaha & Kemitraan Yayasan' },
        { id: 'kas_induk', name: 'Kas Induk Keuangan' }
      ]
    };
  }

  /**
   * Menyimpan / memperbarui konfigurasi default akuntansi penyerahan hak vendor
   */
  async saveAccountingConfig(schoolUnitId, payload) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;

    const record = {
      school_unit_id: effectiveUnitId,
      auto_journal_enabled: payload.auto_journal_enabled !== undefined ? !!payload.auto_journal_enabled : true,
      default_fund_source_name: payload.default_fund_source_name?.trim() || 'Kantin Sekolah',
      default_cash_account_id: payload.default_cash_account_id ? Number(payload.default_cash_account_id) : null,
      default_bank_account_id: payload.default_bank_account_id ? Number(payload.default_bank_account_id) : null,
      debit_coa_id: payload.debit_coa_id ? Number(payload.debit_coa_id) : null,
      credit_coa_id: payload.credit_coa_id ? Number(payload.credit_coa_id) : null,
      default_bank_statement_id: payload.default_bank_statement_id ? Number(payload.default_bank_statement_id) : null,
      updated_at: db.fn.now()
    };

    const existing = await db('canteen_vendor_fee_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();
    if (existing) {
      await db('canteen_vendor_fee_accounting_settings').where({ school_unit_id: effectiveUnitId }).update(record);
    } else {
      await db('canteen_vendor_fee_accounting_settings').insert({
        ...record,
        created_at: db.fn.now()
      });
    }

    return this.getAccountingConfig(effectiveUnitId);
  }

  async listPayments(schoolUnitId, query = {}) {
    let q = db('vendor_fee_payments')
      .join('vendors', 'vendor_fee_payments.vendor_id', 'vendors.id')
      .select(
        'vendor_fee_payments.*',
        'vendors.vendor_name as vendor',
        'vendors.vendor_type',
        'vendors.contact as vendor_phone'
      );

    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      q = q.where('vendor_fee_payments.school_unit_id', schoolUnitId);
    }

    if (query.vendor_id && query.vendor_id !== 'all') {
      q = q.where('vendor_fee_payments.vendor_id', query.vendor_id);
    }
    if (query.period_start) {
      q = q.where('vendor_fee_payments.paid_at', '>=', query.period_start);
    }
    if (query.period_end) {
      const endVal = query.period_end.length === 10 ? `${query.period_end} 23:59:59` : query.period_end;
      q = q.where('vendor_fee_payments.paid_at', '<=', endVal);
    }
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      q = q.where(function() {
        this.where('vendors.vendor_name', 'like', term)
          .orWhere('vendor_fee_payments.receipt_number', 'like', term)
          .orWhere('vendor_fee_payments.finance_receipt_number', 'like', term)
          .orWhere('vendor_fee_payments.journal_number', 'like', term)
          .orWhere('vendor_fee_payments.notes', 'like', term);
      });
    }

    return q.orderBy('vendor_fee_payments.paid_at', 'desc').orderBy('vendor_fee_payments.id', 'desc');
  }

  async getCashAccounts(schoolUnitId) {
    try {
      const accounts = await masterDataService.listCashAccounts(schoolUnitId, { is_active: true });
      return accounts.map(a => ({
        id: a.id,
        name: a.name,
        account_kind: a.account_kind,
        bank_name: a.bank_name,
        bank_account_number: a.bank_account_number,
        display_label: a.bank_account_number
          ? `${a.name} (${a.bank_name || 'Bank'} - ${a.bank_account_number})`
          : `${a.name} (Kas Tunai)`
      }));
    } catch (err) {
      console.warn('[Vendor Fee] Gagal mengambil cash_accounts dari Keuangan:', err.message);
      return [];
    }
  }

  async getCoaAccounts(schoolUnitId) {
    try {
      const accounts = await masterDataService.listChartOfAccounts(schoolUnitId, false);
      const filtered = accounts.filter(a => a.is_active !== false && a.is_active !== 0);

      // Cari default COA untuk hutang vendor / konsinyasi / beban HPP
      const defaultAcc = filtered.find(a => a.account_code === '20102')
        || filtered.find(a => {
          const name = (a.account_name || '').toLowerCase();
          return name.includes('konsinyasi') || name.includes('vendor') || name.includes('titipan');
        })
        || filtered.find(a => a.account_code === '50100' || a.account_code === '501')
        || filtered.find(a => a.account_group === 'kewajiban' || a.account_group === 'beban')
        || filtered[0];

      return {
        accounts: filtered.map(a => ({
          id: a.id,
          account_code: a.account_code,
          account_name: a.account_name,
          account_group: a.account_group,
          normal_balance: a.normal_balance,
          display_label: `[${a.account_code}] ${a.account_name} (${(a.account_group || '').toUpperCase()})`
        })),
        default_coa_id: defaultAcc ? defaultAcc.id : null,
        default_coa: defaultAcc ? {
          id: defaultAcc.id,
          account_code: defaultAcc.account_code,
          account_name: defaultAcc.account_name,
          account_group: defaultAcc.account_group
        } : null
      };
    } catch (err) {
      console.warn('[Vendor Fee] Gagal mengambil COA dari Keuangan:', err.message);
      return { accounts: [], default_coa_id: null, default_coa: null };
    }
  }

  async getBankStatements(schoolUnitId, query = {}) {
    try {
      // Ambil mutasi DB (Debit/Pengeluaran Bank) yang belum direkonsiliasi penuh
      const statements = await keuanganInternalService.listBankStatements(schoolUnitId, {
        dc_type: 'DB',
        is_reconciled: false,
        ...query
      });
      return statements.map(s => ({
        id: s.id,
        transaction_date: s.transaction_date ? (typeof s.transaction_date === 'string' ? s.transaction_date.slice(0, 10) : new Date(s.transaction_date).toISOString().slice(0, 10)) : null,
        amount: parseFloat(s.amount) || 0,
        unallocated_amount: s.unallocated_amount !== undefined ? parseFloat(s.unallocated_amount) : (parseFloat(s.amount) || 0),
        description: s.description || '-',
        reference_number: s.reference_number || null,
        cash_account_id: s.cash_account_id || null,
        cash_account_name: s.cash_account_name || null,
        bank_name: s.bank_name || null,
        bank_account_number: s.bank_account_number || null
      }));
    } catch (err) {
      console.warn('[Vendor Fee] Gagal memuat mutasi rekening koran pengeluaran:', err.message);
      return [];
    }
  }

  async getUndisbursedVendorItems(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const { vendor_id, date_from, date_to } = query;

    let q = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
      .join('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id')
      .where(function() {
        this.whereNull('sales_transactions.status').orWhere('sales_transactions.status', '!=', 'void');
      })
      .whereNull('sales_transaction_items.vendor_fee_payment_id');

    if (!isAll) {
      q = q.where('sales_transactions.school_unit_id', schoolUnitId);
    }
    if (vendor_id && vendor_id !== 'all') {
      q = q.where('vendors.id', vendor_id);
    }
    if (date_from) {
      q = q.where('sales_transactions.transaction_at', '>=', date_from);
    }
    if (date_to) {
      const dTo = date_to.length === 10 ? `${date_to} 23:59:59` : date_to;
      q = q.where('sales_transactions.transaction_at', '<=', dTo);
    }

    const rows = await q.select(
      'sales_transaction_items.id as item_id',
      'sales_transaction_items.sales_transaction_id',
      'sales_transaction_items.qty',
      'sales_transaction_items.sale_price',
      'sales_transaction_items.cost_price',
      'sales_transaction_items.subtotal_price',
      'sales_transaction_items.subtotal_cost',
      'sales_transactions.transaction_at',
      'sales_transactions.buyer_name as raw_buyer_name',
      'sales_transactions.buyer_type',
      'sales_transactions.payment_method',
      'sales_transactions.cashier_name',
      'canteen_students.cached_student_name',
      'canteen_students.cached_class_group_name',
      'vendor_products.product_name',
      'vendors.id as vendor_id',
      'vendors.vendor_name',
      'vendors.vendor_type'
    ).orderBy('sales_transactions.transaction_at', 'asc');

    const totalAmount = rows.reduce((acc, curr) => acc + (parseFloat(curr.subtotal_cost) || 0), 0);

    return {
      items: rows.map(r => {
        let displayName = 'Umum';
        if (r.buyer_type === 'student') {
          displayName = r.cached_student_name
            ? (r.cached_class_group_name ? `${r.cached_student_name} (${r.cached_class_group_name})` : r.cached_student_name)
            : 'Santri';
        } else if (r.raw_buyer_name) {
          displayName = r.raw_buyer_name;
        }
        return {
          id: r.item_id,
          item_id: r.item_id,
          sales_transaction_id: r.sales_transaction_id,
          product_name: r.product_name,
          vendor_id: r.vendor_id,
          vendor_name: r.vendor_name,
          qty: Number(r.qty || 0),
          sale_price: parseFloat(r.sale_price || 0),
          cost_price: parseFloat(r.cost_price || 0),
          subtotal_price: parseFloat(r.subtotal_price || 0),
          subtotal_cost: parseFloat(r.subtotal_cost || 0),
          transaction_at: r.transaction_at,
          payment_method: r.payment_method,
          buyer_name: displayName,
          cashier_name: r.cashier_name || '-'
        };
      }),
      total_count: rows.length,
      total_amount: totalAmount
    };
  }

  async createPayment(schoolUnitId, payload, userId) {
    const {
      vendor_id,
      amount,
      paid_at,
      cash_account_id,
      coa_account_id,
      credit_coa_id: customCreditCoaId,
      bank_statement_id,
      fund_source_name,
      sales_transaction_item_ids,
      notes
    } = payload;

    if (!vendor_id) {
      const err = new Error('Vendor mitra wajib dipilih');
      err.statusCode = 422;
      throw err;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      const err = new Error('Nominal penyerahan hak vendor harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const vendor = await db('vendors').where({ id: vendor_id }).first();
    if (!vendor) {
      const err = new Error('Data vendor tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const transferDate = paid_at || new Date().toISOString().slice(0, 10);
    const effectiveUnitId = (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') ? Number(schoolUnitId) : (vendor.school_unit_id || 1);

    // Ambil default config akuntansi
    const configData = await this.getAccountingConfig(effectiveUnitId);
    const conf = configData.settings || {};

    // 1. Tentukan rekening kas/bank pengeluaran
    let targetCashAccountId = cash_account_id ? Number(cash_account_id) : conf.default_cash_account_id;
    let targetCashAccountName = null;

    try {
      const cashAccounts = await masterDataService.listCashAccounts(effectiveUnitId, { is_active: true });
      const foundAcc = cashAccounts.find(a => String(a.id) === String(targetCashAccountId));
      if (foundAcc) {
        targetCashAccountName = foundAcc.bank_account_number
          ? `${foundAcc.name} (${foundAcc.bank_name || 'Bank'} - ${foundAcc.bank_account_number})`
          : `${foundAcc.name} (Kas Tunai)`;
      }
    } catch (_) {}

    // 2. Tentukan Akun Debet & Kredit Akuntansi
    let allCoas = [];
    try {
      allCoas = await masterDataService.listChartOfAccounts(effectiveUnitId, false);
    } catch (_) {}

    const debitCoaId = coa_account_id ? Number(coa_account_id) : (conf.debit_coa_id || null);
    const creditCoaId = customCreditCoaId ? Number(customCreditCoaId) : (conf.credit_coa_id || null);

    const debitCoa = allCoas.find(c => String(c.id) === String(debitCoaId));
    const creditCoa = allCoas.find(c => String(c.id) === String(creditCoaId));

    const debitCoaCode = debitCoa?.account_code || conf.debit_coa_code || '20102';
    const debitCoaName = debitCoa?.account_name || conf.debit_coa_name || 'Hutang Konsinyasi Mitra Vendor';
    const creditCoaCode = creditCoa?.account_code || conf.credit_coa_code || '10101';
    const creditCoaName = creditCoa?.account_name || conf.credit_coa_name || 'Kas Operasional / Kas Tunai';

    const finalFundSourceName = fund_source_name?.trim() || conf.default_fund_source_name || 'Kantin Sekolah';
    const finalBankStatementId = bank_statement_id ? Number(bank_statement_id) : (conf.default_bank_statement_id ? Number(conf.default_bank_statement_id) : null);

    // 3. Tentukan nomor kwitansi pembayaran vendor (format: KWV/YYYY/MM/XXXX)
    const now = new Date(transferDate);
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const countRow = await db('vendor_fee_payments')
      .whereRaw('YEAR(paid_at) = ?', [yr])
      .count('id as cnt')
      .first();
    const seq = String((parseInt(countRow?.cnt || 0, 10) + 1)).padStart(4, '0');
    const receiptNumber = `KWV/${yr}/${mo}/${seq}`;

    // Tentukan tanggal periode
    let periodStart = payload.period_start || transferDate;
    let periodEnd = payload.period_end || transferDate;

    // 4. Validasi bahwa seluruh item transaksi penjualan yang dipilih berasal dari 1 vendor yang sama
    if (Array.isArray(sales_transaction_item_ids) && sales_transaction_item_ids.length > 0) {
      const itemsToLink = await db('sales_transaction_items')
        .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
        .whereIn('sales_transaction_items.id', sales_transaction_item_ids)
        .select(
          'sales_transaction_items.id',
          'vendor_products.vendor_id',
          'sales_transaction_items.vendor_fee_payment_id'
        );

      const invalidVendorItems = itemsToLink.filter(it => Number(it.vendor_id) !== Number(vendor_id));
      if (invalidVendorItems.length > 0) {
        const err = new Error(`1 transaksi penyerahan hak vendor hanya dapat dilakukan untuk 1 vendor saja (${vendor.vendor_name}).`);
        err.statusCode = 422;
        throw err;
      }
    }

    // 5. Catat Jurnal Akuntansi SBU Kantin (Double-Entry)
    let sbuJournal = null;
    if (conf.auto_journal_enabled !== false) {
      try {
        const descText = notes || `Penyerahan Bagi Hasil Konsinyasi Mitra Vendor ${vendor.vendor_name} (No. Kwitansi ${receiptNumber})`;
        sbuJournal = await canteenAccountingService.createJournalEntry(effectiveUnitId, {
          entry_type: 'general',
          entry_date: transferDate,
          reference_number: finalBankStatementId ? `RK#${finalBankStatementId}` : receiptNumber,
          description: descText,
          lines: [
            {
              coa_account_id: debitCoaId,
              coa_account_code: debitCoaCode,
              coa_account_name: debitCoaName,
              debit: paymentAmount,
              credit: 0,
              memo: `Pelunasan Hak Bagi Hasil Konsinyasi Vendor ${vendor.vendor_name}`
            },
            {
              coa_account_id: creditCoaId,
              coa_account_code: creditCoaCode,
              coa_account_name: creditCoaName,
              debit: 0,
              credit: paymentAmount,
              memo: `Pengeluaran Kas/Bank Penyerahan Hak Vendor (${targetCashAccountName || finalFundSourceName})`
            }
          ]
        }, userId);
      } catch (jrnErr) {
        console.warn(`[Vendor Fee] Gagal mencatat jurnal SBU Kantin: ${jrnErr.message}`);
      }
    }

    const journalNumber = sbuJournal?.entry_number || null;
    const journalEntryId = sbuJournal?.id || null;

    // 6. Simpan record pembayaran hak vendor
    const [id] = await db('vendor_fee_payments').insert({
      school_unit_id: effectiveUnitId,
      vendor_id: Number(vendor_id),
      period_start: periodStart,
      period_end: periodEnd,
      amount: paymentAmount,
      paid_by: userId || 1,
      paid_at: transferDate,
      receipt_number: receiptNumber,
      cash_account_id: targetCashAccountId || null,
      cash_account_name: targetCashAccountName || null,
      debit_coa_id: debitCoaId,
      debit_coa_code: debitCoaCode,
      debit_coa_name: debitCoaName,
      credit_coa_id: creditCoaId,
      credit_coa_code: creditCoaCode,
      credit_coa_name: creditCoaName,
      fund_source_name: finalFundSourceName,
      bank_statement_id: finalBankStatementId,
      journal_entry_id: journalEntryId,
      journal_number: journalNumber,
      notes: notes || `Pembayaran bagi hasil konsinyasi vendor ${vendor.vendor_name}`
    });

    // 7. Tautkan item transaksi penjualan vendor ke vendor_fee_payment_id
    try {
      if (Array.isArray(sales_transaction_item_ids) && sales_transaction_item_ids.length > 0) {
        await db('sales_transaction_items')
          .whereIn('id', sales_transaction_item_ids)
          .whereNull('vendor_fee_payment_id')
          .update({
            vendor_fee_payment_id: id,
            updated_at: db.fn.now()
          });
      } else {
        // Tautkan seluruh item penjualan vendor terkait yang belum diserahkan sampai tanggal penyerahan
        const pEnd = transferDate.length === 10 ? `${transferDate} 23:59:59` : transferDate;
        const pendingItems = await db('sales_transaction_items')
          .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
          .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
          .where('vendor_products.vendor_id', vendor_id)
          .whereNull('sales_transaction_items.vendor_fee_payment_id')
          .where('sales_transactions.transaction_at', '<=', pEnd)
          .select('sales_transaction_items.id');

        if (pendingItems.length > 0) {
          const itemIds = pendingItems.map(p => p.id);
          await db('sales_transaction_items')
            .whereIn('id', itemIds)
            .update({
              vendor_fee_payment_id: id,
              updated_at: db.fn.now()
            });
        }
      }
    } catch (linkErr) {
      console.warn('[Vendor Fee] Gagal menautkan sales_transaction_items ke payment:', linkErr.message);
    }

    let financeExpenseId = null;
    let financeReceiptNumber = null;

    // 8. In-process integration dengan Modul Keuangan (Pencatatan Pengeluaran Kas / BKK bagi hasil vendor)
    try {
      if (targetCashAccountId) {
        const expensePayload = {
          expense_date: transferDate,
          total_amount: paymentAmount,
          unit_price: paymentAmount,
          quantity: 1,
          is_package: true,
          is_outside_budget: true,
          cash_account_id: targetCashAccountId,
          bank_statement_id: finalBankStatementId,
          override_debit_account_id: debitCoaId || undefined,
          recipient_name: vendor.vendor_name || 'Mitra Vendor Kantin',
          notes: notes || `Pembayaran Bagi Hasil Konsinyasi Vendor ${vendor.vendor_name} (No. Kwitansi ${receiptNumber})`
        };

        const expenseRes = await expensesService.createExpense(effectiveUnitId, expensePayload, userId);
        if (expenseRes && expenseRes.id) {
          financeExpenseId = expenseRes.id;
          financeReceiptNumber = expenseRes.voucher_number || expenseRes.receipt_number || `BKK/${yr}/${mo}/${String(expenseRes.id).padStart(4, '0')}`;

          await db('vendor_fee_payments')
            .where({ id })
            .update({
              finance_expense_id: financeExpenseId,
              finance_receipt_number: financeReceiptNumber,
              updated_at: db.fn.now()
            });
        }
      }
    } catch (finErr) {
      console.error('[Vendor Fee] Gagal mencatat pengeluaran in-process ke Modul Keuangan:', finErr.message);
    }

    // 9. Activity log
    try {
      await db('canteen_activity_logs').insert({
        school_unit_id: effectiveUnitId,
        user_id: userId || 1,
        action: 'vendor_fee_payment',
        target_table: 'vendor_fee_payments',
        target_id: id,
        note: `Pembayaran hak vendor ${vendor.vendor_name} sebesar Rp ${paymentAmount.toLocaleString('id-ID')} dicatat dengan No. Kwitansi ${receiptNumber}`
      });
    } catch (_) {}

    return db('vendor_fee_payments')
      .join('vendors', 'vendor_fee_payments.vendor_id', 'vendors.id')
      .where('vendor_fee_payments.id', id)
      .select(
        'vendor_fee_payments.*',
        'vendors.vendor_name as vendor',
        'vendors.vendor_type',
        'vendors.contact as vendor_phone'
      )
      .first();
  }
}

module.exports = new VendorFeePaymentsService();
