/**
 * Canteen Fee Payments Service
 * Sesuai api-contract-kantin.md Modul 7 & erd-kantin.md §2.14
 */
const db = require('../../../config/db/kantin');

class CanteenFeePaymentsService {
  async listPayments(schoolUnitId, query = {}) {
    let q = db('canteen_fee_payments').where('school_unit_id', schoolUnitId);

    if (query.period_start) {
      q = q.where('period_start', '>=', query.period_start);
    }
    if (query.period_end) {
      q = q.where('period_end', '<=', query.period_end);
    }

    return q.orderBy('paid_at', 'desc').orderBy('id', 'desc');
  }

  async createPayment(schoolUnitId, payload, userId) {
    const { period_start, period_end, amount } = payload;
    const paymentAmount = parseFloat(amount);

    if (paymentAmount <= 0) {
      const err = new Error('Nominal pencairan hak kantin harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const [id] = await db('canteen_fee_payments').insert({
      school_unit_id: schoolUnitId,
      period_start,
      period_end,
      amount: paymentAmount,
      paid_by: userId,
      paid_at: db.fn.now()
    });

    // Publish webhook event
    await db('canteen_webhook_events').insert({
      event_type: 'kantin.fee.recorded',
      school_unit_id: schoolUnitId,
      payload: JSON.stringify({
        event: 'canteen_fee_payment',
        payment_id: id,
        amount: paymentAmount,
        period_start,
        period_end,
        paid_at: new Date().toISOString()
      })
    });

    return db('canteen_fee_payments').where({ id }).first();
  }
}

module.exports = new CanteenFeePaymentsService();
