const knexKeuangan = require('../src/config/db/keuangan');
const knexCore = require('../src/config/db/core');

async function runAudit() {
  try {
    console.log('=== 1. KNEX MIGRATION STATUS (KEUANGAN) ===');
    const completedMigrations = await knexKeuangan('knex_migrations_keuangan').select('*').orderBy('id', 'asc');
    console.log('Total Migrations Run in DB:', completedMigrations.length);
    console.log('Last 5 Migrations Run:');
    completedMigrations.slice(-5).forEach(m => console.log(`  - [${m.id}] ${m.name} (batch ${m.batch})`));

    console.log('\n=== 2. FEE_TYPES SCHEMA & DATA ===');
    const feeTypeCols = await knexKeuangan.raw(`DESCRIBE fee_types`);
    console.log('Columns in fee_types:', (feeTypeCols[0] || feeTypeCols).map(c => c.Field));
    
    const feeTypes = await knexKeuangan('fee_types').select('*');
    console.log('Total Fee Types:', feeTypes.length);
    console.log('Sample Fee Types:');
    feeTypes.forEach(f => {
      console.log(`  - ID ${f.id} | Name: ${f.name} | related_revenue_account_id: ${f.related_revenue_account_id}`);
    });

    console.log('\n=== 3. KEUANGAN.* PERMISSIONS IN CORE ===');
    const perms = await knexCore('permissions')
      .where('name', 'like', 'keuangan.%')
      .select('id', 'name', 'description')
      .orderBy('name', 'asc');
    console.log('Total keuangan.* permissions:', perms.length);
    perms.forEach(p => console.log(`  - ${p.name}: ${p.description}`));

    console.log('\n=== 4. 16 TRANSACTION RULES DETAILS ===');
    const rules = await knexKeuangan('transaction_account_mappings')
      .join('chart_of_accounts as d', 'transaction_account_mappings.debit_account_id', 'd.id')
      .join('chart_of_accounts as c', 'transaction_account_mappings.credit_account_id', 'c.id')
      .select(
        'transaction_account_mappings.id',
        'transaction_account_mappings.school_unit_id',
        'transaction_account_mappings.transaction_type',
        'transaction_account_mappings.rule_name',
        'transaction_account_mappings.is_system',
        'transaction_account_mappings.allow_manual_override',
        'd.account_code as debit_code',
        'd.account_name as debit_name',
        'c.account_code as credit_code',
        'c.credit_name as credit_name'
      )
      .orderBy(['school_unit_id', 'id']);
    console.log(`Total rules in DB: ${rules.length}`);
    const unit1Rules = rules.filter(r => r.school_unit_id === 1);
    console.log(`Unit 1 has ${unit1Rules.length} rules:`);
    unit1Rules.forEach(r => {
      console.log(`  [${r.transaction_type}] ${r.rule_name} | Debit: ${r.debit_code} | Credit: ${r.credit_code} | is_system: ${r.is_system} | allow_override: ${r.allow_manual_override}`);
    });

    console.log('\n=== 5. CHECK ALL TABLE COLUMN DEFINITIONS ===');
    const tables = await knexKeuangan.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name NOT LIKE 'knex_%'
      ORDER BY table_name
    `);
    const tableNames = (tables[0] || tables).map(t => t.table_name || t.TABLE_NAME);
    console.log(`Found ${tableNames.length} domain tables:`);

    const schemaOverview = {};
    for (const t of tableNames) {
      const cols = await knexKeuangan.raw(`DESCRIBE ${t}`);
      schemaOverview[t] = (cols[0] || cols).map(c => ({
        field: c.Field,
        type: c.Type,
        null: c.Null,
        key: c.Key,
        default: c.Default,
        extra: c.Extra
      }));
    }
    console.log(JSON.stringify(schemaOverview, null, 2));

  } catch (err) {
    console.error('Audit query error:', err);
  } finally {
    await knexKeuangan.destroy();
    await knexCore.destroy();
    process.exit(0);
  }
}

runAudit();
