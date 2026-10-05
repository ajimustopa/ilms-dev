/**
 * Canteen Fee Payments Service
 * Sesuai api-contract-kantin.md Modul 7, erd-kantin.md §2.14, & aturan in-process modul Keuangan
 */
const db = require('../../../config/db/kantin');
const otherIncomesService = require('../../keuangan/other-incomes/service');
const masterDataService = require('../../keuangan/master-data/service');
const keuanganInternalService = require('../../keuangan/internal/service');

class CanteenFeePaymentsService {
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
    const {
      amount,
      paid_at,
      cash_account_id,
      coa_account_id,
      bank_statement_id,
      sales_transaction_ids,
      notes
    } = payload;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      const err = new Error('Nominal penyetoran hak kantin harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const transferDate = paid_at || new Date().toISOString().slice(0, 10);

    // 1. Tentukan rekening kas/bank penerima di modul Keuangan secara in-process
    let targetCashAccountId = cash_account_id ? Number(cash_account_id) : null;
    if (!targetCashAccountId) {
      try {
        const cashAccounts = await masterDataService.listCashAccounts(schoolUnitId, { is_active: true });
        const kantinAcc = cashAccounts.find(a => (a.name || '').toLowerCase().includes('kantin'))
          || cashAccounts.find(a => a.account_kind === 'cash')
          || cashAccounts[0];
        if (kantinAcc) {
          targetCashAccountId = kantinAcc.id;
        }
      } catch (accErr) {
        console.warn('[Canteen Fee] Tidak dapat memuat cash_accounts dari Keuangan:', accErr.message);
      }
    }

    // Tentukan periode dari data transaksi atau tanggal penyerahan
    let periodStart = payload.period_start || transferDate;
    let periodEnd = payload.period_end || transferDate;

    // Jika sales_transaction_ids dikirim, cari min dan max transaction_at
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

    // 2. Insert record penyetoran hak kantin di database kantin
    const [id] = await db('canteen_fee_payments').insert({
      school_unit_id: (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') ? Number(schoolUnitId) : 1,
      period_start: periodStart,
      period_end: periodEnd,
      amount: paymentAmount,
      paid_by: userId,
      paid_at: transferDate
    });

    // 3. Tautkan transaksi penjualan dompet ke canteen_fee_payment_id
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
        // Tautkan transaksi penjualan dompet sampai tanggal penyerahan
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

    // 4. Catat transaksi in-process ke Modul Keuangan (Penerimaan Kas Lainnya / Pos Unit Usaha Kantin)
    try {
      if (targetCashAccountId) {
        const financePayload = {
          amount: paymentAmount,
          received_at: transferDate,
          cash_account_id: targetCashAccountId,
          bank_statement_id: bank_statement_id ? Number(bank_statement_id) : null,
          override_credit_account_id: coa_account_id ? Number(coa_account_id) : null,
          source_category: 'business_unit',
          payer_name: 'Pengelola Kantin Sekolah',
          notes: notes || `Penyetoran Bagi Hasil Hak Kantin Dompet Santri (Ref #CFP-${id})`
        };

        const financeRes = await otherIncomesService.createOtherIncome(schoolUnitId, financePayload, userId);
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
      } else {
        console.warn(`[Canteen Fee] Tidak ditemukan rekening kas/bank penerima di unit ${schoolUnitId}. Pencatatan kas keuangan dilewati.`);
      }
    } catch (finErr) {
      console.error('[Canteen Fee] Gagal mencatat in-process ke Modul Keuangan:', finErr.message);
    }

    // 5. Publish webhook event
    try {
      await db('canteen_webhook_events').insert({
        event_type: 'kantin.fee.recorded',
        school_unit_id: schoolUnitId,
        payload: JSON.stringify({
          event: 'canteen_fee_payment',
          payment_id: id,
          amount: paymentAmount,
          period_start: periodStart,
          period_end: periodEnd,
          paid_at: transferDate,
          finance_other_income_id: financeOtherIncomeId,
          finance_receipt_number: financeReceiptNumber
        })
      });
    } catch (_) {}

    return db('canteen_fee_payments').where({ id }).first();
  }
}

module.exports = new CanteenFeePaymentsService();
