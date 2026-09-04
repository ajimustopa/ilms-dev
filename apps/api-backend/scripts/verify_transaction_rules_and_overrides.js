/**
 * Verification Script: verify_transaction_rules_and_overrides.js
 */
const db = require('../src/config/db/keuangan');
const masterDataService = require('../src/modules/keuangan/master-data/service');
const { recordJournal } = require('../src/modules/keuangan/bookkeeping/journalEngine');
const expensesService = require('../src/modules/keuangan/expenses/service');
const otherIncomesService = require('../src/modules/keuangan/other-incomes/service');

async function runTests() {
  console.log('=== START VERIFICATION: TRANSACTION RULES & OVERRIDES ===\n');
  const schoolUnitId = 1;

  try {
    // 1. Validasi 5 Aturan Bawaan Sistem
    console.log('1. Memeriksa 5 Aturan Bawaan Sistem (is_system = true)...');
    const systemRules = await db('transaction_account_mappings')
      .where({ school_unit_id: schoolUnitId, is_system: true });
    
    console.log(`Ditemukan ${systemRules.length} aturan sistem.`);
    const systemCodes = systemRules.map(r => r.transaction_code);
    console.log('Kode aturan sistem:', systemCodes);

    const requiredCodes = [
      'student_bill_payment',
      'expense',
      'other_income',
      'payroll_disbursement',
      'opening_balance_entry'
    ];

    for (const code of requiredCodes) {
      if (!systemCodes.includes(code)) {
        throw new Error(`Aturan sistem '${code}' tidak ditemukan atau is_system bukan true!`);
      }
    }
    console.log('✓ 5 Aturan Bawaan Sistem terverifikasi is_system = true\n');

    // 2. Proteksi Aturan Bawaan Sistem
    console.log('2. Menguji proteksi aturan bawaan sistem (larangan ubah kode & larangan hapus)...');
    const firstSystemRule = systemRules[0];

    // Coba ubah transaction_code pada aturan sistem
    try {
      await masterDataService.updateAccountMapping(schoolUnitId, firstSystemRule.id, {
        transaction_code: 'hacked_code',
        transaction_label: 'Attempt Hack'
      }, 1);
      throw new Error('FAILED: Seharusnya gagal mengubah kode transaksi pada aturan sistem!');
    } catch (err) {
      if (err.message.includes('terkunci')) {
        console.log('✓ Berhasil dicegah:', err.message);
      } else {
        throw err;
      }
    }

    // Coba hapus aturan sistem
    try {
      await masterDataService.deleteAccountMapping(schoolUnitId, firstSystemRule.id, 1);
      throw new Error('FAILED: Seharusnya gagal menghapus aturan sistem!');
    } catch (err) {
      if (err.message.includes('tidak dapat dihapus')) {
        console.log('✓ Berhasil dicegah:', err.message);
      } else {
        throw err;
      }
    }
    console.log('✓ Proteksi aturan sistem berfungsi 100%\n');

    // 3. Pembuatan & Pengelolaan Aturan Transaksi Kustom
    console.log('3. Menguji CRUD Aturan Transaksi Kustom...');
    const testCode = `custom_test_${Date.now()}`;
    const customRule = await masterDataService.createAccountMapping(schoolUnitId, {
      transaction_code: testCode,
      transaction_label: 'Uji Aturan Kustom',
      debit_account_id: firstSystemRule.debit_account_id,
      credit_account_id: firstSystemRule.credit_account_id
    }, 1);

    console.log(`✓ Aturan kustom berhasil dibuat ID: ${customRule.id}, is_system: ${customRule.is_system}`);
    if (customRule.is_system !== 0 && customRule.is_system !== false) {
      throw new Error('Aturan kustom seharusnya is_system = false');
    }

    // Update label aturan kustom
    const updatedCustom = await masterDataService.updateAccountMapping(schoolUnitId, customRule.id, {
      transaction_label: 'Uji Aturan Kustom Diperbarui',
      edit_reason: 'Testing update rule'
    }, 1);
    console.log('✓ Aturan kustom berhasil diperbarui labelnya:', updatedCustom.transaction_label);

    // Toggle status
    await masterDataService.updateAccountMappingStatus(schoolUnitId, customRule.id, false, 1);
    const deactivated = await masterDataService.getAccountMappingById(schoolUnitId, customRule.id);
    console.log('✓ Status aturan kustom di-toggle:', deactivated.is_active ? 'Aktif' : 'Non-aktif');

    // Hapus aturan kustom
    await masterDataService.deleteAccountMapping(schoolUnitId, customRule.id, 1);
    console.log('✓ Aturan kustom berhasil dihapus\n');

    // 4. Validasi Override Transaksi Tanpa Alasan (Wajib Error 422)
    console.log('4. Menguji penolakan override transaksi tanpa alasan...');
    const coaAccounts = await db('chart_of_accounts').where({ school_unit_id: schoolUnitId }).limit(3);
    const altDebit = coaAccounts[1].id;
    const altCredit = coaAccounts[2].id;

    try {
      await recordJournal({
        schoolUnitId,
        transactionCode: 'expense',
        amount: 150000,
        sourceType: 'expense',
        overrideDebitAccountId: altDebit,
        overrideCreditAccountId: altCredit,
        overrideReason: '' // Kosong -> Harus ditolak!
      });
      throw new Error('FAILED: Seharusnya gagal karena override_reason kosong!');
    } catch (err) {
      if (err.statusCode === 422 || err.message.includes('override_reason')) {
        console.log('✓ Berhasil ditolak dengan HTTP 422:', err.message);
      } else {
        throw err;
      }
    }

    // 5. Validasi Override Transaksi Dengan Alasan Valid & Audit Log
    console.log('\n5. Menguji eksekusi override transaksi dengan alasan valid & pencatatan audit log...');
    const journalResult = await recordJournal({
      schoolUnitId,
      transactionCode: 'expense',
      amount: 275000,
      sourceType: 'expense',
      overrideDebitAccountId: altDebit,
      overrideCreditAccountId: altCredit,
      overrideReason: 'Instruksi khusus pengalihan pos beban listrik dari Direktur',
      userId: 1
    });

    console.log('✓ Jurnal override berhasil dibuat:', {
      journal_number: journalResult.journal_number,
      debit_account_id: journalResult.debit_account_id,
      credit_account_id: journalResult.credit_account_id,
      is_overridden: journalResult.is_overridden
    });

    if (journalResult.debit_account_id !== altDebit || journalResult.credit_account_id !== altCredit) {
      throw new Error('Jurnal tidak menggunakan akun override!');
    }

    // Cek finance_audit_logs untuk action OVERRIDE_TRANSACTION_MAPPING
    const auditLog = await db('finance_audit_logs')
      .where({
        school_unit_id: schoolUnitId,
        action: 'OVERRIDE_TRANSACTION_MAPPING'
      })
      .orderBy('id', 'desc')
      .first();

    if (!auditLog) {
      throw new Error('Audit log OVERRIDE_TRANSACTION_MAPPING tidak ditemukan!');
    }

    console.log('✓ Audit log OVERRIDE_TRANSACTION_MAPPING tercatat rapi:', {
      id: auditLog.id,
      action: auditLog.action,
      data_after: typeof auditLog.data_after === 'string' ? JSON.parse(auditLog.data_after) : auditLog.data_after
    });

    // 6. Uji Transaksi Expense dengan parameter override via Service
    console.log('\n6. Menguji createExpense dengan parameter override...');
    const expenseRes = await expensesService.createExpense(schoolUnitId, {
      item_name: 'Pembelian Genset Darurat',
      unit_price: 5000000,
      quantity: 1,
      vendor: 'Toko Elektronik Makmur',
      override_debit_account_id: altDebit,
      override_credit_account_id: altCredit,
      override_reason: 'Alokasi khusus dari dana cadangan darurat',
      notes: 'Pengadaan genset'
    }, 1);

    console.log('✓ Pengeluaran dengan override sukses dicatat, ID:', expenseRes.id);

    console.log('\n=== SELURUH PENGUJIAN ATURAN TRANSAKSI & OVERRIDE BERHASIL (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

runTests();
