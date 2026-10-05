/**
 * Canteen Fee Payments Service
 * Sesuai api-contract-kantin.md Modul 7, erd-kantin.md §2.14, & aturan in-process modul Keuangan
 */
const db = require('../../../config/db/kantin');
const otherIncomesService = require('../../keuangan/other-incomes/service');
const masterDataService = require('../../keuangan/master-data/service');
const keuanganInternalService = require('../../keuangan/internal/service');
const canteenAccountingService = require('../accounting/service');

class CanteenFeePaymentsService {
  /**
   * Mengambil konfigurasi default akuntansi setor hak kantin dan opsi dropdown
   */
  async getAccountingConfig(schoolUnitId) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;

    let settings = await db('canteen_fee_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();

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
    const cashCoas = formattedCoas.filter(c =>
      c.account_code === '10101' || c.account_code === '101' || (c.account_name || '').toLowerCase().includes('kas')
    );
    const bankCoas = formattedCoas.filter(c =>
      c.account_code === '10102' || c.account_code === '102' || (c.account_name || '').toLowerCase().includes('bank')
    );
    const receivableCoas = formattedCoas.filter(c =>
      c.account_code === '10200' || c.account_code === '10201' || c.account_code === '102' ||
      (c.account_name || '').toLowerCase().includes('piutang') || (c.account_name || '').toLowerCase().includes('dompet')
    );
    const incomeCoas = formattedCoas.filter(c =>
      c.account_code === '40400' || c.account_code === '40500' || c.account_code === '40100' ||
      (c.account_name || '').toLowerCase().includes('bagi hasil') || (c.account_name || '').toLowerCase().includes('kantin') || (c.account_name || '').toLowerCase().includes('pendapatan')
    );

    const defaultTunaiAcc = formattedCashAccounts.find(a => a.is_canteen && !a.bank_account_number) || formattedCashAccounts.find(a => !a.bank_account_number) || formattedCashAccounts[0] || null;
    const defaultBankAcc = formattedCashAccounts.find(a => a.is_canteen && a.bank_account_number) || formattedCashAccounts.find(a => a.bank_account_number) || formattedCashAccounts[0] || null;

    const defaultDebitCoa = formattedCoas.find(c => c.account_code === '10101') || cashCoas[0] || formattedCoas[0] || null;
    const defaultCreditCoa = formattedCoas.find(c => c.account_code === '10200') || receivableCoas[0] || formattedCoas.find(c => c.account_code === '10301') || formattedCoas[0] || null;

    const resolvedConfig = {
      school_unit_id: effectiveUnitId,
      auto_journal_enabled: settings?.auto_journal_enabled !== undefined ? !!settings.auto_journal_enabled : true,
      default_fund_source_name: settings?.default_fund_source_name || 'Kantin Sekolah',
      default_cash_account_id: settings?.default_cash_account_id || defaultTunaiAcc?.id || null,
      default_bank_account_id: settings?.default_bank_account_id || defaultBankAcc?.id || null,
      debit_coa_id: settings?.debit_coa_id || defaultDebitCoa?.id || null,
      debit_coa_code: defaultDebitCoa?.account_code || '10101',
      debit_coa_name: defaultDebitCoa?.account_name || 'Kas Operasional / Kas Tunai',
      credit_coa_id: settings?.credit_coa_id || defaultCreditCoa?.id || null,
      credit_coa_code: defaultCreditCoa?.account_code || '10200',
      credit_coa_name: defaultCreditCoa?.account_name || 'Piutang Penjualan Dompet Siswa',
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
   * Menyimpan / memperbarui konfigurasi default akuntansi setor hak kantin
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

    const existing = await db('canteen_fee_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();
    if (existing) {
      await db('canteen_fee_accounting_settings').where({ school_unit_id: effectiveUnitId }).update(record);
    } else {
      await db('canteen_fee_accounting_settings').insert({
        ...record,
        created_at: db.fn.now()
      });
    }

    return this.getAccountingConfig(effectiveUnitId);
  }

  async listPayments(schoolUnitId, query = {}) {
    let q = db('canteen_fee_payments');
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      q = q.where('school_unit_id', schoolUnitId);
    }

    if (query.period_start) {
      q = q.where('period_start', '>=', query.period_start);
    }
    if (query.period_end) {
      q = q.where('period_end', '<=', query.period_end);
    }

    return q.orderBy('paid_at', 'desc').orderBy('id', 'desc');
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
      console.warn('[Canteen Fee] Gagal mengambil cash_accounts dari Keuangan:', err.message);
      return [];
    }
  }

  async getCoaAccounts(schoolUnitId) {
    try {
      const accounts = await masterDataService.listChartOfAccounts(schoolUnitId, false);
      const filtered = accounts.filter(a => a.is_active !== false && a.is_active !== 0);

      // Cari default COA yang paling relevan (Pendapatan Unit Usaha Kantin / Bagi Hasil / Pendapatan Usaha)
      const defaultAcc = filtered.find(a => {
        const name = (a.account_name || '').toLowerCase();
        return name.includes('kantin') || name.includes('bagi hasil') || name.includes('unit usaha');
      }) || filtered.find(a => a.account_code === '60800' || a.account_code === '603' || a.account_code === '404')
         || filtered.find(a => a.account_group === 'pendapatan')
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
      console.warn('[Canteen Fee] Gagal mengambil COA dari Keuangan:', err.message);
      return { accounts: [], default_coa_id: null, default_coa: null };
    }
  }

  async getBankStatements(schoolUnitId, query = {}) {
    try {
      const statements = await keuanganInternalService.listBankStatements(schoolUnitId, {
        dc_type: 'CR',
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
      console.warn('[Canteen Fee] Gagal memuat mutasi rekening koran:', err.message);
      return [];
    }
  }

  async getUndisbursedSales(schoolUnitId, query = {}) {
    let q = db('sales_transactions')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id')
      .where('sales_transactions.payment_method', 'wallet')
      .whereNull('sales_transactions.canteen_fee_payment_id');

    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      q = q.where('sales_transactions.school_unit_id', schoolUnitId);
    }

    if (query.date_from) {
      q = q.where('sales_transactions.transaction_at', '>=', query.date_from);
    }
    if (query.date_to) {
      const dTo = query.date_to.length === 10 ? `${query.date_to} 23:59:59` : query.date_to;
      q = q.where('sales_transactions.transaction_at', '<=', dTo);
    }

    const rows = await q.select(
      'sales_transactions.id',
      'sales_transactions.school_unit_id',
      'sales_transactions.buyer_type',
      'sales_transactions.buyer_name',
      'sales_transactions.payment_method',
      'sales_transactions.discount_amount',
      'sales_transactions.total_amount',
      'sales_transactions.cashier_name',
      'sales_transactions.transaction_at',
      'sales_transactions.created_at',
      'canteen_students.student_id',
      'canteen_students.cached_student_name as student_name',
      'canteen_students.cached_class_group_name as class_group_name'
    ).orderBy('sales_transactions.transaction_at', 'asc');

    const totalAmount = rows.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);

    return {
      transactions: rows.map(r => ({
        ...r,
        displayName: r.student_name || r.buyer_name || `Pelanggan #${r.id}`,
        total_amount: parseFloat(r.total_amount) || 0
      })),
      total_count: rows.length,
      total_amount: totalAmount
    };
  }

  async createPayment(schoolUnitId, payload, userId) {
    const effectiveUnitId = (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') ? Number(schoolUnitId) : 1;

    const {
      amount,
      paid_at,
      cash_account_id,
      coa_account_id,
      bank_statement_id,
      sales_transaction_ids,
      fund_source_name,
      notes
    } = payload;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      const err = new Error('Nominal penyetoran hak kantin harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const transferDate = paid_at || new Date().toISOString().slice(0, 10);

    // Ambil setting akuntansi
    const configRes = await this.getAccountingConfig(effectiveUnitId);
    const conf = configRes?.settings || {};

    // 1. Tentukan rekening kas/bank penerima
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

    const debitCoaId = coa_account_id ? Number(coa_account_id) : (conf.debit_coa_id || 1);
    const creditCoaId = conf.credit_coa_id || 2;

    const debitCoa = allCoas.find(c => String(c.id) === String(debitCoaId));
    const creditCoa = allCoas.find(c => String(c.id) === String(creditCoaId));

    const debitCoaCode = debitCoa?.account_code || conf.debit_coa_code || '10101';
    const debitCoaName = debitCoa?.account_name || conf.debit_coa_name || 'Kas Operasional / Kas Tunai';
    const creditCoaCode = creditCoa?.account_code || conf.credit_coa_code || '10200';
    const creditCoaName = creditCoa?.account_name || conf.credit_coa_name || 'Piutang Penjualan Dompet Siswa';

    const finalFundSourceName = fund_source_name?.trim() || conf.default_fund_source_name || 'Kantin Sekolah';
    const finalBankStatementId = bank_statement_id ? Number(bank_statement_id) : (conf.default_bank_statement_id ? Number(conf.default_bank_statement_id) : null);

    // Tentukan periode dari data transaksi atau tanggal penyerahan
    let periodStart = payload.period_start || transferDate;
    let periodEnd = payload.period_end || transferDate;

    if (Array.isArray(sales_transaction_ids) && sales_transaction_ids.length > 0) {
      const txBounds = await db('sales_transactions')
        .whereIn('id', sales_transaction_ids)
        .select(db.raw('MIN(transaction_at) as min_date, MAX(transaction_at) as max_date'))
        .first();

      if (txBounds && txBounds.min_date) {
        periodStart = String(txBounds.min_date).slice(0, 10);
      }
      if (txBounds && txBounds.max_date) {
        periodEnd = String(txBounds.max_date).slice(0, 10);
      }
    }

    // 3. Catat Jurnal Akuntansi SBU Kantin (Double-Entry)
    let sbuJournal = null;
    if (conf.auto_journal_enabled !== false) {
      try {
        const descText = notes || `Penyetoran Bagi Hasil Hak Kantin Dompet Santri Periode ${periodStart} s.d ${periodEnd}`;
        sbuJournal = await canteenAccountingService.createJournalEntry(effectiveUnitId, {
          entry_type: 'general',
          entry_date: transferDate,
          reference_number: finalBankStatementId ? `RK#${finalBankStatementId}` : null,
          description: descText,
          lines: [
            {
              coa_account_id: debitCoaId,
              coa_account_code: debitCoaCode,
              coa_account_name: debitCoaName,
              debit: paymentAmount,
              credit: 0,
              memo: `Penerimaan Kas Penyetoran Hak Kantin (${finalFundSourceName})`
            },
            {
              coa_account_id: creditCoaId,
              coa_account_code: creditCoaCode,
              coa_account_name: creditCoaName,
              debit: 0,
              credit: paymentAmount,
              memo: `Pelunasan / Penyerahan Piutang Penjualan Dompet Santri`
            }
          ]
        }, userId);
      } catch (jrnErr) {
        console.warn(`[Canteen Fee] Gagal mencatat jurnal SBU Kantin: ${jrnErr.message}`);
      }
    }

    const journalNumber = sbuJournal?.entry_number || null;
    const journalEntryId = sbuJournal?.id || null;

    // 4. Insert record penyetoran hak kantin di database kantin
    const [id] = await db('canteen_fee_payments').insert({
      school_unit_id: effectiveUnitId,
      period_start: periodStart,
      period_end: periodEnd,
      amount: paymentAmount,
      paid_by: userId || 1,
      paid_at: transferDate,
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
      notes: notes || null
    });

    // 5. Tautkan transaksi penjualan dompet ke canteen_fee_payment_id
    try {
      if (Array.isArray(sales_transaction_ids) && sales_transaction_ids.length > 0) {
        await db('sales_transactions')
          .whereIn('id', sales_transaction_ids)
          .whereNull('canteen_fee_payment_id')
          .update({
            canteen_fee_payment_id: id,
            updated_at: db.fn.now()
          });
      } else {
        const pEnd = transferDate.length === 10 ? `${transferDate} 23:59:59` : transferDate;
        let txUpdateQ = db('sales_transactions')
          .where('payment_method', 'wallet')
          .whereNull('canteen_fee_payment_id')
          .where('transaction_at', '<=', pEnd);

        if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
          txUpdateQ = txUpdateQ.where('school_unit_id', schoolUnitId);
        }

        await txUpdateQ.update({
          canteen_fee_payment_id: id,
          updated_at: db.fn.now()
        });
      }
    } catch (txErr) {
      console.warn('[Canteen Fee] Gagal menautkan sales_transactions ke payment:', txErr.message);
    }

    let financeOtherIncomeId = null;
    let financeReceiptNumber = null;

    // 6. Catat transaksi in-process ke Modul Keuangan (Penerimaan Kas Lainnya / Pos Unit Usaha Kantin)
    try {
      if (targetCashAccountId) {
        const financePayload = {
          amount: paymentAmount,
          received_at: transferDate,
          cash_account_id: targetCashAccountId,
          bank_statement_id: finalBankStatementId,
          override_credit_account_id: debitCoaId,
          source_category: 'business_unit',
          payer_name: 'Pengelola Kantin Sekolah',
          notes: notes || `Penyetoran Bagi Hasil Hak Kantin Dompet Santri (Ref #CFP-${id})`
        };

        const financeRes = await otherIncomesService.createOtherIncome(effectiveUnitId, financePayload, userId);
        if (financeRes && financeRes.id) {
          financeOtherIncomeId = financeRes.id;
          financeReceiptNumber = financeRes.receipt_number || null;

          await db('canteen_fee_payments')
            .where({ id })
            .update({
              finance_other_income_id: financeOtherIncomeId,
              finance_receipt_number: financeReceiptNumber,
              updated_at: db.fn.now()
            });
        }
      }
    } catch (finErr) {
      console.error('[Canteen Fee] Gagal mencatat in-process ke Modul Keuangan:', finErr.message);
    }

    // 7. Publish webhook event
    try {
      await db('canteen_webhook_events').insert({
        event_type: 'kantin.fee.recorded',
        school_unit_id: effectiveUnitId,
        payload: JSON.stringify({
          event: 'canteen_fee_payment',
          payment_id: id,
          amount: paymentAmount,
          period_start: periodStart,
          period_end: periodEnd,
          paid_at: transferDate,
          journal_number: journalNumber,
          finance_other_income_id: financeOtherIncomeId,
          finance_receipt_number: financeReceiptNumber
        })
      });
    } catch (_) {}

    return db('canteen_fee_payments').where({ id }).first();
  }
}

module.exports = new CanteenFeePaymentsService();

