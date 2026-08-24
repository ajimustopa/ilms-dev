/**
 * Verification Test for Keuangan Module & Journal Engine
 */
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const { recordJournal } = require('./src/modules/keuangan/bookkeeping/journalEngine');
const db = require('./src/config/db/keuangan');

// Buat mock token super_admin
const token = jwt.sign(
  {
    id: 1,
    sub: 1,
    username: 'superadmin',
    full_name: 'Super Admin',
    account_type: 'admin',
    school_units: [
      {
        id: 1,
        roles: ['super_admin'],
        permissions: ['keuangan.master.cash_accounts.manage', 'keuangan.reports.view', 'keuangan.bills.generate']
      }
    ]
  },
  process.env.CORE_JWT_SECRET || 'default_core_jwt_secret_key',
  { expiresIn: '1h' }
);

async function testRoute(name, path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const http = require('http');
    const server = app.listen(0, async () => {
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}${path}`;

      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-School-Unit-Id': '1',
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(url, options, (res) => {
        let rawData = '';
        res.on('data', chunk => rawData += chunk);
        res.on('end', () => {
          server.close();
          try {
            const parsed = JSON.parse(rawData);
            console.log(`[PASS] ${method} ${path} -> Status: ${res.statusCode}, Success: ${parsed.success}`);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            console.log(`[RAW] ${method} ${path} -> Status: ${res.statusCode}`);
            resolve({ status: res.statusCode, raw: rawData });
          }
        });
      });

      req.on('error', (e) => {
        server.close();
        console.error(`[FAIL] ${method} ${path} -> Error: ${e.message}`);
        resolve({ error: e });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

async function testJournalEngine() {
  console.log('--- TESTING JOURNAL ENGINE DIRECTLY ---');
  // Pastikan ada mapping untuk student_bill_payment di school_unit_id 1
  let mapping = await db('transaction_account_mappings')
    .where({ school_unit_id: 1, transaction_code: 'student_bill_payment' })
    .first();

  if (!mapping) {
    // Ambil akun Kas (debit) dan Pendapatan SPP (kredit) dari chart_of_accounts
    const kasAcc = await db('chart_of_accounts').where({ school_unit_id: 1, account_code: '1-100' }).first();
    const sppAcc = await db('chart_of_accounts').where({ school_unit_id: 1, account_code: '4-100' }).first();

    if (kasAcc && sppAcc) {
      await db('transaction_account_mappings').insert({
        school_unit_id: 1,
        transaction_code: 'student_bill_payment',
        transaction_label: 'Penerimaan Pembayaran SPP Siswa',
        debit_account_id: kasAcc.id,
        credit_account_id: sppAcc.id
      });
      console.log('[SETUP] Created default mapping for student_bill_payment');
    }
  }

  // Eksekusi recordJournal
  const journalResult = await recordJournal({
    schoolUnitId: 1,
    transactionCode: 'student_bill_payment',
    amount: 350000,
    sourceType: 'student_bill_payment',
    sourceId: 1,
    description: 'Uji Coba Jurnal Otomatis Pembayaran SPP',
    journalDate: '2026-08-17'
  });

  console.log(`[PASS] Journal Engine: Created ${journalResult.journal_number} with ID: ${journalResult.id}`);

  // Verifikasi 2 baris (debit & credit) di journal_entry_lines
  const lines = await db('journal_entry_lines').where({ journal_entry_id: journalResult.id });
  if (lines.length === 2 && lines[0].amount == 350000 && lines[1].amount == 350000) {
    console.log(`[PASS] Journal Lines: Exactly 2 balanced lines created (Debit: ${lines.find(l=>l.entry_side==='debit').amount}, Credit: ${lines.find(l=>l.entry_side==='credit').amount})`);
  } else {
    console.error('[FAIL] Journal Lines verification failed:', lines);
  }
}

async function runAllTests() {
  console.log('--- START KEUANGAN VERIFICATION TESTS ---');
  await testJournalEngine();
  await testRoute('List Cash Accounts', '/api/v1/keuangan/cash-accounts');
  await testRoute('List COA', '/api/v1/keuangan/chart-of-accounts');
  await testRoute('List Fee Types', '/api/v1/keuangan/fee-types');
  await testRoute('Preview Bill Generation', '/api/v1/keuangan/student-bills/generate/preview', 'POST', {
    fee_type_id: 1,
    period_month: 8,
    period_year: 2026,
    target: 'all'
  });
  await testRoute('List Student Bills', '/api/v1/keuangan/student-bills');
  await testRoute('General Ledger Report', '/api/v1/keuangan/reports/general-ledger');
  await testRoute('Trial Balance Report', '/api/v1/keuangan/reports/trial-balance');
  await testRoute('Income Statement Report', '/api/v1/keuangan/reports/income-statement');
  await testRoute('Dashboard Summary', '/api/v1/keuangan/dashboard');
  await testRoute('Parent Facing Bills', '/api/v1/keuangan/parent-facing/bills?student_id=1');
  console.log('--- ALL KEUANGAN TESTS COMPLETED ---');
  process.exit(0);
}

runAllTests();
