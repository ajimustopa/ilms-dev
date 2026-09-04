const knexKeuangan = require('../src/config/db/keuangan');
const knexCore = require('../src/config/db/core');

async function auditDetails() {
  try {
    console.log('=== 16 TRANSACTION RULES PER SCHOOL UNIT ===');
    const rules = await knexKeuangan('transaction_account_mappings')
      .leftJoin('chart_of_accounts as d', 'transaction_account_mappings.debit_account_id', 'd.id')
      .leftJoin('chart_of_accounts as c', 'transaction_account_mappings.credit_account_id', 'c.id')
      .select(
        'transaction_account_mappings.id',
        'transaction_account_mappings.school_unit_id',
        'transaction_account_mappings.transaction_code',
        'transaction_account_mappings.transaction_label',
        'transaction_account_mappings.is_system',
        'transaction_account_mappings.is_active',
        'transaction_account_mappings.is_dynamic_account',
        'transaction_account_mappings.linked_feature_note',
        'd.account_code as debit_code',
        'd.account_name as debit_name',
        'c.account_code as credit_code',
        'c.account_name as credit_name'
      )
      .orderBy(['school_unit_id', 'id']);
    
    const units = [...new Set(rules.map(r => r.school_unit_id))];
    units.forEach(u => {
      const uRules = rules.filter(r => r.school_unit_id === u);
      console.log(`\n======================================================`);
      console.log(`Unit ID ${u} -> Total Rules: ${uRules.length}`);
      console.log(`======================================================`);
      uRules.forEach((r, idx) => {
        const debitStr = r.debit_code ? `${r.debit_code} (${r.debit_name})` : (r.is_dynamic_account ? '[Dinamis Kas/Katalog/Penerimaan]' : '-');
        const creditStr = r.credit_code ? `${r.credit_code} (${r.credit_name})` : (r.is_dynamic_account ? '[Dinamis Pos/Kas]' : '-');
        console.log(`${idx+1}. [${r.transaction_code}] ${r.transaction_label}`);
        console.log(`   Debit : ${debitStr}`);
        console.log(`   Credit: ${creditStr}`);
        console.log(`   is_system: ${r.is_system} | is_active: ${r.is_active} | is_dynamic: ${r.is_dynamic_account}`);
        if (r.linked_feature_note) console.log(`   Note: ${r.linked_feature_note}`);
      });
    });

    console.log('\n=== FEE TYPES AUDIT ===');
    const feeTypes = await knexKeuangan('fee_types')
      .leftJoin('chart_of_accounts', 'fee_types.related_revenue_account_id', 'chart_of_accounts.id')
      .select(
        'fee_types.id',
        'fee_types.school_unit_id',
        'fee_types.name',
        'fee_types.billing_pattern',
        'fee_types.related_revenue_account_id',
        'chart_of_accounts.account_code',
        'chart_of_accounts.account_name'
      );
    console.log(`Total Fee Types in DB: ${feeTypes.length}`);
    feeTypes.forEach(f => {
      console.log(`  - [ID ${f.id}] Unit: ${f.school_unit_id || 'All/Global'} | Name: ${f.name} | Revenue Account: ${f.related_revenue_account_id ? `${f.account_code} - ${f.account_name}` : 'NULL (TIDAK ADA AKUN PENDAPATAN!)'}`);
    });

  } catch (err) {
    console.error('Error during audit details:', err);
  } finally {
    await knexKeuangan.destroy();
    await knexCore.destroy();
    process.exit(0);
  }
}

auditDetails();
