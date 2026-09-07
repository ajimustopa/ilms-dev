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
      .whereNotIn('student_bills.status', ['cancelled', 'draft'])
      .select(
        'student_bills.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      )
      .orderBy('student_bills.due_date', 'asc');

    const [student, academicYears] = await Promise.all([
      crossModuleServices.getStudent(studentId),
      crossModuleServices.listAcademicYears().catch(() => [])
    ]);

    const ayMap = {};
    (academicYears || []).forEach(ay => { ayMap[ay.id] = ay.name; });

    return bills.map(b => ({
      ...b,
      academic_year_name: ayMap[b.academic_year_id] || (b.period_year ? (b.period_month && b.period_month <= 6 ? `${b.period_year - 1}/${b.period_year}` : `${b.period_year}/${b.period_year + 1}`) : '-'),
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

    if (!bill || bill.status === 'draft') return null;

    const payments = await db('bill_payments')
      .where('student_bill_id', billId)
      .orderBy('paid_at', 'asc');

    const proofs = await db('bill_payment_proofs')
      .where('student_bill_id', billId)
      .orderBy('created_at', 'desc');

    const [student, academicYears] = await Promise.all([
      crossModuleServices.getStudent(studentId),
      crossModuleServices.listAcademicYears().catch(() => [])
    ]);

    const ayMap = {};
    (academicYears || []).forEach(ay => { ayMap[ay.id] = ay.name; });

    return {
      ...bill,
      academic_year_name: ayMap[bill.academic_year_id] || (bill.period_year ? (bill.period_month && bill.period_month <= 6 ? `${bill.period_year - 1}/${bill.period_year}` : `${bill.period_year}/${bill.period_year + 1}`) : '-'),
      student_name: student?.full_name || `Siswa ID ${studentId}`,
      payments,
      payment_proofs: proofs
    };
  }

  async submitTransferProof(schoolUnitId, studentId, billId, payload, userId = null) {
    const { proof_file_url, amount, transfer_date, bank_name, sender_account_name, notes } = payload;

    if (!proof_file_url || !amount || !transfer_date) {
      const err = new Error('Field proof_file_url, amount, dan transfer_date wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const bill = await db('student_bills')
      .where({
        id: billId,
        school_unit_id: schoolUnitId
      })
      .first();

    if (!bill || bill.status === 'draft') {
      const err = new Error('Tagihan tidak ditemukan, berstatus draft, atau bukan milik unit sekolah ini');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status === 'paid') {
      const err = new Error('Tagihan ini sudah berstatus lunas');
      err.statusCode = 400;
      throw err;
    }

    if (bill.status === 'cancelled') {
      const err = new Error('Tagihan ini telah dibatalkan');
      err.statusCode = 400;
      throw err;
    }

    const [id] = await db('bill_payment_proofs').insert({
      school_unit_id: schoolUnitId,
      student_bill_id: bill.id,
      submitted_by_ref_id: userId,
      proof_file_url,
      amount: parseFloat(amount),
      transfer_date,
      bank_name: bank_name || null,
      sender_account_name: sender_account_name || null,
      notes: notes || null,
      status: 'pending'
    });

    return await db('bill_payment_proofs').where({ id }).first();
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
