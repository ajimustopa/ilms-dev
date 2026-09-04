/**
 * Legacy Migration Service for Keuangan Module
 * Handles:
 * 1. Finance Cutover Date Configuration (Tanggal Mulai Pencatatan Sistem)
 * 2. Input Historical Student Bills (Tagihan Siswa Lampau)
 * 3. Record Historical Payments (Pembayaran Lampau Pra-Cutover)
 * 4. Summary & Verification Listing
 * 
 * Strict Accounting Rule:
 * Legacy transactions (is_legacy = true) NEVER trigger recordJournal() or mutate live cash account balances.
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const crossModuleServices = require('../common/crossModuleServices');

function formatDateOnly(d) {
  if (!d) return null;
  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(d).slice(0, 10);
}

class LegacyMigrationService {
  /**
   * 1. Get Cutover Settings for a School Unit
   */
  async getCutoverSetting(schoolUnitId) {
    const setting = await db('finance_cutover_settings')
      .where({ school_unit_id: schoolUnitId })
      .first();

    const legacyBillsCount = await db('student_bills')
      .where({ school_unit_id: schoolUnitId, is_legacy: true })
      .count('id as cnt')
      .first();

    const legacyPaymentsCount = await db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .where('student_bills.school_unit_id', schoolUnitId)
      .where('bill_payments.is_legacy', true)
      .count('bill_payments.id as cnt')
      .first();

    return {
      cutover_date: setting ? formatDateOnly(setting.cutover_date) : null,
      notes: setting?.notes || null,
      set_by: setting?.set_by || null,
      updated_at: setting?.updated_at || null,
      legacy_bills_count: parseInt(legacyBillsCount?.cnt || 0, 10),
      legacy_payments_count: parseInt(legacyPaymentsCount?.cnt || 0, 10),
      has_legacy_data: parseInt(legacyBillsCount?.cnt || 0, 10) > 0
    };
  }

  /**
   * 2. Set or Update Cutover Date
   */
  async setOrUpdateCutoverDate(schoolUnitId, data, userId = null) {
    const { cutover_date, notes, reason } = data;

    if (!cutover_date) {
      const err = new Error('Tanggal Mulai Pencatatan Sistem (cutover_date) wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const existing = await db('finance_cutover_settings')
      .where({ school_unit_id: schoolUnitId })
      .first();

    if (existing) {
      if (!reason || !String(reason).trim()) {
        const err = new Error('Alasan pengubahan Tanggal Mulai Pencatatan Sistem (Cutover Date) wajib diisi');
        err.statusCode = 422;
        throw err;
      }

      const previousSnapshot = {
        cutover_date: String(existing.cutover_date).slice(0, 10),
        notes: existing.notes,
        set_by: existing.set_by,
        updated_at: existing.updated_at
      };

      await db('finance_cutover_settings')
        .where({ school_unit_id: schoolUnitId })
        .update({
          cutover_date,
          notes: notes !== undefined ? notes : existing.notes,
          set_by: userId,
          previous_data: JSON.stringify(previousSnapshot),
          updated_at: db.fn.now()
        });

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'UPDATE_CUTOVER_DATE',
        entityType: 'finance_cutover_settings',
        entityId: existing.id,
        dataBefore: previousSnapshot,
        dataAfter: { cutover_date, notes, reason }
      });
    } else {
      const [newId] = await db('finance_cutover_settings').insert({
        school_unit_id: schoolUnitId,
        cutover_date,
        notes: notes || null,
        set_by: userId
      });

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'SET_CUTOVER_DATE',
        entityType: 'finance_cutover_settings',
        entityId: newId,
        dataAfter: { cutover_date, notes }
      });
    }

    return this.getCutoverSetting(schoolUnitId);
  }

  /**
   * 3. Input Historical Student Bill (Tagihan Historis)
   */
  async createLegacyBill(schoolUnitId, data, userId = null) {
    const cutoverInfo = await this.getCutoverSetting(schoolUnitId);
    if (!cutoverInfo.cutover_date) {
      const err = new Error('Tanggal Mulai Pencatatan Sistem (Cutover Date) belum diatur. Silakan atur cutover date terlebih dahulu.');
      err.statusCode = 422;
      throw err;
    }

    const {
      student_id,
      fee_type_id,
      period_month,
      period_year,
      amount,
      paid_amount = 0,
      due_date,
      historical_cash_note,
      legacy_note
    } = data;

    if (!student_id || !fee_type_id || !period_year || !amount || !due_date) {
      const err = new Error('Field student_id, fee_type_id, period_year, amount, dan due_date wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const dueDateFormatted = String(due_date).slice(0, 10);
    if (dueDateFormatted >= cutoverInfo.cutover_date) {
      const err = new Error(`Jatuh tempo tagihan historis (${dueDateFormatted}) harus sebelum Tanggal Mulai Pencatatan Sistem (${cutoverInfo.cutover_date}). Untuk penagihan aktif berjalan, gunakan menu Tagihan Siswa.`);
      err.statusCode = 422;
      throw err;
    }

    const billAmount = parseFloat(amount);
    const initialPaid = parseFloat(paid_amount || 0);

    if (billAmount <= 0) {
      const err = new Error('Nominal tagihan harus lebih besar dari 0');
      err.statusCode = 422;
      throw err;
    }

    if (initialPaid < 0 || initialPaid > billAmount) {
      const err = new Error('Nominal cicilan/pembayaran awal tidak boleh negatif atau melebihi total tagihan');
      err.statusCode = 422;
      throw err;
    }

    let status = 'unpaid';
    if (initialPaid >= billAmount) {
      status = 'paid';
    } else if (initialPaid > 0) {
      status = 'partially_paid';
    }

    return db.transaction(async (trx) => {
      const [billId] = await trx('student_bills').insert({
        school_unit_id: schoolUnitId,
        student_id,
        fee_type_id,
        period_month: period_month || null,
        period_year,
        amount: billAmount,
        discount_amount: 0,
        due_date: dueDateFormatted,
        status,
        published_at: dueDateFormatted,
        published_by: userId,
        is_legacy: true,
        legacy_note: legacy_note || 'Tagihan historis migrasi data lama'
      });

      const actualBillId = billId || (await trx('student_bills').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

      // Jika ada cicilan lama yang sudah terbayar sebelum cutover
      if (initialPaid > 0) {
        await trx('bill_payments').insert({
          student_bill_id: actualBillId,
          cash_account_id: null,
          paid_at: dueDateFormatted,
          amount: initialPaid,
          payment_method: 'cash',
          receipt_number: `LEGACY-BILL-${actualBillId}`,
          notes: 'Pembayaran historis awal sebelum cutover',
          historical_cash_note: historical_cash_note || 'Kas historis pra-sistem',
          is_legacy: true
        });
      }

      const created = await trx('student_bills')
        .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
        .where('student_bills.id', actualBillId)
        .select('student_bills.*', 'fee_types.name as fee_type_name')
        .first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CREATE_LEGACY_BILL',
        entityType: 'student_bill',
        entityId: actualBillId,
        dataAfter: { ...created, initial_paid: initialPaid, is_legacy: true },
        trx
      });

      return {
        ...created,
        initial_paid: initialPaid
      };
    });
  }

  /**
   * 4. Record Additional Historical Payment (Pembayaran Lampau)
   */
  async addLegacyPayment(schoolUnitId, billId, data, userId = null) {
    const cutoverInfo = await this.getCutoverSetting(schoolUnitId);
    if (!cutoverInfo.cutover_date) {
      const err = new Error('Tanggal Mulai Pencatatan Sistem (Cutover Date) belum diatur.');
      err.statusCode = 422;
      throw err;
    }

    const { amount, payment_date, historical_cash_note, notes } = data;

    if (!amount || !payment_date) {
      const err = new Error('Field amount dan payment_date wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const paymentDateFormatted = String(payment_date).slice(0, 10);
    if (paymentDateFormatted >= cutoverInfo.cutover_date) {
      const err = new Error(`Tanggal pembayaran historis (${paymentDateFormatted}) harus sebelum Tanggal Mulai Pencatatan Sistem (${cutoverInfo.cutover_date}). Untuk pembayaran berjalan setelah cutover, gunakan menu Pembayaran / Kasir.`);
      err.statusCode = 422;
      throw err;
    }

    const payAmount = parseFloat(amount);
    if (payAmount <= 0) {
      const err = new Error('Nominal pembayaran harus lebih besar dari 0');
      err.statusCode = 422;
      throw err;
    }

    const bill = await db('student_bills')
      .where({ id: billId, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan tidak ditemukan atau bukan milik unit sekolah ini');
      err.statusCode = 404;
      throw err;
    }

    if (!bill.is_legacy) {
      const err = new Error('Hanya tagihan bertanda historis (is_legacy = true) yang dapat dicatat lewat migrasi pembayaran lampau');
      err.statusCode = 422;
      throw err;
    }

    const currentPaidSum = await db('bill_payments')
      .where('student_bill_id', billId)
      .sum('amount as sum')
      .first();

    const alreadyPaid = parseFloat(currentPaidSum?.sum || 0);
    const billTotal = parseFloat(bill.amount);
    const remaining = billTotal - alreadyPaid;

    if (payAmount > remaining) {
      const err = new Error(`Nominal pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa tunggakan tagihan (Rp ${remaining.toLocaleString('id-ID')})`);
      err.statusCode = 422;
      throw err;
    }

    return db.transaction(async (trx) => {
      const [paymentId] = await trx('bill_payments').insert({
        student_bill_id: billId,
        cash_account_id: null,
        paid_at: paymentDateFormatted,
        amount: payAmount,
        payment_method: 'cash',
        receipt_number: `LEGACY-PMT-${billId}-${Date.now().toString().slice(-4)}`,
        notes: notes || 'Pembayaran lampau migrasi data',
        historical_cash_note: historical_cash_note || 'Kas historis',
        is_legacy: true
      });

      const actualPaymentId = paymentId || (await trx('bill_payments').where({ student_bill_id: billId }).orderBy('id', 'desc').first()).id;

      // Update status tagihan
      const newTotalPaid = alreadyPaid + payAmount;
      const newStatus = newTotalPaid >= billTotal ? 'paid' : 'partially_paid';

      await trx('student_bills')
        .where({ id: billId })
        .update({ status: newStatus });

      const createdPayment = await trx('bill_payments').where({ id: actualPaymentId }).first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'ADD_LEGACY_PAYMENT',
        entityType: 'bill_payment',
        entityId: actualPaymentId,
        dataAfter: { ...createdPayment, bill_new_status: newStatus },
        trx
      });

      return {
        payment: createdPayment,
        bill_id: billId,
        bill_new_status: newStatus,
        total_paid: newTotalPaid,
        remaining_amount: Math.max(0, billTotal - newTotalPaid)
      };
    });
  }

  /**
   * 5. List and Recap Legacy Migration Records
   */
  async listLegacyBills(schoolUnitId, filters = {}) {
    const cutoverInfo = await this.getCutoverSetting(schoolUnitId);

    let query = db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where({
        'student_bills.school_unit_id': schoolUnitId,
        'student_bills.is_legacy': true
      })
      .select(
        'student_bills.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      );

    if (filters.student_id) {
      query = query.where('student_bills.student_id', filters.student_id);
    }
    if (filters.status) {
      query = query.where('student_bills.status', filters.status);
    }

    const bills = await query.orderBy('student_bills.due_date', 'asc');
    const billIds = bills.map(b => b.id);

    const allPayments = billIds.length > 0
      ? await db('bill_payments')
          .whereIn('student_bill_id', billIds)
          .select('id', 'student_bill_id', 'amount', 'paid_at', 'payment_method', 'receipt_number', 'historical_cash_note', 'is_legacy', 'notes')
          .orderBy('paid_at', 'asc')
      : [];

    const paymentMap = {};
    allPayments.forEach(p => {
      if (!paymentMap[p.student_bill_id]) paymentMap[p.student_bill_id] = [];
      paymentMap[p.student_bill_id].push(p);
    });

    let totalBilled = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    const enrichedBills = await Promise.all(bills.map(async b => {
      const payments = paymentMap[b.id] || [];
      const paidSum = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const remaining = Math.max(0, parseFloat(b.amount || 0) - paidSum);

      totalBilled += parseFloat(b.amount || 0);
      totalPaid += paidSum;
      totalRemaining += remaining;

      const student = await crossModuleServices.getStudent(b.student_id);

      return {
        ...b,
        student_name: student?.full_name || `Siswa ID ${b.student_id}`,
        student_nis: student?.nis || '-',
        student_class: student?.class_name || '-',
        paid_amount: paidSum,
        remaining_amount: remaining,
        payments
      };
    }));

    return {
      cutover_setting: cutoverInfo,
      summary: {
        total_legacy_bills_count: enrichedBills.length,
        total_billed: totalBilled,
        total_paid: totalPaid,
        total_remaining: totalRemaining
      },
      bills: enrichedBills
    };
  }
}

module.exports = new LegacyMigrationService();
