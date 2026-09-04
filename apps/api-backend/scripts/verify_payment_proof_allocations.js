/**
 * Verification Script: verify_payment_proof_allocations.js
 */
const db = require('../src/config/db/keuangan');
const paymentsService = require('../src/modules/keuangan/payments/service');

async function runTests() {
  console.log('=== START VERIFICATION: PAYMENT PROOF MULTI-BILL SPLIT ALLOCATIONS ===\n');
  const schoolUnitId = 1;
  const userId = 88;

  try {
    // 1. Setup Jenis Biaya & 2 Tagihan Siswa untuk Siswa ID 10
    console.log('1. Menyiapkan 2 pos tagihan untuk Siswa ID 10...');
    const studentId = 10;

    // Fee Type 1: SPP
    let feeType1 = await db('fee_types').where({ school_unit_id: schoolUnitId, name: 'SPP Bulanan Split Test' }).first();
    if (!feeType1) {
      const [id] = await db('fee_types').insert({
        school_unit_id: schoolUnitId,
        name: 'SPP Bulanan Split Test',
        billing_pattern: 'monthly',
        is_active: true
      });
      feeType1 = { id, name: 'SPP Bulanan Split Test' };
    }

    // Fee Type 2: Seragam
    let feeType2 = await db('fee_types').where({ school_unit_id: schoolUnitId, name: 'Uang Seragam Santri' }).first();
    if (!feeType2) {
      const [id] = await db('fee_types').insert({
        school_unit_id: schoolUnitId,
        name: 'Uang Seragam Santri',
        billing_pattern: 'one_time',
        is_active: true
      });
      feeType2 = { id, name: 'Uang Seragam Santri' };
    }

    // Insert 2 Tagihan Unpaid
    const [bill1Id] = await db('student_bills').insert({
      school_unit_id: schoolUnitId,
      student_id: studentId,
      fee_type_id: feeType1.id,
      period_month: 10,
      period_year: 2026,
      amount: 350000,
      discount_amount: 0,
      due_date: '2026-10-10',
      status: 'unpaid',
      published_at: db.fn.now(),
      published_by: userId
    });

    const [bill2Id] = await db('student_bills').insert({
      school_unit_id: schoolUnitId,
      student_id: studentId,
      fee_type_id: feeType2.id,
      period_month: null,
      period_year: 2026,
      amount: 250000,
      discount_amount: 0,
      due_date: '2026-10-10',
      status: 'unpaid',
      published_at: db.fn.now(),
      published_by: userId
    });

    console.log(`✓ Berhasil membuat 2 Tagihan Siswa: Bill #1 (${bill1Id} - Rp 350.000), Bill #2 (${bill2Id} - Rp 250.000)`);

    // 2. Buat Bukti Transfer Gabungan Rp 600.000 (Multi-Pos)
    console.log('\n2. Membuat Bukti Transfer Gabungan (Total Rp 600.000)...');
    const [proofId] = await db('bill_payment_proofs').insert({
      school_unit_id: schoolUnitId,
      student_id: studentId,
      student_bill_id: null, // Nullable!
      amount: 600000,
      total_transfer_amount: 600000,
      proof_file_url: 'https://example.com/transfer-600k.jpg',
      transfer_date: '2026-09-01',
      bank_name: 'BCA Syariah',
      sender_account_name: 'H. Abdullah',
      notes: 'Pembayaran SPP + Seragam sekaligus',
      status: 'pending'
    });

    console.log(`✓ Bukti transfer berhasil dibuat dengan ID #${proofId}`);

    // 3. Uji Validasi Alokasi Melebihi Total Transfer (Harus Gagal)
    console.log('\n3. Menguji Validasi Alokasi (Melebihi total transfer)...');
    try {
      await paymentsService.savePaymentProofAllocations(schoolUnitId, proofId, [
        { student_bill_id: bill1Id, allocated_amount: 350000 },
        { student_bill_id: bill2Id, allocated_amount: 350000 } // Total 700k > 600k
      ], userId);
      throw new Error('FAILED: Seharusnya gagal jika total alokasi > total transfer!');
    } catch (err) {
      if (err.statusCode === 422 || err.message.includes('melebihi total transfer')) {
        console.log('✓ Berhasil ditolak saat total alokasi melebihi transfer:', err.message);
      } else {
        throw err;
      }
    }

    // 4. Simpan Alokasi Valid (350k + 250k = 600k)
    console.log('\n4. Menyimpan Alokasi Valid...');
    const savedAllocations = await paymentsService.savePaymentProofAllocations(schoolUnitId, proofId, [
      { student_bill_id: bill1Id, allocated_amount: 350000 },
      { student_bill_id: bill2Id, allocated_amount: 250000 }
    ], userId);

    console.log(`✓ Berhasil menyimpan ${savedAllocations.length} baris alokasi:`, savedAllocations.map(a => ({
      bill_id: a.student_bill_id,
      fee: a.fee_type_name,
      amount: a.allocated_amount
    })));

    if (savedAllocations.length !== 2) {
      throw new Error('FAILED: Baris alokasi yang tersimpan tidak berjumlah 2!');
    }

    // 5. Eksekusi Verifikasi Bukti Transfer
    console.log('\n5. Mengeksekusi Verifikasi Bukti Transfer (verifyPaymentProof)...');
    const verifyResult = await paymentsService.verifyPaymentProof(schoolUnitId, proofId, userId);

    if (verifyResult.error) {
      throw new Error(`FAILED to verify: ${verifyResult.message}`);
    }

    console.log('✓ Bukti transfer sukses diverifikasi:', {
      proof_status: verifyResult.data.proof.status,
      receipt_number: verifyResult.data.receipt_number,
      payments_count: verifyResult.data.payments.length
    });

    if (verifyResult.data.proof.status !== 'verified' || verifyResult.data.payments.length !== 2) {
      throw new Error('FAILED: Status bukti transfer atau jumlah pembayaran tidak sesuai!');
    }

    // 6. Verifikasi Status Tagihan Siswa (Keduanya Harus 'paid')
    console.log('\n6. Memeriksa status kedua tagihan siswa...');
    const [chkBill1, chkBill2] = await Promise.all([
      db('student_bills').where({ id: bill1Id }).first(),
      db('student_bills').where({ id: bill2Id }).first()
    ]);

    console.log(`✓ Status Bill #1: ${chkBill1.status} (Amount: ${chkBill1.amount})`);
    console.log(`✓ Status Bill #2: ${chkBill2.status} (Amount: ${chkBill2.amount})`);

    if (chkBill1.status !== 'paid' || chkBill2.status !== 'paid') {
      throw new Error('FAILED: Kedua tagihan seharusnya berubah status menjadi paid!');
    }

    // 7. Verifikasi Jurnal Kas Masuk Otomatis
    console.log('\n7. Memeriksa jurnal penerimaan kas masuk (student_bill_payment)...');
    const paymentIds = verifyResult.data.payments.map(p => p.id);
    const journals = await db('journal_entries')
      .whereIn('source_id', paymentIds)
      .where({ source_type: 'student_bill_payment' });

    console.log(`✓ Ditemukan ${journals.length} entri jurnal untuk 2 pembayaran split:`);
    for (const j of journals) {
      const lines = await db('journal_entry_lines').where({ journal_entry_id: j.id });
      console.log(`  - Entry #${j.id} [${j.journal_number}]: ${j.description}`);
      lines.forEach(l => {
        console.log(`    * Akun #${l.chart_of_account_id}: ${l.entry_side.toUpperCase()} Rp ${l.amount}`);
      });
    }

    if (journals.length !== 2) {
      throw new Error('FAILED: Jurnal otomatis seharusnya terbentuk untuk masing-masing alokasi!');
    }

    // 8. Verifikasi Cetak Kwitansi Resmi Gabungan (Consolidated Multi-Item Receipt)
    console.log('\n8. Memeriksa data cetak Kwitansi Resmi Gabungan (getReceiptData)...');
    const primaryPaymentId = verifyResult.data.payments[0].id;
    const receiptData = await paymentsService.getReceiptData(schoolUnitId, primaryPaymentId);

    console.log('✓ Data Kwitansi Resmi:', {
      receipt_number: receiptData.receipt_number,
      total_amount: receiptData.amount,
      amount_in_words: receiptData.amount_in_words,
      items_count: receiptData.items?.length
    });

    console.log('  Rincian Item Kwitansi:');
    receiptData.items.forEach(it => {
      console.log(`  - ${it.fee_type_name} (${it.period}): Rp ${it.amount}`);
    });

    if (parseFloat(receiptData.amount) !== 600000 || receiptData.items.length !== 2) {
      throw new Error('FAILED: Data kwitansi gabungan tidak memuat seluruh 2 pos tagihan dengan total Rp 600.000!');
    }

    console.log('\n=== SELURUH PENGUJIAN SPLIT MULTI-BILL PAYMENT PROOF ALLOCATION BERHASIL (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

runTests();
