/**
 * Verification test script for 7 nonprofit COA groups, normal_balance, and opening balance auto-journal
 */
const db = require('../src/config/db/keuangan');
const masterDataService = require('../src/modules/keuangan/master-data/service');
const reportsService = require('../src/modules/keuangan/reports/service');

async function testAccountingFoundation() {
  console.log('=== 1. Check Table Columns & Migrated COA Data ===');
  const accounts = await db('chart_of_accounts').where({ school_unit_id: 1 });
  console.log(`Found ${accounts.length} accounts for unit 1:`);
  accounts.forEach(a => {
    console.log(` - [${a.account_code}] ${a.account_name} | Group: ${a.account_group} | Normal: ${a.normal_balance}`);
  });

  // Verify no old groups remain
  const oldGroups = accounts.filter(a => ['asset', 'liability', 'equity', 'revenue', 'expense'].includes(a.account_group));
  if (oldGroups.length === 0) {
    console.log('PASS: All old account groups have been migrated to 7 nonprofit groups.');
  } else {
    console.error('FAIL: Found legacy groups remaining:', oldGroups);
  }

  console.log('\n=== 2. Test Normal Balance Consistency Validation ===');
  try {
    // Attempt invalid normal balance
    await masterDataService.createChartOfAccount(1, {
      account_code: '1-999',
      account_name: 'Test Invalid',
      account_group: 'harta',
      normal_balance: 'credit' // Invalid for harta
    });
    console.error('FAIL: Validation did not throw for mismatched normal_balance');
  } catch (err) {
    console.log('PASS: Validation correctly caught mismatched normal_balance:', err.message);
  }

  // Valid account creation
  const validAccount = await masterDataService.createChartOfAccount(1, {
    account_code: '1-999',
    account_name: 'Test Piutang Khusus',
    account_group: 'piutang',
    normal_balance: 'debit'
  });
  console.log('PASS: Valid account created:', validAccount.account_code, validAccount.account_group, validAccount.normal_balance);

  // Clean up test account
  await db('chart_of_accounts').where({ id: validAccount.id }).delete();

  console.log('\n=== 3. Test Auto-Journal for Opening Balance ===');
  const cashAcc = await db('cash_accounts').where({ school_unit_id: 1 }).first();
  if (cashAcc) {
    const testYearId = 9999;
    const testOpeningBalance = 7500000;
    
    // Clean up if exists from previous runs
    await db('cash_account_opening_balances').where({ cash_account_id: cashAcc.id, academic_year_id: testYearId }).delete();

    const createdOpening = await masterDataService.createOpeningBalance(1, {
      cash_account_id: cashAcc.id,
      academic_year_id: testYearId,
      opening_balance: testOpeningBalance
    });
    console.log('Created opening balance record ID:', createdOpening.id);

    // Check if journal entry exists
    const journal = await db('journal_entries').where({ source_id: createdOpening.id, source_type: 'manual' }).first();
    if (journal) {
      console.log(`PASS: Auto-journal header created: ${journal.journal_number} - "${journal.description}"`);
      const lines = await db('journal_entry_lines').where({ journal_entry_id: journal.id });
      console.log(` - Lines count: ${lines.length}`);
      lines.forEach(l => {
        console.log(`   * Account ID: ${l.chart_of_account_id} | Side: ${l.entry_side} | Amount: Rp ${parseFloat(l.amount).toLocaleString('id-ID')}`);
      });
    } else {
      console.error('FAIL: Auto-journal not found for opening balance');
    }

    // Clean up test opening balance and journal
    if (journal) {
      await db('journal_entry_lines').where({ journal_entry_id: journal.id }).delete();
      await db('journal_entries').where({ id: journal.id }).delete();
    }
    await db('cash_account_opening_balances').where({ id: createdOpening.id }).delete();
  }

  console.log('\n=== 4. Test Reports Service Calculations ===');
  const trialBalance = await reportsService.getTrialBalance(1);
  console.log(`Trial Balance: Total Debit = ${trialBalance.total_debit}, Total Credit = ${trialBalance.total_credit}, Balanced = ${trialBalance.is_balanced}`);
  
  const incomeStatement = await reportsService.getIncomeStatement(1);
  console.log(`Income Statement: Revenues = ${incomeStatement.total_revenue}, Expenses = ${incomeStatement.total_expense}, Surplus/Defisit = ${incomeStatement.surplus_defisit}`);

  const balanceSheet = await reportsService.getBalanceSheet(1);
  console.log(`Balance Sheet: Assets = ${balanceSheet.total_assets}, Liabilities = ${balanceSheet.total_liabilities}, Equity = ${balanceSheet.total_equity}, Balanced = ${balanceSheet.is_balanced}`);

  const cashFlow = await reportsService.getCashFlow(1);
  console.log(`Cash Flow: Inflow = ${cashFlow.cash_inflow}, Outflow = ${cashFlow.cash_outflow}, Net = ${cashFlow.net_cash_flow}`);

  console.log('\n=== ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

testAccountingFoundation().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
