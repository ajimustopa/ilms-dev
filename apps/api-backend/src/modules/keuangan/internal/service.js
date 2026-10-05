/**
 * Internal Service Implementation for Keuangan Module
 * Menyediakan fungsi in-process untuk konsumsi antar-layanan (Kantin, Akademik, PSB, dsb)
 * Sesuai arsitektur Modular Monolith Core Aldepos (AI-CONTEXT.md & ARSITEKTUR-SISTEM.md §6).
 */
const db = require('../../../config/db/keuangan');
const { generateJournalNumber } = require('../bookkeeping/journalEngine');

class KeuanganInternalService {
  /**
   * Mengambil daftar rekening Kas & Bank aktif untuk unit sekolah tertentu atau gabungan
   * @param {number|string|null} schoolUnitId
   * @returns {Promise<Array<{id: number, name: string, account_kind: string, bank_name: string|null, bank_account_number: string|null, account_id: number|null, coa_code: string|null, coa_name: string|null}>>}
   */
  async listCashAccounts(schoolUnitId = null) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('cash_accounts')
      .leftJoin('chart_of_accounts', 'cash_accounts.account_id', 'chart_of_accounts.id')
      .where('cash_accounts.is_active', true);

    if (!isAll && Number(schoolUnitId) > 0) {
      q = q.where(function() {
        this.where('cash_accounts.school_unit_id', Number(schoolUnitId))
            .orWhere('cash_accounts.school_unit_id', 0);
      });
    }

    const rows = await q.select(
      'cash_accounts.id',
      'cash_accounts.school_unit_id',
      'cash_accounts.name',
      'cash_accounts.account_kind',
      'cash_accounts.bank_name',
      'cash_accounts.bank_account_number',
      'cash_accounts.account_id',
      'chart_of_accounts.account_code as coa_code',
      'chart_of_accounts.account_name as coa_name'
    ).orderBy('cash_accounts.id', 'asc');

    return rows.map(r => ({
      id: r.id,
      school_unit_id: r.school_unit_id,
      name: r.name,
      account_kind: r.account_kind,
      bank_name: r.bank_name,
      bank_account_number: r.bank_account_number,
      account_id: r.account_id,
      coa_code: r.coa_code,
      coa_name: r.coa_name,
      display_label: r.bank_account_number
        ? `${r.name} (${r.bank_name || 'Bank'} - ${r.bank_account_number})`
        : `${r.name} (Kas Tunai)`
    }));
  }

  /**
   * Mengambil akun COA untuk Dana Titipan Dompet Santri (Liabilitas / Utang)
   * @param {number|string|null} schoolUnitId
   * @returns {Promise<Object>}
   */
  async getCanteenWalletCoa(schoolUnitId = null) {
    let coa = await db('chart_of_accounts')
      .where({ account_code: '404' })
      .first();

    if (!coa) {
      coa = await db('chart_of_accounts')
        .where('account_name', 'like', '%Titipan%')
        .andWhere('account_group', 'utang')
        .first();
    }

    if (!coa) {
      // Fallback buat COA default jika belum ada
      const [id] = await db('chart_of_accounts').insert({
        school_unit_id: 0,
        account_code: '404',
        account_name: 'Dana Titipan Dompet Santri',
        account_group: 'utang',
        normal_balance: 'credit',
        level: 1,
        is_active: 1
      });
      coa = await db('chart_of_accounts').where({ id }).first();
    }

    return coa;
  }

  /**
   * Mengambil daftar mutasi rekening koran (bank_statements) untuk referensi auto-fill & rekonsiliasi
   * @param {number|string|null} schoolUnitId
   * @param {Object} filters
   * @returns {Promise<Array<Object>>}
   */
  async listBankStatements(schoolUnitId = null, filters = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('bank_statements')
      .leftJoin('cash_accounts', 'bank_statements.cash_account_id', 'cash_accounts.id')
      .leftJoin(
        db('bank_statement_references')
          .select('bank_statement_id')
          .sum('amount as total_allocated')
          .count('id as reference_count')
          .groupBy('bank_statement_id')
          .as('alloc'),
        'bank_statements.id',
        'alloc.bank_statement_id'
      );

    if (!isAll && Number(schoolUnitId) > 0) {
      q = q.where(function() {
        this.where('bank_statements.school_unit_id', Number(schoolUnitId))
            .orWhere('bank_statements.school_unit_id', 0);
      });
    }

    if (filters.cash_account_id) {
      q = q.where(function() {
        this.where('bank_statements.cash_account_id', Number(filters.cash_account_id));
        if (filters.include_id) {
          this.orWhere('bank_statements.id', Number(filters.include_id));
        }
      });
    }

    if (filters.dc_type) {
      const dt = String(filters.dc_type).toLowerCase();
      if (dt === 'cr' || dt === 'credit') {
        q = q.whereIn('bank_statements.dc_type', ['credit', 'CR', 'cr', 'CREDIT']);
      } else if (dt === 'db' || dt === 'debit') {
        q = q.whereIn('bank_statements.dc_type', ['debit', 'DB', 'db', 'DEBIT']);
      } else {
        q = q.where('bank_statements.dc_type', filters.dc_type);
      }
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      q = q.where(function() {
        this.where('bank_statements.description', 'like', term)
            .orWhere('bank_statements.journal_number', 'like', term)
            .orWhere('bank_statements.amount', 'like', term)
            .orWhere('cash_accounts.name', 'like', term)
            .orWhere('cash_accounts.bank_account_number', 'like', term);
      });
    }

    if (filters.is_reconciled !== undefined && filters.is_reconciled !== 'all') {
      const isReconciled = filters.is_reconciled === true || filters.is_reconciled === '1' || filters.is_reconciled === 'true';
      if (isReconciled) {
        q = q.where(function() {
          this.where('bank_statements.is_reconciled', 1)
              .orWhere('bank_statements.is_reconciled', true)
              .orWhereRaw('(bank_statements.amount - COALESCE(alloc.total_allocated, 0)) <= 0.01');
          if (filters.include_id) {
            this.orWhere('bank_statements.id', Number(filters.include_id));
          }
        });
      } else {
        q = q.where(function() {
          this.where(function() {
            this.where(function() {
              this.where('bank_statements.is_reconciled', 0)
                  .orWhere('bank_statements.is_reconciled', false)
                  .orWhereNull('bank_statements.is_reconciled');
            }).whereRaw('(bank_statements.amount - COALESCE(alloc.total_allocated, 0)) > 0.01');
          });
          if (filters.include_id) {
            this.orWhere('bank_statements.id', Number(filters.include_id));
          }
        });
      }
    }

    if (filters.from_date) {
      q = q.where('bank_statements.transaction_date', '>=', filters.from_date);
    }
    if (filters.to_date) {
      q = q.where('bank_statements.transaction_date', '<=', filters.to_date);
    }

    const rows = await q.select(
      'bank_statements.*',
      'cash_accounts.name as cash_account_name',
      'cash_accounts.bank_name',
      'cash_accounts.bank_account_number',
      db.raw('COALESCE(alloc.total_allocated, 0) as allocated_amount'),
      db.raw('COALESCE(alloc.reference_count, 0) as reference_count')
    ).orderBy('bank_statements.transaction_date', 'desc')
     .orderBy('bank_statements.id', 'desc')
     .limit(500);

    return rows.map(r => {
      const amt = parseFloat(r.amount) || 0;
      const allocAmt = parseFloat(r.allocated_amount) || 0;
      const remAmt = Math.max(0, amt - allocAmt);
      const isReconciled = Boolean(r.is_reconciled) || (allocAmt >= amt - 0.01 && amt > 0);
      const isPartiallyReconciled = allocAmt > 0 && remAmt > 0.01;

      return {
        id: r.id,
        school_unit_id: r.school_unit_id,
        cash_account_id: r.cash_account_id,
        cash_account_name: r.cash_account_name,
        bank_name: r.bank_name,
        bank_account_number: r.bank_account_number,
        transaction_date: r.transaction_date ? (typeof r.transaction_date === 'string' ? r.transaction_date.slice(0, 10) : r.transaction_date.toISOString().slice(0, 10)) : null,
        transaction_time: r.transaction_time,
        description: r.description,
        amount: amt,
        allocated_amount: allocAmt,
        remaining_amount: remAmt,
        dc_type: r.dc_type,
        journal_number: r.journal_number,
        reference_number: r.journal_number || r.import_batch_id || null,
        import_batch_id: r.import_batch_id,
        is_reconciled: isReconciled,
        is_partially_reconciled: isPartiallyReconciled,
        reference_count: parseInt(r.reference_count || 0, 10),
        reconciled_reference_type: r.reconciled_reference_type,
        reconciled_reference_id: r.reconciled_reference_id
      };
    });
  }

  /**
   * Mencatat Jurnal Otomatis Top Up Dompet Santri ke Jurnal Umum & Pos Dana Keuangan
   * @param {Object} params
   * @param {number} params.schoolUnitId - Unit sekolah
   * @param {number} params.studentId - ID santri
   * @param {string} params.studentName - Nama santri
   * @param {number} params.amount - Nominal top up
   * @param {number|null} [params.cashAccountId] - ID rekening kas/bank penerima
   * @param {number|null} [params.bankStatementId] - ID mutasi rekening koran terkait
   * @param {string|Date} [params.occurredAt] - Waktu transaksi
   * @param {string|null} [params.notes] - Catatan transaksi
   * @param {number|null} [params.userId] - User kasir pemroses
   * @param {number|null} [params.academicYearId] - ID Tahun Ajaran aktif
   * @returns {Promise<Object>}
   */
  async recordWalletTopUpJournal({
    schoolUnitId,
    studentId,
    studentName = '',
    amount,
    cashAccountId = null,
    bankStatementId = null,
    occurredAt = new Date(),
    notes = null,
    userId = null,
    academicYearId = null
  }) {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Nominal top up tidak valid: ${amount}`);
    }

    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation'
      ? Number(schoolUnitId)
      : 1;

    return await db.transaction(async (trx) => {
      // 1. Dapatkan akun Kas/Bank (Debit)
      let cashAccount = null;
      let debitCoaId = null;

      if (cashAccountId) {
        cashAccount = await trx('cash_accounts').where({ id: cashAccountId }).first();
      }
      if (!cashAccount) {
        cashAccount = await trx('cash_accounts')
          .where({ school_unit_id: effectiveUnitId, is_active: true })
          .orderBy('id', 'asc')
          .first();
      }

      if (cashAccount && cashAccount.account_id) {
        debitCoaId = cashAccount.account_id;
      } else {
        // Fallback ke COA Kas Tunai (101) atau Kas Bank (102)
        const fallbackCoa = await trx('chart_of_accounts')
          .where({ account_code: cashAccount?.account_kind === 'bank' ? '102' : '101' })
          .first();
        debitCoaId = fallbackCoa?.id || 1;
      }

      // 2. Dapatkan akun Liabilitas Titipan Dompet Santri (Credit)
      const walletCoa = await this.getCanteenWalletCoa(effectiveUnitId);
      const creditCoaId = walletCoa.id;

      // 3. Generate nomor jurnal
      const journalNumber = await generateJournalNumber(trx, occurredAt);

      // 4. Insert Header Jurnal Umum
      const description = notes || `Top Up Saldo Dompet Santri - ${studentName || `Siswa #${studentId}`}`;
      const [journalEntryId] = await trx('journal_entries').insert({
        school_unit_id: effectiveUnitId,
        academic_year_id: academicYearId || 3,
        journal_number: journalNumber,
        journal_date: occurredAt,
        source_type: 'canteen_wallet_topup',
        source_id: studentId,
        description,
        is_manual_correction: false,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });

      // 5. Insert Lines (Debit Kas/Bank, Credit Titipan Santri)
      await trx('journal_entry_lines').insert([
        {
          journal_entry_id: journalEntryId,
          chart_of_account_id: debitCoaId,
          entry_side: 'debit',
          amount: numericAmount,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        },
        {
          journal_entry_id: journalEntryId,
          chart_of_account_id: creditCoaId,
          entry_side: 'credit',
          amount: numericAmount,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        }
      ]);

      // 6. Mutasi Pos Sumber Dana (fund_balances) untuk Dompet Santri
      let fundBalanceRecord = await trx('fund_balances')
        .where({
          school_unit_id: effectiveUnitId,
          fund_type: 'canteen_wallet',
          fund_ref_id: 0
        })
        .first();

      if (!fundBalanceRecord) {
        const [fundId] = await trx('fund_balances').insert({
          school_unit_id: effectiveUnitId,
          fund_type: 'canteen_wallet',
          fund_ref_id: 0,
          budget_plan_income_item_id: null,
          academic_year_id: academicYearId || 3,
          balance: numericAmount,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });
        fundBalanceRecord = { id: fundId, balance: numericAmount };
      } else {
        const updatedBalance = parseFloat(fundBalanceRecord.balance) + numericAmount;
        await trx('fund_balances')
          .where({ id: fundBalanceRecord.id })
          .update({
            balance: updatedBalance,
            updated_at: trx.fn.now()
          });
        fundBalanceRecord.balance = updatedBalance;
      }

      // 7. Update status rekonsiliasi mutasi rekening koran & pencatatan alokasi bank_statement_references jika disertakan
      if (bankStatementId) {
        try {
          const stmt = await trx('bank_statements').where({ id: bankStatementId }).first();
          if (stmt) {
            const allocSum = await trx('bank_statement_references')
              .where('bank_statement_id', stmt.id)
              .sum('amount as total_allocated')
              .first();
            const curAlloc = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
            const stmtTotal = parseFloat(stmt.amount || 0);
            const remainingPlafon = Math.max(0, stmtTotal - curAlloc);
            if (remainingPlafon <= 0) {
              const err = new Error('Mutasi rekening koran ini sudah dialokasikan penuh (sisa plafon Rp 0). Harap pilih mutasi lain.');
              err.statusCode = 422;
              throw err;
            }
            const thisAlloc = Math.min(numericAmount, remainingPlafon);

            await trx('bank_statement_references').insert({
              bank_statement_id: stmt.id,
              school_unit_id: effectiveUnitId,
              reference_type: 'canteen_wallet_topup',
              reference_id: journalEntryId,
              amount: thisAlloc,
              notes: `Top Up Dompet Santri - ${studentName || `Siswa #${studentId}`} (Jurnal #${journalNumber})`,
              created_by: userId
            });

            const newAlloc = curAlloc + thisAlloc;
            const isFullyReconciled = newAlloc >= stmtTotal - 0.01;

            await trx('bank_statements')
              .where({ id: stmt.id })
              .update({
                is_reconciled: isFullyReconciled ? 1 : 0,
                reconciled_reference_type: 'canteen_wallet_topup',
                reconciled_reference_id: journalEntryId,
                reconciliation_notes: isFullyReconciled
                  ? `Lunas teralokasi ke Top Up Dompet Santri #${journalNumber}`
                  : `Teralokasi Rp ${newAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')} (Top Up #${journalNumber})`,
                reconciled_at: isFullyReconciled ? trx.fn.now() : stmt.reconciled_at,
                updated_at: trx.fn.now()
              });
          }
        } catch (bsErr) {
          if (bsErr.statusCode === 422) throw bsErr;
          console.warn('[Kantin TopUp] Bank statement reconciliation error:', bsErr.message);
        }
      }

      return {
        success: true,
        journal_entry_id: journalEntryId,
        journal_number: journalNumber,
        debit_account_id: debitCoaId,
        credit_account_id: creditCoaId,
        cash_account_id: cashAccount?.id || null,
        bank_statement_id: bankStatementId ? Number(bankStatementId) : null,
        fund_balance: parseFloat(fundBalanceRecord.balance)
      };
    });
  }

  /**
   * Mencatat Jurnal Otomatis Penarikan Tunai Saldo Dompet Santri
   * @param {Object} params
   */
  async recordWalletWithdrawalJournal({
    schoolUnitId,
    studentId,
    studentName = '',
    amount,
    cashAccountId = null,
    occurredAt = new Date(),
    notes = null,
    userId = null,
    academicYearId = null
  }) {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Nominal penarikan tidak valid: ${amount}`);
    }

    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation'
      ? Number(schoolUnitId)
      : 1;

    return await db.transaction(async (trx) => {
      // Dapatkan kas/bank yang mengeluarkan dana (Credit)
      let cashAccount = null;
      let creditCoaId = null;

      if (cashAccountId) {
        cashAccount = await trx('cash_accounts').where({ id: cashAccountId }).first();
      }
      if (!cashAccount) {
        cashAccount = await trx('cash_accounts')
          .where({ school_unit_id: effectiveUnitId, is_active: true })
          .orderBy('id', 'asc')
          .first();
      }

      if (cashAccount && cashAccount.account_id) {
        creditCoaId = cashAccount.account_id;
      } else {
        const fallbackCoa = await trx('chart_of_accounts')
          .where({ account_code: cashAccount?.account_kind === 'bank' ? '102' : '101' })
          .first();
        creditCoaId = fallbackCoa?.id || 1;
      }

      // Dapatkan akun Liabilitas Titipan Dompet Santri (Debit)
      const walletCoa = await this.getCanteenWalletCoa(effectiveUnitId);
      const debitCoaId = walletCoa.id;

      // Generate nomor jurnal
      const journalNumber = await generateJournalNumber(trx, occurredAt);

      // Header Jurnal
      const description = notes || `Penarikan Tunai Saldo Dompet Santri - ${studentName || `Siswa #${studentId}`}`;
      const [journalEntryId] = await trx('journal_entries').insert({
        school_unit_id: effectiveUnitId,
        academic_year_id: academicYearId || 3,
        journal_number: journalNumber,
        journal_date: occurredAt,
        source_type: 'canteen_wallet_withdrawal',
        source_id: studentId,
        description,
        is_manual_correction: false,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });

      // Lines (Debit Titipan Santri, Credit Kas/Bank)
      await trx('journal_entry_lines').insert([
        {
          journal_entry_id: journalEntryId,
          chart_of_account_id: debitCoaId,
          entry_side: 'debit',
          amount: numericAmount,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        },
        {
          journal_entry_id: journalEntryId,
          chart_of_account_id: creditCoaId,
          entry_side: 'credit',
          amount: numericAmount,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        }
      ]);

      // Kurangi Pos Dana Dompet Santri
      const fundBalanceRecord = await trx('fund_balances')
        .where({
          school_unit_id: effectiveUnitId,
          fund_type: 'canteen_wallet',
          fund_ref_id: 0
        })
        .first();

      if (fundBalanceRecord) {
        const updatedBalance = parseFloat(fundBalanceRecord.balance) - numericAmount;
        await trx('fund_balances')
          .where({ id: fundBalanceRecord.id })
          .update({
            balance: updatedBalance,
            updated_at: trx.fn.now()
          });
      }

      return {
        success: true,
        journal_entry_id: journalEntryId,
        journal_number: journalNumber,
        debit_account_id: debitCoaId,
        credit_account_id: creditCoaId
      };
    });
  }

  /**
   * Mendapatkan Saldo Agregat Pos Dana Dompet Santri di Buku Besar Keuangan
   * @param {number|string|null} schoolUnitId
   * @returns {Promise<number>}
   */
  async getCanteenWalletFundBalance(schoolUnitId = null) {
    let q = db('fund_balances').where({ fund_type: 'canteen_wallet' });
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      q = q.where({ school_unit_id: Number(schoolUnitId) });
    }
    const funds = await q;
    return funds.reduce((sum, f) => sum + (parseFloat(f.balance) || 0), 0);
  }

  /**
   * Mendapatkan Ringkasan Akuntansi Dompet Santri (Pos Dana + Saldo Buku Besar COA 404)
   * @param {number|string|null} schoolUnitId
   * @returns {Promise<Object>}
   */
  async getWalletAccountingSummary(schoolUnitId = null) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    
    // 1. Saldo Pos Dana (fund_balances)
    let fbQuery = db('fund_balances').where({ fund_type: 'canteen_wallet' });
    if (!isAll) {
      fbQuery = fbQuery.where({ school_unit_id: Number(schoolUnitId) });
    }
    const fbRows = await fbQuery;
    const totalFundBalance = fbRows.reduce((sum, r) => sum + (parseFloat(r.balance) || 0), 0);

    // 2. Akun COA 404 (Dana Titipan Dompet Santri)
    const coa = await this.getCanteenWalletCoa(schoolUnitId);

    // 3. Saldo Buku Besar COA 404 dari baris jurnal (journal_entry_lines)
    let journalQuery = db('journal_entry_lines')
      .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .where('journal_entry_lines.chart_of_account_id', coa.id);

    if (!isAll) {
      journalQuery = journalQuery.where('journal_entries.school_unit_id', Number(schoolUnitId));
    }

    const lines = await journalQuery.select(
      'journal_entry_lines.entry_side',
      'journal_entry_lines.amount'
    );

    let totalCredit = 0;
    let totalDebit = 0;
    lines.forEach(line => {
      const amt = parseFloat(line.amount) || 0;
      if (line.entry_side === 'credit') totalCredit += amt;
      if (line.entry_side === 'debit') totalDebit += amt;
    });

    const netCoaBalance = totalCredit - totalDebit;

    return {
      fund_balance: totalFundBalance,
      coa_id: coa.id,
      coa_code: coa.account_code,
      coa_name: coa.account_name,
      coa_total_credit: totalCredit,
      coa_total_debit: totalDebit,
      coa_net_balance: netCoaBalance,
      journal_lines_count: lines.length
    };
  }

  /**
   * Mensinkronkan revisi transaksi dompet santri ke Jurnal Keuangan, Pos Dana, dan Mutasi Rekening Koran
   */
  async syncWalletTransactionRevision({
    schoolUnitId,
    journalEntryId,
    oldAmount,
    newAmount,
    oldCashAccountId,
    newCashAccountId,
    oldBankStatementId,
    newBankStatementId,
    transactionType = 'top_up',
    notes = null,
    studentName = '',
    userId = null
  }) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation'
      ? Number(schoolUnitId)
      : 1;

    const diff = (parseFloat(newAmount) || 0) - (parseFloat(oldAmount) || 0);

    return await db.transaction(async (trx) => {
      // 1. Update Pos Sumber Dana fund_balances
      if (Math.abs(diff) > 0.001) {
        const fundBalanceRecord = await trx('fund_balances')
          .where({
            school_unit_id: effectiveUnitId,
            fund_type: 'canteen_wallet',
            fund_ref_id: 0
          })
          .first();

        if (fundBalanceRecord) {
          const delta = transactionType === 'top_up' ? diff : -diff;
          const updatedBalance = Math.max(0, parseFloat(fundBalanceRecord.balance) + delta);
          await trx('fund_balances')
            .where({ id: fundBalanceRecord.id })
            .update({
              balance: updatedBalance,
              updated_at: trx.fn.now()
            });
        }
      }

      // 2. Update Journal Entries & Lines jika ada journalEntryId
      if (journalEntryId) {
        const journal = await trx('journal_entries').where({ id: journalEntryId }).first();
        if (journal) {
          if (notes) {
            await trx('journal_entries')
              .where({ id: journalEntryId })
              .update({
                description: `(Revisi) ${notes}`,
                is_manual_correction: true,
                updated_at: trx.fn.now()
              });
          }

          if (Math.abs(diff) > 0.001) {
            await trx('journal_entry_lines')
              .where({ journal_entry_id: journalEntryId })
              .update({
                amount: parseFloat(newAmount),
                updated_at: trx.fn.now()
              });
          }

          if (newCashAccountId && String(newCashAccountId) !== String(oldCashAccountId)) {
            const newCashAccount = await trx('cash_accounts').where({ id: newCashAccountId }).first();
            if (newCashAccount?.account_id) {
              const targetSide = transactionType === 'top_up' ? 'debit' : 'credit';
              await trx('journal_entry_lines')
                .where({ journal_entry_id: journalEntryId, entry_side: targetSide })
                .update({
                  chart_of_account_id: newCashAccount.account_id,
                  updated_at: trx.fn.now()
                });
            }
          }
        }
      }

      // 3. Mutasi Rekening Koran / Alokasi bank_statement_references
      const bankStmtChanged = String(newBankStatementId || '') !== String(oldBankStatementId || '');
      const amountChanged = Math.abs(diff) > 0.001;

      if ((bankStmtChanged || amountChanged) && journalEntryId) {
        if (oldBankStatementId) {
          await trx('bank_statement_references')
            .where({
              bank_statement_id: oldBankStatementId,
              reference_type: 'canteen_wallet_topup',
              reference_id: journalEntryId
            })
            .del();

          const oldStmt = await trx('bank_statements').where({ id: oldBankStatementId }).first();
          if (oldStmt) {
            const oldAllocSum = await trx('bank_statement_references')
              .where('bank_statement_id', oldStmt.id)
              .sum('amount as total_allocated')
              .first();
            const curOldAlloc = parseFloat(oldAllocSum?.total_allocated || 0);
            const stmtAmount = parseFloat(oldStmt.amount || 0);
            const isFullyReconciled = curOldAlloc >= stmtAmount - 0.01 && stmtAmount > 0;
            await trx('bank_statements').where({ id: oldStmt.id }).update({
              is_reconciled: isFullyReconciled ? 1 : 0,
              reconciled_reference_type: isFullyReconciled ? oldStmt.reconciled_reference_type : (curOldAlloc > 0 ? oldStmt.reconciled_reference_type : null),
              reconciled_reference_id: isFullyReconciled ? oldStmt.reconciled_reference_id : (curOldAlloc > 0 ? oldStmt.reconciled_reference_id : null),
              reconciliation_notes: isFullyReconciled
                ? oldStmt.reconciliation_notes
                : (curOldAlloc > 0 ? `Teralokasi sebagian (Sisa Rp ${(stmtAmount - curOldAlloc).toLocaleString('id-ID')})` : null),
              reconciled_at: isFullyReconciled ? oldStmt.reconciled_at : null,
              updated_at: trx.fn.now()
            });
          }
        }

        if (newBankStatementId) {
          const newStmt = await trx('bank_statements').where({ id: newBankStatementId }).first();
          if (newStmt) {
            const allocSum = await trx('bank_statement_references')
              .where('bank_statement_id', newStmt.id)
              .sum('amount as total_allocated')
              .first();
            const curAlloc = parseFloat(allocSum?.total_allocated || 0);
            const stmtTotal = parseFloat(newStmt.amount || 0);
            const thisAlloc = Math.min(parseFloat(newAmount), Math.max(0, stmtTotal - curAlloc));

            await trx('bank_statement_references').insert({
              bank_statement_id: newStmt.id,
              school_unit_id: effectiveUnitId,
              reference_type: 'canteen_wallet_topup',
              reference_id: journalEntryId,
              amount: thisAlloc,
              notes: `(Revisi) Top Up Dompet Santri - ${studentName}`,
              created_by: userId
            });

            const updatedAlloc = curAlloc + thisAlloc;
            const isFullyReconciled = updatedAlloc >= stmtTotal - 0.01 && stmtTotal > 0;
            await trx('bank_statements').where({ id: newStmt.id }).update({
              is_reconciled: isFullyReconciled ? 1 : 0,
              reconciled_reference_type: 'canteen_wallet_topup',
              reconciled_reference_id: journalEntryId,
              reconciliation_notes: isFullyReconciled
                ? `Lunas teralokasi ke Top Up Dompet Santri (Revisi)`
                : `Teralokasi Rp ${updatedAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')} (Top Up Revisi)`,
              reconciled_at: isFullyReconciled ? trx.fn.now() : null,
              updated_at: trx.fn.now()
            });
          }
        }
      }

      return { success: true };
    });
  }
}

module.exports = new KeuanganInternalService();
