/**
 * Parent Self-Service for Kantin Module
 * Sesuai api-contract-kantin.md Modul 8 & erd-kantin.md §2.9
 */
const bcrypt = require('bcryptjs');
const db = require('../../../config/db/kantin');
const canteenStudentsService = require('../canteen-students/service');

class ParentService {
  async getStudentWallet(schoolUnitId, studentId) {
    const student = await canteenStudentsService.getStudentByStudentId(schoolUnitId, studentId);
    if (!student) {
      const err = new Error('Data santri tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return {
      student_id: student.student_id,
      student_name: student.student_name,
      class_group_name: student.class_group_name,
      wallet_balance: student.wallet_balance,
      custom_daily_limit: student.custom_daily_limit,
      is_blocked_by_parent: student.is_blocked_by_parent,
      status: student.status
    };
  }

  async getWalletHistory(schoolUnitId, studentId) {
    const student = await db('canteen_students').where({ student_id: studentId }).first();
    if (!student) return [];

    return db('wallet_transactions')
      .where({ canteen_student_id: student.id })
      .orderBy('occurred_at', 'desc')
      .limit(50);
  }

  async getSpendingHistory(schoolUnitId, studentId) {
    const student = await db('canteen_students').where({ student_id: studentId }).first();
    if (!student) return [];

    const txs = await db('sales_transactions')
      .where({ canteen_student_id: student.id })
      .orderBy('transaction_at', 'desc')
      .limit(50);

    const txIds = txs.map(t => t.id);
    const items = txIds.length > 0
      ? await db('sales_transaction_items')
          .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
          .whereIn('sales_transaction_items.sales_transaction_id', txIds)
          .select(
            'sales_transaction_items.*',
            'vendor_products.product_name',
            'vendor_products.unit'
          )
      : [];

    return txs.map(t => ({
      ...t,
      items: items.filter(it => it.sales_transaction_id === t.id)
    }));
  }

  async changeParentPin(schoolUnitId, studentId, payload) {
    const { old_pin, new_pin } = payload;
    const student = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, studentId);

    if (student.parent_pin_hash && old_pin) {
      const match = await bcrypt.compare(String(old_pin), student.parent_pin_hash);
      if (!match) {
        const err = new Error('PIN lama salah');
        err.statusCode = 400;
        throw err;
      }
    }

    const newHash = await bcrypt.hash(String(new_pin), 10);
    await db('canteen_students')
      .where({ id: student.id })
      .update({ parent_pin_hash: newHash, updated_at: db.fn.now() });

    return { success: true, message: 'PIN orangtua berhasil diubah' };
  }

  async setSpendingLimit(schoolUnitId, studentId, payload) {
    const { custom_daily_limit } = payload;
    const student = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, studentId);

    const limitVal = custom_daily_limit !== null && custom_daily_limit !== undefined
      ? parseFloat(custom_daily_limit)
      : null;

    await db('canteen_students')
      .where({ id: student.id })
      .update({ custom_daily_limit: limitVal, updated_at: db.fn.now() });

    return this.getStudentWallet(schoolUnitId, studentId);
  }

  async toggleBlock(schoolUnitId, studentId, payload) {
    const { is_blocked } = payload;
    const student = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, studentId);

    await db('canteen_students')
      .where({ id: student.id })
      .update({ is_blocked_by_parent: Boolean(is_blocked), updated_at: db.fn.now() });

    return this.getStudentWallet(schoolUnitId, studentId);
  }
}

module.exports = new ParentService();
