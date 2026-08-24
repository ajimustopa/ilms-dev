/**
 * Parent-Facing Service for Keuangan Module
 * Covers Feature #35
 * Khusus akses self-service orangtua & siswa, data otomatis terikat student_id
 */
const db = require('../../../config/db/keuangan');
const bookkeepingService = require('../bookkeeping/service');
const crossModuleServices = require('../common/crossModuleServices');

class ParentFacingService {
  async listStudentBills(schoolUnitId, studentId) {
    const bills = await db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where({
        'student_bills.school_unit_id': schoolUnitId,
        'student_bills.student_id': studentId
      })
      .whereNot('student_bills.status', 'cancelled')
      .select(
        'student_bills.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      )
      .orderBy('student_bills.due_date', 'asc');

    const student = await crossModuleServices.getStudent(studentId);

    return bills.map(b => ({
      ...b,
      student_name: student?.full_name || `Siswa ID ${studentId}`
    }));
  }

  async getStudentBillDetail(schoolUnitId, studentId, billId) {
    const bill = await db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where({
        'student_bills.id': billId,
        'student_bills.student_id': studentId,
        'student_bills.school_unit_id': schoolUnitId
      })
      .select(
        'student_bills.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      )
      .first();

    if (!bill) return null;

    const payments = await db('bill_payments')
      .where('student_bill_id', billId)
      .orderBy('paid_at', 'asc');

    const student = await crossModuleServices.getStudent(studentId);

    return {
      ...bill,
      student_name: student?.full_name || `Siswa ID ${studentId}`,
      payments
    };
  }

  async listStudentPayments(schoolUnitId, studentId) {
    const payments = await db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where({
        'student_bills.school_unit_id': schoolUnitId,
        'student_bills.student_id': studentId
      })
      .select(
        'bill_payments.*',
        'student_bills.fee_type_id',
        'fee_types.name as fee_type_name',
        'student_bills.period_month',
        'student_bills.period_year'
      )
      .orderBy('bill_payments.paid_at', 'desc');

    return payments;
  }

  async getStudentSavings(schoolUnitId, studentId) {
    const savingsAccount = await bookkeepingService.getOrCreateSavingsAccount(schoolUnitId, 'student', studentId);
    const transactions = await bookkeepingService.listSavingsTransactions(schoolUnitId, savingsAccount.id);

    return {
      account_id: savingsAccount.id,
      student_id: studentId,
      balance: parseFloat(savingsAccount.balance),
      transactions
    };
  }
}

module.exports = new ParentFacingService();
