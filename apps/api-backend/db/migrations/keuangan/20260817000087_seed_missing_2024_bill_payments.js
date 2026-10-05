/**
 * Migration: Create bill_payments records for paid student_bills in 2024/2025 (AY 3)
 */
exports.up = async function (knex) {
  const paidBillsAY3 = await knex('student_bills')
    .where('academic_year_id', 3)
    .where('status', 'paid')
    .where('paid_amount', '>', 0);

  const existingPayments = await knex('bill_payments').select('student_bill_id');
  const existingSet = new Set(existingPayments.map(p => p.student_bill_id));
  const missingBills = paidBillsAY3.filter(b => !existingSet.has(b.id));

  let counter = 1;
  for (const bill of missingBills) {
    const paidAt = bill.bill_date ? `${bill.bill_date} 09:30:00` : '2025-05-08 09:30:00';
    const receiptNo = `KWT-${bill.school_unit_id || 1}-202505${String(counter).padStart(4, '0')}`;
    counter++;

    await knex('bill_payments').insert({
      student_bill_id: bill.id,
      cash_account_id: 2, // Tahun Berjalan / Bank Kas
      paid_at: paidAt,
      amount: bill.paid_amount || bill.amount,
      payment_method: 'bank_transfer',
      receipt_number: receiptNo,
      notes: `Pembayaran ${bill.period_month ? `SPP Bulan ${bill.period_month}/${bill.period_year}` : 'SPP'} (T.A. 2024/2025)`,
      created_at: new Date(),
      updated_at: new Date(),
      is_legacy: 0
    });
  }
};

exports.down = async function (knex) {
  await knex('bill_payments')
    .where('receipt_number', 'like', 'KWT-%-202505%')
    .delete();
};
