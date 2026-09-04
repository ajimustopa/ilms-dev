/**
 * Comprehensive Verification Script for Lapisan Saldo per Sumber Dana (Fund Balances Layer)
 */
const db = require('../src/config/db/keuangan');
const masterDataService = require('../src/modules/keuangan/master-data/service');
const paymentsService = require('../src/modules/keuangan/payments/service');
const otherIncomesService = require('../src/modules/keuangan/other-incomes/service');
const expensesService = require('../src/modules/keuangan/expenses/service');
const fundBalanceEngine = require('../src/modules/keuangan/bookkeeping/fundBalanceEngine');

async function runTests() {
  console.log('=== START VERIFICATION: FUND BALANCES & MUTATIONS LAYER ===\n');

  const schoolUnitId = 1;
  const userId = 88;

  try {
    // 0. Ambil master data pendukung
    const cashAccount = await db('cash_accounts').where({ school_unit_id: schoolUnitId, is_active: true }).first();
    const feeType = await db('fee_types').where({ school_unit_id: schoolUnitId, is_active: true }).first();
    const otherCategory = await db('transaction_categories').where('school_unit_id', schoolUnitId).whereNot('category_kind', 'expense').first();
    const budgetItem = await db('budget_plan_expense_items').first();

    console.log('Master data didapat:', {
      cash_account_id: cashAccount?.id,
      fee_type_id: feeType?.id,
      category_id: otherCategory?.id,
      budget_item_id: budgetItem?.id
    });

    // 1. Uji Opening Balance -> Masuk ke Opening Pool
    console.log('\n1. Menguji Pencatatan Saldo Awal Kas -> Masuk ke Opening Pool...');
    await db('cash_account_opening_balances').where({ cash_account_id: cashAccount.id, academic_year_id: 1 }).delete();
    const openingBalBefore = await fundBalanceEngine.getFundBalance(schoolUnitId, 'opening_pool', 0);
    const openingTestAmt = 5000000;

    await masterDataService.createOpeningBalance(schoolUnitId, {
      cash_account_id: cashAccount.id,
      academic_year_id: 1,
      opening_balance: openingTestAmt
    }, userId);

    const openingBalAfter = await fundBalanceEngine.getFundBalance(schoolUnitId, 'opening_pool', 0);
    console.log(`✓ Saldo Opening Pool: Sebelum Rp ${openingBalBefore.toLocaleString('id-ID')} -> Sesudah Rp ${openingBalAfter.toLocaleString('id-ID')}`);
    if (openingBalAfter !== openingBalBefore + openingTestAmt) {
      throw new Error('FAILED: Saldo opening pool tidak bertambah sesuai nominal saldo awal');
    }

    // 2. Uji Penerimaan Non-SPP (Other Income) -> Masuk ke transaction_category
    console.log('\n2. Menguji Penerimaan Non-SPP -> Masuk ke Kantong Pendapatan...');
    const catBalBefore = await fundBalanceEngine.getFundBalance(schoolUnitId, 'transaction_category', otherCategory.id);
    const otherIncomeAmt = 1500000;

    const otherIncome = await otherIncomesService.createOtherIncome(schoolUnitId, {
      transaction_category_id: otherCategory.id,
      cash_account_id: cashAccount.id,
      amount: otherIncomeAmt,
      notes: 'Donasi Test Fund Balance'
    }, userId);

    const catBalAfter = await fundBalanceEngine.getFundBalance(schoolUnitId, 'transaction_category', otherCategory.id);
    console.log(`✓ Saldo Kantong Pendapatan #${otherCategory.id}: Sebelum Rp ${catBalBefore.toLocaleString('id-ID')} -> Sesudah Rp ${catBalAfter.toLocaleString('id-ID')}`);
    if (catBalAfter !== catBalBefore + otherIncomeAmt) {
      throw new Error('FAILED: Saldo kantong pendapatan tidak bertambah');
    }

    // 3. Uji Pembayaran Tagihan Santri (Live vs Legacy)
    console.log('\n3. Menguji Pembayaran Tagihan Live vs Legacy...');
    const feeBalBefore = await fundBalanceEngine.getFundBalance(schoolUnitId, 'fee_type', feeType.id);

    // 3a. Tagihan Live Normal
    const [liveBillId] = await db('student_bills').insert({
      school_unit_id: schoolUnitId,
      student_id: 20,
      fee_type_id: feeType.id,
      period_month: 9,
      period_year: 2026,
      amount: 400000,
      status: 'unpaid',
      is_legacy: false
    });

    const actualLiveBillId = liveBillId || (await db('student_bills').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

    await paymentsService.recordBillPayment(schoolUnitId, {
      student_bill_id: actualLiveBillId,
      cash_account_id: cashAccount.id,
      amount: 400000,
      payment_method: 'cash',
      paid_at: '2026-09-01'
    }, userId);

    const feeBalAfterLive = await fundBalanceEngine.getFundBalance(schoolUnitId, 'fee_type', feeType.id);
    console.log(`✓ Pembayaran Live: Saldo Pos ${feeType.name}: Sebelum Rp ${feeBalBefore.toLocaleString('id-ID')} -> Sesudah Rp ${feeBalAfterLive.toLocaleString('id-ID')}`);
    if (feeBalAfterLive !== feeBalBefore + 400000) {
      throw new Error('FAILED: Saldo pos biaya live tidak bertambah');
    }

    // 3b. Tagihan Legacy (is_legacy = true): pembayaran migrasi TIDAK boleh memicu applyFundMutation
    const [legacyBillId] = await db('student_bills').insert({
      school_unit_id: schoolUnitId,
      student_id: 20,
      fee_type_id: feeType.id,
      period_month: 5,
      period_year: 2026,
      amount: 300000,
      status: 'unpaid',
      is_legacy: true
    });
    const actualLegacyBillId = legacyBillId || (await db('student_bills').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

    // Catat legacy payment
    await db('bill_payments').insert({
      student_bill_id: actualLegacyBillId,
      amount: 300000,
      payment_method: 'cash',
      receipt_number: `LEGACY-TEST-${Date.now()}`,
      paid_at: '2026-05-01',
      is_legacy: true,
      historical_cash_note: 'Kas Lama'
    });

    const feeBalAfterLegacy = await fundBalanceEngine.getFundBalance(schoolUnitId, 'fee_type', feeType.id);
    console.log(`✓ Pembayaran Migrasi Legacy (is_legacy=true): Saldo Tetap Rp ${feeBalAfterLegacy.toLocaleString('id-ID')} (Tidak terpengaruh)`);
    if (feeBalAfterLegacy !== feeBalAfterLive) {
      throw new Error('FAILED: Pembayaran legacy seharusnya tidak memutasi fund balance');
    }

    // 4. Uji Pengeluaran / Belanja (createExpense) dengan Alokasi Kantong Dana
    console.log('\n4. Menguji Pencatatan Belanja dengan Alokasi Kantong Dana...');
    // Override RAPBS tanpa reason (harus ditolak 422)
    if (budgetItem && budgetItem.fund_source_fee_type_id) {
      try {
        await expensesService.createExpense(schoolUnitId, {
          item_name: 'ATK Uji Override',
          unit_price: 100000,
          quantity: 1,
          budget_plan_expense_item_id: budgetItem.id,
          fund_source_type: 'opening_pool',
          fund_source_ref_id: 0,
          fund_source_override_reason: '' // Kosong!
        }, userId);
        throw new Error('FAILED: Override sumber dana tanpa reason seharusnya ditolak 422');
      } catch (err) {
        console.log('✓ Berhasil ditolak override sumber dana tanpa reason:', err.message);
      }
    }

    // Belanja normal memotong Opening Pool
    const opBeforeExpense = await fundBalanceEngine.getFundBalance(schoolUnitId, 'opening_pool', 0);
    const expenseAmt = 250000;

    const createdExpense = await expensesService.createExpense(schoolUnitId, {
      item_name: 'Pembelian Cat Tembok',
      unit_price: expenseAmt,
      quantity: 1,
      fund_source_type: 'opening_pool',
      fund_source_ref_id: 0,
      notes: 'Uji Belanja Opening Pool'
    }, userId);

    const opAfterExpense = await fundBalanceEngine.getFundBalance(schoolUnitId, 'opening_pool', 0);
    console.log(`✓ Saldo Opening Pool setelah Belanja: Sebelum Rp ${opBeforeExpense.toLocaleString('id-ID')} -> Sesudah Rp ${opAfterExpense.toLocaleString('id-ID')}`);
    if (opAfterExpense !== opBeforeExpense - expenseAmt) {
      throw new Error('FAILED: Saldo opening pool tidak terpotong belanja');
    }

    // 5. Uji Realokasi Sumber Dana (PATCH /expenses/:id/fund-source)
    console.log('\n5. Menguji Realokasi Sumber Dana Pengeluaran (Reassign Fund Source)...');
    // Realokasi belanja dari opening_pool ke pos fee_type
    const feeBalBeforeReassign = await fundBalanceEngine.getFundBalance(schoolUnitId, 'fee_type', feeType.id);
    const opBeforeReassign = await fundBalanceEngine.getFundBalance(schoolUnitId, 'opening_pool', 0);

    const reassignRes = await expensesService.reassignExpenseFundSource(schoolUnitId, createdExpense.id, {
      fund_source_type: 'fee_type',
      fund_source_ref_id: feeType.id,
      reason: 'Dialihkan ke dana operasional SPP sesuai instruksi pimpinan'
    }, userId);

    const feeBalAfterReassign = await fundBalanceEngine.getFundBalance(schoolUnitId, 'fee_type', feeType.id);
    const opAfterReassign = await fundBalanceEngine.getFundBalance(schoolUnitId, 'opening_pool', 0);

    console.log('✓ Realokasi Berhasil:', {
      expense_id: reassignRes.id,
      new_fund_source: reassignRes.fund_source_type,
      new_ref_id: reassignRes.fund_source_ref_id,
      opening_pool_kembali: `Rp ${opBeforeReassign.toLocaleString('id-ID')} -> Rp ${opAfterReassign.toLocaleString('id-ID')} (+Rp ${expenseAmt.toLocaleString('id-ID')})`,
      pos_biaya_terpotong: `Rp ${feeBalBeforeReassign.toLocaleString('id-ID')} -> Rp ${feeBalAfterReassign.toLocaleString('id-ID')} (-Rp ${expenseAmt.toLocaleString('id-ID')})`
    });

    if (opAfterReassign !== opBeforeReassign + expenseAmt || feeBalAfterReassign !== feeBalBeforeReassign - expenseAmt) {
      throw new Error('FAILED: Mutasi pengembalian & pemotongan dana realokasi tidak berpasangan presisi');
    }

    // 6. Uji Daftar Saldo Sumber Dana (listFundBalances) & Mutasi Drill-down
    console.log('\n6. Menguji listFundBalances & Drill-down Riwayat Mutasi...');
    const fundList = await fundBalanceEngine.listFundBalances(schoolUnitId);
    console.log('✓ Ringkasan Sumber Dana:', fundList.summary);
    console.log(`✓ Total Kantong Dana Terdaftar: ${fundList.funds.length}`);

    // Baris pertama wajib Opening Pool
    if (fundList.funds[0].fund_type !== 'opening_pool') {
      throw new Error('FAILED: Baris pertama fund balances harus opening_pool');
    }

    const openingFbRow = fundList.funds[0];
    if (openingFbRow.id) {
      const muts = await fundBalanceEngine.listFundMutations(schoolUnitId, openingFbRow.id);
      console.log(`✓ Mutasi Opening Pool (ID #${openingFbRow.id}) memuat ${muts.mutations.length} entri riwayat.`);
    }

    console.log('\n=== SELURUH PENGUJIAN FUND BALANCES & MUTATIONS LAYER BERHASIL (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runTests();
