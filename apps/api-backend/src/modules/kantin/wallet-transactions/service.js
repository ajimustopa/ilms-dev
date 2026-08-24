/**
 * Wallet Transactions Service
 * Sesuai api-contract-kantin.md Modul 5 & erd-kantin.md §2.11
 */
const db = require('../../../config/db/kantin');
const canteenStudentsService = require('../canteen-students/service');

class WalletTransactionsService {
  async listTransactions(schoolUnitId, query = {}) {
    let q = db('wallet_transactions')
      .join('canteen_students', 'wallet_transactions.canteen_student_id', 'canteen_students.id')
      .where('wallet_transactions.school_unit_id', schoolUnitId)
      .select(
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

    return q.orderBy('wallet_transactions.occurred_at', 'desc').orderBy('wallet_transactions.id', 'desc');
  }

  async topUp(schoolUnitId, payload, userId) {
    const { student_id, amount, payment_method = 'cash' } = payload;
    const topUpAmount = parseFloat(amount);

    if (topUpAmount <= 0) {
      const err = new Error('Nominal top up harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    // Pastikan record canteen_students ada
    const student = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, student_id);

    const newBalance = parseFloat(student.wallet_balance) + topUpAmount;

    // Update saldo
    await db('canteen_students')
      .where({ id: student.id })
      .update({
        wallet_balance: newBalance,
        updated_at: db.fn.now()
      });

    // Record transaksi
    const [txId] = await db('wallet_transactions').insert({
      school_unit_id: schoolUnitId,
      canteen_student_id: student.id,
      transaction_type: 'top_up',
      amount: topUpAmount,
      balance_after: newBalance,
      payment_method,
      processed_by: userId,
      occurred_at: db.fn.now()
    });

    // Publish webhook event
    await db('canteen_webhook_events').insert({
      event_type: 'kantin.wallet.updated',
      school_unit_id: schoolUnitId,
      payload: JSON.stringify({
        event: 'top_up',
        student_id: Number(student_id),
        amount: topUpAmount,
        balance_after: newBalance,
        occurred_at: new Date().toISOString()
      })
    });

    return {
      wallet_transaction_id: txId,
      student_id: Number(student_id),
      amount: topUpAmount,
      balance_after: newBalance
    };
  }

  async withdrawal(schoolUnitId, payload, userId) {
    const { student_id, amount, payment_method = 'cash' } = payload;
    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount <= 0) {
      const err = new Error('Nominal penarikan harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const student = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, student_id);

    if (parseFloat(student.wallet_balance) < withdrawAmount) {
      const err = new Error('Saldo dompet tidak mencukupi');
      err.statusCode = 400;
      throw err;
    }

    const newBalance = parseFloat(student.wallet_balance) - withdrawAmount;

    await db('canteen_students')
      .where({ id: student.id })
      .update({
        wallet_balance: newBalance,
        updated_at: db.fn.now()
      });

    const [txId] = await db('wallet_transactions').insert({
      school_unit_id: schoolUnitId,
      canteen_student_id: student.id,
      transaction_type: 'withdrawal',
      amount: withdrawAmount,
      balance_after: newBalance,
      payment_method,
      processed_by: userId,
      occurred_at: db.fn.now()
    });

    await db('canteen_webhook_events').insert({
      event_type: 'kantin.wallet.updated',
      school_unit_id: schoolUnitId,
      payload: JSON.stringify({
        event: 'withdrawal',
        student_id: Number(student_id),
        amount: withdrawAmount,
        balance_after: newBalance,
        occurred_at: new Date().toISOString()
      })
    });

    return {
      wallet_transaction_id: txId,
      student_id: Number(student_id),
      amount: withdrawAmount,
      balance_after: newBalance
    };
  }
}

module.exports = new WalletTransactionsService();
