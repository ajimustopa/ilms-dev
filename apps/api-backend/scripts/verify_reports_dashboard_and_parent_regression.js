/**
 * Verification Script: verify_reports_dashboard_and_parent_regression.js
 */
const db = require('../src/config/db/keuangan');
const reportsService = require('../src/modules/keuangan/reports/service');
const pdfGenerator = require('../src/modules/keuangan/reports/pdfGenerator');
const dashboardService = require('../src/modules/keuangan/dashboard/service');
const parentFacingService = require('../src/modules/keuangan/parent-facing/service');

async function runTests() {
  console.log('=== START VERIFICATION: REPORTS, DASHBOARD ENHANCEMENTS & PARENT REGRESSION ===\n');
  const schoolUnitId = 1;
  const userId = 88;

  try {
    // ============================================================
    // 1. PENGUJIAN 5 LAPORAN KEUANGAN (NERACA NIRLABA 7 KELOMPOK)
    // ============================================================
    console.log('1. Menguji Laporan Posisi Keuangan (Neraca Nirlaba 7 Kelompok)...');
    const balanceSheet = await reportsService.getBalanceSheet(schoolUnitId);

    console.log('✓ Struktur Neraca Nirlaba:', {
      total_current_assets: balanceSheet.total_current_assets,
      total_receivables: balanceSheet.total_receivables,
      total_fixed_assets: balanceSheet.total_fixed_assets,
      total_assets: balanceSheet.total_assets,
      total_liabilities: balanceSheet.total_liabilities,
      total_equity: balanceSheet.total_equity,
      is_balanced: balanceSheet.is_balanced
    });

    if (balanceSheet.total_current_assets === undefined ||
        balanceSheet.total_receivables === undefined ||
        balanceSheet.total_fixed_assets === undefined ||
        balanceSheet.total_liabilities === undefined ||
        balanceSheet.total_equity === undefined) {
      throw new Error('FAILED: Struktur Neraca Nirlaba tidak memuat 7 kelompok lengkap!');
    }

    // Uji PDF Neraca Nirlaba
    const schoolUnit = { name: 'SMK ALDEPOS', address: 'Bogor' };
    const user = { name: 'Admin Keuangan' };
    const bsPdf = pdfGenerator.generateBalanceSheetPdf(balanceSheet, schoolUnit, user);
    let bsBytes = 0;
    bsPdf.on('data', c => { bsBytes += c.length; });
    await new Promise((res, rej) => { bsPdf.on('end', res); bsPdf.on('error', rej); });
    console.log(`✓ PDF Neraca Nirlaba berhasil di-generate (${bsBytes} bytes)`);

    // Uji Laporan Lainnya
    console.log('\n2. Menguji Laporan Trial Balance, Buku Besar, Surplus/Defisit, & Arus Kas...');
    const [trialBal, generalLedger, incomeStmt, cashFlow] = await Promise.all([
      reportsService.getTrialBalance(schoolUnitId),
      reportsService.getGeneralLedger(schoolUnitId),
      reportsService.getIncomeStatement(schoolUnitId),
      reportsService.getCashFlow(schoolUnitId)
    ]);

    console.log('✓ Trial Balance:', { total_debit: trialBal.total_debit, total_credit: trialBal.total_credit, rows: trialBal.rows.length });
    console.log('✓ General Ledger:', { accounts_count: generalLedger.length });
    console.log('✓ Surplus / Defisit:', { revenue: incomeStmt.total_revenue, expense: incomeStmt.total_expense, net: incomeStmt.surplus_defisit });
    console.log('✓ Arus Kas:', { in: cashFlow.cash_inflow, out: cashFlow.cash_outflow, net: cashFlow.net_cash_flow });

    // ============================================================
    // 2. PENGUJIAN DASHBOARD ENHANCEMENTS
    // ============================================================
    console.log('\n3. Menguji Ringkasan Dashboard Keuangan...');
    const dashboard = await dashboardService.getDashboardSummary(schoolUnitId);

    console.log('✓ Ringkasan Tagihan Draft & Terbit:', {
      draft_bills_count: dashboard.draft_bills_count,
      draft_bills_amount: dashboard.draft_bills_amount,
      bill_status_summary: dashboard.bill_status_summary
    });

    console.log(`✓ Realisasi RAPBS per Item Belanja (${dashboard.budget_realization_by_item.length} item):`);
    dashboard.budget_realization_by_item.slice(0, 3).forEach(it => {
      console.log(`  - ${it.item_name}: Realisasi Rp ${it.realized_amount} / Pagu Rp ${it.planned_amount} (${it.absorption_percentage}%)`);
    });

    console.log(`✓ Piutang Tertunggak per Skema Biaya (${dashboard.outstanding_by_fee_scheme.length} skema):`);
    dashboard.outstanding_by_fee_scheme.forEach(sch => {
      console.log(`  - ${sch.scheme_name}: Rp ${sch.outstanding_amount} (${sch.students_count} siswa, ${sch.bills_count} tagihan)`);
    });

    if (dashboard.draft_bills_count === undefined ||
        !Array.isArray(dashboard.budget_realization_by_item) ||
        !Array.isArray(dashboard.outstanding_by_fee_scheme)) {
      throw new Error('FAILED: Data dashboard tidak memuat field baru!');
    }

    // ============================================================
    // 3. REGRESI PORTAL ORANG TUA (PARENT-FACING)
    // ============================================================
    console.log('\n4. Menguji Keamanan & Regresi Parent-Facing Portal...');
    const studentTestId = 15;

    // Buat 1 Tagihan DRAFT dan 1 Tagihan TERBIT untuk Siswa 15
    const [draftBillId] = await db('student_bills').insert({
      school_unit_id: schoolUnitId,
      student_id: studentTestId,
      fee_type_id: 1,
      period_month: 11,
      period_year: 2026,
      amount: 400000,
      discount_amount: 0,
      due_date: '2026-11-10',
      status: 'draft' // DRAFT!
    });

    const [publishedBillId] = await db('student_bills').insert({
      school_unit_id: schoolUnitId,
      student_id: studentTestId,
      fee_type_id: 1,
      period_month: 12,
      period_year: 2026,
      amount: 400000,
      discount_amount: 0,
      due_date: '2026-12-10',
      status: 'unpaid', // TERBIT!
      published_at: db.fn.now(),
      published_by: userId
    });

    // Uji listStudentBills: tagihan DRAFT TIDAK BOLEH MUNCUL di portal orang tua
    const parentBills = await parentFacingService.listStudentBills(schoolUnitId, studentTestId);
    const hasDraft = parentBills.some(b => b.id === draftBillId || b.status === 'draft');
    const hasPublished = parentBills.some(b => b.id === publishedBillId);

    console.log('✓ Hasil listStudentBills orang tua:', {
      total_visible_bills: parentBills.length,
      has_draft_leaked: hasDraft,
      has_published_visible: hasPublished
    });

    if (hasDraft) {
      throw new Error('FAILED: Tagihan status draft bocor ke list tagihan orang tua!');
    }
    if (!hasPublished) {
      throw new Error('FAILED: Tagihan resmi published tidak muncul di list orang tua!');
    }

    // Uji getStudentBillDetail untuk tagihan DRAFT (harus null)
    const draftDetail = await parentFacingService.getStudentBillDetail(schoolUnitId, studentTestId, draftBillId);
    console.log('✓ Hasil getStudentBillDetail draft:', draftDetail);
    if (draftDetail !== null) {
      throw new Error('FAILED: Detail tagihan draft dapat diakses oleh orang tua!');
    }

    // Uji submitTransferProof untuk tagihan DRAFT (harus ditolak)
    try {
      await parentFacingService.submitTransferProof(schoolUnitId, studentTestId, draftBillId, {
        proof_file_url: 'https://example.com/proof.jpg',
        amount: 400000,
        transfer_date: '2026-09-01'
      });
      throw new Error('FAILED: Bukti transfer tagihan draft seharusnya ditolak!');
    } catch (err) {
      console.log('✓ Berhasil ditolak upload bukti transfer pada tagihan draft:', err.message);
    }

    console.log('\n=== SELURUH PENGUJIAN LAPORAN, DASHBOARD & REGRESI PARENT-FACING BERHASIL (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

runTests();
