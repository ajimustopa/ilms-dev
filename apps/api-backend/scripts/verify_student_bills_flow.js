/**
 * Verification Script: verify_student_bills_flow.js
 */
const db = require('../src/config/db/keuangan');
const billsService = require('../src/modules/keuangan/bills/service');
const parentFacingService = require('../src/modules/keuangan/parent-facing/service');

async function runTests() {
  console.log('=== START VERIFICATION: STUDENT BILLS FLOW (DRAFT, DISCOUNT, EDIT, PUBLISH, JOURNAL) ===\n');
  const schoolUnitId = 1;
  const userId = 88;

  try {
    // 1. Persiapan Data Jenis Biaya (SPP)
    console.log('1. Menyiapkan Jenis Biaya...');
    let feeType = await db('fee_types').where({ school_unit_id: schoolUnitId }).first();
    if (!feeType) {
      const [fId] = await db('fee_types').insert({
        school_unit_id: schoolUnitId,
        code: 'SPP-TEST',
        name: 'SPP Bulanan Test',
        billing_pattern: 'monthly',
        is_active: true
      });
      feeType = { id: fId, name: 'SPP Bulanan Test' };
    }
    console.log(`✓ Menggunakan Fee Type: ID ${feeType.id} (${feeType.name})`);

    // Hapus test bills untuk period_month 12 jika ada dari run sebelumnya
    await db('student_bills')
      .where({ school_unit_id: schoolUnitId, period_year: 2026, period_month: 12 })
      .delete();

    // 2. Generate Tagihan Massal
    console.log('\n2. Menguji Generate Tagihan Massal...');
    const genResult = await billsService.generateBills(schoolUnitId, {
      fee_type_id: feeType.id,
      period_month: 12,
      period_year: 2026,
      target: 'all'
    }, userId);

    console.log(`✓ Berhasil men-generate ${genResult.generated_count} tagihan baru.`);
    const testBillId = genResult.bill_ids[0];
    const generatedBill = await db('student_bills').where({ id: testBillId }).first();

    console.log('✓ Status tagihan awal:', {
      id: generatedBill.id,
      status: generatedBill.status,
      amount: generatedBill.amount,
      discount_amount: generatedBill.discount_amount
    });

    if (generatedBill.status !== 'draft') {
      throw new Error(`FAILED: Status tagihan yang baru di-generate seharusnya 'draft', tetapi bernilai '${generatedBill.status}'`);
    }

    // Pastikan belum ada jurnal piutang untuk tagihan draft ini
    const draftJournals = await db('journal_entries')
      .where({ source_type: 'student_bill_issued', source_id: testBillId });
    if (draftJournals.length > 0) {
      throw new Error('FAILED: Tagihan berstatus draft seharusnya BELUM membentuk jurnal piutang!');
    }
    console.log('✓ Terverifikasi: Tagihan draft belum membentuk jurnal piutang.');

    // 3. Uji Parent-Facing (Harus tersembunyi dari orangtua saat masih draft)
    console.log('\n3. Menguji Parent-Facing service...');
    const parentBills = await parentFacingService.listStudentBills(schoolUnitId, generatedBill.student_id);
    const isPresentInParent = parentBills.some(b => b.id === testBillId);
    if (isPresentInParent) {
      throw new Error('FAILED: Tagihan draft tidak boleh terlihat oleh orangtua di Parent Portal!');
    }
    console.log('✓ Terverifikasi: Tagihan draft tidak tampil di Parent Portal.');

    // 4. Uji Edit Draft Tagihan (Validasi edit_reason)
    console.log('\n4. Menguji Edit Draft Tagihan...');
    try {
      await billsService.updateDraftBill(schoolUnitId, testBillId, {
        amount: 300000,
        discount_amount: 50000,
        edit_reason: '' // Kosong -> WAJIB GAGAL
      }, userId);
      throw new Error('FAILED: Seharusnya gagal jika edit_reason kosong!');
    } catch (err) {
      if (err.statusCode === 422 || err.message.includes('edit_reason')) {
        console.log('✓ Berhasil ditolak saat edit_reason kosong:', err.message);
      } else {
        throw err;
      }
    }

    // Edit dengan edit_reason valid
    const updatedDraft = await billsService.updateDraftBill(schoolUnitId, testBillId, {
      amount: 250000,
      discount_amount: 100000,
      edit_reason: 'Pemberian keringanan khusus beasiswa santri berprestasi'
    }, userId);

    console.log('✓ Draft tagihan berhasil diubah:', {
      id: updatedDraft.id,
      amount: updatedDraft.amount,
      discount_amount: updatedDraft.discount_amount,
      edit_reason: updatedDraft.edit_reason,
      previous_data: updatedDraft.previous_data
    });

    if (parseFloat(updatedDraft.amount) !== 250000 || !updatedDraft.previous_data) {
      throw new Error('FAILED: Nominal atau previous_data tidak tersimpan dengan benar!');
    }

    // 5. Uji Penerbitan Tagihan (Publish)
    console.log('\n5. Menguji Penerbitan Tagihan (Publish Draft -> Unpaid + Jurnal Piutang)...');
    const publishResult = await billsService.publishBills(schoolUnitId, {
      bill_ids: [testBillId]
    }, userId);

    console.log(`✓ Hasil publish:`, publishResult);

    const publishedBill = await db('student_bills').where({ id: testBillId }).first();
    console.log('✓ Data tagihan setelah terbit:', {
      id: publishedBill.id,
      status: publishedBill.status,
      published_at: publishedBill.published_at,
      published_by: publishedBill.published_by
    });

    if (publishedBill.status !== 'unpaid' || !publishedBill.published_at || publishedBill.published_by !== userId) {
      throw new Error('FAILED: Kolom status/published_at/published_by tidak sesuai setelah di-publish!');
    }

    // Periksa apakah jurnal piutang otomatis terbentuk
    const issuedJournals = await db('journal_entries')
      .where({ source_type: 'student_bill_issued', source_id: testBillId });

    console.log(`✓ Ditemukan ${issuedJournals.length} entri jurnal penerbitan piutang:`);
    for (const j of issuedJournals) {
      const items = await db('journal_entry_lines').where({ journal_entry_id: j.id });
      console.log(`  - Entry #${j.id} [${j.journal_number}]: ${j.description}`);
      items.forEach(it => {
        console.log(`    * Akun #${it.chart_of_account_id}: ${it.entry_side.toUpperCase()} Rp ${it.amount}`);
      });
    }

    if (issuedJournals.length === 0) {
      throw new Error('FAILED: Jurnal piutang tidak terbentuk otomatis saat tagihan diterbitkan!');
    }

    // 6. Uji Parent-Facing setelah Terbit (Harus Muncul)
    console.log('\n6. Menguji Parent-Facing setelah tagihan diterbitkan...');
    const parentBillsAfter = await parentFacingService.listStudentBills(schoolUnitId, publishedBill.student_id);
    const isNowPresent = parentBillsAfter.some(b => b.id === testBillId);
    if (!isNowPresent) {
      throw new Error('FAILED: Tagihan yang sudah diterbitkan seharusnya tampil di Parent Portal!');
    }
    console.log('✓ Terverifikasi: Tagihan yang telah terbit muncul di Parent Portal.');

    // 7. Uji Edit Tagihan yang Sudah Terbit (Harus Ditolak)
    console.log('\n7. Menguji proteksi edit pada tagihan yang sudah terbit...');
    try {
      await billsService.updateDraftBill(schoolUnitId, testBillId, {
        amount: 200000,
        edit_reason: 'Mencoba mengubah tagihan terbit'
      }, userId);
      throw new Error('FAILED: Seharusnya gagal karena tagihan sudah berstatus unpaid/terbit!');
    } catch (err) {
      if (err.statusCode === 422 || err.message.includes('Hanya tagihan berstatus draft')) {
        console.log('✓ Berhasil ditolak:', err.message);
      } else {
        throw err;
      }
    }

    console.log('\n=== SELURUH PENGUJIAN ALUR PENAGIHAN SISWA BERHASIL (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

runTests();
