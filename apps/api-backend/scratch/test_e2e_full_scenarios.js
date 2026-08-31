/**
 * End-to-End Test Suite for Modul Keuangan (Scenarios #1 to #8)
 * Using REAL database connections to aldepos_core, aldepos_akademik, aldepos_kepegawaian, aldepos_keuangan.
 */
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const http = require('http');
const dbKeuangan = require('../src/config/db/keuangan');
const dbAkademik = require('../src/config/db/akademik');
const dbKepegawaian = require('../src/config/db/kepegawaian');

const token = jwt.sign(
  {
    id: 1,
    sub: 1,
    username: 'bendahara_utama',
    account_type: 'admin',
    ref_type: 'guardian',
    ref_id: 1,
    school_units: [
      {
        id: 1,
        roles: ['super_admin'],
        permissions: [
          'keuangan.master.cash_accounts.manage',
          'keuangan.master.coa.manage',
          'keuangan.master.fee_types.manage',
          'keuangan.master.fee_reference_amounts.manage',
          'keuangan.master.fee_adjustments.submit',
          'keuangan.master.fee_adjustments.approve',
          'keuangan.budget.view',
          'keuangan.budget.manage',
          'keuangan.budget.publish',
          'keuangan.bills.generate',
          'keuangan.bills.view',
          'keuangan.bills.cancel',
          'keuangan.payments.record',
          'keuangan.income.manage',
          'keuangan.expenses.manage',
          'keuangan.payroll.disburse',
          'keuangan.bookkeeping.view',
          'keuangan.bookkeeping.manual_entry',
          'keuangan.reports.view',
          'keuangan.parent.self_service'
        ]
      }
    ]
  },
  process.env.CORE_JWT_SECRET || 'default_core_jwt_secret_key',
  { expiresIn: '1h' }
);

async function req(path, method = 'GET', body = null, isBlob = false) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const url = 'http://127.0.0.1:' + port + path;
      const r = http.request(url, {
        method,
        headers: {
          'Authorization': 'Bearer ' + token,
          'X-School-Unit-Id': '1',
          'Content-Type': 'application/json'
        }
      }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          server.close();
          const buf = Buffer.concat(chunks);
          if (isBlob) {
            resolve({
              status: res.statusCode,
              contentType: res.headers['content-type'],
              contentDisposition: res.headers['content-disposition'],
              size: buf.length,
              isPdf: buf.slice(0, 4).toString() === '%PDF'
            });
          } else {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(buf.toString()) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: buf.toString() });
            }
          }
        });
      });
      r.on('error', err => { server.close(); reject(err); });
      if (body) r.write(JSON.stringify(body));
      r.end();
    });
  });
}

async function runE2ETests() {
  console.log('================================================================');
  console.log('STARTING END-TO-END TEST SUITE - MODUL 05 KEUANGAN');
  console.log('================================================================\n');

  const results = {};

  // ==================================================================
  // SCENARIO 1: Generate Tagihan SPP Massal untuk 1 Rombel Nyata
  // ==================================================================
  try {
    console.log('--- SCENARIO 1: Generate Tagihan SPP Massal Rombel 8-A (ID: 7) ---');
    // 1. Preview
    const previewRes = await req('/api/v1/keuangan/student-bills/generate/preview', 'POST', {
      fee_type_id: 1,
      academic_year_id: 2,
      billing_period: '2026-09',
      class_group_id: 7,
      target: 'class_group'
    });

    console.log('Preview Status:', previewRes.status);
    console.log('Preview Data Total Students:', previewRes.data?.data?.total_students, 'Total Amount:', previewRes.data?.data?.total_amount);

    if (previewRes.status !== 200 || !previewRes.data?.data) {
      throw new Error('Preview generation failed');
    }

    // 2. Generate
    const genRes = await req('/api/v1/keuangan/student-bills/generate', 'POST', {
      fee_type_id: 1,
      academic_year_id: 2,
      period_month: 9,
      period_year: 2026,
      due_date: '2026-09-10',
      class_group_id: 7,
      target: 'class_group'
    });

    console.log('Generate Status:', genRes.status, 'Generated Count:', genRes.data?.data?.generated_count);
    if (genRes.status !== 201) {
      throw new Error(`Generate failed with status ${genRes.status}: ${JSON.stringify(genRes.data)}`);
    }

    results['1_generate_spp_massal'] = { pass: true, count: genRes.data?.data?.generated_count };
    console.log('[PASS] Scenario 1: Generate Tagihan SPP Massal Sukses\n');
  } catch (err) {
    results['1_generate_spp_massal'] = { pass: false, error: err.message };
    console.error('[FAIL] Scenario 1:', err.message, '\n');
  }

  // ==================================================================
  // SCENARIO 2: Alur Upload Bukti Transfer, Antrean FIFO & Verifikasi
  // ==================================================================
  let createdProofId = null;
  let testBillId = null;
  try {
    console.log('--- SCENARIO 2: Upload Bukti Transfer -> Antrean FIFO -> Verifikasi -> Jurnal Otomatis ---');
    // Ambil 1 tagihan unpaid
    const unpaidBill = await dbKeuangan('student_bills')
      .where({ school_unit_id: 1, status: 'unpaid' })
      .first();

    if (!unpaidBill) throw new Error('Tidak ada tagihan unpaid untuk diuji');
    testBillId = unpaidBill.id;

    // Catat saldo kas sebelum verifikasi
    const cashBefore = await dbKeuangan('cash_accounts').where({ id: 2 }).first();
    const initialBalance = parseFloat(cashBefore?.current_balance || 0);

    // 1. Upload Bukti Transfer oleh Orang Tua
    const submitProofRes = await req(`/api/v1/keuangan/parent-facing/bills/${testBillId}/transfer-proof`, 'POST', {
      proof_file_url: 'https://cdn.aldepos.sch.id/transfers/proof_e2e_001.jpg',
      amount: parseFloat(unpaidBill.amount),
      transfer_date: '2026-09-01',
      bank_name: 'BSI',
      sender_account_name: 'Wali Santri E2E',
      notes: 'Pembayaran SPP September via BSI'
    });

    console.log('Submit Proof Status:', submitProofRes.status, 'Proof ID:', submitProofRes.data?.data?.id);
    if (submitProofRes.status !== 201) throw new Error('Gagal submit bukti transfer: ' + JSON.stringify(submitProofRes.data));
    createdProofId = submitProofRes.data.data.id;

    // 2. Cek Antrean FIFO Bendahara
    const listProofsRes = await req('/api/v1/keuangan/bill-payment-proofs?status=pending');
    console.log('Pending Proofs Queue Count:', listProofsRes.data?.data?.length);
    const foundInQueue = listProofsRes.data?.data?.some(p => p.id === createdProofId);
    if (!foundInQueue) throw new Error('Bukti transfer tidak muncul di antrean bendahara');

    // 3. Verifikasi oleh Bendahara
    const verifyRes = await req(`/api/v1/keuangan/bill-payment-proofs/${createdProofId}/verify`, 'PATCH', {
      cash_account_id: 2
    });

    console.log('Verify Status:', verifyRes.status, 'Receipt:', verifyRes.data?.data?.payment?.receipt_number);
    if (verifyRes.status !== 200) throw new Error('Gagal verifikasi bukti transfer');

    // 4. Verifikasi DB state: bill_payments, student_bills, cash_accounts, journal_entries & lines
    const paymentRecord = await dbKeuangan('bill_payments').where({ id: verifyRes.data.data.payment.id }).first();
    const billAfter = await dbKeuangan('student_bills').where({ id: testBillId }).first();
    const cashAfter = await dbKeuangan('cash_accounts').where({ id: 2 }).first();
    const proofAfter = await dbKeuangan('bill_payment_proofs').where({ id: createdProofId }).first();

    const journal = await dbKeuangan('journal_entries')
      .where({ source_type: 'student_bill_payment', source_id: paymentRecord.id })
      .first();

    const lines = await dbKeuangan('journal_entry_lines').where({ journal_entry_id: journal.id });
    const totalDebit = lines.filter(l => l.entry_side === 'debit').reduce((s, l) => s + parseFloat(l.amount), 0);
    const totalCredit = lines.filter(l => l.entry_side === 'credit').reduce((s, l) => s + parseFloat(l.amount), 0);

    console.log('Bill Status After:', billAfter.status);
    console.log('Proof Status After:', proofAfter.status);
    console.log('Cash Balance Increase:', parseFloat(cashAfter.current_balance) - initialBalance);
    console.log('Journal Number:', journal.journal_number, `| Balanced: Debit ${totalDebit} == Credit ${totalCredit}`);

    if (billAfter.status !== 'paid' && billAfter.status !== 'partially_paid') throw new Error('Status tagihan belum terupdate');
    if (Math.abs(totalDebit - totalCredit) > 0.01) throw new Error('Jurnal tidak balance!');

    results['2_transfer_proof_verify_flow'] = { pass: true, receipt: paymentRecord.receipt_number, journal: journal.journal_number };
    console.log('[PASS] Scenario 2: Alur Bukti Transfer & Auto-Journal Sukses\n');
  } catch (err) {
    results['2_transfer_proof_verify_flow'] = { pass: false, error: err.message };
    console.error('[FAIL] Scenario 2:', err.message, '\n');
  }

  // ==================================================================
  // SCENARIO 3: Alur Tolak Bukti Transfer (Reject)
  // ==================================================================
  try {
    console.log('--- SCENARIO 3: Tolak Bukti Transfer (Reject) dengan Alasan ---');
    const unpaidBill = await dbKeuangan('student_bills')
      .where({ school_unit_id: 1, status: 'unpaid' })
      .whereNot({ id: testBillId || 0 })
      .first();

    if (!unpaidBill) throw new Error('Tidak ada tagihan unpaid kedua');

    // 1. Submit proof kedua
    const submitProof2 = await req(`/api/v1/keuangan/parent-facing/bills/${unpaidBill.id}/transfer-proof`, 'POST', {
      proof_file_url: 'https://cdn.aldepos.sch.id/transfers/proof_fake.jpg',
      amount: 100000,
      transfer_date: '2026-09-01',
      bank_name: 'BCA',
      sender_account_name: 'Penipu',
      notes: 'Nominal salah'
    });
    const proof2Id = submitProof2.data?.data?.id;
    if (!proof2Id) throw new Error('Gagal membuat bukti transfer 2: ' + JSON.stringify(submitProof2.data));

    // 2. Tolak
    const countPaymentsBefore = (await dbKeuangan('bill_payments').count('id as cnt').first()).cnt;
    const rejectRes = await req(`/api/v1/keuangan/bill-payment-proofs/${proof2Id}/reject`, 'PATCH', {
      rejection_reason: 'Bukti transfer tidak valid / nominal tidak cocok dengan rekening koran'
    });

    console.log('Reject Status:', rejectRes.status, 'Message:', rejectRes.data?.message);
    const countPaymentsAfter = (await dbKeuangan('bill_payments').count('id as cnt').first()).cnt;
    const proof2Record = await dbKeuangan('bill_payment_proofs').where({ id: proof2Id }).first();

    if (rejectRes.status !== 200 || proof2Record.status !== 'rejected') throw new Error('Status proof tidak menjadi rejected');
    if (countPaymentsBefore !== countPaymentsAfter) throw new Error('Ada bill_payments terbentuk pada alur tolak!');

    results['3_reject_transfer_proof'] = { pass: true, rejection_reason: proof2Record.rejection_reason };
    console.log('[PASS] Scenario 3: Tolak Bukti Transfer Sukses\n');
  } catch (err) {
    results['3_reject_transfer_proof'] = { pass: false, error: err.message };
    console.error('[FAIL] Scenario 3:', err.message, '\n');
  }

  // ==================================================================
  // SCENARIO 4: Kirim Reminder Tagihan
  // ==================================================================
  try {
    console.log('--- SCENARIO 4: Kirim Reminder Tagihan Belum Lunas ---');
    const targetBill = await dbKeuangan('student_bills')
      .where({ school_unit_id: 1, status: 'unpaid' })
      .first();

    if (!targetBill) throw new Error('Tidak ada tagihan unpaid');

    const remRes = await req(`/api/v1/keuangan/student-bills/${targetBill.id}/reminders`, 'POST', {
      channel: 'whatsapp'
    });

    console.log('Send Reminder Status:', remRes.status, 'Response:', remRes.data);
    if (remRes.status !== 200) throw new Error('Gagal mengirim reminder');

    // Cek GET detail
    const billDetailRes = await req(`/api/v1/keuangan/student-bills/${targetBill.id}`);
    const reminders = billDetailRes.data?.data?.reminders || [];
    console.log('Reminders in Bill Detail:', reminders.length);

    if (reminders.length === 0) throw new Error('Log reminder tidak muncul di detail tagihan');

    results['4_send_bill_reminder'] = { pass: true, log_id: remRes.data?.data?.id, total_reminders: reminders.length };
    console.log('[PASS] Scenario 4: Pengiriman Reminder Tagihan Sukses\n');
  } catch (err) {
    results['4_send_bill_reminder'] = { pass: false, error: err.message };
    console.error('[FAIL] Scenario 4:', err.message, '\n');
  }

  // ==================================================================
  // SCENARIO 5: Catat Pengeluaran Melebihi Sisa Anggaran (Warning Check)
  // ==================================================================
  try {
    console.log('--- SCENARIO 5: Pengeluaran Melebihi Anggaran RAPBS (Budget Overrun Warning) ---');
    let expItem = await dbKeuangan('budget_plan_expense_items').first();
    if (!expItem) {
      let bp = await dbKeuangan('budget_plans').where({ school_unit_id: 1, academic_year_id: 2 }).first();
      let bpId;
      if (!bp) {
        [bpId] = await dbKeuangan('budget_plans').insert({
          school_unit_id: 1,
          academic_year_id: 2,
          version: 1,
          status: 'published'
        });
      } else {
        bpId = bp.id;
      }

      let prog = await dbKeuangan('budget_programs').where({ school_unit_id: 1, academic_year_id: 2 }).first();
      let progId;
      if (!prog) {
        [progId] = await dbKeuangan('budget_programs').insert({
          school_unit_id: 1,
          academic_year_id: 2,
          name: 'Program Sarana'
        });
      } else {
        progId = prog.id;
      }

      const [itemId] = await dbKeuangan('budget_plan_expense_items').insert({
        budget_plan_id: bpId,
        budget_program_id: progId,
        name: 'Beli Meja Guru',
        planned_amount: 1000000
      });
      expItem = await dbKeuangan('budget_plan_expense_items').where({ id: itemId }).first();
    }

    // Input expense dengan nominal Rp 5.000.000 (melebihi anggaran Rp 1.000.000)
    const expRes = await req('/api/v1/keuangan/expenses', 'POST', {
      academic_year_id: 2,
      budget_plan_expense_item_id: expItem.id,
      transaction_category_id: expItem.transaction_category_id || 1,
      cash_account_id: 1,
      item_name: 'Pengadaan Meja Kursi Lab Melebihi Pagu',
      unit_price: 5000000,
      quantity: 1,
      expense_date: '2026-09-02'
    });

    console.log('Expense Create Status:', expRes.status, 'Warning:', expRes.data?.data?.budget_warning);
    const hasWarning = Boolean(expRes.data?.data?.budget_warning || expRes.data?.data?.is_over_budget);

    if (!hasWarning) throw new Error('Budget warning tidak muncul saat pengeluaran melebihi pagu!');

    results['5_budget_overrun_warning'] = { pass: true, expense_id: expRes.data?.data?.id, budget_warning: expRes.data?.data?.budget_warning };
    console.log('[PASS] Scenario 5: Pengeluaran dengan Warning Anggaran Sukses\n');
  } catch (err) {
    results['5_budget_overrun_warning'] = { pass: false, error: err.message };
    console.error('[FAIL] Scenario 5:', err.message, '\n');
  }

  // ==================================================================
  // SCENARIO 6: Ingest & Cairkan Payroll Pegawai Asli Kepegawaian
  // ==================================================================
  try {
    console.log('--- SCENARIO 6: Ingest & Pencairan Payroll Pegawai Kepegawaian (ID: 1) ---');
    // 1. Ingest via X-API-Key (Internal)
    const ingestRes = await new Promise((resolve) => {
      const server = app.listen(0, () => {
        const port = server.address().port;
        const r = http.request(`http://127.0.0.1:${port}/api/v1/keuangan/internal/payroll-disbursements/ingest`, {
          method: 'POST',
          headers: {
            'X-API-Key': process.env.INTERNAL_API_KEY || 'internal_api_secret_key_default',
            'Content-Type': 'application/json'
          }
        }, (res) => {
          let raw = '';
          res.on('data', c => raw += c);
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          });
        });
        r.write(JSON.stringify({
          school_unit_id: 1,
          employee_id: 1, // Aji Mustopa S.Pd., M.E.
          payroll_id: 992,
          period_month: 9,
          period_year: 2026,
          amount: 4500000
        }));
        r.end();
      });
    });

    console.log('Ingest Payroll Status:', ingestRes.status, 'ID:', ingestRes.data?.data?.id);
    if (ingestRes.status !== 201 && ingestRes.status !== 200) throw new Error('Gagal ingest payroll');
    const disbursementId = ingestRes.data.data.id;

    // 2. Disburse oleh Bendahara
    const cashBefore = await dbKeuangan('cash_accounts').where({ id: 2 }).first();
    const balanceBefore = parseFloat(cashBefore.current_balance);

    const disburseRes = await req(`/api/v1/keuangan/payroll-disbursements/${disbursementId}/disburse`, 'POST', {
      cash_account_id: 2
    });

    console.log('Disburse Status:', disburseRes.status, 'Data:', disburseRes.data);
    if (disburseRes.status !== 200) throw new Error('Gagal mencairkan payroll');

    const cashAfter = await dbKeuangan('cash_accounts').where({ id: 2 }).first();
    const balanceAfter = parseFloat(cashAfter.current_balance);
    const disbursementRecord = await dbKeuangan('payroll_disbursements').where({ id: disbursementId }).first();

    const journal = await dbKeuangan('journal_entries')
      .where({ source_type: 'payroll_disbursement', source_id: disbursementId })
      .first();

    console.log('Payroll Status After:', disbursementRecord.status);
    console.log('Cash Balance Decreased by:', balanceBefore - balanceAfter);
    console.log('Auto Journal Generated:', journal?.journal_number);

    if (disbursementRecord.status !== 'disbursed') throw new Error('Status payroll bukan disbursed');
    if (!journal) throw new Error('Jurnal payroll tidak terbentuk');

    results['6_payroll_ingest_and_disburse'] = { pass: true, journal: journal.journal_number, amount: 4500000 };
    console.log('[PASS] Scenario 6: Payroll Ingest & Pencairan Sukses\n');
  } catch (err) {
    results['6_payroll_ingest_and_disburse'] = { pass: false, error: err.message };
    console.error('[FAIL] Scenario 6:', err.message, '\n');
  }

  // ==================================================================
  // SCENARIO 7: Export 5 Laporan Keuangan ke PDF
  // ==================================================================
  try {
    console.log('--- SCENARIO 7: Export 5 Laporan Keuangan ke PDF (?format=pdf) ---');
    const r1 = await req('/api/v1/keuangan/reports/general-ledger?format=pdf', 'GET', null, true);
    const r2 = await req('/api/v1/keuangan/reports/trial-balance?format=pdf', 'GET', null, true);
    const r3 = await req('/api/v1/keuangan/reports/income-statement?format=pdf', 'GET', null, true);
    const r4 = await req('/api/v1/keuangan/reports/cash-flow?format=pdf', 'GET', null, true);
    const r5 = await req('/api/v1/keuangan/reports/balance-sheet?format=pdf', 'GET', null, true);

    console.log('1. General Ledger PDF -> Status:', r1.status, 'Size:', r1.size, 'Valid PDF:', r1.isPdf);
    console.log('2. Trial Balance PDF   -> Status:', r2.status, 'Size:', r2.size, 'Valid PDF:', r2.isPdf);
    console.log('3. Income Statement PDF-> Status:', r3.status, 'Size:', r3.size, 'Valid PDF:', r3.isPdf);
    console.log('4. Cash Flow PDF       -> Status:', r4.status, 'Size:', r4.size, 'Valid PDF:', r4.isPdf);
    console.log('5. Balance Sheet PDF   -> Status:', r5.status, 'Size:', r5.size, 'Valid PDF:', r5.isPdf);

    const allValid = r1.isPdf && r2.isPdf && r3.isPdf && r4.isPdf && r5.isPdf &&
                     r1.status === 200 && r2.status === 200 && r3.status === 200 && r4.status === 200 && r5.status === 200;

    if (!allValid) throw new Error('Salah satu export PDF gagal atau output bukan format PDF valid');

    results['7_export_five_pdf_reports'] = { pass: true, sizes: { gl: r1.size, tb: r2.size, is: r3.size, cf: r4.size, bs: r5.size } };
    console.log('[PASS] Scenario 7: Export 5 Laporan PDF Sukses\n');
  } catch (err) {
    results['7_export_five_pdf_reports'] = { pass: false, error: err.message };
    console.error('[FAIL] Scenario 7:', err.message, '\n');
  }

  // ==================================================================
  // SCENARIO 8: Penonaktifan Payment Gateway (HTTP 501 Check)
  // ==================================================================
  try {
    console.log('--- SCENARIO 8: Payment Gateway Endpoint 501 Check ---');
    const gw1 = await req('/api/v1/keuangan/payment-gateway/checkout', 'POST', { student_bill_id: 1 });
    const gw2 = await req('/api/v1/keuangan/payment-gateway/callback', 'POST', { tx_id: 'test' });

    console.log('Gateway Checkout Status:', gw1.status, 'Message:', gw1.data?.message);
    console.log('Gateway Callback Status:', gw2.status, 'Message:', gw2.data?.message);

    if (gw1.status !== 501 || gw2.status !== 501) {
      throw new Error(`Expected 501 but got checkout: ${gw1.status}, callback: ${gw2.status}`);
    }

    results['8_payment_gateway_501'] = { pass: true, checkout_status: gw1.status, callback_status: gw2.status };
    console.log('[PASS] Scenario 8: Payment Gateway 501 Sukses\n');
  } catch (err) {
    results['8_payment_gateway_501'] = { pass: false, error: err.message };
    console.error('[FAIL] Scenario 8:', err.message, '\n');
  }

  console.log('================================================================');
  console.log('END-TO-END TEST RESULTS SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('================================================================');

  const allPassed = Object.values(results).every(r => r.pass);
  process.exit(allPassed ? 0 : 1);
}

runE2ETests().catch(e => {
  console.error('Fatal error in test runner:', e);
  process.exit(1);
});
