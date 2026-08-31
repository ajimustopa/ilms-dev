/**
 * Payments Service for Keuangan Module
 * Covers Features #17, #18, #19, #20, #21
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');
const { terbilang } = require('../common/terbilang');
const crossModuleServices = require('../common/crossModuleServices');

class PaymentsService {
  // ============================================================
  // 1. CATAT PEMBAYARAN TAGIHAN (Fitur #17)
  // ============================================================

  async generateReceiptNumber(trx, schoolUnitId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `KWT-${schoolUnitId}-${today}-`;
    const lastPayment = await trx('bill_payments')
      .where('receipt_number', 'like', `${prefix}%`)
      .orderBy('id', 'desc')
      .first();

    let counter = 1;
    if (lastPayment && lastPayment.receipt_number) {
      const parts = lastPayment.receipt_number.split('-');
      const lastCounter = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastCounter)) counter = lastCounter + 1;
    }
    return `${prefix}${String(counter).padStart(4, '0')}`;
  }

  async recordBillPayment(schoolUnitId, data, userId = null, existingTrx = null) {
    const exec = async (trx) => {
      const bill = await trx('student_bills')
        .where({ id: data.student_bill_id, school_unit_id: schoolUnitId })
        .first();

      if (!bill) {
        return { error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan' };
      }

      if (bill.status === 'paid') {
        return { error: 'CONFLICT', message: 'Tagihan ini sudah berstatus lunas' };
      }

      if (bill.status === 'cancelled') {
        return { error: 'CONFLICT', message: 'Tagihan ini telah dibatalkan' };
      }

      // Hitung total akumulasi pembayaran
      const existingPayments = await trx('bill_payments')
        .where('student_bill_id', bill.id)
        .sum('amount as total_paid')
        .first();
      const currentPaid = existingPayments?.total_paid ? parseFloat(existingPayments.total_paid) : 0;
      const paymentAmount = parseFloat(data.amount);
      const newTotalPaid = currentPaid + paymentAmount;
      const billAmount = parseFloat(bill.amount);

      const billStatusAfter = newTotalPaid >= billAmount ? 'paid' : 'partially_paid';
      const receiptNumber = await this.generateReceiptNumber(trx, schoolUnitId);

      const paidAt = data.paid_at || new Date().toISOString();

      const [paymentId] = await trx('bill_payments').insert({
        student_bill_id: bill.id,
        cash_account_id: data.cash_account_id,
        paid_at: paidAt,
        amount: paymentAmount,
        payment_method: data.payment_method || 'cash',
        receipt_number: receiptNumber,
        notes: data.notes || null
      });

      const actualPaymentId = paymentId || (await trx('bill_payments').where({ receipt_number: receiptNumber }).first()).id;

      // Update status tagihan
      await trx('student_bills')
        .where({ id: bill.id })
        .update({ status: billStatusAfter });

      // Trigger jurnal otomatis via journalEngine
      try {
        await recordJournal({
          schoolUnitId,
          transactionCode: 'student_bill_payment',
          amount: paymentAmount,
          sourceType: 'student_bill_payment',
          sourceId: actualPaymentId,
          description: `Pembayaran tagihan #${bill.id} (${receiptNumber})`,
          journalDate: paidAt,
          trx
        });
      } catch (journalErr) {
        console.warn('Auto journal skipped or error:', journalErr.message);
      }

      const paymentRecord = await trx('bill_payments').where({ id: actualPaymentId }).first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'RECORD_BILL_PAYMENT',
        entityType: 'bill_payment',
        entityId: actualPaymentId,
        dataAfter: paymentRecord,
        trx
      });

      return {
        data: {
          id: actualPaymentId,
          student_bill_id: bill.id,
          amount: paymentAmount,
          status_after: billStatusAfter,
          receipt_number: receiptNumber,
          paid_at: paidAt
        }
      };
    };

    if (existingTrx) {
      return exec(existingTrx);
    }
    return db.transaction(exec);
  }

  // ============================================================
  // 2. EDIT / KOREKSI PEMBAYARAN (Fitur #18)
  // ============================================================

  async getPaymentById(schoolUnitId, id) {
    return db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .where({ 'bill_payments.id': id, 'student_bills.school_unit_id': schoolUnitId })
      .select('bill_payments.*', 'student_bills.school_unit_id', 'student_bills.amount as bill_amount')
      .first();
  }

  async getPaymentHistory(schoolUnitId, id) {
    const payment = await this.getPaymentById(schoolUnitId, id);
    if (!payment) return null;
    return {
      payment_id: payment.id,
      current_data: payment,
      previous_data: payment.previous_data ? (typeof payment.previous_data === 'string' ? JSON.parse(payment.previous_data) : payment.previous_data) : null,
      correction_reason: payment.correction_reason
    };
  }

  async correctPayment(schoolUnitId, id, data, userId = null) {
    const { amount, paid_at, correction_reason } = data;
    if (!correction_reason) {
      return { error: 'VALIDATION', message: 'Alasan koreksi (correction_reason) wajib diisi' };
    }

    return db.transaction(async (trx) => {
      const payment = await trx('bill_payments')
        .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
        .where({ 'bill_payments.id': id, 'student_bills.school_unit_id': schoolUnitId })
        .select('bill_payments.*', 'student_bills.school_unit_id', 'student_bills.amount as bill_amount')
        .first();

      if (!payment) return { error: 'NOT_FOUND', message: 'Pembayaran tidak ditemukan' };

      const previousSnapshot = {
        amount: payment.amount,
        paid_at: payment.paid_at,
        cash_account_id: payment.cash_account_id,
        payment_method: payment.payment_method
      };

      const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(payment.amount);
      const newPaidAt = paid_at || payment.paid_at;

      await trx('bill_payments')
        .where({ id })
        .update({
          amount: newAmount,
          paid_at: newPaidAt,
          previous_data: JSON.stringify(previousSnapshot),
          correction_reason: correction_reason
        });

      // Recalculate status tagihan
      const allPayments = await trx('bill_payments')
        .where('student_bill_id', payment.student_bill_id)
        .sum('amount as total_paid')
        .first();
      const totalPaid = allPayments?.total_paid ? parseFloat(allPayments.total_paid) : 0;
      const billStatus = totalPaid >= parseFloat(payment.bill_amount) ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');

      await trx('student_bills')
        .where({ id: payment.student_bill_id })
        .update({ status: billStatus });

      const updated = await trx('bill_payments').where({ id }).first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CORRECT_BILL_PAYMENT',
        entityType: 'bill_payment',
        entityId: id,
        dataBefore: payment,
        dataAfter: updated,
        trx
      });

      return { data: updated };
    });
  }

  // ============================================================
  // 3. CETAK KWITANSI PEMBAYARAN (Fitur #19)
  // ============================================================

  async getReceiptData(schoolUnitId, paymentId) {
    const payment = await db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .leftJoin('cash_accounts', 'bill_payments.cash_account_id', 'cash_accounts.id')
      .where({ 'bill_payments.id': paymentId, 'student_bills.school_unit_id': schoolUnitId })
      .select(
        'bill_payments.*',
        'student_bills.student_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'fee_types.name as fee_type_name',
        'cash_accounts.name as cash_account_name'
      )
      .first();

    if (!payment) return null;

    let receiptNumber = payment.receipt_number;
    if (!receiptNumber) {
      receiptNumber = await this.generateReceiptNumber(db, schoolUnitId);
      await db('bill_payments').where({ id: paymentId }).update({ receipt_number: receiptNumber });
      payment.receipt_number = receiptNumber;
    }

    const student = await crossModuleServices.getStudent(payment.student_id);
    const amountInWords = terbilang(payment.amount);

    return {
      receipt_number: payment.receipt_number,
      payment_id: payment.id,
      paid_at: payment.paid_at,
      amount: parseFloat(payment.amount),
      amount_in_words: amountInWords,
      payment_method: payment.payment_method,
      student: {
        id: payment.student_id,
        name: student?.full_name || `Siswa ID ${payment.student_id}`,
        nis: student?.nis || '-'
      },
      payment_for: `${payment.fee_type_name} (Periode: ${payment.period_month ? payment.period_month + '/' : ''}${payment.period_year})`,
      cash_account_name: payment.cash_account_name
    };
  }

  // ============================================================
  // 4. INTEGRASI PAYMENT GATEWAY (Fitur #20)
  // ============================================================

  async checkoutGateway(schoolUnitId, data) {
    const { student_bill_id, channel = 'qris' } = data;
    const bill = await db('student_bills')
      .where({ id: student_bill_id, school_unit_id: schoolUnitId })
      .first();

    if (!bill) return { error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan' };

    const providerReference = `PG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [pgtId] = await db('payment_gateway_transactions').insert({
      provider: 'midtrans_or_xendit',
      provider_reference: providerReference,
      channel: channel,
      amount: bill.amount,
      status: 'pending'
    });

    return {
      data: {
        transaction_id: pgtId,
        provider_reference: providerReference,
        amount: bill.amount,
        channel,
        payment_url: `https://mock-gateway.aldepos.sch.id/pay/${providerReference}`,
        status: 'pending'
      }
    };
  }

  async handleGatewayCallback(callbackPayload) {
    const { provider_reference, status } = callbackPayload;
    const pgt = await db('payment_gateway_transactions')
      .where({ provider_reference })
      .first();

    if (!pgt) return { error: 'NOT_FOUND', message: 'Transaksi gateway tidak ditemukan' };

    await db('payment_gateway_transactions')
      .where({ id: pgt.id })
      .update({
        status: status || 'success',
        callback_payload: JSON.stringify(callbackPayload)
      });

    return { data: { id: pgt.id, status: status || 'success' } };
  }

  async listGatewayTransactions(status = null) {
    let query = db('payment_gateway_transactions');
    if (status) query = query.where('status', status);
    return query.orderBy('created_at', 'desc');
  }

  // ============================================================
  // 5. REKONSILIASI PEMBAYARAN PPDB & KANTIN (Fitur #21)
  // ============================================================

  async listReconciliations(schoolUnitId, filters = {}) {
    let query = db('payment_reconciliations').where('school_unit_id', schoolUnitId);
    if (filters.source_module) {
      query = query.where('source_module', filters.source_module);
    }
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    return query.orderBy('created_at', 'desc');
  }

  async matchReconciliation(schoolUnitId, id, billPaymentId = null, userId = null) {
    const rec = await db('payment_reconciliations')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!rec) return null;

    await db('payment_reconciliations')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'matched',
        reconciled_at: db.fn.now()
      });

    return db('payment_reconciliations').where({ id }).first();
  }

  async flagDiscrepancy(schoolUnitId, id, notes, userId = null) {
    const rec = await db('payment_reconciliations')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!rec) return null;

    await db('payment_reconciliations')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'discrepancy'
      });

    return db('payment_reconciliations').where({ id }).first();
  }

  async ingestReconciliationInternal(data) {
    const { school_unit_id = 1, source_module, source_reference, amount } = data;

    const [id] = await db('payment_reconciliations').insert({
      school_unit_id,
      source_module,
      source_reference,
      amount,
      status: 'pending'
    });

    return db('payment_reconciliations').where({ id }).first();
  }

  // ============================================================
  // 6. BUKTI TRANSFER MANUAL & VERIFIKASI (Fitur Pengganti Payment Gateway)
  // ============================================================

  async listPaymentProofs(schoolUnitId, filters = {}) {
    let q = db('bill_payment_proofs')
      .join('student_bills', 'bill_payment_proofs.student_bill_id', 'student_bills.id')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .select(
        'bill_payment_proofs.*',
        'student_bills.student_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'student_bills.amount as bill_amount',
        'student_bills.status as bill_status',
        'fee_types.name as fee_type_name'
      );

    if (schoolUnitId) {
      q = q.where('bill_payment_proofs.school_unit_id', schoolUnitId);
    }
    if (filters.status) {
      q = q.where('bill_payment_proofs.status', filters.status);
    }

    const proofs = await q.orderBy('bill_payment_proofs.created_at', 'asc');

    // In-process resolution of student data
    return Promise.all(proofs.map(async p => {
      const student = await crossModuleServices.getStudent(p.student_id);
      return {
        ...p,
        student_name: student?.full_name || `Siswa ID ${p.student_id}`,
        student_nis: student?.nis || '-',
        student_class: student?.class_name || '-'
      };
    }));
  }

  async verifyPaymentProof(schoolUnitId, proofId, userId, cashAccountId = null) {
    return db.transaction(async (trx) => {
      const proof = await trx('bill_payment_proofs')
        .where({ id: proofId, school_unit_id: schoolUnitId })
        .first();

      if (!proof) {
        return { error: 'NOT_FOUND', message: 'Bukti transfer tidak ditemukan' };
      }

      if (proof.status !== 'pending') {
        return { error: 'CONFLICT', message: `Bukti transfer ini sudah berstatus ${proof.status}` };
      }

      // Tentukan rekening kas/bank tujuan
      let targetCashAccountId = cashAccountId;
      if (!targetCashAccountId) {
        const bankAcc = await trx('cash_accounts')
          .where({ school_unit_id: schoolUnitId, account_kind: 'bank', is_active: true })
          .first();
        targetCashAccountId = bankAcc ? bankAcc.id : 1;
      }

      // Catat pembayaran resmi via recordBillPayment
      const paymentResult = await this.recordBillPayment(schoolUnitId, {
        student_bill_id: proof.student_bill_id,
        cash_account_id: targetCashAccountId,
        amount: proof.amount,
        payment_method: 'bank_transfer',
        paid_at: proof.transfer_date ? new Date(proof.transfer_date).toISOString() : new Date().toISOString(),
        notes: `Verifikasi Bukti Transfer #${proof.id} (Bank: ${proof.bank_name || '-'}, Pengirim: ${proof.sender_account_name || '-'})`
      }, userId, trx);

      if (paymentResult.error) {
        return paymentResult;
      }

      const verifiedAt = trx.fn.now();
      await trx('bill_payment_proofs')
        .where({ id: proof.id })
        .update({
          status: 'verified',
          verified_by: userId,
          verified_at: verifiedAt,
          bill_payment_id: paymentResult.data.id
        });

      const updatedProof = await trx('bill_payment_proofs').where({ id: proof.id }).first();

      return {
        data: {
          proof: updatedProof,
          payment: paymentResult.data
        }
      };
    });
  }

  async rejectPaymentProof(schoolUnitId, proofId, rejectionReason, userId) {
    if (!rejectionReason || !rejectionReason.trim()) {
      return { error: 'VALIDATION', message: 'Alasan penolakan (rejection_reason) wajib diisi' };
    }

    const proof = await db('bill_payment_proofs')
      .where({ id: proofId, school_unit_id: schoolUnitId })
      .first();

    if (!proof) {
      return { error: 'NOT_FOUND', message: 'Bukti transfer tidak ditemukan' };
    }

    if (proof.status !== 'pending') {
      return { error: 'CONFLICT', message: `Bukti transfer ini sudah berstatus ${proof.status}` };
    }

    await db('bill_payment_proofs')
      .where({ id: proof.id })
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
        verified_by: userId,
        verified_at: db.fn.now()
      });

    const updatedProof = await db('bill_payment_proofs').where({ id: proof.id }).first();
    return { data: updatedProof };
  }
}

module.exports = new PaymentsService();
