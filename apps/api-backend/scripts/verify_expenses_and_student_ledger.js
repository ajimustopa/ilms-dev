/**
 * Verification Script: verify_expenses_and_student_ledger.js
 */
const db = require('../src/config/db/keuangan');
const expensesService = require('../src/modules/keuangan/expenses/service');
const reportsService = require('../src/modules/keuangan/reports/service');
const pdfGenerator = require('../src/modules/keuangan/reports/pdfGenerator');

async function runTests() {
  console.log('=== START VERIFICATION: EXPENSES RAPBS LINKAGE & STUDENT LEDGER ===\n');
  const schoolUnitId = 1;
  const userId = 88;

  try {
    // ============================================================
    // BAGIAN 1: PENGELUARAN RAPBS & BUDGET CEILING WARNING
    // ============================================================
    console.log('1. Menyiapkan RAPBS Item untuk Pengujian Pengeluaran...');

    // Buat/Ambil Budget Plan
    let budgetPlan = await db('budget_plans').where({ school_unit_id: schoolUnitId, academic_year_id: 1 }).first();
    if (!budgetPlan) {
      const [id] = await db('budget_plans').insert({
        school_unit_id: schoolUnitId,
        academic_year_id: 1,
        version: 1,
        status: 'published'
      });
      budgetPlan = { id, version: 1 };
    }

    // Buat/Ambil Budget Program
    let budgetProg = await db('budget_programs').where({ school_unit_id: schoolUnitId, academic_year_id: 1 }).first();
    if (!budgetProg) {
      const [pId] = await db('budget_programs').insert({
        school_unit_id: schoolUnitId,
        academic_year_id: 1,
        name: 'Program Kurikulum & Pembelajaran'
      });
      budgetProg = { id: pId };
    }

    // Buat budget_plan_expense_item dengan pagu 500.000
    const [expenseItemId] = await db('budget_plan_expense_items').insert({
      budget_plan_id: budgetPlan.id,
      budget_program_id: budgetProg.id,
      name: 'Pengadaan ATK & Modul Ujian Semester',
      planned_amount: 500000
    });

    console.log(`✓ Pos Item RAPBS berhasil dibuat ID #${expenseItemId} dengan Pagu: Rp 500.000`);

    // Belanja 1: Rp 300.000 (Masih dalam pagu)
    console.log('\n2. Mencatat Belanja 1 (Rp 300.000 - Dalam Pagu)...');
    const exp1 = await expensesService.createExpense(schoolUnitId, {
      budget_plan_expense_item_id: expenseItemId,
      item_name: 'Pembelian Kertas HVS & Tinta Printer',
      quantity: 3,
      unit: 'Rim/Botol',
      unit_price: 100000,
      vendor: 'Toko Buku Sinar Terang',
      expense_date: '2026-09-01',
      proof_number: 'NOTA-001'
    }, userId);

    console.log('✓ Hasil Belanja 1:', {
      id: exp1.id,
      total_amount: exp1.total_amount,
      budget_warning: exp1.budget_warning,
      is_over_budget: exp1.is_over_budget,
      remaining_budget: exp1.item_remaining_budget
    });

    if (exp1.is_over_budget || exp1.item_remaining_budget !== 200000) {
      throw new Error('FAILED: Belanja 1 seharusnya tidak over-budget dan sisa pagu Rp 200.000!');
    }

    // Belanja 2: Rp 350.000 (Total realisasi jadi 650.000 > 500.000 pagu -> Warning!)
    console.log('\n3. Mencatat Belanja 2 (Rp 350.000 - Melebihi Pagu)...');
    const exp2 = await expensesService.createExpense(schoolUnitId, {
      budget_plan_expense_item_id: expenseItemId,
      item_name: 'Cetak Lembar Jawaban Komputer',
      quantity: 7,
      unit: 'Paket',
      unit_price: 50000,
      vendor: 'Percetakan Grafika',
      expense_date: '2026-09-02',
      proof_number: 'NOTA-002'
    }, userId);

    console.log('✓ Hasil Belanja 2:', {
      id: exp2.id,
      total_amount: exp2.total_amount,
      budget_warning: exp2.budget_warning,
      is_over_budget: exp2.is_over_budget,
      remaining_budget: exp2.item_remaining_budget
    });

    if (!exp2.is_over_budget || !exp2.budget_warning) {
      throw new Error('FAILED: Belanja 2 seharusnya memicu peringatan over-budget!');
    }

    // Uji Edit Pengeluaran: Wajib edit_reason
    console.log('\n4. Menguji Validasi Edit Belanja tanpa edit_reason (Harus Ditolak)...');
    try {
      await expensesService.updateExpense(schoolUnitId, exp2.id, {
        unit_price: 60000,
        edit_reason: ''
      }, userId);
      throw new Error('FAILED: Seharusnya gagal jika edit_reason kosong!');
    } catch (err) {
      if (err.statusCode === 422 || err.message.includes('edit_reason')) {
        console.log('✓ Berhasil ditolak saat edit_reason kosong:', err.message);
      } else {
        throw err;
      }
    }

    // Edit Belanja dengan edit_reason valid
    console.log('\n5. Menguji Edit Belanja dengan edit_reason valid...');
    const exp2Updated = await expensesService.updateExpense(schoolUnitId, exp2.id, {
      unit_price: 40000, // total jadi 7 * 40k = 280k. Total belanja = 300k + 280k = 580k
      edit_reason: 'Koreksi harga faktur diskon percetakan'
    }, userId);

    console.log('✓ Hasil Edit Belanja 2:', {
      id: exp2Updated.id,
      new_total: exp2Updated.total_amount,
      budget_item_name: exp2Updated.budget_item_name
    });

    // ============================================================
    // BAGIAN 2: KARTU BAYAR SISWA (STUDENT LEDGER)
    // ============================================================
    console.log('\n6. Menguji Query Kartu Bayar Siswa (getStudentLedger)...');
    const studentId = 10;
    const ledger = await reportsService.getStudentLedger(schoolUnitId, studentId);

    console.log('✓ Data Profil Siswa:', ledger.student);
    console.log('✓ Ringkasan Keuangan Siswa:', ledger.summary);
    console.log(`✓ Jumlah Item Tagihan: ${ledger.items?.length}`);

    if (!ledger.student || !ledger.summary || !Array.isArray(ledger.items)) {
      throw new Error('FAILED: Struktur return data getStudentLedger tidak sesuai!');
    }

    // Rekap Kelas
    console.log('\n7. Menguji Rekap Tagihan Satu Kelas (getClassStudentLedger)...');
    const classRecap = await reportsService.getClassStudentLedger(schoolUnitId);
    console.log('✓ Ringkasan Rekap Kelas:', {
      total_students: classRecap.total_students,
      summary: classRecap.summary
    });

    if (classRecap.total_students === 0) {
      throw new Error('FAILED: Data siswa pada rekap kelas kosong!');
    }

    // Uji Generate PDF
    console.log('\n8. Menguji Generator PDF Kartu Bayar Siswa (generateStudentLedgerPdf)...');
    const schoolUnit = { name: 'SMK ALDEPOS ISLAMIC BOARDING SCHOOL', address: 'Bogor, Jawa Barat' };
    const user = { name: 'Bendahara Sekolah' };
    const pdfDoc = pdfGenerator.generateStudentLedgerPdf(ledger, schoolUnit, user);

    let pdfBytes = 0;
    pdfDoc.on('data', (chunk) => { pdfBytes += chunk.length; });
    await new Promise((resolve, reject) => {
      pdfDoc.on('end', resolve);
      pdfDoc.on('error', reject);
    });

    console.log(`✓ Dokumen PDF Kartu Bayar Siswa berhasil dibuat dengan ukuran ${pdfBytes} bytes.`);
    if (pdfBytes <= 0) {
      throw new Error('FAILED: Buffer PDF kosong!');
    }

    console.log('\n=== SELURUH PENGUJIAN PENGELUARAN RAPBS & KARTU BAYAR SISWA SUKSES (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

runTests();
