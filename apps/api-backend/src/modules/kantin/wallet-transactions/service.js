/**
 * Wallet Transactions Service
 * Sesuai api-contract-kantin.md Modul 5 & erd-kantin.md §2.11
 */
const db = require('../../../config/db/kantin');
const canteenStudentsService = require('../canteen-students/service');
const keuanganInternalService = require('../../keuangan/internal/service');
const masterDataService = require('../../keuangan/master-data/service');
const canteenAccountingService = require('../accounting/service');

class WalletTransactionsService {
  /**
   * Mengambil konfigurasi default akuntansi Dompet Santri dan opsi dropdown COA/Kas
   */
  async getAccountingConfig(schoolUnitId) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? Number(schoolUnitId) : 1;

    let settings = await db('canteen_wallet_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();

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
      is_canteen: (a.name || '').toLowerCase().includes('kantin') || (a.name || '').toLowerCase().includes('dompet'),
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

    const walletLiabilityCoas = formattedCoas.filter(c =>
      c.account_code === '20101' || c.account_code === '404' || c.account_code === '20100' ||
      (c.account_name || '').toLowerCase().includes('dompet') || (c.account_name || '').toLowerCase().includes('titipan') || (c.account_name || '').toLowerCase().includes('simpanan')
    );
    const cashCoas = formattedCoas.filter(c =>
      c.account_code === '10101' || c.account_code === '101' || (c.account_name || '').toLowerCase().includes('kas')
    );
    const bankCoas = formattedCoas.filter(c =>
      c.account_code === '10102' || c.account_code === '102' || (c.account_name || '').toLowerCase().includes('bank') || (c.account_name || '').toLowerCase().includes('bni') || (c.account_name || '').toLowerCase().includes('bsi')
    );

    const defaultTunaiAcc = formattedCashAccounts.find(a => a.is_canteen && !a.bank_account_number) || formattedCashAccounts.find(a => !a.bank_account_number) || formattedCashAccounts[0] || null;
    const defaultBankAcc = formattedCashAccounts.find(a => a.is_canteen && a.bank_account_number) || formattedCashAccounts.find(a => a.bank_account_number) || formattedCashAccounts[0] || null;

    const defaultWalletCoa = formattedCoas.find(c => c.account_code === '404') || formattedCoas.find(c => c.account_code === '20101') || walletLiabilityCoas[0] || formattedCoas[0] || null;
    const defaultClearingCoa = formattedCoas.find(c => c.account_code === '50199') || formattedCoas.find(c => (c.account_name || '').toLowerCase().includes('penyeimbang') || (c.account_name || '').toLowerCase().includes('kliring')) || null;
    const defaultCashCoa = formattedCoas.find(c => c.account_code === '10101') || formattedCoas.find(c => c.account_code === '101') || cashCoas[0] || formattedCoas[0] || null;
    const defaultBankCoa = formattedCoas.find(c => c.account_code === '10102') || formattedCoas.find(c => c.account_code === '102') || bankCoas[0] || formattedCoas[0] || null;

    const resolvedConfig = {
      school_unit_id: effectiveUnitId,
      cash_account_id_tunai: settings?.cash_account_id_tunai || defaultTunaiAcc?.id || null,
      cash_account_name_tunai: settings?.cash_account_name_tunai || defaultTunaiAcc?.display_label || null,
      cash_account_id_bank: settings?.cash_account_id_bank || defaultBankAcc?.id || null,
      cash_account_name_bank: settings?.cash_account_name_bank || defaultBankAcc?.display_label || null,
      wallet_liability_coa_id: settings?.wallet_liability_coa_id || defaultWalletCoa?.id || null,
      wallet_liability_coa_code: settings?.wallet_liability_coa_code || defaultWalletCoa?.account_code || null,
      wallet_liability_coa_name: settings?.wallet_liability_coa_name || defaultWalletCoa?.account_name || null,
      opening_clearing_coa_id: settings?.opening_clearing_coa_id || defaultClearingCoa?.id || null,
      opening_clearing_coa_code: settings?.opening_clearing_coa_code || defaultClearingCoa?.account_code || '50199',
      opening_clearing_coa_name: settings?.opening_clearing_coa_name || defaultClearingCoa?.account_name || 'Penyeimbang Saldo Awal Dompet Santri',
      cash_coa_id: settings?.cash_coa_id || defaultCashCoa?.id || null,
      cash_coa_code: settings?.cash_coa_code || defaultCashCoa?.account_code || null,
      cash_coa_name: settings?.cash_coa_name || defaultCashCoa?.account_name || null,
      bank_coa_id: settings?.bank_coa_id || defaultBankCoa?.id || null,
      bank_coa_code: settings?.bank_coa_code || defaultBankCoa?.account_code || null,
      bank_coa_name: settings?.bank_coa_name || defaultBankCoa?.account_name || null,
      fund_source_name: settings?.fund_source_name || 'Pos Dana Titipan Dompet Santri / SBU Kantin',
      auto_journal: settings ? !!settings.auto_journal : true
    };

    return {
      settings: resolvedConfig,
      cash_accounts: formattedCashAccounts,
      coas: {
        all: formattedCoas,
        wallet_liability: walletLiabilityCoas.length > 0 ? walletLiabilityCoas : formattedCoas,
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
      wallet_liability_coa_id,
      wallet_liability_coa_code,
      wallet_liability_coa_name,
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
      wallet_liability_coa_id: wallet_liability_coa_id ? Number(wallet_liability_coa_id) : null,
      wallet_liability_coa_code: wallet_liability_coa_code || null,
      wallet_liability_coa_name: wallet_liability_coa_name || null,
      cash_coa_id: cash_coa_id ? Number(cash_coa_id) : null,
      cash_coa_code: cash_coa_code || null,
      cash_coa_name: cash_coa_name || null,
      bank_coa_id: bank_coa_id ? Number(bank_coa_id) : null,
      bank_coa_code: bank_coa_code || null,
      bank_coa_name: bank_coa_name || null,
      fund_source_name: fund_source_name || 'Pos Dana Titipan Dompet Santri / SBU Kantin',
      auto_journal: auto_journal !== undefined ? !!auto_journal : true,
      updated_at: db.fn.now()
    };

    const existing = await db('canteen_wallet_accounting_settings').where({ school_unit_id: effectiveUnitId }).first();
    if (existing) {
      await db('canteen_wallet_accounting_settings').where({ school_unit_id: effectiveUnitId }).update(dataToSave);
    } else {
      await db('canteen_wallet_accounting_settings').insert(dataToSave);
    }

    return await this.getAccountingConfig(effectiveUnitId);
  }

  async listCashAccounts(schoolUnitId) {
    try {
      return await keuanganInternalService.listCashAccounts(schoolUnitId);
    } catch (err) {
      console.warn('[Kantin Wallet] Gagal memuat daftar kas dari modul Keuangan:', err.message);
      return [];
    }
  }

  async listBankStatements(schoolUnitId, query = {}) {
    try {
      return await keuanganInternalService.listBankStatements(schoolUnitId, query);
    } catch (err) {
      console.warn('[Kantin Wallet] Gagal memuat mutasi rekening koran dari modul Keuangan:', err.message);
      return [];
    }
  }

  async listTransactions(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('wallet_transactions')
      .join('canteen_students', 'wallet_transactions.canteen_student_id', 'canteen_students.id');

    if (!isAll) {
      q = q.where('wallet_transactions.school_unit_id', schoolUnitId);
    }

    q = q.select(
      'wallet_transactions.*',
      'canteen_students.student_id',
      'canteen_students.cached_student_name as student_name',
      'canteen_students.cached_class_group_name as class_group_name'
    );

    if (query.canteen_student_id) {
      q = q.where('wallet_transactions.canteen_student_id', query.canteen_student_id);
    }
    if (query.student_id) {
      q = q.where('canteen_students.student_id', query.student_id);
    }
    if (query.transaction_type) {
      q = q.where('wallet_transactions.transaction_type', query.transaction_type);
    }
    if (query.date_from) {
      q = q.where('wallet_transactions.occurred_at', '>=', query.date_from);
    }
    if (query.date_to) {
      q = q.where('wallet_transactions.occurred_at', '<=', query.date_to);
    }

    const txs = await q.orderBy('wallet_transactions.occurred_at', 'desc').orderBy('wallet_transactions.id', 'desc');

    // Load nama kas/bank untuk enrich tampilan transaksi jika belum tercatat di kolom
    let cashAccountsMap = new Map();
    try {
      const cashAccounts = await keuanganInternalService.listCashAccounts(schoolUnitId);
      cashAccounts.forEach(c => cashAccountsMap.set(Number(c.id), c));
    } catch (e) {}

    return txs.map(t => {
      const ca = t.cash_account_id ? cashAccountsMap.get(Number(t.cash_account_id)) : null;
      return {
        ...t,
        amount: parseFloat(t.amount),
        balance_after: parseFloat(t.balance_after),
        bank_statement_id: t.bank_statement_id ? Number(t.bank_statement_id) : null,
        cash_account_name: t.cash_account_name || ca?.name || (t.payment_method === 'cash' ? 'Kas Tunai' : 'Transfer Bank'),
        cash_account_details: ca?.bank_account_number ? `${ca.bank_name || 'Bank'} (${ca.bank_account_number})` : null
      };
    });
  }

  async topUp(schoolUnitId, payload, userId) {
    const {
      student_id,
      amount,
      payment_method = 'cash',
      cash_account_id = null,
      bank_statement_id = null,
      occurred_at = null,
      notes = null
    } = payload;
    const topUpAmount = parseFloat(amount);

    if (topUpAmount <= 0) {
      const err = new Error('Nominal top up harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    // Pastikan record canteen_students ada
    const student = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, student_id);
    const effectiveUnitId = student.school_unit_id || (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1);

    // Ambil konfigurasi akuntansi default
    const walletConfig = await this.getAccountingConfig(effectiveUnitId);
    const conf = walletConfig.settings;

    // Tentukan akun kas & metode
    let selectedCashAccount = null;
    if (cash_account_id) {
      selectedCashAccount = walletConfig.cash_accounts.find(c => Number(c.id) === Number(cash_account_id));
    }
    const isBank = payment_method === 'transfer' || payment_method === 'bank' || selectedCashAccount?.account_kind === 'bank';
    const effectivePaymentMethod = isBank ? 'transfer' : 'cash';

    const finalCashAccId = cash_account_id ? Number(cash_account_id) : (isBank ? conf.cash_account_id_bank : conf.cash_account_id_tunai);
    const finalCashAccName = selectedCashAccount?.display_label || (isBank ? conf.cash_account_name_bank : conf.cash_account_name_tunai) || (isBank ? 'Transfer Bank' : 'Kas Tunai');

    // Tentukan Debet & Kredit COA
    // Top-Up: DEBET Kas/Bank, KREDIT Simpanan/Titipan Dompet Santri
    const debitCoaId = isBank ? (conf.bank_coa_id || 2) : (conf.cash_coa_id || 1);
    const debitCoaCode = isBank ? (conf.bank_coa_code || '10102') : (conf.cash_coa_code || '10101');
    const debitCoaName = isBank ? (conf.bank_coa_name || 'Kas Bank Kantin') : (conf.cash_coa_name || 'Kas Tunai Kasir');

    const creditCoaId = conf.wallet_liability_coa_id || 3;
    const creditCoaCode = conf.wallet_liability_coa_code || '20101';
    const creditCoaName = conf.wallet_liability_coa_name || 'Simpanan Dompet Santri';

    const fundSourceName = conf.fund_source_name || 'Pos Dana Titipan Dompet Santri / SBU Kantin';

    const newBalance = parseFloat(student.wallet_balance) + topUpAmount;
    const transactionDate = occurred_at ? new Date(occurred_at) : new Date();

    // 1. Update saldo di database kantin
    await db('canteen_students')
      .where({ id: student.id })
      .update({
        wallet_balance: newBalance,
        updated_at: db.fn.now()
      });

    // 2. Catat Jurnal Akuntansi SBU Kantin (Database Kantin)
    let sbuJournal = null;
    if (conf.auto_journal) {
      try {
        const studentName = student.cached_student_name || `Siswa #${student_id}`;
        sbuJournal = await canteenAccountingService.createJournalEntry(effectiveUnitId, {
          entry_type: 'general',
          entry_date: transactionDate.toISOString().slice(0, 10),
          reference_number: bank_statement_id ? `RK#${bank_statement_id}` : null,
          description: notes || `Top Up Saldo Dompet - ${studentName}`,
          lines: [
            {
              coa_account_id: debitCoaId,
              coa_account_code: debitCoaCode,
              coa_account_name: debitCoaName,
              debit: topUpAmount,
              credit: 0,
              memo: `Penerimaan Kas Top Up (${effectivePaymentMethod.toUpperCase()}) - ${studentName}`
            },
            {
              coa_account_id: creditCoaId,
              coa_account_code: creditCoaCode,
              coa_account_name: creditCoaName,
              debit: 0,
              credit: topUpAmount,
              memo: `Titipan Saldo Dompet Santri - ${studentName}`
            }
          ]
        }, userId);
      } catch (sbuJournalErr) {
        console.warn(`[Kantin TopUp] Gagal mencatat jurnal internal SBU Kantin: ${sbuJournalErr.message}`);
      }
    }

    // 3. Catat Jurnal Akuntansi & Pos Dana Otomatis ke Modul Keuangan (In-Process)
    let journalResult = null;
    if (conf.auto_journal) {
      try {
        journalResult = await keuanganInternalService.recordWalletTopUpJournal({
          schoolUnitId: effectiveUnitId,
          studentId: Number(student_id),
          studentName: student.cached_student_name || `Siswa #${student_id}`,
          amount: topUpAmount,
          cashAccountId: finalCashAccId,
          bankStatementId: bank_statement_id ? Number(bank_statement_id) : null,
          occurredAt: transactionDate,
          notes: notes || `Top Up Saldo Dompet - ${student.cached_student_name || `Siswa #${student_id}`}`,
          userId
        });
      } catch (journalErr) {
        console.error(`[Kantin TopUp] Gagal posting jurnal ke Modul Keuangan: ${journalErr.message}`);
      }
    }

    const journalNumber = sbuJournal?.entry_number || journalResult?.journal_number || null;
    const journalEntryId = sbuJournal?.id || journalResult?.journal_entry_id || null;

    // 4. Simpan record transaksi di tabel wallet_transactions
    const [txId] = await db('wallet_transactions').insert({
      school_unit_id: effectiveUnitId,
      canteen_student_id: student.id,
      transaction_type: 'top_up',
      amount: topUpAmount,
      balance_after: newBalance,
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
      notes,
      processed_by: userId || 1,
      occurred_at: transactionDate
    });

    // 5. Publish webhook event
    try {
      await db('canteen_webhook_events').insert({
        event_type: 'kantin.wallet.updated',
        school_unit_id: effectiveUnitId,
        payload: JSON.stringify({
          event: 'top_up',
          student_id: Number(student_id),
          amount: topUpAmount,
          balance_after: newBalance,
          journal_number: journalNumber,
          occurred_at: transactionDate.toISOString()
        })
      });
    } catch (e) {}

    return {
      wallet_transaction_id: txId,
      student_id: Number(student_id),
      amount: topUpAmount,
      balance_after: newBalance,
      journal_number: journalNumber,
      cash_account_name: finalCashAccName,
      fund_source_name: fundSourceName
    };
  }

  async setOpeningBalance(schoolUnitId, payload, userId) {
    const {
      student_id,
      amount,
      occurred_at = null,
      notes = null,
      debit_coa_id = null,
      debit_coa_code = null,
      debit_coa_name = null,
      credit_coa_id = null,
      credit_coa_code = null,
      credit_coa_name = null
    } = payload;
    const initialAmount = parseFloat(amount);

    if (isNaN(initialAmount) || initialAmount <= 0) {
      const err = new Error('Nominal saldo awal migrasi harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const student = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, student_id);
    const effectiveUnitId = student.school_unit_id || (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1);

    const walletConfig = await this.getAccountingConfig(effectiveUnitId);
    const conf = walletConfig.settings || {};

    const finalDebitCoaId = debit_coa_id ? Number(debit_coa_id) : (conf.opening_clearing_coa_id || null);
    const finalDebitCoaCode = debit_coa_code || conf.opening_clearing_coa_code || '50199';
    const finalDebitCoaName = debit_coa_name || conf.opening_clearing_coa_name || 'Penyeimbang Saldo Awal Dompet Santri';

    const finalCreditCoaId = credit_coa_id ? Number(credit_coa_id) : (conf.wallet_liability_coa_id || null);
    const finalCreditCoaCode = credit_coa_code || conf.wallet_liability_coa_code || '404';
    const finalCreditCoaName = credit_coa_name || conf.wallet_liability_coa_name || 'Dana Titipan Dompet Santri';

    const newBalance = parseFloat(student.wallet_balance || 0) + initialAmount;
    const transactionDate = occurred_at ? new Date(occurred_at) : new Date();

    // 1. Update saldo di database kantin
    await db('canteen_students')
      .where({ id: student.id })
      .update({
        wallet_balance: newBalance,
        updated_at: db.fn.now()
      });

    // 2. Saldo Awal Migrasi (Cutover): Murni pencatatan Sub-Ledger Kartu Santri.
    const journalNumber = 'SALDO-AWAL-CUTOVER';

    // 3. Simpan record transaksi di tabel wallet_transactions
    const [txId] = await db('wallet_transactions').insert({
      school_unit_id: effectiveUnitId,
      canteen_student_id: student.id,
      transaction_type: 'opening_balance',
      amount: initialAmount,
      balance_after: newBalance,
      payment_method: 'transfer',
      cash_account_id: null,
      cash_account_name: 'Saldo Awal Cutover',
      debit_coa_id: finalDebitCoaId,
      debit_coa_code: finalDebitCoaCode,
      debit_coa_name: finalDebitCoaName,
      credit_coa_id: finalCreditCoaId,
      credit_coa_code: finalCreditCoaCode,
      credit_coa_name: finalCreditCoaName,
      fund_source_name: 'Pos Dana Titipan Dompet Santri (Cutover)',
      bank_statement_id: null,
      journal_entry_id: null,
      journal_number: journalNumber,
      notes: notes || 'Saldo Awal Migrasi Sistem Lama (Cutover)',
      processed_by: userId || 1,
      occurred_at: transactionDate
    });

    // 4. Publish webhook event
    try {
      await db('canteen_webhook_events').insert({
        event_type: 'kantin.wallet.updated',
        school_unit_id: effectiveUnitId,
        payload: JSON.stringify({
          event: 'opening_balance',
          student_id: Number(student_id),
          amount: initialAmount,
          balance_after: newBalance,
          journal_number: journalNumber,
          occurred_at: transactionDate.toISOString()
        })
      });
    } catch (e) {}

    return {
      wallet_transaction_id: txId,
      student_id: Number(student_id),
      amount: initialAmount,
      balance_after: newBalance,
      journal_number: journalNumber,
      debit_coa_code: finalDebitCoaCode,
      credit_coa_code: finalCreditCoaCode
    };
  }

  async withdrawal(schoolUnitId, payload, userId) {
    const {
      student_id,
      amount,
      payment_method = 'cash',
      cash_account_id = null,
      occurred_at = null,
      notes = null
    } = payload;
    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount <= 0) {
      const err = new Error('Nominal penarikan harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const student = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, student_id);
    const effectiveUnitId = student.school_unit_id || (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1);

    if (parseFloat(student.wallet_balance) < withdrawAmount) {
      const err = new Error('Saldo dompet tidak mencukupi');
      err.statusCode = 400;
      throw err;
    }

    // Ambil konfigurasi akuntansi default
    const walletConfig = await this.getAccountingConfig(effectiveUnitId);
    const conf = walletConfig.settings;

    let selectedCashAccount = null;
    if (cash_account_id) {
      selectedCashAccount = walletConfig.cash_accounts.find(c => Number(c.id) === Number(cash_account_id));
    }
    const isBank = payment_method === 'transfer' || payment_method === 'bank' || selectedCashAccount?.account_kind === 'bank';
    const effectivePaymentMethod = isBank ? 'transfer' : 'cash';

    const finalCashAccId = cash_account_id ? Number(cash_account_id) : (isBank ? conf.cash_account_id_bank : conf.cash_account_id_tunai);
    const finalCashAccName = selectedCashAccount?.display_label || (isBank ? conf.cash_account_name_bank : conf.cash_account_name_tunai) || (isBank ? 'Transfer Bank' : 'Kas Tunai');

    // Tentukan Debet & Kredit COA
    // Tarik Tunai: DEBET Simpanan/Titipan Dompet Santri, KREDIT Kas/Bank
    const debitCoaId = conf.wallet_liability_coa_id || 3;
    const debitCoaCode = conf.wallet_liability_coa_code || '20101';
    const debitCoaName = conf.wallet_liability_coa_name || 'Simpanan Dompet Santri';

    const creditCoaId = isBank ? (conf.bank_coa_id || 2) : (conf.cash_coa_id || 1);
    const creditCoaCode = isBank ? (conf.bank_coa_code || '10102') : (conf.cash_coa_code || '10101');
    const creditCoaName = isBank ? (conf.bank_coa_name || 'Kas Bank Kantin') : (conf.cash_coa_name || 'Kas Tunai Kasir');

    const fundSourceName = conf.fund_source_name || 'Pos Dana Titipan Dompet Santri / SBU Kantin';

    const newBalance = parseFloat(student.wallet_balance) - withdrawAmount;
    const transactionDate = occurred_at ? new Date(occurred_at) : new Date();

    // 1. Update saldo di database kantin
    await db('canteen_students')
      .where({ id: student.id })
      .update({
        wallet_balance: newBalance,
        updated_at: db.fn.now()
      });

    // 2. Catat Jurnal Akuntansi SBU Kantin
    let sbuJournal = null;
    if (conf.auto_journal) {
      try {
        const studentName = student.cached_student_name || `Siswa #${student_id}`;
        sbuJournal = await canteenAccountingService.createJournalEntry(effectiveUnitId, {
          entry_type: 'general',
          entry_date: transactionDate.toISOString().slice(0, 10),
          description: notes || `Penarikan Tunai Saldo Dompet - ${studentName}`,
          lines: [
            {
              coa_account_id: debitCoaId,
              coa_account_code: debitCoaCode,
              coa_account_name: debitCoaName,
              debit: withdrawAmount,
              credit: 0,
              memo: `Penarikan Saldo Dompet Santri - ${studentName}`
            },
            {
              coa_account_id: creditCoaId,
              coa_account_code: creditCoaCode,
              coa_account_name: creditCoaName,
              debit: 0,
              credit: withdrawAmount,
              memo: `Pengeluaran Kas/Bank Penarikan (${effectivePaymentMethod.toUpperCase()}) - ${studentName}`
            }
          ]
        }, userId);
      } catch (sbuJournalErr) {
        console.warn(`[Kantin Withdrawal] Gagal mencatat jurnal internal SBU Kantin: ${sbuJournalErr.message}`);
      }
    }

    // 3. Catat Jurnal Akuntansi Penarikan ke Modul Keuangan (In-Process)
    let journalResult = null;
    if (conf.auto_journal) {
      try {
        journalResult = await keuanganInternalService.recordWalletWithdrawalJournal({
          schoolUnitId: effectiveUnitId,
          studentId: Number(student_id),
          studentName: student.cached_student_name || `Siswa #${student_id}`,
          amount: withdrawAmount,
          cashAccountId: finalCashAccId,
          occurredAt: transactionDate,
          notes: notes || `Penarikan Tunai Saldo Dompet - ${student.cached_student_name || `Siswa #${student_id}`}`,
          userId
        });
      } catch (journalErr) {
        console.error(`[Kantin Withdrawal] Gagal posting jurnal ke Modul Keuangan: ${journalErr.message}`);
      }
    }

    const journalNumber = sbuJournal?.entry_number || journalResult?.journal_number || null;
    const journalEntryId = sbuJournal?.id || journalResult?.journal_entry_id || null;

    // 4. Simpan record transaksi di tabel wallet_transactions
    const [txId] = await db('wallet_transactions').insert({
      school_unit_id: effectiveUnitId,
      canteen_student_id: student.id,
      transaction_type: 'withdrawal',
      amount: withdrawAmount,
      balance_after: newBalance,
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
      journal_entry_id: journalEntryId,
      journal_number: journalNumber,
      notes,
      processed_by: userId || 1,
      occurred_at: transactionDate
    });

    try {
      await db('canteen_webhook_events').insert({
        event_type: 'kantin.wallet.updated',
        school_unit_id: effectiveUnitId,
        payload: JSON.stringify({
          event: 'withdrawal',
          student_id: Number(student_id),
          amount: withdrawAmount,
          balance_after: newBalance,
          journal_number: journalNumber,
          occurred_at: transactionDate.toISOString()
        })
      });
    } catch (e) {}

    return {
      wallet_transaction_id: txId,
      student_id: Number(student_id),
      amount: withdrawAmount,
      balance_after: newBalance,
      journal_number: journalNumber,
      cash_account_name: finalCashAccName,
      fund_source_name: fundSourceName
    };
  }

  /**
   * Menghitung Rekonsiliasi Saldo Agregat Kartu Santri (Kantin) vs Pos Dana & COA 404/20101 (Keuangan)
   * @param {number|string|null} schoolUnitId
   * @returns {Promise<Object>}
   */
  async getReconciliationSummary(schoolUnitId = null) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';

    // 1. Data Agregat Saldo di Database Kantin
    let studentsQuery = db('canteen_students');
    if (!isAll) {
      studentsQuery = studentsQuery.where('school_unit_id', Number(schoolUnitId));
    }

    const canteenStats = await studentsQuery.select(
      db.raw('COUNT(id) as total_students'),
      db.raw('COUNT(CASE WHEN wallet_balance > 0 THEN 1 END) as active_wallets_count'),
      db.raw('COALESCE(SUM(wallet_balance), 0) as total_canteen_balance')
    ).first();

    const totalStudents = parseInt(canteenStats?.total_students || 0, 10);
    const activeWalletsCount = parseInt(canteenStats?.active_wallets_count || 0, 10);
    const totalCanteenBalance = parseFloat(canteenStats?.total_canteen_balance || 0);

    // 2. Statistik Transaksi Hari Ini
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayTxQuery = db('wallet_transactions')
      .where('occurred_at', '>=', `${todayStr} 00:00:00`)
      .where('occurred_at', '<=', `${todayStr} 23:59:59`);

    if (!isAll) {
      todayTxQuery = todayTxQuery.where('school_unit_id', Number(schoolUnitId));
    }

    const todayTxs = await todayTxQuery.select(
      'transaction_type',
      db.raw('COUNT(id) as count'),
      db.raw('COALESCE(SUM(amount), 0) as total_amount')
    ).groupBy('transaction_type');

    let todayTopUpCount = 0;
    let todayTopUpAmount = 0;
    let todayWithdrawalCount = 0;
    let todayWithdrawalAmount = 0;

    todayTxs.forEach(t => {
      if (t.transaction_type === 'top_up') {
        todayTopUpCount = parseInt(t.count, 10);
        todayTopUpAmount = parseFloat(t.total_amount);
      } else if (t.transaction_type === 'withdrawal') {
        todayWithdrawalCount = parseInt(t.count, 10);
        todayWithdrawalAmount = parseFloat(t.total_amount);
      }
    });

    // 3. Data Akuntansi dari Modul Keuangan (In-Process)
    let financeSummary = {
      fund_balance: 0,
      coa_id: null,
      coa_code: '404',
      coa_name: 'Dana Titipan Dompet Santri',
      coa_net_balance: 0,
      coa_total_credit: 0,
      coa_total_debit: 0,
      journal_lines_count: 0
    };

    try {
      financeSummary = await keuanganInternalService.getWalletAccountingSummary(schoolUnitId);
    } catch (err) {
      console.warn('[Kantin Reconciliation] Gagal mengambil ringkasan akuntansi dari keuangan:', err.message);
    }

    // 4. Hitung Selisih dan Status Sinkronisasi
    const fundBalance = parseFloat(financeSummary.fund_balance || 0);
    const coaNetBalance = parseFloat(financeSummary.coa_net_balance || 0);

    const diffCanteenVsFund = totalCanteenBalance - fundBalance;
    const diffCanteenVsCoa = totalCanteenBalance - coaNetBalance;
    const isBalanced = Math.abs(diffCanteenVsFund) < 0.01 && Math.abs(diffCanteenVsCoa) < 0.01;

    return {
      canteen: {
        total_students: totalStudents,
        active_wallets_count: activeWalletsCount,
        total_balance: totalCanteenBalance,
        today_topup_count: todayTopUpCount,
        today_topup_amount: todayTopUpAmount,
        today_withdrawal_count: todayWithdrawalCount,
        today_withdrawal_amount: todayWithdrawalAmount
      },
      keuangan: {
        fund_balance: fundBalance,
        coa_code: financeSummary.coa_code,
        coa_name: financeSummary.coa_name,
        coa_net_balance: coaNetBalance,
        coa_total_credit: financeSummary.coa_total_credit,
        coa_total_debit: financeSummary.coa_total_debit,
        journal_lines_count: financeSummary.journal_lines_count
      },
      reconciliation: {
        is_balanced: isBalanced,
        status: isBalanced ? 'MATCH' : 'DISCREPANCY',
        difference_fund: diffCanteenVsFund,
        difference_coa: diffCanteenVsCoa,
        checked_at: new Date().toISOString()
      }
    };
  }

  async updateTransaction(schoolUnitId, txId, payload, user = {}) {
    const {
      amount,
      notes,
      payment_method,
      cash_account_id,
      bank_statement_id,
      occurred_at,
      revision_reason
    } = payload;

    if (!revision_reason || typeof revision_reason !== 'string' || revision_reason.trim().length < 3) {
      const err = new Error('Catatan alasan revisi wajib diisi (minimal 3 karakter)');
      err.statusCode = 422;
      throw err;
    }

    const tx = await db('wallet_transactions')
      .join('canteen_students', 'wallet_transactions.canteen_student_id', 'canteen_students.id')
      .where('wallet_transactions.id', txId)
      .select(
        'wallet_transactions.*',
        'canteen_students.student_id',
        'canteen_students.cached_student_name',
        'canteen_students.wallet_balance'
      )
      .first();

    if (!tx) {
      const err = new Error('Transaksi dompet tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const oldAmount = parseFloat(tx.amount);
    const newAmount = amount !== undefined && !isNaN(parseFloat(amount)) ? parseFloat(amount) : oldAmount;
    if (newAmount <= 0) {
      const err = new Error('Nominal transaksi harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const diff = newAmount - oldAmount;
    const currentStudentBalance = parseFloat(tx.wallet_balance);

    // Hitung dampak perubahan saldo santri
    let deltaBalance = 0;
    if (tx.transaction_type === 'top_up' || tx.transaction_type === 'opening_balance') {
      deltaBalance = diff;
    } else if (tx.transaction_type === 'withdrawal' || tx.transaction_type === 'purchase') {
      deltaBalance = -diff;
    }

    const newStudentBalance = currentStudentBalance + deltaBalance;
    if (newStudentBalance < 0) {
      const err = new Error(`Revisi ditolak: Saldo santri saat ini (Rp ${currentStudentBalance.toLocaleString('id-ID')}) tidak mencukupi untuk pengurangan nominal ini.`);
      err.statusCode = 422;
      throw err;
    }

    const previousData = {
      amount: oldAmount,
      balance_after: parseFloat(tx.balance_after),
      payment_method: tx.payment_method,
      cash_account_id: tx.cash_account_id,
      cash_account_name: tx.cash_account_name,
      bank_statement_id: tx.bank_statement_id,
      notes: tx.notes,
      occurred_at: tx.occurred_at
    };

    const newOccurredAt = occurred_at ? new Date(occurred_at) : tx.occurred_at;
    const newBalanceAfter = parseFloat(tx.balance_after) + deltaBalance;

    const updatedFields = {
      amount: newAmount,
      balance_after: newBalanceAfter,
      payment_method: payment_method !== undefined ? payment_method : tx.payment_method,
      cash_account_id: cash_account_id !== undefined ? (cash_account_id ? Number(cash_account_id) : null) : tx.cash_account_id,
      bank_statement_id: bank_statement_id !== undefined ? (bank_statement_id ? Number(bank_statement_id) : null) : tx.bank_statement_id,
      notes: notes !== undefined ? notes : tx.notes,
      occurred_at: newOccurredAt,
      is_revised: 1,
      revision_count: (parseInt(tx.revision_count || 0, 10)) + 1,
      last_revised_at: new Date(),
      updated_at: new Date()
    };

    const newData = {
      amount: updatedFields.amount,
      balance_after: updatedFields.balance_after,
      payment_method: updatedFields.payment_method,
      cash_account_id: updatedFields.cash_account_id,
      bank_statement_id: updatedFields.bank_statement_id,
      notes: updatedFields.notes,
      occurred_at: updatedFields.occurred_at
    };

    // Eksekusi pembaruan dalam transaksi DB Kantin
    await db.transaction(async (trx) => {
      // 1. Update saldo canteen_students jika ada perubahan nominal
      if (Math.abs(deltaBalance) > 0.001) {
        await trx('canteen_students')
          .where({ id: tx.canteen_student_id })
          .update({
            wallet_balance: newStudentBalance,
            updated_at: new Date()
          });
      }

      // 2. Update wallet_transactions
      await trx('wallet_transactions')
        .where({ id: tx.id })
        .update(updatedFields);

      // 3. Catat riwayat revisi (audit log)
      await trx('wallet_transaction_revisions').insert({
        school_unit_id: tx.school_unit_id,
        wallet_transaction_id: tx.id,
        revised_by: user.id || 1,
        revised_by_name: user.full_name || user.name || user.username || 'Admin/Petugas',
        revision_reason: revision_reason.trim(),
        previous_data: JSON.stringify(previousData),
        new_data: JSON.stringify(newData),
        created_at: new Date()
      });
    });

    // 4. Sinkronisasi ke Modul Keuangan jika memiliki jurnal (Top-Up / Penarikan biasa)
    if (tx.transaction_type !== 'opening_balance' && tx.journal_entry_id) {
      try {
        await keuanganInternalService.syncWalletTransactionRevision({
          schoolUnitId: tx.school_unit_id,
          journalEntryId: tx.journal_entry_id,
          oldAmount,
          newAmount,
          oldCashAccountId: tx.cash_account_id,
          newCashAccountId: updatedFields.cash_account_id,
          oldBankStatementId: tx.bank_statement_id,
          newBankStatementId: updatedFields.bank_statement_id,
          transactionType: tx.transaction_type,
          notes: updatedFields.notes,
          studentName: tx.cached_student_name,
          userId: user.id || null
        });
      } catch (err) {
        console.warn('[Wallet Revision] Gagal sinkron ke modul keuangan:', err.message);
      }
    }

    return {
      success: true,
      transaction_id: tx.id,
      is_revised: true,
      revision_count: updatedFields.revision_count,
      wallet_balance: newStudentBalance
    };
  }

  async listRevisions(schoolUnitId, txId) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('wallet_transaction_revisions').where('wallet_transaction_id', txId);
    if (!isAll) {
      q = q.where('school_unit_id', schoolUnitId);
    }
    const revisions = await q.orderBy('created_at', 'desc').orderBy('id', 'desc');
    return revisions.map(r => ({
      ...r,
      previous_data: typeof r.previous_data === 'string' ? JSON.parse(r.previous_data) : r.previous_data,
      new_data: typeof r.new_data === 'string' ? JSON.parse(r.new_data) : r.new_data
    }));
  }
}

module.exports = new WalletTransactionsService();
