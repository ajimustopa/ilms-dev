/**
 * Operational Expenses & Incomes Service (Kas & Akuntansi Operasional Kantin)
 * Sesuai api-contract-kantin.md Modul 7 & integrasi modul Keuangan Enterprise Aldepos
 */
const db = require('../../../config/db/kantin');
const masterDataService = require('../../keuangan/master-data/service');
const otherIncomesService = require('../../keuangan/other-incomes/service');
const expensesService = require('../../keuangan/expenses/service');
const bankStatementsService = require('../../keuangan/bank-statements/service');

class OperationalExpensesService {
  /**
   * Mengambil daftar transaksi pemasukan dan pengeluaran operasional
   */
  async listExpenses(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('operational_expenses');

    if (!isAll) {
      q = q.where('school_unit_id', Number(schoolUnitId));
    }

    if (query.type && query.type !== 'all') {
      q = q.where('type', query.type);
    }
    if (query.category && query.category !== 'all') {
      q = q.where('category', query.category);
    }
    if (query.cash_account_id && query.cash_account_id !== 'all') {
      q = q.where('cash_account_id', Number(query.cash_account_id));
    }
    if (query.date_from) {
      q = q.where('expense_date', '>=', query.date_from);
    }
    if (query.date_to) {
      q = q.where('expense_date', '<=', query.date_to);
    }
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('expense_name', 'like', term)
          .orWhere('receipt_number', 'like', term)
          .orWhere('note', 'like', term)
          .orWhere('cash_account_name', 'like', term)
          .orWhere('coa_account_name', 'like', term);
      });
    }

    const rows = await q.orderBy('expense_date', 'desc').orderBy('id', 'desc');

    return rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount || 0),
      type: r.type || 'expense'
    }));
  }

  /**
   * Mengambil ringkasan metrik kas operasional kantin
   */
  async getSummary(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('operational_expenses');

    if (!isAll) {
      q = q.where('school_unit_id', Number(schoolUnitId));
    }
    if (query.date_from) {
      q = q.where('expense_date', '>=', query.date_from);
    }
    if (query.date_to) {
      q = q.where('expense_date', '<=', query.date_to);
    }

    const rows = await q.select('id', 'type', 'amount', 'category', 'cash_account_id', 'cash_account_name');

    let totalIncome = 0;
    let totalExpense = 0;
    let countIncome = 0;
    let countExpense = 0;

    const accountMap = {};
    const categoryMap = {};

    rows.forEach(r => {
      const amt = parseFloat(r.amount || 0);
      const isIncome = r.type === 'income';

      if (isIncome) {
        totalIncome += amt;
        countIncome++;
      } else {
        totalExpense += amt;
        countExpense++;
      }

      // Group per cash account
      const accKey = r.cash_account_id ? String(r.cash_account_id) : 'unassigned';
      if (!accountMap[accKey]) {
        accountMap[accKey] = {
          cash_account_id: r.cash_account_id || null,
          cash_account_name: r.cash_account_name || 'Kas Utama / Belum Ditentukan',
          total_income: 0,
          total_expense: 0,
          net_balance: 0
        };
      }
      if (isIncome) {
        accountMap[accKey].total_income += amt;
      } else {
        accountMap[accKey].total_expense += amt;
      }
      accountMap[accKey].net_balance = accountMap[accKey].total_income - accountMap[accKey].total_expense;

      // Group per category
      const catKey = r.category || 'operasional';
      if (!categoryMap[catKey]) {
        categoryMap[catKey] = {
          category: catKey,
          type: r.type || 'expense',
          total_amount: 0,
          count: 0
        };
      }
      categoryMap[catKey].total_amount += amt;
      categoryMap[catKey].count += 1;
    });

    return {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_cashflow: totalIncome - totalExpense,
      count_income: countIncome,
      count_expense: countExpense,
      total_transactions: rows.length,
      by_cash_account: Object.values(accountMap),
      by_category: Object.values(categoryMap)
    };
  }

  /**
   * Mengambil daftar rekening kas/bank yang tersedia untuk Kantin
   */
  async getCashAccounts(schoolUnitId) {
    try {
      const accounts = await masterDataService.listCashAccounts(schoolUnitId, { is_active: true });
      
      // Urutkan akun kas kantin di paling atas
      const sorted = [...accounts].sort((a, b) => {
        const aIsKantin = (a.name || '').toLowerCase().includes('kantin') ? -1 : 1;
        const bIsKantin = (b.name || '').toLowerCase().includes('kantin') ? -1 : 1;
        return aIsKantin - bIsKantin;
      });

      return sorted.map(a => ({
        id: a.id,
        name: a.name,
        account_kind: a.account_kind,
        bank_name: a.bank_name,
        bank_account_number: a.bank_account_number,
        is_canteen_account: (a.name || '').toLowerCase().includes('kantin'),
        display_label: a.bank_account_number
          ? `${a.name} (${a.bank_name || 'Bank'} - ${a.bank_account_number})`
          : `${a.name} (Kas Tunai)`
      }));
    } catch (err) {
      console.warn('[Operational Expenses] Gagal mengambil cash_accounts dari Keuangan:', err.message);
      return [];
    }
  }

  /**
   * Mengambil daftar COA untuk akun kredit pemasukan atau akun debet pengeluaran kantin
   */
  async getCoaAccounts(schoolUnitId, type = 'expense') {
    try {
      const accounts = await masterDataService.listChartOfAccounts(schoolUnitId, false);
      const filtered = accounts.filter(a => a.is_active !== false && a.is_active !== 0);

      // Default COA
      let defaultAcc = null;
      if (type === 'income') {
        defaultAcc = filtered.find(a => a.account_code === '617')
          || filtered.find(a => a.account_code === '616')
          || filtered.find(a => (a.account_name || '').toLowerCase().includes('kantin'))
          || filtered.find(a => a.account_code === '60800')
          || filtered.find(a => a.account_group === 'pendapatan')
          || filtered[0];
      } else {
        defaultAcc = filtered.find(a => a.account_code === '79200')
          || filtered.find(a => a.account_code === '79100')
          || filtered.find(a => (a.account_name || '').toLowerCase().includes('beban') && (a.account_name || '').toLowerCase().includes('kantin'))
          || filtered.find(a => a.account_group === 'biaya')
          || filtered[0];
      }

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
      console.warn('[Operational Expenses] Gagal mengambil COA dari Keuangan:', err.message);
      return { accounts: [], default_coa_id: null, default_coa: null };
    }
  }

  /**
   * Mengambil daftar mutasi rekening koran untuk pencocokan transaksi bank
   */
  async getBankStatements(schoolUnitId, query = {}) {
    try {
      const st = await bankStatementsService.listStatements(schoolUnitId, {
        cash_account_id: query.cash_account_id,
        direction: query.type === 'income' ? 'credit' : (query.type === 'expense' ? 'debit' : undefined),
        is_reconciled: false
      });
      return st || [];
    } catch (err) {
      console.warn('[Operational Expenses] Gagal mengambil bank_statements:', err.message);
      return [];
    }
  }

  /**
   * Membuat nomor bukti kas (BKM atau BKK)
   */
  async generateReceiptNumber(type, expenseDate) {
    const dateObj = expenseDate ? new Date(expenseDate) : new Date();
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = type === 'income' ? 'BKM' : 'BKK';
    const codePattern = `${prefix}/KNT/${year}/${month}/%`;

    const lastRecord = await db('operational_expenses')
      .where('receipt_number', 'like', codePattern)
      .orderBy('id', 'desc')
      .first();

    let seq = 1;
    if (lastRecord && lastRecord.receipt_number) {
      const parts = lastRecord.receipt_number.split('/');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}/KNT/${year}/${month}/${String(seq).padStart(4, '0')}`;
  }

  /**
   * Mencatat transaksi pemasukan atau pengeluaran operasional
   */
  async createExpense(schoolUnitId, payload, userId) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;
    const {
      type = 'expense',
      expense_name,
      amount,
      category = 'operasional',
      expense_date,
      cash_account_id,
      coa_account_id,
      bank_statement_id,
      note = null,
      sync_finance = true
    } = payload;

    const txAmount = parseFloat(amount);
    if (isNaN(txAmount) || txAmount <= 0) {
      const err = new Error('Nominal transaksi harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    if (!expense_name || !expense_name.trim()) {
      const err = new Error('Nama/uraian transaksi wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const txDate = expense_date || new Date().toISOString().slice(0, 10);
    const receiptNumber = await this.generateReceiptNumber(type, txDate);

    // Ambil info nama akun kas
    let cashAccountName = null;
    if (cash_account_id) {
      try {
        const cashAccounts = await masterDataService.listCashAccounts(effectiveUnitId, {});
        const found = cashAccounts.find(a => Number(a.id) === Number(cash_account_id));
        if (found) {
          cashAccountName = found.bank_account_number
            ? `${found.name} (${found.bank_name || 'Bank'} - ${found.bank_account_number})`
            : `${found.name} (Kas Tunai)`;
        }
      } catch (_) {}
    }

    // Ambil info COA
    let coaCode = null;
    let coaName = null;
    if (coa_account_id) {
      try {
        const coas = await masterDataService.listChartOfAccounts(effectiveUnitId, false);
        const foundCoa = coas.find(c => Number(c.id) === Number(coa_account_id));
        if (foundCoa) {
          coaCode = foundCoa.account_code;
          coaName = foundCoa.account_name;
        }
      } catch (_) {}
    }

    // 1. Simpan ke database kantin
    const [id] = await db('operational_expenses').insert({
      school_unit_id: effectiveUnitId,
      type,
      category,
      receipt_number: receiptNumber,
      expense_name: expense_name.trim(),
      amount: txAmount,
      expense_date: txDate,
      cash_account_id: cash_account_id ? Number(cash_account_id) : null,
      cash_account_name: cashAccountName,
      coa_account_id: coa_account_id ? Number(coa_account_id) : null,
      coa_account_code: coaCode,
      coa_account_name: coaName,
      bank_statement_id: bank_statement_id ? Number(bank_statement_id) : null,
      note,
      recorded_by: userId || 1
    });

    // 2. In-process sync ke Modul Keuangan (Pusat Yayasan / Sekolah)
    let financeTxId = null;
    if (sync_finance && cash_account_id) {
      try {
        if (type === 'income') {
          // Sync Penerimaan Kas Lainnya
          const incomeRes = await otherIncomesService.createOtherIncome(effectiveUnitId, {
            amount: txAmount,
            received_at: txDate,
            cash_account_id: Number(cash_account_id),
            bank_statement_id: bank_statement_id ? Number(bank_statement_id) : null,
            override_credit_account_id: coa_account_id ? Number(coa_account_id) : null,
            source_category: 'business_unit',
            payer_name: 'Operasional Kantin',
            notes: `[${receiptNumber}] ${expense_name.trim()}${note ? ' - ' + note : ''}`
          }, userId);
          if (incomeRes && incomeRes.id) {
            financeTxId = incomeRes.id;
          }
        } else {
          // Sync Pengeluaran Kas Keuangan (Beban Operasional Non-RAPBS Kantin)
          const expenseRes = await expensesService.createExpense(effectiveUnitId, {
            expense_name: `[${receiptNumber}] ${expense_name.trim()}`,
            amount: txAmount,
            expense_date: txDate,
            cash_account_id: Number(cash_account_id),
            bank_statement_id: bank_statement_id ? Number(bank_statement_id) : null,
            override_debit_account_id: coa_account_id ? Number(coa_account_id) : null,
            is_outside_budget: true,
            recipient_name: 'Operasional Kantin',
            notes: note || `Biaya Operasional Kantin (${category})`
          }, userId);
          if (expenseRes && expenseRes.id) {
            financeTxId = expenseRes.id;
          }
        }

        if (financeTxId) {
          await db('operational_expenses').where({ id }).update({
            finance_transaction_id: financeTxId,
            updated_at: db.fn.now()
          });
        }
      } catch (syncErr) {
        console.warn('[Operational Expenses] Gagal sinkronisasi in-process ke Modul Keuangan:', syncErr.message);
      }
    }

    return db('operational_expenses').where({ id }).first();
  }

  /**
   * Menghapus transaksi kas operasional kantin
   */
  async deleteExpense(id, schoolUnitId) {
    let q = db('operational_expenses').where('id', id);
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      q = q.where('school_unit_id', Number(schoolUnitId));
    }
    const item = await q.first();
    if (!item) {
      const err = new Error('Data transaksi operasional tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('operational_expenses').where('id', id).del();
    return { deleted: true, id };
  }

  /**
   * Mengambil Laporan Akuntansi & Buku Kas Kantin (Separate Entity Accounting Ledger)
   */
  async getAccountingLedger(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    
    // 1. Ambil seluruh transaksi operasional kantin
    let opQ = db('operational_expenses');
    if (!isAll) {
      opQ = opQ.where('school_unit_id', Number(schoolUnitId));
    }
    if (query.date_from) {
      opQ = opQ.where('expense_date', '>=', query.date_from);
    }
    if (query.date_to) {
      opQ = opQ.where('expense_date', '<=', query.date_to);
    }
    const opRows = await opQ.orderBy('expense_date', 'asc').orderBy('id', 'asc');

    // 2. Ambil ringkasan penjualan POS & Hak Kantin
    let salesQ = db('sales_transactions')
      .leftJoin('sales_transaction_items', 'sales_transactions.id', 'sales_transaction_items.sales_transaction_id');
      
    if (!isAll) {
      salesQ = salesQ.where('sales_transactions.school_unit_id', Number(schoolUnitId));
    }
    if (query.date_from) {
      salesQ = salesQ.where('sales_transactions.transaction_at', '>=', `${query.date_from} 00:00:00`);
    }
    if (query.date_to) {
      salesQ = salesQ.where('sales_transactions.transaction_at', '<=', `${query.date_to} 23:59:59`);
    }

    const salesItemRows = await salesQ.select(
      'sales_transactions.id as tx_id',
      'sales_transactions.payment_method',
      'sales_transaction_items.subtotal_price',
      'sales_transaction_items.subtotal_cost'
    );

    let totalPosGrossSales = 0;
    let totalVendorCost = 0;
    let totalNonWalletCashSales = 0;

    salesItemRows.forEach(item => {
      const price = parseFloat(item.subtotal_price || 0);
      const cost = parseFloat(item.subtotal_cost || 0);
      totalPosGrossSales += price;
      totalVendorCost += cost;
      if (item.payment_method !== 'wallet') {
        totalNonWalletCashSales += price;
      }
    });

    const totalCanteenPosShare = Math.max(0, totalPosGrossSales - totalVendorCost);

    // 3. Klasifikasi Beban & Pendapatan Operasional
    let otherIncomesTotal = 0;
    let expensesByCategory = {};
    let totalExpenses = 0;

    opRows.forEach(r => {
      const amt = parseFloat(r.amount || 0);
      if (r.type === 'income') {
        otherIncomesTotal += amt;
      } else {
        totalExpenses += amt;
        const cat = r.category || 'operasional';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
      }
    });

    // 4. Susun Laporan Laba Rugi Operasional Kantin (Income Statement)
    const totalOperatingRevenue = totalCanteenPosShare + otherIncomesTotal;
    const netOperatingIncome = totalOperatingRevenue - totalExpenses;

    // 5. Susun Buku Kas (General Ledger Lines)
    let runningBalance = 0;
    const ledgerLines = opRows.map(r => {
      const amt = parseFloat(r.amount || 0);
      const isIncome = r.type === 'income';
      const debit = isIncome ? amt : 0;
      const credit = !isIncome ? amt : 0;
      runningBalance += debit - credit;

      return {
        id: r.id,
        date: r.expense_date,
        receipt_number: r.receipt_number || '-',
        type: r.type,
        category: r.category,
        description: r.expense_name,
        account_name: r.cash_account_name || 'Kas Kantin',
        coa_code: r.coa_account_code || (isIncome ? '617' : '79200'),
        coa_name: r.coa_account_name || (isIncome ? 'Pendapatan Unit Usaha Kantin' : 'Beban Operasional Kantin'),
        debit,
        credit,
        balance: runningBalance,
        note: r.note
      };
    });

    return {
      entity_info: {
        entity_name: 'Unit Usaha Mandiri Kantin Smart Aldepos',
        accounting_policy: 'Pencatatan Berbasis Akuntansi Entitas Terpisah (Separate Entity SBU) yang terkonsolidasi realtime ke Buku Besar Keuangan Pusat Yayasan Aldepos.',
        reporting_period: {
          from: query.date_from || 'Semua Periode',
          to: query.date_to || 'Semua Periode'
        }
      },
      income_statement: {
        revenues: [
          {
            name: 'Pendapatan Bagi Hasil Penjualan POS (Hak Kantin)',
            code: 'REV-POS-01',
            amount: totalCanteenPosShare,
            notes: 'Hasil margin & bagi hasil dari seluruh penjualan kasir POS santri'
          },
          {
            name: 'Pendapatan Operasional Lainnya',
            code: 'REV-OPR-02',
            amount: otherIncomesTotal,
            notes: 'Pemasukan sewa stand, insentif mitra, penjualan kardus/minyak, pesanan khusus'
          }
        ],
        total_revenue: totalOperatingRevenue,
        expenses: Object.entries(expensesByCategory).map(([cat, amt]) => ({
          name: `Beban ${cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}`,
          code: `EXP-${cat.toUpperCase()}`,
          category: cat,
          amount: amt
        })),
        total_expense: totalExpenses,
        net_operating_income: netOperatingIncome
      },
      ledger_summary: {
        total_debit: otherIncomesTotal,
        total_credit: totalExpenses,
        net_cashflow: runningBalance,
        total_lines: ledgerLines.length
      },
      ledger_lines: ledgerLines
    };
  }
}

module.exports = new OperationalExpensesService();
