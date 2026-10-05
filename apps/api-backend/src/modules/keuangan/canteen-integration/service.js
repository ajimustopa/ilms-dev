/**
 * Canteen Integration Service for Keuangan Module
 * Menyediakan agregasi & layanan terpadu transaksi kantin & dompet digital di Modul Keuangan
 * Sesuai arsitektur Modular Monolith Core Aldepos (In-Process cross-module calls).
 */
const db = require('../../../config/db/keuangan');
const dbKantin = require('../../../config/db/kantin');
const walletTransactionsService = require('../../kantin/wallet-transactions/service');
const canteenStudentsService = require('../../kantin/canteen-students/service');
const receivablesService = require('../../kantin/receivables/service');
const canteenFeePaymentsService = require('../../kantin/canteen-fee-payments/service');
const vendorFeePaymentsService = require('../../kantin/vendor-fee-payments/service');
const vendorsService = require('../../kantin/vendors/service');
const masterDataService = require('../master-data/service');
const expensesService = require('../expenses/service');
const otherIncomesService = require('../other-incomes/service');
const cashTransfersService = require('../cash-transfers/service');
const keuanganInternalService = require('../internal/service');

class CanteenIntegrationService {
  /**
   * Mengambil ringkasan rekonsiliasi triangulasi saldo & metrik bagi hasil kantin/vendor
   */
  async getOverview(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const effectiveUnitId = !isAll && Number(schoolUnitId) > 0 ? Number(schoolUnitId) : null;

    // 1. Saldo Kartu Siswa di DB Kantin
    let canteenStudentQ = dbKantin('canteen_students').where('status', 'active');
    if (effectiveUnitId) {
      canteenStudentQ = canteenStudentQ.where('school_unit_id', effectiveUnitId);
    }
    const studentAgg = await canteenStudentQ
      .select(
        dbKantin.raw('COUNT(id) as total_students'),
        dbKantin.raw('COALESCE(SUM(wallet_balance), 0) as total_wallet_balance')
      )
      .first();

    const totalCardBalance = parseFloat(studentAgg?.total_wallet_balance || 0);
    const totalActiveStudents = parseInt(studentAgg?.total_students || 0, 10);

    // 2. Saldo Pos Sumber Dana (fund_balances) di DB Keuangan
    let fundQ = db('fund_balances').where('fund_type', 'canteen_wallet');
    if (effectiveUnitId) {
      fundQ = fundQ.where('school_unit_id', effectiveUnitId);
    }
    const fundRow = await fundQ.sum('balance as total_fund').first();
    const totalFundBalance = parseFloat(fundRow?.total_fund || 0);

    // Pos Dana Hak Kantin & Pos Dana Vendor jika ada
    let incomeFundQ = db('fund_balances').where('fund_type', 'canteen_income');
    if (effectiveUnitId) incomeFundQ = incomeFundQ.where('school_unit_id', effectiveUnitId);
    const incomeFundRow = await incomeFundQ.sum('balance as total_fund').first();
    const totalCanteenIncomeFund = parseFloat(incomeFundRow?.total_fund || 0);

    // 3. Saldo Buku Besar Akun Titipan COA 404 di DB Keuangan
    const walletCoa = await keuanganInternalService.getCanteenWalletCoa(effectiveUnitId);
    let ledgerBalance = 0;
    if (walletCoa?.id) {
      let linesQ = db('journal_entry_lines')
        .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
        .where('journal_entry_lines.chart_of_account_id', walletCoa.id);

      if (effectiveUnitId) {
        linesQ = linesQ.where('journal_entries.school_unit_id', effectiveUnitId);
      }

      const lines = await linesQ.select('journal_entry_lines.entry_side', 'journal_entry_lines.amount');
      let debits = 0;
      let credits = 0;
      lines.forEach(l => {
        const val = parseFloat(l.amount || 0);
        if (l.entry_side === 'credit') credits += val;
        else if (l.entry_side === 'debit') debits += val;
      });
      ledgerBalance = credits - debits; // Akun liabilitas bertambah di Kredit
    }

    // Hitung selisih rekonsiliasi
    const diffCardFund = totalCardBalance - totalFundBalance;
    const diffFundLedger = totalFundBalance - ledgerBalance;
    const isBalanced = Math.abs(diffCardFund) < 0.01 && Math.abs(diffFundLedger) < 0.01;

    // 4. Ambil Hak Kantin & Hak Vendor dari Kantin Receivables Service
    const [canteenShare, vendorShares] = await Promise.all([
      receivablesService.getCanteenShare(schoolUnitId, query),
      receivablesService.getVendorShare(schoolUnitId, query)
    ]);

    const totalVendorGross = vendorShares.reduce((sum, v) => sum + (v.vendor_gross_share || 0), 0);
    const totalVendorPaid = vendorShares.reduce((sum, v) => sum + (v.vendor_paid || 0), 0);
    const totalVendorPayable = vendorShares.reduce((sum, v) => sum + (v.vendor_payable || 0), 0);

    return {
      reconciliation: {
        total_card_balance: totalCardBalance,
        total_active_students: totalActiveStudents,
        total_fund_balance: totalFundBalance,
        total_canteen_income_fund: totalCanteenIncomeFund,
        total_ledger_balance: ledgerBalance,
        wallet_coa_code: walletCoa?.account_code || '404',
        wallet_coa_name: walletCoa?.account_name || 'Dana Titipan Dompet Santri',
        diff_card_fund: diffCardFund,
        diff_fund_ledger: diffFundLedger,
        is_balanced: isBalanced
      },
      canteen_share: canteenShare,
      vendor_summary: {
        total_vendors: vendorShares.length,
        total_vendor_gross: totalVendorGross,
        total_vendor_paid: totalVendorPaid,
        total_vendor_payable: totalVendorPayable,
        vendors: vendorShares
      }
    };
  }

  /**
   * Mengambil daftar santri aktif
   */
  async listStudents(schoolUnitId, query = {}) {
    return canteenStudentsService.listStudents(schoolUnitId, query);
  }

  /**
   * Mengambil daftar transaksi dompet
   */
  async listWalletTransactions(schoolUnitId, query = {}) {
    return walletTransactionsService.listTransactions(schoolUnitId, query);
  }

  /**
   * Melakukan Top Up Dompet Santri
   */
  async topUpWallet(schoolUnitId, payload, userId) {
    return walletTransactionsService.topUp(schoolUnitId, payload, userId);
  }

  /**
   * Melakukan Penarikan Tunai Sisa Saldo Dompet Santri
   */
  async withdrawWallet(schoolUnitId, payload, userId) {
    return walletTransactionsService.withdrawal(schoolUnitId, payload, userId);
  }

  /**
   * Mengambil daftar mutasi rekening koran untuk referensi auto-fill
   */
  async listBankStatements(schoolUnitId, query = {}) {
    return keuanganInternalService.listBankStatements(schoolUnitId, query);
  }

  /**
   * Mengambil daftar rekening kas/bank aktif
   */
  async listCashAccounts(schoolUnitId) {
    return keuanganInternalService.listCashAccounts(schoolUnitId);
  }

  /**
   * Mengambil rincian hak kantin
   */
  async getCanteenShare(schoolUnitId, query = {}) {
    return receivablesService.getCanteenShare(schoolUnitId, query);
  }

  /**
   * Mengambil rincian per produk hak kantin
   */
  async getCanteenShareDetail(schoolUnitId, query = {}) {
    return receivablesService.getCanteenShareDetail(schoolUnitId, query);
  }

  /**
   * Mengambil histori penyerahan dana hak kantin
   */
  async listCanteenFeePayments(schoolUnitId, query = {}) {
    return canteenFeePaymentsService.listPayments(schoolUnitId, query);
  }

  /**
   * Mencatat penyerahan dana hak kantin (dengan auto-income ke Keuangan)
   */
  async createCanteenFeePayment(schoolUnitId, payload, userId) {
    return canteenFeePaymentsService.createPayment(schoolUnitId, payload, userId);
  }

  /**
   * Mengambil daftar bagi hasil hak vendor
   */
  async getVendorShares(schoolUnitId, query = {}) {
    return receivablesService.getVendorShare(schoolUnitId, query);
  }

  /**
   * Mengambil histori pembayaran hak vendor
   */
  async listVendorFeePayments(schoolUnitId, query = {}) {
    return vendorFeePaymentsService.listPayments(schoolUnitId, query);
  }

  /**
   * Mencatat pembayaran hak vendor ke vendor mitra (dengan auto-expense ke Keuangan)
   */
  async createVendorFeePayment(schoolUnitId, payload, userId) {
    const { vendor_id, period_start, period_end, amount, cash_account_id = null, bank_statement_id = null, notes = null } = payload;
    const paymentAmount = parseFloat(amount);

    if (!vendor_id) {
      const err = new Error('vendor_id wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      const err = new Error('Nominal pembayaran hak vendor harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;
    const vendor = await dbKantin('vendors').where({ id: vendor_id }).first();
    if (!vendor) {
      const err = new Error('Vendor mitra tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // 1. Simpan pembayaran di database kantin
    const localPayment = await vendorFeePaymentsService.createPayment(effectiveUnitId, {
      vendor_id,
      period_start: period_start || new Date().toISOString().slice(0, 10),
      period_end: period_end || new Date().toISOString().slice(0, 10),
      amount: paymentAmount
    }, userId);

    let expenseId = null;
    let expenseProofNumber = null;

    // 2. Jika rekening kas/bank disertakan, catat bukti pengeluaran kas (Expense) di Modul Keuangan
    if (cash_account_id) {
      try {
        const expensePayload = {
          expense_date: payload.payment_date || new Date().toISOString().slice(0, 10),
          cash_account_id: Number(cash_account_id),
          bank_statement_id: bank_statement_id ? Number(bank_statement_id) : null,
          category: 'operational',
          recipient_name: vendor.vendor_name,
          item_name: `Pembayaran Bagi Hasil Titipan Vendor - ${vendor.vendor_name} (Periode ${period_start || ''} s/d ${period_end || ''})`,
          total_amount: paymentAmount,
          notes: notes || `Penyelesaian Hak Vendor Titipan ${vendor.vendor_name} (#VFP-${localPayment.id})`
        };

        const expenseRes = await expensesService.createExpense(effectiveUnitId, expensePayload, userId);
        if (expenseRes && expenseRes.id) {
          expenseId = expenseRes.id;
          expenseProofNumber = expenseRes.proof_number || null;

          // Update record di DB kantin jika kolom tersedia
          try {
            await dbKantin('vendor_fee_payments')
              .where({ id: localPayment.id })
              .update({
                notes: notes ? `${notes} [BKK #${expenseProofNumber}]` : `BKK #${expenseProofNumber}`
              });
          } catch (_) {}
        }
      } catch (expErr) {
        console.warn('[Vendor Payout] Gagal auto-posting expense ke Keuangan:', expErr.message);
      }
    }

    return {
      ...localPayment,
      expense_id: expenseId,
      expense_proof_number: expenseProofNumber
    };
  }

  /**
   * Melakukan Mutasi Kas Dompet Internal (misal dari Bank Penampung Dompet ke Kas Kasir Kantin)
   */
  async createCanteenCashTransfer(schoolUnitId, payload, userId) {
    const { from_cash_account_id, to_cash_account_id, amount, transfer_date, notes, bank_statement_id } = payload;
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;

    const transferPayload = {
      from_cash_account_id: Number(from_cash_account_id),
      to_cash_account_id: Number(to_cash_account_id),
      amount: parseFloat(amount),
      transfer_date: transfer_date || new Date().toISOString().slice(0, 10),
      notes: notes ? `[Mutasi Kas Kantin] ${notes}` : `[Mutasi Kas Kantin] Pemindahan Likuiditas Kas Dompet Santri`,
      bank_statement_id: bank_statement_id ? Number(bank_statement_id) : null
    };

    return cashTransfersService.createCashTransfer(effectiveUnitId, transferPayload, userId);
  }

  async updateWalletTransaction(schoolUnitId, txId, payload, user = {}) {
    return await walletTransactionsService.updateTransaction(schoolUnitId, txId, payload, user);
  }

  async listWalletRevisions(schoolUnitId, txId) {
    return await walletTransactionsService.listRevisions(schoolUnitId, txId);
  }
}

module.exports = new CanteenIntegrationService();
