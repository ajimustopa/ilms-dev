/**
 * Vendor Fee Payments Service
 * Sesuai api-contract-kantin.md Modul 7 & erd-kantin.md §2.15
 */
const db = require('../../../config/db/kantin');

class VendorFeePaymentsService {
  async listPayments(schoolUnitId, query = {}) {
    let q = db('vendor_fee_payments')
      .join('vendors', 'vendor_fee_payments.vendor_id', 'vendors.id')
      .where('vendor_fee_payments.school_unit_id', schoolUnitId)
      .select(
        'vendor_fee_payments.*',
        'vendors.vendor_name as vendor'
      );

    if (query.vendor_id) {
      q = q.where('vendor_fee_payments.vendor_id', query.vendor_id);
    }
    if (query.period_start) {
      q = q.where('vendor_fee_payments.period_start', '>=', query.period_start);
    }
    if (query.period_end) {
      q = q.where('vendor_fee_payments.period_end', '<=', query.period_end);
    }

    return q.orderBy('vendor_fee_payments.paid_at', 'desc').orderBy('vendor_fee_payments.id', 'desc');
  }

  async createPayment(schoolUnitId, payload, userId) {
    const { vendor_id, period_start, period_end, amount } = payload;
    const paymentAmount = parseFloat(amount);

    if (!vendor_id) {
      const err = new Error('vendor_id wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (paymentAmount <= 0) {
      const err = new Error('Nominal pembayaran hak vendor harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const vendor = await db('vendors').where({ id: vendor_id, school_unit_id: schoolUnitId }).first();
    if (!vendor) {
      const err = new Error('Vendor tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const [id] = await db('vendor_fee_payments').insert({
      school_unit_id: schoolUnitId,
      vendor_id,
      period_start,
      period_end,
      amount: paymentAmount,
      paid_by: userId,
      paid_at: db.fn.now()
    });

    return db('vendor_fee_payments')
      .join('vendors', 'vendor_fee_payments.vendor_id', 'vendors.id')
      .where('vendor_fee_payments.id', id)
      .select('vendor_fee_payments.*', 'vendors.vendor_name as vendor')
      .first();
  }
}

module.exports = new VendorFeePaymentsService();
