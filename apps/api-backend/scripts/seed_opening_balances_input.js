/**
 * Script to insert opening balances for all specified cash accounts
 */
const db = require('../src/config/db/keuangan');
const masterDataService = require('../src/modules/keuangan/master-data/service');

const openingBalancesInput = [
  { bank_account_number: '7243476199', default_name: 'Rekening BSI Operasional', bank_name: 'Bank Syariah Indonesia (BSI)', opening_balance: 9609923, note: 'BSI - 7243476199' },
  { bank_account_number: '1559422963', default_name: 'Tabungan THR', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 678956, note: 'BNI - 1559422963' },
  { bank_account_number: '1559456108', default_name: 'Tahun Berjalan (Collection)', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 23306788, note: 'BNI - 1559456108 (Collection)' },
  { bank_account_number: '1559480459', default_name: 'Bank #1 (PPDB Indent)', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 570332, note: 'BNI - 1559480459 (PPDB Indent)' },
  { bank_account_number: '1559494315', default_name: 'Kantin', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 747510, note: 'BNI - 1559494315' },
  { bank_account_number: '1559508828', default_name: 'Sport Center (RAB Non-OP)', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 1056924, note: 'BNI - 1559508828 (RAB Non-OP)' },
  { bank_account_number: '1559526575', default_name: 'Bank #2', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 664000, note: 'BNI - 1559526575' },
  { bank_account_number: '1559539437', default_name: 'Bank #3', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 1175125, note: 'BNI - 1559539437' },
  { bank_account_number: '1559548330', default_name: 'Bank #4', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 772563, note: 'BNI - 1559548330' },
  { bank_account_number: '1559557311', default_name: 'Operasional (OP Bulanan)', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 951352, note: 'BNI - 1559557311 (OP Bulanan)' },
  { bank_account_number: '1559566982', default_name: 'Dana Kurban', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 1902500, note: 'BNI - 1559566982' },
  { bank_account_number: '1857137308', default_name: 'Bank #5', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 950000, note: 'BNI - 1857137308' },
  { bank_account_number: '1857138630', default_name: 'Bank #6', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 950000, note: 'BNI - 1857138630' },
  { bank_account_number: '1857140128', default_name: 'Bank #7', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 950000, note: 'BNI - 1857140128' },
  { bank_account_number: '1857140424', default_name: 'PPDB', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 950000, note: 'BNI - 1857140424' },
  { bank_account_number: '1857140718', default_name: 'Bank #8', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 950000, note: 'BNI - 1857140718' },
  { bank_account_number: '1857141020', default_name: 'Bank #9', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 950000, note: 'BNI - 1857141020' },
  { bank_account_number: '1857141495', default_name: 'Bank #10', bank_name: 'Bank Nasional Indonesia (BNI)', opening_balance: 950000, note: 'BNI - 1857141495' }
];

async function seedOpeningBalances() {
  console.log('=== MEMULAI INPUT DATA SALDO AWAL REKENING KAS ===\n');

  try {
    const schoolUnitId = 1;
    const academicYearId = 1;
    let totalOpeningSum = 0;

    for (const item of openingBalancesInput) {
      let cashAcc = await db('cash_accounts')
        .where({ bank_account_number: item.bank_account_number })
        .first();

      if (!cashAcc) {
        // Buat akun kas baru jika belum terdaftar
        const [newId] = await db('cash_accounts').insert({
          school_unit_id: schoolUnitId,
          name: item.default_name,
          account_kind: 'bank',
          bank_name: item.bank_name,
          bank_account_number: item.bank_account_number,
          is_active: true
        });
        cashAcc = await db('cash_accounts').where({ id: newId }).first();
        console.log(`+ Dibuat Akun Kas Baru: ${cashAcc.name} (${cashAcc.bank_name} - ${cashAcc.bank_account_number})`);
      }

      // Periksa apakah saldo awal sudah ada
      const existingOpening = await db('cash_account_opening_balances')
        .where({ cash_account_id: cashAcc.id, academic_year_id: academicYearId })
        .first();

      if (existingOpening) {
        await masterDataService.updateOpeningBalance(schoolUnitId, existingOpening.id, {
          opening_balance: item.opening_balance,
          opening_date: '2026-08-01',
          edit_reason: 'Input Saldo Awal Awal Tahun'
        }, 88);
        console.log(`✓ [UPDATE] Saldo Awal ${cashAcc.name} (${item.note}) -> Rp ${item.opening_balance.toLocaleString('id-ID')}`);
      } else {
        await masterDataService.createOpeningBalance(schoolUnitId, {
          cash_account_id: cashAcc.id,
          academic_year_id: academicYearId,
          opening_balance: item.opening_balance,
          opening_date: '2026-08-01'
        }, 88);
        console.log(`✓ [INSERT] Saldo Awal ${cashAcc.name} (${item.note}) -> Rp ${item.opening_balance.toLocaleString('id-ID')}`);
      }

      totalOpeningSum += item.opening_balance;
    }

    console.log(`\n=== SELESAI: 18 Saldo Awal Rekening Berhasil Diinput ===`);
    console.log(`Total Akumulasi Saldo Awal Kas: Rp ${totalOpeningSum.toLocaleString('id-ID')}`);
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat input saldo awal:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seedOpeningBalances();
