/**
 * Verification Script: verify_catalog_and_rapbs.js
 */
const db = require('../src/config/db/keuangan');
const masterDataService = require('../src/modules/keuangan/master-data/service');
const budgetService = require('../src/modules/keuangan/budget/service');

async function runTests() {
  console.log('=== START VERIFICATION: CATALOG ITEMS & RAPBS ENHANCEMENTS ===\n');
  const schoolUnitId = 1;
  const academicYearId = 1;
  const userId = 99;

  try {
    // 1. Memeriksa Kategori Pengeluaran untuk Katalog
    console.log('1. Memeriksa Kategori Pengeluaran (transaction_categories)...');
    const expenseCategories = await db('transaction_categories')
      .where({ school_unit_id: schoolUnitId, category_kind: 'expense' });
    
    if (expenseCategories.length === 0) {
      throw new Error('Tidak ada kategori transaksi pengeluaran (expense)!');
    }
    const catId = expenseCategories[0].id;
    console.log(`✓ Ditemukan ${expenseCategories.length} kategori pengeluaran. Menggunakan ID: ${catId} (${expenseCategories[0].name})`);

    // 2. Pembuatan Item Standar Biaya / Katalog
    console.log('\n2. Menguji pembuatan item katalog standar biaya...');
    const catalogItem = await masterDataService.createCatalogItem(schoolUnitId, {
      name: 'Kertas HVS A4 80gr Sidu',
      unit: 'rim',
      reference_price: 55000,
      expense_category_id: catId,
      academic_year_id: academicYearId,
      reason: 'Inisialisasi harga acuan awal TA 2026/2027'
    }, userId);

    console.log('✓ Katalog item berhasil dibuat:', {
      id: catalogItem.id,
      name: catalogItem.name,
      unit: catalogItem.unit,
      reference_price: catalogItem.reference_price,
      expense_category_id: catalogItem.expense_category_id,
      academic_year_id: catalogItem.academic_year_id
    });

    // 3. Update Harga Acuan Katalog & Cek Riwayat Harga
    console.log('\n3. Menguji update reference_price dan pencatatan catalog_item_price_history...');
    await masterDataService.updateCatalogItem(schoolUnitId, catalogItem.id, {
      reference_price: 60000,
      reason: 'Penyesuaian kenaikan harga distributor kertas'
    }, userId);

    const priceHistories = await masterDataService.getCatalogItemPriceHistory(catalogItem.id);
    console.log(`✓ Ditemukan ${priceHistories.length} riwayat harga acuan:`);
    for (const h of priceHistories) {
      console.log(`  - Old: Rp ${h.old_price} -> New: Rp ${h.new_price} (Alasan: ${h.reason})`);
    }

    if (priceHistories.length < 2) {
      throw new Error('Riwayat perubahan harga tidak tercatat lengkap di catalog_item_price_history!');
    }

    // 4. Buat Draft RAPBS
    console.log('\n4. Menguji pembuatan draft RAPBS...');
    const draftPlan = await budgetService.createBudgetPlanDraft(schoolUnitId, {
      academic_year_id: academicYearId
    }, userId);
    console.log(`✓ Draft RAPBS berhasil dibuat ID: ${draftPlan.id}, Versi: ${draftPlan.version}, Status: ${draftPlan.status}`);

    // Pastikan ada program kerja
    let program = await db('budget_programs').where({ school_unit_id: schoolUnitId }).first();
    if (!program) {
      const [progId] = await db('budget_programs').insert({
        school_unit_id: schoolUnitId,
        academic_year_id: academicYearId,
        name: 'Program Pengadaan Sarana Belajar'
      });
      program = { id: progId, name: 'Program Pengadaan Sarana Belajar' };
    }

    // Ambil fee type untuk sumber dana
    const feeType = await db('fee_types').where({ school_unit_id: schoolUnitId }).first();
    const feeTypeId = feeType ? feeType.id : null;

    // 5. Uji Validasi Plafon Harga Acuan (Tolak jika unit_price > reference_price)
    console.log('\n5. Menguji validasi plafon harga acuan katalog pada item belanja RAPBS...');
    try {
      await budgetService.addExpenseItem(schoolUnitId, draftPlan.id, {
        budget_program_id: program.id,
        catalog_item_id: catalogItem.id,
        name: 'Pengadaan Kertas Ujian',
        unit: 'rim',
        quantity: 10,
        unit_price: 75000 // Melebihi acuan 60000 -> WAJIB DITOLAK
      }, userId);
      throw new Error('FAILED: Seharusnya gagal karena unit_price melebihi reference_price!');
    } catch (err) {
      if (err.statusCode === 422 || err.message.includes('tidak boleh melebihi')) {
        console.log('✓ Berhasil ditolak dengan pesan:', err.message);
      } else {
        throw err;
      }
    }

    // 6. Uji Penyimpanan Item Belanja Valid
    console.log('\n6. Menguji penambahan item belanja valid (unit_price <= reference_price)...');
    const validExpense = await budgetService.addExpenseItem(schoolUnitId, draftPlan.id, {
      budget_program_id: program.id,
      catalog_item_id: catalogItem.id,
      fund_source_fee_type_id: feeTypeId,
      name: 'Pengadaan Kertas Ujian Semester',
      unit: 'rim',
      quantity: 10,
      unit_price: 58000 // Dibawah acuan 60000 -> Sukses
    }, userId);

    console.log('✓ Item belanja valid berhasil ditambahkan:', {
      id: validExpense.id,
      name: validExpense.name,
      quantity: validExpense.quantity,
      unit_price: validExpense.unit_price,
      planned_amount: validExpense.planned_amount,
      catalog_item_id: validExpense.catalog_item_id,
      fund_source_fee_type_id: validExpense.fund_source_fee_type_id
    });

    if (parseFloat(validExpense.planned_amount) !== 580000) {
      throw new Error(`Planned amount tidak sesuai: expected 580000, got ${validExpense.planned_amount}`);
    }

    // 7. Pengesahan RAPBS (Publish)
    console.log('\n7. Menguji pengesahan RAPBS (published_by, approved_by, approved_at)...');
    const publishedPlan = await budgetService.publishBudgetPlan(schoolUnitId, draftPlan.id, userId);

    console.log('✓ RAPBS berhasil disahkan:', {
      id: publishedPlan.id,
      status: publishedPlan.status,
      published_by: publishedPlan.published_by,
      approved_by: publishedPlan.approved_by,
      approved_at: publishedPlan.approved_at
    });

    if (publishedPlan.status !== 'published' || publishedPlan.published_by !== userId) {
      throw new Error('Kolom status atau published_by tidak terekam dengan benar!');
    }

    // 8. Pembuatan Versi Revisi Baru Dari Versi Published
    console.log('\n8. Menguji createNewVersionFromPublished...');
    const revisedPlan = await budgetService.createNewVersionFromPublished(
      schoolUnitId,
      publishedPlan.id,
      'Penambahan kuota kertas untuk ujian tryout akbar',
      userId
    );

    console.log('✓ Versi revisi baru berhasil dibuat:', {
      id: revisedPlan.id,
      version: revisedPlan.version,
      status: revisedPlan.status,
      revision_reason: revisedPlan.revision_reason,
      expense_items_count: revisedPlan.expense_items.length
    });

    if (revisedPlan.version !== publishedPlan.version + 1 || revisedPlan.expense_items.length === 0) {
      throw new Error('Duplikasi rincian RAPBS pada versi revisi gagal!');
    }

    const copiedItem = revisedPlan.expense_items[0];
    console.log('✓ Rincian belanja terduplikasi utuh pada versi revisi:', {
      catalog_item_id: copiedItem.catalog_item_id,
      fund_source_fee_type_id: copiedItem.fund_source_fee_type_id,
      quantity: copiedItem.quantity,
      unit_price: copiedItem.unit_price,
      planned_amount: copiedItem.planned_amount
    });

    console.log('\n=== SELURUH PENGUJIAN KATALOG STANDAR BIAYA & RAPBS BERHASIL (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

runTests();
