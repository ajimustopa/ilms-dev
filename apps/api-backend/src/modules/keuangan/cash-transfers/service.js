/**
 * Cash Transfers Service for Keuangan Module
 * apps/api-backend/src/modules/keuangan/cash-transfers/service.js
 * 
 * Melayani mutasi transfer saldo internal antar jenis kas lembaga (misal: Kas Tunai ke Bank, atau Bank ke Bank)
 * dengan pencatatan jurnal berpasangan otomatis (internal_cash_transfer) dan audit logs finansial.
 * 
 * CATATAN PENTING: Mutasi ini HANYA memindahkan saldo fisik/rekening kas dan TIDAK mempengaruhi
 * alokasi saldo sumber dana (fund balances).
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');

/**
 * Generate nomor mutasi transfer kas otomatis: TRF-YYYYMMDD-00001
 */
async function generateTransferNumber(trx, transferDate = null) {
  const dateObj = transferDate ? new Date(transferDate) : new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `TRF-${dateStr}-`;

  const lastEntry = await trx('cash_transfers')
    .where('transfer_number', 'like', `${prefix}%`)
    .orderBy('id', 'desc')
    .first();

  let counter = 1;
  if (lastEntry && lastEntry.transfer_number) {
    const parts = lastEntry.transfer_number.split('-');
    const lastCounter = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastCounter)) {
      counter = lastCounter + 1;
    }
  }

  return `${prefix}${String(counter).padStart(5, '0')}`;
}

class CashTransfersService {
  /**
   * Menampilkan riwayat transfer antar kas
   */
  async listTransfers(schoolUnitId, query = {}) {
    const { from_date, to_date, cash_account_id, search, page = 1, limit = 20 } = query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    let builder = db('cash_transfers')
      .leftJoin('cash_accounts as from_acc', 'cash_transfers.from_cash_account_id', 'from_acc.id')
      .leftJoin('cash_accounts as to_acc', 'cash_transfers.to_cash_account_id', 'to_acc.id')
      .leftJoin('bank_statements as from_bs', 'cash_transfers.from_bank_statement_id', 'from_bs.id')
      .leftJoin('bank_statements as to_bs', 'cash_transfers.to_bank_statement_id', 'to_bs.id')
      .select(
        'cash_transfers.*',
        'from_acc.name as from_cash_account_name',
        'from_acc.account_kind as from_account_kind',
        'from_acc.bank_name as from_bank_name',
        'from_acc.bank_account_number as from_bank_account_number',
        'from_bs.description as from_bank_statement_desc',
        'to_acc.name as to_cash_account_name',
        'to_acc.account_kind as to_account_kind',
        'to_acc.bank_name as to_bank_name',
        'to_acc.bank_account_number as to_bank_account_number',
        'to_bs.description as to_bank_statement_desc'
      );

    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      builder = builder.where('cash_transfers.school_unit_id', schoolUnitId);
    }

    if (from_date) {
      builder = builder.where('cash_transfers.transfer_date', '>=', from_date);
    }
    if (to_date) {
      builder = builder.where('cash_transfers.transfer_date', '<=', to_date);
    }
    if (cash_account_id) {
      builder = builder.where(function() {
        this.where('cash_transfers.from_cash_account_id', cash_account_id)
          .orWhere('cash_transfers.to_cash_account_id', cash_account_id);
      });
    }
    if (search) {
      const q = `%${search}%`;
      builder = builder.where(function() {
        this.where('cash_transfers.transfer_number', 'like', q)
          .orWhere('cash_transfers.reference_number', 'like', q)
          .orWhere('cash_transfers.reason', 'like', q)
          .orWhere('from_acc.name', 'like', q)
          .orWhere('to_acc.name', 'like', q);
      });
    }

    const totalRes = await builder.clone().count('cash_transfers.id as cnt').first();
    const total = parseInt(totalRes?.cnt || 0, 10);

    const transfers = await builder
      .orderBy('cash_transfers.transfer_date', 'desc')
      .orderBy('cash_transfers.id', 'desc')
      .limit(parseInt(limit, 10))
      .offset(offset);

    // Ambil info nomor jurnal terkait
    const transferIds = transfers.map(t => t.id);
    let journalMap = {};
    if (transferIds.length > 0) {
      const journals = await db('journal_entries')
        .where('source_type', 'internal_cash_transfer')
        .whereIn('source_id', transferIds)
        .select('id', 'journal_number', 'source_id');
      
      journals.forEach(j => {
        journalMap[j.source_id] = j;
      });
    }

    const data = transfers.map(t => {
      const j = journalMap[t.id];
      return {
        id: t.id,
        transfer_number: t.transfer_number,
        transfer_date: typeof t.transfer_date === 'string' ? t.transfer_date.slice(0, 10) : t.transfer_date?.toISOString().slice(0, 10),
        amount: parseFloat(t.amount) || 0,
        from_cash_account_id: t.from_cash_account_id,
        from_cash_account_name: t.from_cash_account_name,
        from_account_kind: t.from_account_kind,
        from_bank_name: t.from_bank_name,
        from_bank_account_number: t.from_bank_account_number,
        from_bank_statement_id: t.from_bank_statement_id,
        from_bank_statement_desc: t.from_bank_statement_desc,
        to_cash_account_id: t.to_cash_account_id,
        to_cash_account_name: t.to_cash_account_name,
        to_account_kind: t.to_account_kind,
        to_bank_name: t.to_bank_name,
        to_bank_account_number: t.to_bank_account_number,
        to_bank_statement_id: t.to_bank_statement_id,
        to_bank_statement_desc: t.to_bank_statement_desc,
        reference_number: t.reference_number,
        reason: t.reason,
        journal_id: j?.id || null,
        journal_number: j?.journal_number || null,
        created_at: t.created_at
      };
    });

    return {
      data,
      meta: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        total_pages: Math.ceil(total / parseInt(limit, 10)) || 1
      }
    };
  }

  /**
   * Melakukan transfer saldo antar akun kas
   */
  async createTransfer(schoolUnitId, data, userId = null) {
    const {
      from_cash_account_id,
      from_bank_statement_id = null,
      to_cash_account_id,
      to_bank_statement_id = null,
      amount,
      transfer_date = new Date(),
      reference_number = null,
      notes,
      reason
    } = data;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      const err = new Error('Nominal pemindahan kas harus lebih besar dari 0');
      err.statusCode = 422;
      throw err;
    }

    if (!from_cash_account_id || !to_cash_account_id) {
      const err = new Error('Kas asal dan kas tujuan wajib dipilih');
      err.statusCode = 422;
      throw err;
    }

    if (String(from_cash_account_id) === String(to_cash_account_id)) {
      const err = new Error('Kas asal dan kas tujuan tidak boleh sama');
      err.statusCode = 422;
      throw err;
    }

    const transferReason = reason || notes || 'Pemindahan kas internal lembaga';
    const effectiveUnitId = (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation')
      ? parseInt(schoolUnitId, 10)
      : (data.school_unit_id || 1);

    const fromAccount = await db('cash_accounts')
      .where({ id: from_cash_account_id })
      .first();
    const toAccount = await db('cash_accounts')
      .where({ id: to_cash_account_id })
      .first();

    if (!fromAccount || !toAccount) {
      const err = new Error('Akun kas asal atau tujuan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    return await db.transaction(async (trx) => {
      const transferNumber = await generateTransferNumber(trx, transfer_date);

      const [transferId] = await trx('cash_transfers').insert({
        school_unit_id: effectiveUnitId,
        transfer_number: transferNumber,
        transfer_date: typeof transfer_date === 'string' ? transfer_date.slice(0, 10) : transfer_date.toISOString().slice(0, 10),
        from_cash_account_id,
        from_bank_statement_id: from_bank_statement_id ? parseInt(from_bank_statement_id, 10) : null,
        to_cash_account_id,
        to_bank_statement_id: to_bank_statement_id ? parseInt(to_bank_statement_id, 10) : null,
        amount: numericAmount,
        reference_number: reference_number || null,
        reason: transferReason,
        created_by: userId || null
      });

      // Update rekonsiliasi mutasi rekening koran kas asal jika ada
      if (from_bank_statement_id) {
        await trx('bank_statements')
          .where({ id: from_bank_statement_id })
          .update({
            is_reconciled: 1,
            reconciled_reference_type: 'cash_transfer',
            reconciled_reference_id: transferId,
            reconciled_at: new Date(),
            reconciled_by: userId || null,
            reconciliation_notes: `Pemindahan Kas Keluar ke ${toAccount.name} (${transferNumber})`
          });
      }

      // Update rekonsiliasi mutasi rekening koran kas tujuan jika ada
      if (to_bank_statement_id) {
        await trx('bank_statements')
          .where({ id: to_bank_statement_id })
          .update({
            is_reconciled: 1,
            reconciled_reference_type: 'cash_transfer',
            reconciled_reference_id: transferId,
            reconciled_at: new Date(),
            reconciled_by: userId || null,
            reconciliation_notes: `Pemindahan Kas Masuk dari ${fromAccount.name} (${transferNumber})`
          });
      }

      // Catat Auto Jurnal: Debit Kas Tujuan, Kredit Kas Asal
      // Note: sourceType = 'internal_cash_transfer', sourceId = transferId
      const debitAccountId = toAccount.account_id || null;
      const creditAccountId = fromAccount.account_id || null;

      const journalResult = await recordJournal({
        schoolUnitId: effectiveUnitId,
        transactionCode: 'internal_cash_transfer',
        amount: numericAmount,
        sourceType: 'internal_cash_transfer',
        sourceId: transferId,
        journalDate: transfer_date,
        overrideDebitAccountId: debitAccountId,
        overrideCreditAccountId: creditAccountId,
        overrideCashAccountId: from_cash_account_id,
        description: `Transfer Kas: ${fromAccount.name} -> ${toAccount.name} (${transferReason}) [${transferNumber}]`,
        userId,
        trx
      });

      await logFinanceAudit({
        schoolUnitId: effectiveUnitId,
        userId,
        action: 'INTERNAL_CASH_TRANSFER',
        entityType: 'cash_transfers',
        entityId: transferId,
        dataAfter: {
          transfer_number: transferNumber,
          from_cash_account_id,
          from_cash_account_name: fromAccount.name,
          from_bank_statement_id: from_bank_statement_id || null,
          to_cash_account_id,
          to_cash_account_name: toAccount.name,
          to_bank_statement_id: to_bank_statement_id || null,
          amount: numericAmount,
          reason: transferReason,
          reference_number: reference_number || null,
          journal_id: journalResult?.id || null
        }
      });

      return {
        message: `Pemindahan kas sebesar Rp ${numericAmount.toLocaleString('id-ID')} dari ${fromAccount.name} ke ${toAccount.name} berhasil dicatat (${transferNumber})`,
        data: {
          id: transferId,
          transfer_number: transferNumber,
          from_cash_account: fromAccount.name,
          to_cash_account: toAccount.name,
          amount: numericAmount,
          transfer_date,
          reason: transferReason,
          journal_number: journalResult?.journal_number || null
        }
      };
    });
  }
}

module.exports = new CashTransfersService();
