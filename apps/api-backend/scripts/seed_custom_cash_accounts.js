/**
 * Script to insert custom cash accounts requested by user
 */
const db = require('../src/config/db/keuangan');

const cashAccountsData = [
  { name: 'Tahun Berjalan', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559456108' },
  { name: 'PPDB', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1857140424' },
  { name: 'Operasional', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559557311' },
  { name: 'Tunai', account_kind: 'cash', bank_name: null, bank_account_number: null },
  { name: 'Kantin', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559494315' },
  { name: 'Sport Center', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559508828' },
  { name: 'Dana Kurban', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559566982' },
  { name: 'Tabungan THR', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559422963' },
  { name: 'Bank #1', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559480459' },
  { name: 'Bank #2', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559526575' },
  { name: 'Bank #3', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559539437' },
  { name: 'Bank #4', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1559548330' },
  { name: 'Bank #5', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1857137308' },
  { name: 'Bank #6', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1857138630' },
  { name: 'Bank #7', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1857140128' },
  { name: 'Bank #8', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1857140718' },
  { name: 'Bank #9', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1857141020' },
  { name: 'Bank #10', account_kind: 'bank', bank_name: 'Bank Nasional Indonesia (BNI)', bank_account_number: '1857141495' }
];

async function seedCashAccounts() {
  console.log('=== MEMULAI PENAMBAHAN JENIS KAS ===\n');

  try {
    const schoolUnitId = 1;

    for (const item of cashAccountsData) {
      const [id] = await db('cash_accounts').insert({
        school_unit_id: schoolUnitId,
        name: item.name,
        account_kind: item.account_kind,
        bank_name: item.bank_name,
        bank_account_number: item.bank_account_number,
        is_active: true
      });

      console.log(`✓ Berhasil menambahkan kas (ID #${id}): ${item.name} [${item.account_kind.toUpperCase()}] ${item.bank_account_number ? `(${item.bank_name} - ${item.bank_account_number})` : ''}`);
    }

    const total = await db('cash_accounts').count('id as cnt').first();
    console.log(`\n=== SELESAI: Total ${total.cnt} Jenis Kas terdaftar di database ===`);
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat menambahkan jenis kas:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seedCashAccounts();
