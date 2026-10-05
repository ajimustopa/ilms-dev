/**
 * Wallet Transactions Service
 * Sesuai api-contract-kantin.md Modul 5 & erd-kantin.md §2.11
 */
const db = require('../../../config/db/kantin');
const canteenStudentsService = require('../canteen-students/service');
const keuanganInternalService = require('../../keuangan/internal/service');

class WalletTransactionsService {
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

    // Load nama kas/bank untuk enrich tampilan transaksi
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
        cash_account_name: ca?.name || (t.payment_method === 'cash' ? 'Kas Tunai' : 'Transfer Bank'),
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

    const newBalance = parseFloat(student.wallet_balance) + topUpAmount;
    const transactionDate = occurred_at ? new Date(occurred_at) : new Date();

    // 1. Update saldo di database kantin
    await db('canteen_students')
      .where({ id: student.id })
      .update({
        wallet_balance: newBalance,
        updated_at: db.fn.now()
      });

    // 2. Catat Jurnal Akuntansi & Pos Dana Otomatis ke Modul Keuangan (In-Process)
    let journalResult = null;
    try {
      journalResult = await keuanganInternalService.recordWalletTopUpJournal({
        schoolUnitId: effectiveUnitId,
        studentId: Number(student_id),
        studentName: student.cached_student_name || `Siswa #${student_id}`,
        amount: topUpAmount,
        cashAccountId: cash_account_id ? Number(cash_account_id) : null,
        bankStatementId: bank_statement_id ? Number(bank_statement_id) : null,
        occurredAt: transactionDate,
        notes: notes || `Top Up Saldo Dompet - ${student.cached_student_name || `Siswa #${student_id}`}`,
        userId
      });
    } catch (journalErr) {
      console.error(`[Kantin TopUp] Gagal posting jurnal ke Modul Keuangan: ${journalErr.message}`);
    }

    // 3. Simpan record transaksi di tabel wallet_transactions
    const [txId] = await db('wallet_transactions').insert({
      school_unit_id: effectiveUnitId,
      canteen_student_id: student.id,
      transaction_type: 'top_up',
      amount: topUpAmount,
      balance_after: newBalance,
      payment_method,
      cash_account_id: cash_account_id ? Number(cash_account_id) : null,
      bank_statement_id: bank_statement_id ? Number(bank_statement_id) : null,
      journal_entry_id: journalResult?.journal_entry_id || null,
      journal_number: journalResult?.journal_number || null,
      notes,
      processed_by: userId || 1,
      occurred_at: transactionDate
    });

    // 4. Publish webhook event
    try {
      await db('canteen_webhook_events').insert({
        event_type: 'kantin.wallet.updated',
        school_unit_id: effectiveUnitId,
        payload: JSON.stringify({
          event: 'top_up',
          student_id: Number(student_id),
          amount: topUpAmount,
          balance_after: newBalance,
          journal_number: journalResult?.journal_number || null,
          occurred_at: transactionDate.toISOString()
        })
      });
    } catch (e) {}

    return {
      wallet_transaction_id: txId,
      student_id: Number(student_id),
      amount: topUpAmount,
      balance_after: newBalance,
      journal_number: journalResult?.journal_number || null
    };
  }

  async setOpeningBalance(schoolUnitId, payload, userId) {
    const {
      student_id,
      amount,
      payment_method = 'cash',
      cash_account_id = null,
      bank_statement_id = null,
      occurred_at = null,
      notes = null
    } = payload;
    const initialAmount = parseFloat(amount);

    if (isNaN(initialAmount) || initialAmount <= 0) {
      const err = new Error('Nominal saldo awal migrasi harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const student = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, student_id);
    const effectiveUnitId = student.school_unit_id || (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1);

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
    // Uang fisik/rekening sudah ada di Saldo Awal Kas BNI (Keuangan), sehingga TIDAK mendebit kas ulang.
    const journalNumber = 'SALDO-AWAL-CUTOVER';

    // 3. Simpan record transaksi di tabel wallet_transactions
    const [txId] = await db('wallet_transactions').insert({
      school_unit_id: effectiveUnitId,
      canteen_student_id: student.id,
      transaction_type: 'opening_balance',
      amount: initialAmount,
      balance_after: newBalance,
      payment_method: payment_method || 'transfer',
      cash_account_id: cash_account_id ? Number(cash_account_id) : null,
      bank_statement_id: bank_statement_id ? Number(bank_statement_id) : null,
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
      journal_number: journalNumber
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

    const newBalance = parseFloat(student.wallet_balance) - withdrawAmount;
    const transactionDate = occurred_at ? new Date(occurred_at) : new Date();

    // 1. Update saldo di database kantin
    await db('canteen_students')
      .where({ id: student.id })
      .update({
        wallet_balance: newBalance,
        updated_at: db.fn.now()
      });

    // 2. Catat Jurnal Akuntansi Penarikan ke Modul Keuangan (In-Process)
    let journalResult = null;
    try {
      journalResult = await keuanganInternalService.recordWalletWithdrawalJournal({
        schoolUnitId: effectiveUnitId,
        studentId: Number(student_id),
        studentName: student.cached_student_name || `Siswa #${student_id}`,
        amount: withdrawAmount,
        cashAccountId: cash_account_id ? Number(cash_account_id) : null,
        occurredAt: transactionDate,
        notes: notes || `Penarikan Tunai Saldo Dompet - ${student.cached_student_name || `Siswa #${student_id}`}`,
        userId
      });
    } catch (journalErr) {
      console.error(`[Kantin Withdrawal] Gagal posting jurnal ke Modul Keuangan: ${journalErr.message}`);
    }

    // 3. Simpan record transaksi di tabel wallet_transactions
    const [txId] = await db('wallet_transactions').insert({
      school_unit_id: effectiveUnitId,
      canteen_student_id: student.id,
      transaction_type: 'withdrawal',
      amount: withdrawAmount,
      balance_after: newBalance,
      payment_method,
      cash_account_id: cash_account_id ? Number(cash_account_id) : null,
      journal_entry_id: journalResult?.journal_entry_id || null,
      journal_number: journalResult?.journal_number || null,
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
          journal_number: journalResult?.journal_number || null,
          occurred_at: transactionDate.toISOString()
        })
      });
    } catch (e) {}

    return {
      wallet_transaction_id: txId,
      student_id: Number(student_id),
      amount: withdrawAmount,
      balance_after: newBalance,
      journal_number: journalResult?.journal_number || null
    };
  }

  /**
   * Menghitung Rekonsiliasi Saldo Agregat Kartu Santri (Kantin) vs Pos Dana & COA 404 (Keuangan)
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
