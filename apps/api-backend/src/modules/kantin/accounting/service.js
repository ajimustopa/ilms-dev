/**
 * Accounting Cycle & Financial Statements Service for SBU Kantin
 * Modul Kantin - Core Aldepos
 */
const db = require('../../../config/db/kantin');
const masterDataService = require('../../keuangan/master-data/service');

class CanteenAccountingService {
  /**
   * Menghasilkan nomor bukti jurnal otomatis sesuai tipe jurnal
   */
  async generateJournalNumber(entryType, entryDate) {
    const d = entryDate ? new Date(entryDate) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');

    let prefix = 'JU/KNT';
    if (entryType === 'adjustment') prefix = 'JP/KNT';
    else if (entryType === 'closing') prefix = 'JPEN/KNT';
    else if (entryType === 'reversing') prefix = 'JPB/KNT';

    const pattern = `${prefix}/${year}/${month}/%`;
    const last = await db('canteen_journal_entries')
      .where('entry_number', 'like', pattern)
      .orderBy('id', 'desc')
      .first();

    let seq = 1;
    if (last && last.entry_number) {
      const parts = last.entry_number.split('/');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}/${year}/${month}/${String(seq).padStart(4, '0')}`;
  }

  /**
   * Membuat entri jurnal akuntansi manual (Jurnal Umum / Penyesuaian / Penutup / Pembalik)
   */
  async createJournalEntry(schoolUnitId, payload, userId) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;
    const {
      entry_type = 'general',
      entry_date,
      reference_number = null,
      description,
      lines = []
    } = payload;

    if (!description || !description.trim()) {
      const err = new Error('Deskripsi/uraian jurnal wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (!Array.isArray(lines) || lines.length < 2) {
      const err = new Error('Jurnal harus memiliki minimal 2 baris (Debet dan Kredit)');
      err.statusCode = 422;
      throw err;
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const validatedLines = lines.map((line, idx) => {
      const debit = parseFloat(line.debit || 0);
      const credit = parseFloat(line.credit || 0);

      if (debit < 0 || credit < 0) {
        const err = new Error(`Baris ke-${idx + 1}: Nilai debet/kredit tidak boleh negatif`);
        err.statusCode = 422;
        throw err;
      }

      if (debit === 0 && credit === 0) {
        const err = new Error(`Baris ke-${idx + 1}: Salah satu dari debet atau kredit harus lebih dari 0`);
        err.statusCode = 422;
        throw err;
      }

      if (!line.coa_account_code || !line.coa_account_name) {
        const err = new Error(`Baris ke-${idx + 1}: Kode akun dan nama akun COA wajib diisi`);
        err.statusCode = 422;
        throw err;
      }

      totalDebit += debit;
      totalCredit += credit;

      return {
        coa_account_id: line.coa_account_id ? Number(line.coa_account_id) : null,
        coa_account_code: String(line.coa_account_code).trim(),
        coa_account_name: String(line.coa_account_name).trim(),
        debit,
        credit,
        memo: line.memo || null
      };
    });

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      const err = new Error(`Jurnal tidak seimbang (Unbalanced). Total Debet: Rp ${totalDebit.toLocaleString('id-ID')} vs Total Kredit: Rp ${totalCredit.toLocaleString('id-ID')}`);
      err.statusCode = 422;
      throw err;
    }

    const txDate = entry_date || new Date().toISOString().slice(0, 10);
    const entryNumber = await this.generateJournalNumber(entry_type, txDate);

    return db.transaction(async (trx) => {
      const [entryId] = await trx('canteen_journal_entries').insert({
        school_unit_id: effectiveUnitId,
        entry_number: entryNumber,
        entry_date: txDate,
        entry_type,
        reference_number,
        description: description.trim(),
        total_debit: totalDebit,
        total_credit: totalCredit,
        is_balanced: true,
        status: 'posted',
        recorded_by: userId || 1
      });

      const lineInserts = validatedLines.map(l => ({
        canteen_journal_entry_id: entryId,
        coa_account_id: l.coa_account_id,
        coa_account_code: l.coa_account_code,
        coa_account_name: l.coa_account_name,
        debit: l.debit,
        credit: l.credit,
        memo: l.memo
      }));

      await trx('canteen_journal_lines').insert(lineInserts);

      const created = await trx('canteen_journal_entries').where({ id: entryId }).first();
      const linesData = await trx('canteen_journal_lines').where({ canteen_journal_entry_id: entryId });

      return {
        ...created,
        total_debit: parseFloat(created.total_debit || 0),
        total_credit: parseFloat(created.total_credit || 0),
        lines: linesData.map(l => ({
          ...l,
          debit: parseFloat(l.debit || 0),
          credit: parseFloat(l.credit || 0)
        }))
      };
    });
  }

  /**
   * Mengambil daftar jurnal akuntansi dengan filter
   */
  async listJournalEntries(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('canteen_journal_entries');

    if (!isAll) {
      q = q.where('school_unit_id', Number(schoolUnitId));
    }

    if (query.entry_type && query.entry_type !== 'all') {
      q = q.where('entry_type', query.entry_type);
    }
    if (query.date_from) {
      q = q.where('entry_date', '>=', query.date_from);
    }
    if (query.date_to) {
      q = q.where('entry_date', '<=', query.date_to);
    }
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('entry_number', 'like', term)
          .orWhere('description', 'like', term)
          .orWhere('reference_number', 'like', term);
      });
    }

    const entries = await q.orderBy('entry_date', 'desc').orderBy('id', 'desc');
    const entryIds = entries.map(e => e.id);

    let allLines = [];
    if (entryIds.length > 0) {
      allLines = await db('canteen_journal_lines').whereIn('canteen_journal_entry_id', entryIds);
    }

    const linesByEntry = {};
    allLines.forEach(l => {
      if (!linesByEntry[l.canteen_journal_entry_id]) {
        linesByEntry[l.canteen_journal_entry_id] = [];
      }
      linesByEntry[l.canteen_journal_entry_id].push({
        ...l,
        debit: parseFloat(l.debit || 0),
        credit: parseFloat(l.credit || 0)
      });
    });

    return entries.map(e => ({
      ...e,
      total_debit: parseFloat(e.total_debit || 0),
      total_credit: parseFloat(e.total_credit || 0),
      lines: linesByEntry[e.id] || []
    }));
  }

  /**
   * Menghapus / Membatalkan entri jurnal
   */
  async deleteJournalEntry(id, schoolUnitId) {
    let q = db('canteen_journal_entries').where('id', id);
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      q = q.where('school_unit_id', Number(schoolUnitId));
    }
    const item = await q.first();
    if (!item) {
      const err = new Error('Entri jurnal tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('canteen_journal_lines').where('canteen_journal_entry_id', id).del();
    await db('canteen_journal_entries').where('id', id).del();

    return { deleted: true, id, entry_number: item.entry_number };
  }

  /**
   * Mengambil Buku Besar Lengkap (General Ledger per Akun COA)
   */
  async getGeneralLedger(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';

    // 1. Ambil seluruh lines dari jurnal akuntansi
    let jLinesQ = db('canteen_journal_lines')
      .join('canteen_journal_entries', 'canteen_journal_lines.canteen_journal_entry_id', 'canteen_journal_entries.id');

    if (!isAll) {
      jLinesQ = jLinesQ.where('canteen_journal_entries.school_unit_id', Number(schoolUnitId));
    }
    if (query.date_from) {
      jLinesQ = jLinesQ.where('canteen_journal_entries.entry_date', '>=', query.date_from);
    }
    if (query.date_to) {
      jLinesQ = jLinesQ.where('canteen_journal_entries.entry_date', '<=', query.date_to);
    }

    const journalRows = await jLinesQ.select(
      'canteen_journal_lines.id as line_id',
      'canteen_journal_entries.entry_number as ref_no',
      'canteen_journal_entries.entry_date as date',
      'canteen_journal_entries.entry_type',
      'canteen_journal_entries.description as entry_desc',
      'canteen_journal_lines.coa_account_id',
      'canteen_journal_lines.coa_account_code',
      'canteen_journal_lines.coa_account_name',
      'canteen_journal_lines.debit',
      'canteen_journal_lines.credit',
      'canteen_journal_lines.memo'
    );

    // 2. Ambil dari transaksi kas operasional (BKM & BKK)
    let opQ = db('operational_expenses');
    if (!isAll) opQ = opQ.where('school_unit_id', Number(schoolUnitId));
    if (query.date_from) opQ = opQ.where('expense_date', '>=', query.date_from);
    if (query.date_to) opQ = opQ.where('expense_date', '<=', query.date_to);
    const opRows = await opQ;

    // Kumpulkan semua mutasi ke ledger lines
    const allMutations = [];

    // Mutasi dari Jurnal
    journalRows.forEach(r => {
      allMutations.push({
        date: r.date,
        ref_no: r.ref_no,
        type: `Jurnal ${r.entry_type}`,
        description: r.memo ? `${r.entry_desc} (${r.memo})` : r.entry_desc,
        account_code: r.coa_account_code,
        account_name: r.coa_account_name,
        debit: parseFloat(r.debit || 0),
        credit: parseFloat(r.credit || 0)
      });
    });

    // Mutasi dari Kas Operasional BKM/BKK (Double entry)
    opRows.forEach(op => {
      const amt = parseFloat(op.amount || 0);
      const isInc = op.type === 'income';

      // Sisi Kas
      const cashCode = '11101';
      const cashName = op.cash_account_name || 'Kas Tunai Kantin';
      allMutations.push({
        date: op.expense_date,
        ref_no: op.receipt_number || `OP-${op.id}`,
        type: isInc ? 'Bukti Kas Masuk (BKM)' : 'Bukti Kas Keluar (BKK)',
        description: op.expense_name,
        account_code: cashCode,
        account_name: cashName,
        debit: isInc ? amt : 0,
        credit: !isInc ? amt : 0
      });

      // Sisi Akun Lawan COA
      const contraCode = op.coa_account_code || (isInc ? '617' : '79200');
      const contraName = op.coa_account_name || (isInc ? 'Pendapatan Unit Usaha Kantin' : 'Beban Operasional Kantin');
      allMutations.push({
        date: op.expense_date,
        ref_no: op.receipt_number || `OP-${op.id}`,
        type: isInc ? 'Pendapatan Operasional' : 'Beban Operasional',
        description: op.expense_name,
        account_code: contraCode,
        account_name: contraName,
        debit: !isInc ? amt : 0,
        credit: isInc ? amt : 0
      });
    });

    // Urutkan mutasi berdasarkan tanggal
    allMutations.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Kelompokkan per Akun COA
    const ledgerByAccount = {};
    allMutations.forEach(m => {
      const code = m.account_code || '99999';
      if (!ledgerByAccount[code]) {
        // Tentukan normal balance (1xx, 5xx, 7xx = debit; 2xx, 3xx, 4xx, 6xx = credit)
        const isDebitNormal = code.startsWith('1') || code.startsWith('5') || code.startsWith('7');
        ledgerByAccount[code] = {
          account_code: code,
          account_name: m.account_name || 'Akun Operasional',
          normal_balance: isDebitNormal ? 'debit' : 'credit',
          opening_balance: 0,
          total_debit: 0,
          total_credit: 0,
          closing_balance: 0,
          lines: []
        };
      }

      const acc = ledgerByAccount[code];
      acc.total_debit += m.debit;
      acc.total_credit += m.credit;

      const delta = acc.normal_balance === 'debit' ? (m.debit - m.credit) : (m.credit - m.debit);
      const currentBal = (acc.lines.length > 0 ? acc.lines[acc.lines.length - 1].balance : acc.opening_balance) + delta;

      acc.lines.push({
        ...m,
        balance: currentBal
      });
      acc.closing_balance = currentBal;
    });

    return {
      period: {
        from: query.date_from || 'Semua',
        to: query.date_to || 'Semua'
      },
      accounts: Object.values(ledgerByAccount).sort((a, b) => a.account_code.localeCompare(b.account_code))
    };
  }

  /**
   * Mengambil Neraca Lajur 10 Kolom (10-Column Accounting Worksheet)
   */
  async getWorksheet(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';

    // 1. Ambil ringkasan jurnal penyesuaian
    let adjQ = db('canteen_journal_lines')
      .join('canteen_journal_entries', 'canteen_journal_lines.canteen_journal_entry_id', 'canteen_journal_entries.id')
      .where('canteen_journal_entries.entry_type', 'adjustment');

    if (!isAll) adjQ = adjQ.where('canteen_journal_entries.school_unit_id', Number(schoolUnitId));
    if (query.date_from) adjQ = adjQ.where('canteen_journal_entries.entry_date', '>=', query.date_from);
    if (query.date_to) adjQ = adjQ.where('canteen_journal_entries.entry_date', '<=', query.date_to);

    const adjRows = await adjQ.select(
      'canteen_journal_lines.coa_account_code',
      'canteen_journal_lines.coa_account_name',
      'canteen_journal_lines.debit',
      'canteen_journal_lines.credit'
    );

    // 2. Ambil seluruh buku besar
    const glData = await this.getGeneralLedger(schoolUnitId, query);

    const adjustmentMap = {};
    adjRows.forEach(a => {
      const code = a.coa_account_code;
      if (!adjustmentMap[code]) {
        adjustmentMap[code] = { debit: 0, credit: 0 };
      }
      adjustmentMap[code].debit += parseFloat(a.debit || 0);
      adjustmentMap[code].credit += parseFloat(a.credit || 0);
    });

    // Susun baris 10 kolom
    let totTrialDeb = 0, totTrialCred = 0;
    let totAdjDeb = 0, totAdjCred = 0;
    let totAdjTrialDeb = 0, totAdjTrialCred = 0;
    let totIncDeb = 0, totIncCred = 0;
    let totBalDeb = 0, totBalCred = 0;

    const rows = glData.accounts.map(acc => {
      const isDebitNormal = acc.normal_balance === 'debit';
      const adj = adjustmentMap[acc.account_code] || { debit: 0, credit: 0 };

      // Kolom 1-2: Neraca Saldo Sebelum Penyesuaian
      // Pisahkan efek penyesuaian dari total buku besar
      const trialDebit = isDebitNormal ? Math.max(0, acc.total_debit - adj.debit) : 0;
      const trialCredit = !isDebitNormal ? Math.max(0, acc.total_credit - adj.credit) : 0;

      // Kolom 3-4: Penyesuaian
      const adjDebit = adj.debit;
      const adjCredit = adj.credit;

      // Kolom 5-6: Neraca Saldo Disesuaikan (NSD)
      let adjTrialDebit = 0;
      let adjTrialCredit = 0;
      if (isDebitNormal) {
        const net = trialDebit + adjDebit - adjCredit;
        if (net >= 0) adjTrialDebit = net;
        else adjTrialCredit = Math.abs(net);
      } else {
        const net = trialCredit + adjCredit - adjDebit;
        if (net >= 0) adjTrialCredit = net;
        else adjTrialDebit = Math.abs(net);
      }

      // Klasifikasi akun: Laba Rugi (Pendapatan/Beban: 4xx, 5xx, 6xx, 7xx) vs Neraca (Harta/Utang/Modal: 1xx, 2xx, 3xx)
      const code = acc.account_code;
      const isIncomeStatement = code.startsWith('4') || code.startsWith('5') || code.startsWith('6') || code.startsWith('7');

      // Kolom 7-8: Laba Rugi
      const incDebit = isIncomeStatement ? adjTrialDebit : 0;
      const incCredit = isIncomeStatement ? adjTrialCredit : 0;

      // Kolom 9-10: Neraca
      const balDebit = !isIncomeStatement ? adjTrialDebit : 0;
      const balCredit = !isIncomeStatement ? adjTrialCredit : 0;

      totTrialDeb += trialDebit;
      totTrialCred += trialCredit;
      totAdjDeb += adjDebit;
      totAdjCred += adjCredit;
      totAdjTrialDeb += adjTrialDebit;
      totAdjTrialCred += adjTrialCredit;
      totIncDeb += incDebit;
      totIncCred += incCredit;
      totBalDeb += balDebit;
      totBalCred += balCredit;

      return {
        account_code: acc.account_code,
        account_name: acc.account_name,
        trial_balance: { debit: trialDebit, credit: trialCredit },
        adjustments: { debit: adjDebit, credit: adjCredit },
        adjusted_trial_balance: { debit: adjTrialDebit, credit: adjTrialCredit },
        income_statement: { debit: incDebit, credit: incCredit },
        balance_sheet: { debit: balDebit, credit: balCredit }
      };
    });

    const netProfit = totIncCred - totIncDeb; // Kredit (Pendapatan) - Debet (Beban)

    return {
      period: glData.period,
      rows,
      totals: {
        trial_balance: { debit: totTrialDeb, credit: totTrialCred },
        adjustments: { debit: totAdjDeb, credit: totAdjCred },
        adjusted_trial_balance: { debit: totAdjTrialDeb, credit: totAdjTrialCred },
        income_statement: { debit: totIncDeb, credit: totIncCred },
        balance_sheet: { debit: totBalDeb, credit: totBalCred }
      },
      net_profit: netProfit,
      is_balanced: Math.abs((totBalDeb - totBalCred) - netProfit) < 0.01
    };
  }

  /**
   * Mengambil Paket Laporan Keuangan Lengkap (Laba Rugi, Perubahan Modal, Arus Kas)
   */
  async getFinancialStatements(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';

    // 1. Ambil Penjualan POS Kasir
    let salesQ = db('sales_transactions')
      .leftJoin('sales_transaction_items', 'sales_transactions.id', 'sales_transaction_items.sales_transaction_id');

    if (!isAll) salesQ = salesQ.where('sales_transactions.school_unit_id', Number(schoolUnitId));
    if (query.date_from) salesQ = salesQ.where('sales_transactions.transaction_at', '>=', `${query.date_from} 00:00:00`);
    if (query.date_to) salesQ = salesQ.where('sales_transactions.transaction_at', '<=', `${query.date_to} 23:59:59`);

    const salesRows = await salesQ.select(
      'sales_transaction_items.subtotal_price',
      'sales_transaction_items.subtotal_cost',
      'sales_transactions.payment_method'
    );

    let totalPosGross = 0;
    let totalVendorCost = 0;
    let cashPosSales = 0;
    salesRows.forEach(r => {
      const p = parseFloat(r.subtotal_price || 0);
      const c = parseFloat(r.subtotal_cost || 0);
      totalPosGross += p;
      totalVendorCost += c;
      if (r.payment_method !== 'wallet') cashPosSales += p;
    });
    const canteenPosMargin = Math.max(0, totalPosGross - totalVendorCost);

    // 2. Ambil Transaksi Operasional Kas Masuk & Keluar
    let opQ = db('operational_expenses');
    if (!isAll) opQ = opQ.where('school_unit_id', Number(schoolUnitId));
    if (query.date_from) opQ = opQ.where('expense_date', '>=', query.date_from);
    if (query.date_to) opQ = opQ.where('expense_date', '<=', query.date_to);
    const opRows = await opQ;

    let otherIncomeTotal = 0;
    let expenseTotal = 0;
    const expenseBreakdown = {};

    opRows.forEach(r => {
      const amt = parseFloat(r.amount || 0);
      if (r.type === 'income') {
        otherIncomeTotal += amt;
      } else {
        expenseTotal += amt;
        const cat = r.category || 'operasional';
        expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + amt;
      }
    });

    // 3. Susun LAPORAN LABA RUGI (Income Statement)
    const totalRevenue = canteenPosMargin + otherIncomeTotal;
    const netIncome = totalRevenue - expenseTotal;

    const incomeStatement = {
      revenues: [
        { name: 'Pendapatan Bagi Hasil Penjualan Kasir POS', amount: canteenPosMargin, note: 'Margin keuntungan kantin dari transaksi santri' },
        { name: 'Pendapatan Sewa Stand & Operasional Non-POS', amount: otherIncomeTotal, note: 'Sewa lapak, insentif vendor, penjualan limbah' }
      ],
      total_revenue: totalRevenue,
      expenses: Object.entries(expenseBreakdown).map(([cat, amt]) => ({
        name: `Beban ${cat.replace('_', ' ').toUpperCase()}`,
        amount: amt
      })),
      total_expense: expenseTotal,
      net_operating_income: netIncome
    };

    // 4. Susun LAPORAN PERUBAHAN MODAL (Changes in Equity)
    const openingCapital = 5000000; // Modal Awal SBU
    const additionalInvestment = 0;
    const dividendPayout = 0; // Setoran bagi hasil ke yayasan
    const endingCapital = openingCapital + additionalInvestment + netIncome - dividendPayout;

    const statementOfEquity = {
      opening_capital: openingCapital,
      additional_investment: additionalInvestment,
      net_income: netIncome,
      drawings_or_dividends: dividendPayout,
      ending_capital: endingCapital
    };

    // 5. Susun LAPORAN ARUS KAS (Statement of Cash Flows)
    const cashInflowsOperating = cashPosSales + otherIncomeTotal;
    const cashOutflowsOperating = expenseTotal;
    const netCashFlowOperating = cashInflowsOperating - cashOutflowsOperating;

    const cashFlowStatement = {
      operating_activities: {
        inflows: [
          { name: 'Penerimaan Penjualan Tunai POS', amount: cashPosSales },
          { name: 'Penerimaan Pemasukan Operasional (BKM)', amount: otherIncomeTotal }
        ],
        outflows: [
          { name: 'Pengeluaran Beban Operasional (BKK)', amount: expenseTotal }
        ],
        net_cash: netCashFlowOperating
      },
      investing_activities: {
        inflows: [],
        outflows: [],
        net_cash: 0
      },
      financing_activities: {
        inflows: [],
        outflows: [],
        net_cash: 0
      },
      net_increase_in_cash: netCashFlowOperating,
      opening_cash_balance: openingCapital,
      closing_cash_balance: openingCapital + netCashFlowOperating
    };

    return {
      period: {
        from: query.date_from || 'Semua Periode',
        to: query.date_to || 'Semua Periode'
      },
      income_statement: incomeStatement,
      statement_of_equity: statementOfEquity,
      cash_flow_statement: cashFlowStatement
    };
  }

  /**
   * Mengambil Laporan Analisis Rasio & Kinerja Keuangan SBU Kantin
   */
  async getFinancialRatios(schoolUnitId, query = {}) {
    const fin = await this.getFinancialStatements(schoolUnitId, query);
    const rev = fin.income_statement.total_revenue || 0;
    const exp = fin.income_statement.total_expense || 0;
    const net = fin.income_statement.net_operating_income || 0;
    const cap = fin.statement_of_equity.ending_capital || 1;

    // Rasio Finansial
    const netProfitMargin = rev > 0 ? (net / rev) * 100 : 0;
    const expenseRatio = rev > 0 ? (exp / rev) * 100 : 0;
    const returnOnEquity = cap > 0 ? (net / cap) * 100 : 0;
    const breakEvenSales = exp; // Nilai omzet minimum agar tidak rugi

    let healthStatus = 'Sehat (Profitable)';
    let healthColor = 'emerald';
    if (net < 0) {
      healthStatus = 'Defisit (Perlu Efisiensi Beban)';
      healthColor = 'rose';
    } else if (netProfitMargin < 15) {
      healthStatus = 'Cukup Sehat (Margin Tipis)';
      healthColor = 'amber';
    }

    return {
      period: fin.period,
      metrics: {
        total_revenue: rev,
        total_expense: exp,
        net_income: net,
        net_profit_margin_percent: Math.round(netProfitMargin * 10) / 10,
        expense_ratio_percent: Math.round(expenseRatio * 10) / 10,
        return_on_equity_percent: Math.round(returnOnEquity * 10) / 10,
        break_even_target: breakEvenSales,
        health_status: healthStatus,
        health_color: healthColor
      },
      recommendations: [
        netProfitMargin >= 25 ? 'Margin keuntungan sangat baik (>25%). Pertahankan efisiensi pembelian bahan pelengkap.' : 'Tingkatkan margin dengan menegosiasikan harga grosir bahan kemasan dan es batu.',
        expenseRatio > 70 ? 'Rasio beban cukup tinggi terhadap omzet. Audit penggunaan listrik dan limbah kantin.' : 'Rasio beban operasional terkendali dengan baik.',
        'Lakukan pencatatan Jurnal Penyesuaian di akhir bulan untuk menghitung penyusutan etalase dan kulkas kantin.'
      ]
    };
  }
}

module.exports = new CanteenAccountingService();
