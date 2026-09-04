/**
 * Bank Statements (Rekening Koran) Service for Keuangan Module
 * 
 * Strict Accounting Principle:
 * Rekening Koran is a ONE-WAY REFERENCE (shadow statement) for bank reconciliation.
 * It NEVER triggers recordJournal() and NEVER mutates fund_balances or live cash accounts.
 */
const db = require('../../../config/db/keuangan');
const XLSX = require('xlsx');
const { logFinanceAudit } = require('../common/auditLogService');

function formatDateOnly(d) {
  if (!d) return null;
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(d).slice(0, 10);
}

class BankStatementsService {
  /**
   * 1. List Bank Statements with filtering, search, pagination, and macro statistics
   */
  async listBankStatements(schoolUnitId, filters = {}) {
    let query = db('bank_statements')
      .join('cash_accounts', 'bank_statements.cash_account_id', 'cash_accounts.id')
      .where('bank_statements.school_unit_id', schoolUnitId);

    if (filters.cash_account_id) {
      query = query.where('bank_statements.cash_account_id', Number(filters.cash_account_id));
    }
    if (filters.academic_year_id) {
      query = query.where('bank_statements.academic_year_id', Number(filters.academic_year_id));
    }
    if (filters.start_date) {
      query = query.where('bank_statements.transaction_date', '>=', `${filters.start_date} 00:00:00`);
    }
    if (filters.end_date) {
      query = query.where('bank_statements.transaction_date', '<=', `${filters.end_date} 23:59:59`);
    }
    if (filters.dc_type) {
      query = query.where('bank_statements.dc_type', filters.dc_type);
    }
    if (filters.is_reconciled !== undefined && filters.is_reconciled !== '' && filters.is_reconciled !== 'all') {
      const isReconciled = filters.is_reconciled === 'true' || filters.is_reconciled === true || filters.is_reconciled === '1' || filters.is_reconciled === 1;
      query = query.where('bank_statements.is_reconciled', isReconciled);
    }
    if (filters.search) {
      const q = `%${filters.search}%`;
      query = query.where(function() {
        this.where('bank_statements.description', 'like', q)
          .orWhere('bank_statements.journal_number', 'like', q)
          .orWhere('bank_statements.reconciliation_notes', 'like', q);
      });
    }

    // Clone query for summary calculation before pagination
    const allRecords = await query.clone().select(
      'bank_statements.id',
      'bank_statements.amount',
      'bank_statements.dc_type',
      'bank_statements.is_reconciled',
      'bank_statements.running_balance'
    );

    const totalRows = allRecords.length;
    let totalCredit = 0; // Uang Masuk
    let totalDebit = 0;  // Uang Keluar
    let reconciledCount = 0;

    allRecords.forEach(r => {
      const amt = parseFloat(r.amount || 0);
      if (r.dc_type === 'credit') {
        totalCredit += amt;
      } else if (r.dc_type === 'debit') {
        totalDebit += amt;
      }
      if (r.is_reconciled) {
        reconciledCount += 1;
      }
    });

    const unreconciledCount = totalRows - reconciledCount;
    const reconciliationRate = totalRows > 0 ? Math.round((reconciledCount / totalRows) * 10000) / 100 : 0;
    const netMutation = totalCredit - totalDebit;

    // Pagination
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const perPage = Math.max(1, parseInt(filters.per_page, 10) || 25);
    const totalPages = Math.ceil(totalRows / perPage) || 1;

    let paginatedQuery = query.clone()
      .select(
        'bank_statements.*',
        'cash_accounts.name as cash_account_name',
        'cash_accounts.bank_name',
        'cash_accounts.bank_account_number'
      )
      .orderBy('bank_statements.transaction_date', 'desc')
      .orderBy('bank_statements.id', 'desc');

    if (!filters.no_pagination) {
      paginatedQuery = paginatedQuery.offset((page - 1) * perPage).limit(perPage);
    }

    const rows = await paginatedQuery;

    // Enrich reconciled reference descriptions
    const enrichedRows = await Promise.all(rows.map(async (row) => {
      let referenceDisplay = null;
      if (row.is_reconciled && row.reconciled_reference_type && row.reconciled_reference_id) {
        try {
          if (row.reconciled_reference_type === 'student_bill_payment') {
            const p = await db('bill_payments')
              .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
              .where('bill_payments.id', row.reconciled_reference_id)
              .select('bill_payments.receipt_number', 'bill_payments.amount', 'bill_payments.paid_at', 'student_bills.student_id')
              .first();
            if (p) {
              referenceDisplay = {
                type: 'student_bill_payment',
                label: `Pembayaran Siswa #${p.receipt_number}`,
                amount: p.amount,
                date: formatDateOnly(p.paid_at)
              };
            }
          } else if (row.reconciled_reference_type === 'other_income') {
            const inc = await db('other_incomes').where({ id: row.reconciled_reference_id }).first();
            if (inc) {
              referenceDisplay = {
                type: 'other_income',
                label: `Penerimaan #${inc.id} (${inc.notes || 'Non-SPP'})`,
                amount: inc.amount,
                date: formatDateOnly(inc.received_at)
              };
            }
          } else if (row.reconciled_reference_type === 'expense') {
            const exp = await db('expenses').where({ id: row.reconciled_reference_id }).first();
            if (exp) {
              referenceDisplay = {
                type: 'expense',
                label: `Pengeluaran #${exp.proof_number || exp.id} (${exp.item_name || 'Belanja'})`,
                amount: exp.total_amount,
                date: formatDateOnly(exp.expense_date)
              };
            }
          } else if (row.reconciled_reference_type === 'cash_transfer') {
            const ct = await db('cash_transfers').where({ id: row.reconciled_reference_id }).first();
            if (ct) {
              referenceDisplay = {
                type: 'cash_transfer',
                label: `Transfer Kas #${ct.transfer_number || ct.id}`,
                amount: ct.amount,
                date: formatDateOnly(ct.transfer_date)
              };
            }
          } else if (row.reconciled_reference_type === 'payroll') {
            const pr = await db('payroll_disbursements').where({ id: row.reconciled_reference_id }).first();
            if (pr) {
              referenceDisplay = {
                type: 'payroll',
                label: `Pencairan Gaji #${pr.id} (${pr.period_name || 'Payroll'})`,
                amount: pr.total_amount,
                date: formatDateOnly(pr.disbursed_at)
              };
            }
          }
        } catch (e) {
          // fallback
        }
      }

      return {
        ...row,
        is_reconciled: Boolean(row.is_reconciled),
        amount: parseFloat(row.amount || 0),
        running_balance: row.running_balance !== null ? parseFloat(row.running_balance) : null,
        transaction_date_formatted: formatDateOnly(row.transaction_date),
        reference_display: referenceDisplay
      };
    }));

    return {
      summary: {
        total_rows: totalRows,
        total_credit: totalCredit,
        total_debit: totalDebit,
        net_mutation: netMutation,
        reconciled_count: reconciledCount,
        unreconciled_count: unreconciledCount,
        reconciliation_rate: reconciliationRate
      },
      pagination: {
        current_page: page,
        per_page: perPage,
        total_pages: totalPages,
        total_records: totalRows
      },
      statements: enrichedRows
    };
  }

  /**
   * 2. Get Single Bank Statement
   */
  async getBankStatementById(schoolUnitId, id) {
    const row = await db('bank_statements')
      .join('cash_accounts', 'bank_statements.cash_account_id', 'cash_accounts.id')
      .where({
        'bank_statements.id': id,
        'bank_statements.school_unit_id': schoolUnitId
      })
      .select(
        'bank_statements.*',
        'cash_accounts.name as cash_account_name',
        'cash_accounts.bank_name',
        'cash_accounts.bank_account_number'
      )
      .first();

    if (!row) return null;

    return {
      ...row,
      is_reconciled: Boolean(row.is_reconciled),
      amount: parseFloat(row.amount || 0),
      running_balance: row.running_balance !== null ? parseFloat(row.running_balance) : null,
      transaction_date_formatted: formatDateOnly(row.transaction_date)
    };
  }

  /**
   * 3. Create Manual Bank Statement Row
   */
  async createBankStatement(schoolUnitId, data, userId = null) {
    const {
      cash_account_id,
      academic_year_id,
      transaction_date,
      journal_number,
      description,
      amount,
      dc_type,
      running_balance
    } = data;

    if (!cash_account_id || !transaction_date || !description || amount === undefined || !dc_type) {
      const err = new Error('Field cash_account_id, transaction_date, description, amount, dan dc_type wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (!['debit', 'credit'].includes(dc_type)) {
      const err = new Error("dc_type harus 'debit' (keluar) atau 'credit' (masuk)");
      err.statusCode = 422;
      throw err;
    }

    const numAmount = Math.abs(parseFloat(amount));
    if (numAmount <= 0) {
      const err = new Error('Nominal mutasi harus lebih besar dari 0');
      err.statusCode = 422;
      throw err;
    }

    // Verify cash_account belongs to unit and is of type 'bank'
    const account = await db('cash_accounts')
      .where({ id: cash_account_id, school_unit_id: schoolUnitId })
      .first();

    if (!account) {
      const err = new Error('Rekening kas/bank tidak ditemukan atau bukan milik unit sekolah ini');
      err.statusCode = 404;
      throw err;
    }

    if (account.account_kind !== 'bank') {
      const err = new Error("Rekening koran hanya dapat dicatat untuk rekening kas bertipe Bank (account_kind = 'bank'). Rekening tunai/kas kecil tidak memiliki rekening koran.");
      err.statusCode = 422;
      throw err;
    }

    const [newId] = await db('bank_statements').insert({
      school_unit_id: schoolUnitId,
      academic_year_id: academic_year_id || null,
      cash_account_id,
      transaction_date: new Date(transaction_date),
      journal_number: journal_number || null,
      description: String(description).trim(),
      amount: numAmount,
      dc_type,
      running_balance: running_balance !== undefined && running_balance !== '' ? parseFloat(running_balance) : null,
      is_reconciled: false
    });

    const actualId = newId || (await db('bank_statements').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CREATE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: actualId,
      dataAfter: { cash_account_id, transaction_date, amount: numAmount, dc_type }
    });

    return this.getBankStatementById(schoolUnitId, actualId);
  }

  /**
   * 4. Update Bank Statement Row
   */
  async updateBankStatement(schoolUnitId, id, data, userId = null) {
    const existing = await db('bank_statements')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!existing) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (existing.is_reconciled) {
      const err = new Error('Baris rekening koran yang telah berstatus sudah direkonsiliasi tidak dapat diedit. Silakan lepas rujukan rekonsiliasi terlebih dahulu.');
      err.statusCode = 422;
      throw err;
    }

    const updates = {};
    if (data.transaction_date) updates.transaction_date = new Date(data.transaction_date);
    if (data.journal_number !== undefined) updates.journal_number = data.journal_number || null;
    if (data.description) updates.description = String(data.description).trim();
    if (data.amount !== undefined) updates.amount = Math.abs(parseFloat(data.amount));
    if (data.dc_type && ['debit', 'credit'].includes(data.dc_type)) updates.dc_type = data.dc_type;
    if (data.running_balance !== undefined) updates.running_balance = data.running_balance !== '' ? parseFloat(data.running_balance) : null;
    updates.updated_at = db.fn.now();

    await db('bank_statements')
      .where({ id, school_unit_id: schoolUnitId })
      .update(updates);

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: id,
      dataBefore: existing,
      dataAfter: updates
    });

    return this.getBankStatementById(schoolUnitId, id);
  }

  /**
   * 5. Delete Bank Statement Row
   */
  async deleteBankStatement(schoolUnitId, id, userId = null) {
    const existing = await db('bank_statements')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!existing) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (existing.is_reconciled) {
      const err = new Error('Baris rekening koran yang telah berstatus sudah direkonsiliasi tidak dapat dihapus. Silakan lepas rujukan rekonsiliasi terlebih dahulu.');
      err.statusCode = 422;
      throw err;
    }

    await db('bank_statements')
      .where({ id, school_unit_id: schoolUnitId })
      .delete();

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'DELETE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: id,
      dataBefore: existing
    });

    return { id, deleted: true };
  }

  /**
   * 6. Reconcile Statement (Tautkan Rujukan Transaksi Internal)
   */
  async reconcileStatement(schoolUnitId, id, data, userId = null) {
    const { reference_type, reference_id, notes } = data;

    if (!reference_type || !reference_id) {
      const err = new Error('Field reference_type dan reference_id wajib diisi untuk rekonsiliasi');
      err.statusCode = 422;
      throw err;
    }

    const validTypes = ['student_bill_payment', 'other_income', 'expense', 'payroll', 'cash_transfer', 'other'];
    if (!validTypes.includes(reference_type)) {
      const err = new Error(`reference_type tidak valid. Pilihan: ${validTypes.join(', ')}`);
      err.statusCode = 422;
      throw err;
    }

    const statement = await db('bank_statements')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!statement) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const now = new Date();
    await db('bank_statements')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        is_reconciled: true,
        reconciled_reference_type: reference_type,
        reconciled_reference_id: reference_id,
        reconciled_at: now,
        reconciled_by: userId,
        reconciliation_notes: notes || null,
        updated_at: now
      });

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'RECONCILE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: id,
      dataAfter: {
        is_reconciled: true,
        reference_type,
        reference_id,
        notes
      }
    });

    return this.getBankStatementById(schoolUnitId, id);
  }

  /**
   * 7. Unreconcile Statement (Lepas Tautan Rekonsiliasi)
   */
  async unreconcileStatement(schoolUnitId, id, userId = null) {
    const statement = await db('bank_statements')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!statement) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const now = new Date();
    await db('bank_statements')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        is_reconciled: false,
        reconciled_reference_type: null,
        reconciled_reference_id: null,
        reconciled_at: null,
        reconciled_by: null,
        reconciliation_notes: null,
        updated_at: now
      });

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UNRECONCILE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: id,
      dataBefore: {
        reconciled_reference_type: statement.reconciled_reference_type,
        reconciled_reference_id: statement.reconciled_reference_id
      },
      dataAfter: { is_reconciled: false }
    });

    return this.getBankStatementById(schoolUnitId, id);
  }

  /**
   * 8. Get Candidates for Reconciliation (Pencocokan Cerdas Transaksi Internal)
   */
  async getReconcileCandidates(schoolUnitId, id) {
    const statement = await db('bank_statements')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!statement) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const stmtDate = new Date(statement.transaction_date);
    const startDate = new Date(stmtDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = new Date(stmtDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const targetAmount = parseFloat(statement.amount);

    const candidates = [];

    // If Credit (Uang Masuk di Bank): search bill_payments & other_incomes
    if (statement.dc_type === 'credit') {
      // 1. Bill Payments
      const payments = await db('bill_payments')
        .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
        .where('student_bills.school_unit_id', schoolUnitId)
        .where('bill_payments.paid_at', '>=', `${startDate} 00:00:00`)
        .where('bill_payments.paid_at', '<=', `${endDate} 23:59:59`)
        .select(
          'bill_payments.id',
          'bill_payments.receipt_number',
          'bill_payments.amount',
          'bill_payments.paid_at',
          'bill_payments.notes',
          'student_bills.student_id'
        );

      payments.forEach(p => {
        const pAmt = parseFloat(p.amount);
        const diffDays = Math.abs(Math.floor((new Date(p.paid_at) - stmtDate) / (1000 * 60 * 60 * 24)));
        const isExactAmount = Math.abs(pAmt - targetAmount) < 0.01;

        if (isExactAmount || Math.abs(pAmt - targetAmount) <= 1000) {
          candidates.push({
            reference_type: 'student_bill_payment',
            reference_id: p.id,
            title: `Pembayaran Tagihan Siswa (${p.receipt_number})`,
            amount: pAmt,
            date: formatDateOnly(p.paid_at),
            diff_days: diffDays,
            confidence: isExactAmount && diffDays === 0 ? 'high' : (isExactAmount ? 'medium' : 'low'),
            notes: p.notes
          });
        }
      });

      // 2. Other Incomes
      const otherIncomes = await db('other_incomes')
        .where('school_unit_id', schoolUnitId)
        .where('received_at', '>=', `${startDate} 00:00:00`)
        .where('received_at', '<=', `${endDate} 23:59:59`)
        .select('id', 'notes', 'amount', 'received_at');

      otherIncomes.forEach(inc => {
        const incAmt = parseFloat(inc.amount);
        const diffDays = Math.abs(Math.floor((new Date(inc.received_at) - stmtDate) / (1000 * 60 * 60 * 24)));
        const isExactAmount = Math.abs(incAmt - targetAmount) < 0.01;

        if (isExactAmount || Math.abs(incAmt - targetAmount) <= 1000) {
          candidates.push({
            reference_type: 'other_income',
            reference_id: inc.id,
            title: `Penerimaan Non-SPP #${inc.id} (${inc.notes || 'Penerimaan'})`,
            amount: incAmt,
            date: formatDateOnly(inc.received_at),
            diff_days: diffDays,
            confidence: isExactAmount && diffDays === 0 ? 'high' : (isExactAmount ? 'medium' : 'low')
          });
        }
      });
    }

    // If Debit (Uang Keluar di Bank): search expenses & payroll & cash transfers
    if (statement.dc_type === 'debit') {
      // 1. Expenses
      const expenses = await db('expenses')
        .where('school_unit_id', schoolUnitId)
        .where('expense_date', '>=', startDate)
        .where('expense_date', '<=', endDate)
        .select('id', 'proof_number', 'item_name', 'total_amount', 'expense_date');

      expenses.forEach(exp => {
        const expAmt = parseFloat(exp.total_amount);
        const diffDays = Math.abs(Math.floor((new Date(exp.expense_date) - stmtDate) / (1000 * 60 * 60 * 24)));
        const isExactAmount = Math.abs(expAmt - targetAmount) < 0.01;

        if (isExactAmount || Math.abs(expAmt - targetAmount) <= 1000) {
          candidates.push({
            reference_type: 'expense',
            reference_id: exp.id,
            title: `Pengeluaran: ${exp.item_name} (${exp.proof_number || exp.id})`,
            amount: expAmt,
            date: formatDateOnly(exp.expense_date),
            diff_days: diffDays,
            confidence: isExactAmount && diffDays === 0 ? 'high' : (isExactAmount ? 'medium' : 'low')
          });
        }
      });

      // 2. Cash Transfers
      const transfers = await db('cash_transfers')
        .where('school_unit_id', schoolUnitId)
        .where('transfer_date', '>=', startDate)
        .where('transfer_date', '<=', endDate)
        .select('id', 'transfer_number', 'amount', 'transfer_date', 'notes');

      transfers.forEach(tr => {
        const trAmt = parseFloat(tr.amount);
        const diffDays = Math.abs(Math.floor((new Date(tr.transfer_date) - stmtDate) / (1000 * 60 * 60 * 24)));
        const isExactAmount = Math.abs(trAmt - targetAmount) < 0.01;

        if (isExactAmount || Math.abs(trAmt - targetAmount) <= 1000) {
          candidates.push({
            reference_type: 'cash_transfer',
            reference_id: tr.id,
            title: `Transfer Kas: ${tr.transfer_number || tr.id}`,
            amount: trAmt,
            date: formatDateOnly(tr.transfer_date),
            diff_days: diffDays,
            confidence: isExactAmount && diffDays === 0 ? 'high' : (isExactAmount ? 'medium' : 'low'),
            notes: tr.notes
          });
        }
      });
    }

    // Sort by confidence ('high' first) and diff_days (closest first)
    candidates.sort((a, b) => {
      const confScore = { high: 3, medium: 2, low: 1 };
      if (confScore[b.confidence] !== confScore[a.confidence]) {
        return confScore[b.confidence] - confScore[a.confidence];
      }
      return a.diff_days - b.diff_days;
    });

    return {
      statement_id: Number(id),
      statement_amount: targetAmount,
      statement_date: formatDateOnly(stmtDate),
      statement_dc: statement.dc_type,
      candidates
    };
  }

  /**
   * 9. Import Bank Statements Batch from Parsed Rows or Base64 Excel
   */
  async importBankStatements(schoolUnitId, data, userId = null) {
    const { cash_account_id, academic_year_id, rows = [], file_base64, column_mapping = {} } = data;

    if (!cash_account_id) {
      const err = new Error('Rekening Bank tujuan (cash_account_id) wajib dipilih');
      err.statusCode = 422;
      throw err;
    }

    const account = await db('cash_accounts')
      .where({ id: cash_account_id, school_unit_id: schoolUnitId })
      .first();

    if (!account) {
      const err = new Error('Rekening kas/bank tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (account.account_kind !== 'bank') {
      const err = new Error("Import rekening koran hanya diperbolehkan untuk rekening bertipe Bank (account_kind = 'bank').");
      err.statusCode = 422;
      throw err;
    }

    let parsedRows = rows;

    // Parse Excel from Base64 if rows not provided directly
    if ((!parsedRows || parsedRows.length === 0) && file_base64) {
      const buffer = Buffer.from(file_base64, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      parsedRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    if (!parsedRows || parsedRows.length === 0) {
      const err = new Error('File Excel tidak memiliki data baris mutasi untuk diimpor');
      err.statusCode = 422;
      throw err;
    }

    const batchId = `BATCH-${schoolUnitId}-${Date.now().toString().slice(-6)}`;
    const recordsToInsert = [];
    const errors = [];

    parsedRows.forEach((row, idx) => {
      const rowNum = idx + 2; // considering 1 header row

      // Read columns using mapping or common auto-detect keys
      const rawDate = row[column_mapping.date_key || 'Tanggal'] || row['tanggal'] || row['Date'] || row['date'] || row['Tgl'];
      const rawDesc = row[column_mapping.desc_key || 'Uraian'] || row['uraian'] || row['Keterangan'] || row['keterangan'] || row['Description'] || row['desc'];
      const rawRef = row[column_mapping.ref_key || 'No Referensi'] || row['no_referensi'] || row['No. Jurnal'] || row['Reff'] || row['Ref'] || '';

      // Amount detection (could be separate Debit/Credit columns or Amount + DC column)
      let rawDebit = row[column_mapping.debit_key || 'Debit'] || row['debit'] || row['DB'] || row['Keluar'] || 0;
      let rawCredit = row[column_mapping.credit_key || 'Kredit'] || row['kredit'] || row['CR'] || row['Masuk'] || 0;
      let rawAmount = row[column_mapping.amount_key || 'Nominal'] || row['nominal'] || row['Amount'] || 0;
      let rawDcType = row[column_mapping.dc_key || 'Tipe'] || row['tipe'] || row['D/C'] || row['DC'] || '';
      let rawBalance = row[column_mapping.balance_key || 'Saldo'] || row['saldo'] || row['Balance'] || null;

      if (!rawDate) {
        errors.push(`Baris ${rowNum}: Tanggal transaksi kosong`);
        return;
      }
      if (!rawDesc) {
        errors.push(`Baris ${rowNum}: Uraian transaksi kosong`);
        return;
      }

      // Normalize date
      let parsedDate = null;
      if (typeof rawDate === 'number') {
        // Excel serial date number
        parsedDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      } else {
        parsedDate = new Date(rawDate);
      }

      if (isNaN(parsedDate.getTime())) {
        errors.push(`Baris ${rowNum}: Format tanggal (${rawDate}) tidak valid`);
        return;
      }

      // Determine dc_type and amount
      let dc = 'credit';
      let finalAmt = 0;

      const dVal = Math.abs(parseFloat(String(rawDebit).replace(/[^0-9.-]+/g, '')) || 0);
      const cVal = Math.abs(parseFloat(String(rawCredit).replace(/[^0-9.-]+/g, '')) || 0);
      const aVal = Math.abs(parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, '')) || 0);

      if (cVal > 0) {
        dc = 'credit';
        finalAmt = cVal;
      } else if (dVal > 0) {
        dc = 'debit';
        finalAmt = dVal;
      } else if (aVal > 0) {
        finalAmt = aVal;
        const dcStr = String(rawDcType).trim().toUpperCase();
        if (['D', 'DB', 'DEBIT', 'KELUAR'].includes(dcStr)) {
          dc = 'debit';
        } else {
          dc = 'credit';
        }
      }

      if (finalAmt <= 0) {
        errors.push(`Baris ${rowNum}: Nominal mutasi harus lebih besar dari 0`);
        return;
      }

      const balanceNum = rawBalance !== null && rawBalance !== ''
        ? parseFloat(String(rawBalance).replace(/[^0-9.-]+/g, ''))
        : null;

      recordsToInsert.push({
        school_unit_id: schoolUnitId,
        academic_year_id: academic_year_id || null,
        cash_account_id,
        transaction_date: parsedDate,
        journal_number: rawRef ? String(rawRef).trim() : null,
        description: String(rawDesc).trim(),
        amount: finalAmt,
        dc_type: dc,
        running_balance: !isNaN(balanceNum) ? balanceNum : null,
        is_reconciled: false,
        import_batch_id: batchId
      });
    });

    if (recordsToInsert.length === 0) {
      const err = new Error(`Tidak ada baris data valid yang dapat diimpor. Ditemukan ${errors.length} kesalahan format.`);
      err.statusCode = 422;
      err.errors = errors;
      throw err;
    }

    // Chunked insert
    const chunkSize = 100;
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
      await db('bank_statements').insert(recordsToInsert.slice(i, i + chunkSize));
    }

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'IMPORT_BANK_STATEMENTS',
      entityType: 'bank_statement',
      entityId: 0,
      dataAfter: {
        batch_id: batchId,
        cash_account_id,
        imported_count: recordsToInsert.length,
        skipped_count: errors.length
      }
    });

    return {
      batch_id: batchId,
      imported_count: recordsToInsert.length,
      skipped_count: errors.length,
      errors: errors.slice(0, 10)
    };
  }

  /**
   * 10. Export Statements to Excel (.xlsx)
   */
  async exportBankStatementsExcel(schoolUnitId, filters = {}) {
    const data = await this.listBankStatements(schoolUnitId, { ...filters, no_pagination: true });
    const statements = data.statements || [];

    const wb = XLSX.utils.book_new();

    const headers = [
      'No',
      'Tanggal Transaksi',
      'No. Referensi / Mutasi',
      'Uraian Mutasi Bank',
      'Tipe (D/C)',
      'Nominal Masuk (Kredit)',
      'Nominal Keluar (Debit)',
      'Saldo Berjalan',
      'Status Rekonsiliasi',
      'Kategori Transaksi Sistem',
      'Referensi Sistem',
      'Catatan Rekonsiliasi'
    ];

    const rows = [
      ['LAPORAN MUTASI REKENING KORAN & REKONSILIASI BANK'],
      [`Satuan Pendidikan ID: ${schoolUnitId}`],
      [`Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}`],
      [],
      headers
    ];

    statements.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.transaction_date_formatted,
        s.journal_number || '-',
        s.description,
        s.dc_type === 'credit' ? 'CR (Masuk)' : 'DB (Keluar)',
        s.dc_type === 'credit' ? s.amount : 0,
        s.dc_type === 'debit' ? s.amount : 0,
        s.running_balance !== null ? s.running_balance : '-',
        s.is_reconciled ? 'Sudah Direkonsiliasi' : 'Belum Cocok',
        s.reconciled_reference_type || '-',
        s.reference_display?.label || (s.reconciled_reference_id ? `#${s.reconciled_reference_id}` : '-'),
        s.reconciliation_notes || '-'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 18 }, // Tanggal
      { wch: 20 }, // No Ref
      { wch: 35 }, // Uraian
      { wch: 12 }, // D/C
      { wch: 18 }, // Kredit
      { wch: 18 }, // Debit
      { wch: 18 }, // Saldo
      { wch: 20 }, // Status
      { wch: 22 }, // Kategori
      { wch: 30 }, // Ref Sistem
      { wch: 25 }  // Catatan
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Rekening Koran');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 11. Generate Sample Excel Template for Import
   */
  getTemplateExcel() {
    const wb = XLSX.utils.book_new();

    const headers = [
      'Tanggal',
      'No Referensi',
      'Uraian',
      'Debit',
      'Kredit',
      'Saldo'
    ];

    const sampleRows = [
      headers,
      ['2026-07-02', 'TRF/20260702/001', 'Setoran SPP Ahmad Fauzi', '', 1000000, 25000000],
      ['2026-07-05', 'TRF/20260705/099', 'Pembayaran Uang Seragam Santri', '', 2500000, 27500000],
      ['2026-07-10', 'DEB/20260710/012', 'Biaya Administrasi Bank Bulanan', 25000, '', 27475000],
      ['2026-07-12', 'TRF/20260712/045', 'Transfer Belanja Pengadaan ATK', 450000, '', 27025000]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Template Rekening Koran');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = new BankStatementsService();
