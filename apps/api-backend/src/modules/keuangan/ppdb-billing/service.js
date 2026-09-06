/**
 * Service for PPDB Registration Billing & Payments (Submodul ppdb-billing)
 * Full Alignment with Bills Lifecycle (Tahap 2):
 * 1. Draft -> Approval Berjenjang Diskon Kasuistik -> Penerbitan Massal/Individual (Jurnal Piutang ppdb_bill_issued)
 * 2. Revisi Pasca-Terbit dengan Safeguard Penguncian Nominal Terbayar (paid_amount) & Jurnal Penyesuaian
 * 3. Skema Cicilan / Termin Uang Pangkal (Multi-Termin Installment Plan)
 * 4. Kebijakan Refund Pengunduran Diri (ppdb_refund_policy_rules & Jurnal ppdb_refund_issued)
 * 5. Kuota Beasiswa & Subsidi PPDB (ppdb_scholarship_quotas)
 * 6. Placement Hook & Kontinuitas Kartu Bayar Siswa
 */
const db = require('../../../config/db/keuangan');
const dbAkademik = require('../../../config/db/akademik');
const { recordJournal } = require('../bookkeeping/journalEngine');
const fundBalanceEngine = require('../bookkeeping/fundBalanceEngine');
const { logFinanceAudit } = require('../common/auditLogService');
const crossModuleServices = require('../common/crossModuleServices');
const { determineDiscountApprovalTier } = require('../bills/service');

const isUnit = (id) => id && id !== 'all' && id !== 'foundation' && id !== 'null' && Number(id) !== 0;

function formatDateOnly(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const clean = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const match = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

class PpdbBillingService {
  /**
   * Helper to resolve academic year IDs across multi-units (SMP, SMA, etc)
   */
  async getMatchingAcademicYearIds(targetAyId) {
    if (!targetAyId) return [];
    try {
      const ayRow = await dbAkademik('academic_years').where('id', Number(targetAyId)).first();
      if (ayRow) {
        const sameAys = await dbAkademik('academic_years').where('name', ayRow.name);
        return sameAys.map(a => a.id);
      }
    } catch (e) {
      console.warn('[PpdbBillingService] Could not resolve multi-unit AY IDs:', e.message);
    }
    return [Number(targetAyId)];
  }

  /**
   * List PPDB Registration Bills with filters & metrics
   */
  async listRegistrationBills(schoolUnitId, filters = {}) {
    let query = db('ppdb_registration_bills as prb')
      .leftJoin('ppdb_registration_payments as prp', 'prb.id', 'prp.ppdb_registration_bill_id')
      .leftJoin('fee_types as ft', 'prb.fee_type_id', 'ft.id')
      .leftJoin('cash_accounts as ca', 'prp.cash_account_id', 'ca.id')
      .leftJoin('ppdb_scholarship_quotas as psq', 'prb.scholarship_quota_id', 'psq.id');

    if (isUnit(schoolUnitId)) {
      query = query.where('prb.school_unit_id', Number(schoolUnitId));
    }

    // Filter Tahun Transaksi / Berjalan
    if (filters.academic_year_id) {
      const matchingAyIds = await this.getMatchingAcademicYearIds(filters.academic_year_id);
      query = query.whereIn('prb.academic_year_id', matchingAyIds);
    }

    // Filter Tahun Masuk Target
    if (filters.target_academic_year_id) {
      const matchingTargetAyIds = await this.getMatchingAcademicYearIds(filters.target_academic_year_id);
      query = query.whereIn('prb.target_academic_year_id', matchingTargetAyIds);
    }

    // Filter Fase Penagihan (registration_fee vs enrollment_fee)
    if (filters.billing_phase && filters.billing_phase !== 'all') {
      query = query.where('prb.billing_phase', filters.billing_phase);
    }

    // Filter Status Tagihan
    if (filters.status && filters.status !== 'all') {
      query = query.where('prb.status', filters.status);
    }

    // Filter Status Refund
    if (filters.refund_status && filters.refund_status !== 'all') {
      query = query.where('prb.refund_status', filters.refund_status);
    }

    // Pencarian Siswa / Nomor Pendaftaran
    if (filters.search) {
      const term = `%${filters.search}%`;
      query = query.where(b => {
        b.where('prb.registrant_name_snapshot', 'like', term)
          .orWhere('prb.registration_number_snapshot', 'like', term)
          .orWhere('prp.receipt_number', 'like', term);
      });
    }

    const bills = await query
      .select(
        'prb.*',
        'ft.name as fee_type_name',
        'psq.quota_category as scholarship_category_name',
        'prp.id as payment_id',
        'prp.receipt_number',
        'prp.amount_paid',
        'prp.payment_date',
        'prp.payment_method',
        'prp.cash_account_id',
        'ca.name as cash_account_name'
      )
      .orderBy('prb.created_at', 'desc');

    // Summary calculation (kecualikan parent cicilan agar tidak double counting dengan termin)
    let allUnitQuery = db('ppdb_registration_bills').where('is_installment_parent', false);
    if (isUnit(schoolUnitId)) {
      allUnitQuery = allUnitQuery.where('school_unit_id', Number(schoolUnitId));
    }
    const allUnitBills = await allUnitQuery;

    const draftBills = allUnitBills.filter(b => b.status === 'draft');
    const pendingApprovalBills = allUnitBills.filter(b => b.status === 'pending_approval');
    const unpaidBills = allUnitBills.filter(b => b.status === 'unpaid' || b.status === 'partially_paid');
    const paidBills = allUnitBills.filter(b => b.status === 'paid');
    const refundedBills = allUnitBills.filter(b => b.status === 'refunded');

    const totalAmountBilled = allUnitBills.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalAmountDraft = draftBills.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalAmountPaid = paidBills.reduce((acc, b) => acc + parseFloat(b.paid_amount || b.amount || 0), 0);
    const totalAmountUnpaid = unpaidBills.reduce((acc, b) => acc + Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.paid_amount || 0)), 0);
    const totalAmountRefunded = refundedBills.reduce((acc, b) => acc + parseFloat(b.refund_amount || 0), 0);

    const formattedBills = bills.map(b => ({
      ...b,
      bill_date: formatDateOnly(b.bill_date),
      due_date: formatDateOnly(b.due_date),
      payment_date: formatDateOnly(b.payment_date)
    }));

    return {
      summary: {
        total_bills: allUnitBills.length,
        draft_count: draftBills.length,
        pending_approval_count: pendingApprovalBills.length,
        unpaid_count: unpaidBills.length,
        paid_count: paidBills.length,
        refunded_count: refundedBills.length,
        total_amount_billed: totalAmountBilled,
        total_amount_draft: totalAmountDraft,
        total_amount_paid: totalAmountPaid,
        total_amount_unpaid: totalAmountUnpaid,
        total_amount_refunded: totalAmountRefunded
      },
      bills: formattedBills
    };
  }

  /**
   * Get prospective student candidates from Akademik PSB module
   */
  async getRegistrantCandidates(schoolUnitId, filters = {}) {
    try {
      const registrants = await crossModuleServices.listPsbRegistrants(schoolUnitId, filters);

      // Cek apakah sudah ada tagihan pendaftaran di keuangan
      const regIds = registrants.map(r => r.id);
      let billsQuery = db('ppdb_registration_bills');
      if (isUnit(schoolUnitId)) {
        billsQuery = billsQuery.where('school_unit_id', Number(schoolUnitId));
      }
      const existingBills = regIds.length > 0
        ? await billsQuery.whereIn('psb_registrant_ref_id', regIds)
        : [];

      const billMap = {};
      existingBills.forEach(b => {
        billMap[b.psb_registrant_ref_id] = b;
      });

      return registrants.map(r => ({
        ...r,
        has_bill: Boolean(billMap[r.id]),
        bill: billMap[r.id] || null
      }));
    } catch (err) {
      console.warn('Error fetching registrant candidates via CrossModule:', err.message);
      return [];
    }
  }

  // ============================================================
  // BAGIAN 2: BACKEND ENGINE (DRAFT -> APPROVAL -> TERBIT -> REVISI)
  // ============================================================

  /**
   * 1. Create a new PPDB Registration Bill (Hasilnya DRAFT atau UNPAID siap bayar)
   */
  async createRegistrationBill(schoolUnitId, data, userId = null) {
    const registrantRefId = Number(data.psb_registrant_ref_id);
    const academicYearId = Number(data.academic_year_id || 1);
    const targetAyId = Number(data.target_academic_year_id || 2);
    const baseAmount = parseFloat(data.amount || 0);
    const billingPhase = data.billing_phase || 'enrollment_fee';

    if (!registrantRefId || isNaN(baseAmount) || baseAmount <= 0) {
      const err = new Error('Data calon santri dan nominal tagihan PPDB valid wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    // 1.1 Ambil data calon santri dari modul PSB / Akademik
    const registrant = await crossModuleServices.getPsbRegistrant(registrantRefId);
    let resolvedUnitId = isUnit(schoolUnitId) ? Number(schoolUnitId) : (registrant?.satuan_pendidikan_id || data.satuan_pendidikan_id || 1);

    // 1.2 Resolusi fee_type
    let feeTypeId = data.fee_type_id ? Number(data.fee_type_id) : null;
    if (!feeTypeId) {
      const searchKeyword = billingPhase === 'enrollment_fee' ? '%Pangkal%' : '%Pendaftaran%';
      const fee = await db('fee_types')
        .where(b => b.where('school_unit_id', resolvedUnitId).orWhere('school_unit_id', 0).orWhereNull('school_unit_id'))
        .where('name', 'like', searchKeyword)
        .first();
      feeTypeId = fee ? fee.id : (billingPhase === 'enrollment_fee' ? 3 : 2);
    }

    // 1.3 Evaluasi Diskon Kasuistik & Persetujuan Berjenjang
    let discountAmount = parseFloat(data.discount_amount || 0);
    let discountPct = data.discount_percentage ? parseFloat(data.discount_percentage) : null;
    const discountType = data.discount_type || (discountAmount > 0 ? 'fixed_amount' : null);

    if (discountType === 'percentage' && discountPct > 0) {
      discountAmount = (discountPct / 100) * baseAmount;
    } else if (discountType === 'full_waiver') {
      discountAmount = baseAmount;
      discountPct = 100.00;
    }

    const netAmount = Math.max(0, baseAmount - discountAmount);

    // 1.4 Cek jika sudah ada tagihan aktif untuk calon santri & pos biaya ini
    const existing = await db('ppdb_registration_bills')
      .where({
        psb_registrant_ref_id: registrantRefId,
        fee_type_id: feeTypeId
      })
      .whereNot('status', 'cancelled')
      .first();

    const billDateClean = formatDateOnly(data.bill_date);
    const dueDateClean = formatDateOnly(data.due_date);

    if (existing) {
      if (existing.paid_amount > 0) {
        const err = new Error(`Tagihan sudah memiliki riwayat pembayaran sebesar Rp ${Number(existing.paid_amount).toLocaleString('id-ID')}, tidak dapat diubah langsung.`);
        err.statusCode = 422;
        throw err;
      }

      await db('ppdb_registration_bills')
        .where({ id: existing.id })
        .update({
          amount: netAmount,
          bill_date: billDateClean || existing.bill_date,
          due_date: dueDateClean || existing.due_date,
          discount_type: discountType,
          discount_amount: discountAmount,
          discount_percentage: discountPct,
          discount_reason: data.discount_reason || null,
          notes: data.notes || existing.notes,
          status: 'unpaid',
          updated_at: db.fn.now()
        });

      const updatedRow = await db('ppdb_registration_bills').where({ id: existing.id }).first();
      try {
        await crossModuleServices.syncPpdbBillToStudentBill(updatedRow);
      } catch (sErr) {
        console.warn('[createRegistrationBill] syncPpdbBillToStudentBill warning:', sErr.message);
      }

      return {
        ...updatedRow,
        bill_date: formatDateOnly(updatedRow.bill_date),
        due_date: formatDateOnly(updatedRow.due_date)
      };
    }

    const approvalEval = determineDiscountApprovalTier({
      discountType,
      discountAmount,
      discountPercentage: discountPct,
      baseAmount,
      discountSkDocUrl: data.discount_sk_document_url
    });

    // 1.5 Validasi Kuota Beasiswa jika memilih kategori kuota
    let scholarshipQuotaId = data.scholarship_quota_id ? Number(data.scholarship_quota_id) : null;
    if (scholarshipQuotaId) {
      const quota = await db('ppdb_scholarship_quotas').where({ id: scholarshipQuotaId }).first();
      if (!quota || !quota.is_active) {
        const err = new Error('Kategori kuota beasiswa tidak ditemukan atau sudah nonaktif');
        err.statusCode = 422;
        throw err;
      }
      if (quota.used_quota >= quota.max_quota) {
        const err = new Error(`Kuota beasiswa '${quota.quota_category}' telah habis (${quota.used_quota}/${quota.max_quota}). Silakan pilih kategori lain atau ajukan penambahan kuota ke Yayasan.`);
        err.statusCode = 422;
        throw err;
      }
    }

    let linkedStudentId = data.linked_student_id ? Number(data.linked_student_id) : (data.student_id ? Number(data.student_id) : null);
    if (!linkedStudentId) {
      try {
        const studentMatch = await crossModuleServices.getStudent(registrantRefId);
        if (studentMatch) linkedStudentId = studentMatch.id;
      } catch (_) {}
    }

    const billStatus = data.status || 'unpaid';

    const [id] = await db('ppdb_registration_bills').insert({
      school_unit_id: resolvedUnitId,
      academic_year_id: academicYearId,
      target_academic_year_id: targetAyId,
      psb_registrant_ref_id: registrantRefId,
      linked_student_id: linkedStudentId,
      registrant_name_snapshot: data.registrant_name_snapshot || registrant?.full_name || 'Calon Santri',
      registration_number_snapshot: data.registration_number_snapshot || registrant?.registration_number || null,
      fee_type_id: feeTypeId,
      amount: netAmount,
      paid_amount: 0.00,
      bill_date: billDateClean,
      due_date: dueDateClean,
      version: 1,
      discount_type: discountType,
      discount_amount: discountAmount,
      discount_percentage: discountPct,
      discount_sk_number: data.discount_sk_number || null,
      discount_sk_date: data.discount_sk_date || null,
      discount_sk_document_url: data.discount_sk_document_url || null,
      discount_reason: data.discount_reason || null,
      approval_tier: approvalEval.tier,
      billing_phase: billingPhase,
      scholarship_quota_id: scholarshipQuotaId,
      status: billStatus,
      notes: data.notes || null,
      created_by: userId
    });

    const actualId = id || (await db('ppdb_registration_bills')
      .where({ school_unit_id: resolvedUnitId })
      .orderBy('id', 'desc')
      .first()).id;

    await logFinanceAudit({
      schoolUnitId: resolvedUnitId,
      userId,
      action: 'CREATE_PPDB_REGISTRATION_BILL',
      entityType: 'ppdb_registration_bill',
      entityId: actualId,
      dataBefore: null,
      dataAfter: { id: actualId, amount: netAmount, status: billStatus, phase: billingPhase }
    });

    const createdRow = await db('ppdb_registration_bills').where({ id: actualId }).first();
    try {
      await crossModuleServices.syncPpdbBillToStudentBill(createdRow);
    } catch (sErr) {
      console.warn('[createRegistrationBill] syncPpdbBillToStudentBill warning:', sErr.message);
    }

    return {
      ...createdRow,
      bill_date: formatDateOnly(createdRow.bill_date),
      due_date: formatDateOnly(createdRow.due_date)
    };
  }

  /**
   * 2. Publish PPDB Registration Bills (Draft -> Unpaid + Jurnal Piutang ppdb_bill_issued)
   */
  async publishRegistrationBills(schoolUnitId, billIds = [], userId = null) {
    if (!Array.isArray(billIds) || billIds.length === 0) {
      const err = new Error('Pilih minimal satu tagihan PPDB untuk diterbitkan');
      err.statusCode = 422;
      throw err;
    }

    const numericIds = billIds.map(Number);
    const bills = await db('ppdb_registration_bills')
      .whereIn('id', numericIds)
      .andWhere('school_unit_id', schoolUnitId);

    if (bills.length === 0) {
      const err = new Error('Tagihan PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Safeguard: Tolak jika ada tagihan yang masih 'pending_approval'
    const pendingBills = bills.filter(b => b.status === 'pending_approval');
    if (pendingBills.length > 0) {
      const err = new Error(`Penerbitan dibatalkan: Tagihan #${pendingBills[0].id} (${pendingBills[0].registrant_name_snapshot}) masih berstatus 'pending_approval' (memerlukan otorisasi diskon berjenjang sebelum dapat diterbitkan)`);
      err.statusCode = 422;
      throw err;
    }

    const publishedResults = [];

    await db.transaction(async (trx) => {
      for (const bill of bills) {
        if (bill.status !== 'draft') {
          continue; // Lewati yang sudah terbit/lunas/dibatalkan
        }

        const feeType = await trx('fee_types').where({ id: bill.fee_type_id }).first();

        // 1. Update status tagihan menjadi unpaid
        await trx('ppdb_registration_bills')
          .where({ id: bill.id })
          .update({
            status: 'unpaid',
            updated_at: trx.fn.now()
          });

        // 2. Jurnal Piutang PPDB (ppdb_bill_issued)
        if (bill.amount > 0) {
          try {
            await recordJournal({
              schoolUnitId,
              transactionCode: 'ppdb_bill_issued',
              amount: bill.amount,
              sourceType: 'ppdb_registration_bill',
              sourceId: bill.id,
              description: `Penerbitan Piutang PPDB: ${bill.registrant_name_snapshot} (${feeType ? feeType.name : 'Biaya PPDB'})`,
              journalDate: new Date(),
              overrideDebitAccountId: 199, // Piutang Usaha - Siswa
              overrideCreditAccountId: feeType ? feeType.related_revenue_account_id : null,
              userId,
              trx
            });
          } catch (jErr) {
            console.warn(`[PpdbBilling] Gagal mencatat jurnal piutang PPDB #${bill.id}:`, jErr.message);
          }
        }

        // 3. Increment used_quota pada kuota beasiswa jika ada
        if (bill.scholarship_quota_id) {
          await trx('ppdb_scholarship_quotas')
            .where({ id: bill.scholarship_quota_id })
            .increment('used_quota', 1);
        }

        publishedResults.push({ id: bill.id, status: 'unpaid' });
      }
    });

    for (const p of publishedResults) {
      try {
        await crossModuleServices.syncPpdbBillToStudentBill(p.id);
      } catch (sErr) {
        console.warn('[publishRegistrationBills] syncPpdbBillToStudentBill warning:', sErr.message);
      }
    }

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'PUBLISH_PPDB_BILLS',
      entityType: 'ppdb_registration_bill',
      entityId: numericIds.join(','),
      dataBefore: null,
      dataAfter: { count: publishedResults.length, ids: publishedResults.map(p => p.id) }
    });

    return {
      message: `${publishedResults.length} tagihan PPDB berhasil diterbitkan dan dicatat sebagai piutang resmi`,
      published_count: publishedResults.length,
      bills: publishedResults
    };
  }

  /**
   * 3. Approve PPDB Bill Discount (Pending Approval -> Draft)
   */
  async approveRegistrationBillDiscount(schoolUnitId, id, userId = null, userRoles = []) {
    const bill = await db('ppdb_registration_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status !== 'pending_approval') {
      const err = new Error(`Tagihan #${id} tidak sedang menunggu persetujuan diskon (status: ${bill.status})`);
      err.statusCode = 422;
      throw err;
    }

    const isSuper = userRoles.includes('super_admin');
    const isYayasan = userRoles.includes('admin_yayasan') || isSuper;
    const isUnit = userRoles.includes('admin_satuan_pendidikan') || isYayasan;

    if (bill.approval_tier === 'yayasan') {
      if (!isYayasan) {
        const err = new Error('Persetujuan diskon tingkat Yayasan / Full Waiver PPDB hanya dapat dilakukan oleh role admin_yayasan atau super_admin');
        err.statusCode = 403;
        throw err;
      }
      if (!bill.discount_sk_document_url || !String(bill.discount_sk_document_url).trim()) {
        const err = new Error('Persetujuan diskon tingkat Yayasan gagal: Dokumen SK resmi wajib dilampirkan sebelum status dapat disahkan');
        err.statusCode = 422;
        throw err;
      }
    } else if (bill.approval_tier === 'unit' && !isUnit) {
      const err = new Error('Persetujuan diskon tingkat Satuan Pendidikan hanya dapat dilakukan oleh Kepala Satuan Pendidikan atau di atasnya');
      err.statusCode = 403;
      throw err;
    }

    await db('ppdb_registration_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'draft', // Beralih ke draft siap terbit
        approved_by: userId,
        approved_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    return { message: `Diskon kasuistik tagihan PPDB #${id} berhasil disetujui, tagihan kini berstatus draft siap diterbitkan` };
  }

  /**
   * 4. Reject PPDB Bill Discount (Pending Approval -> Draft dengan nominal normal)
   */
  async rejectRegistrationBillDiscount(schoolUnitId, id, userId = null, reason = '') {
    const bill = await db('ppdb_registration_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status !== 'pending_approval') {
      const err = new Error(`Tagihan #${id} tidak sedang menunggu persetujuan diskon (status: ${bill.status})`);
      err.statusCode = 422;
      throw err;
    }

    const restoredAmount = parseFloat(bill.amount) + parseFloat(bill.discount_amount || 0);

    await db('ppdb_registration_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'draft',
        amount: restoredAmount,
        discount_amount: 0.00,
        discount_percentage: null,
        discount_type: null,
        discount_sk_number: null,
        discount_sk_date: null,
        discount_sk_document_url: null,
        discount_reason: null,
        approval_tier: null,
        rejection_reason: reason || 'Diskon ditolak oleh pengesah',
        updated_at: db.fn.now()
      });

    return { message: `Diskon tagihan PPDB #${id} ditolak dan dikembalikan ke nominal normal (${restoredAmount})` };
  }

  /**
   * 5. Revise PPDB Registration Bill (Paralel reviseIssuedBill dengan Safeguard paid_amount)
   */
  async reviseRegistrationBill(schoolUnitId, id, data, userId = null) {
    const bill = await db('ppdb_registration_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status === 'cancelled' || bill.status === 'refunded') {
      const err = new Error(`Tagihan yang berstatus ${bill.status} tidak dapat direvisi`);
      err.statusCode = 422;
      throw err;
    }

    const previousAmount = parseFloat(bill.amount);
    const newAmount = data.new_amount !== undefined ? parseFloat(data.new_amount) : previousAmount;
    const paidAmount = parseFloat(bill.paid_amount || 0);
    const revisionReason = String(data.revision_reason || '').trim();

    if (isNaN(newAmount) || newAmount < 0) {
      const err = new Error('Nominal baru tagihan PPDB harus berupa angka positif');
      err.statusCode = 422;
      throw err;
    }

    if (!revisionReason) {
      const err = new Error('Alasan revisi operasional wajib diisi sebagai jejak audit');
      err.statusCode = 422;
      throw err;
    }

    // SAFEGUARD LOCK: Nominal baru dilarang keras lebih kecil dari jumlah yang telah dibayarkan
    if (newAmount < paidAmount) {
      const err = new Error(`Revisi ditolak: Nominal baru (Rp ${newAmount.toLocaleString('id-ID')}) tidak boleh lebih kecil dari jumlah yang telah dibayarkan santri (Rp ${paidAmount.toLocaleString('id-ID')}). Silakan gunakan alur permohonan pengembalian dana / refund.`);
      err.statusCode = 422;
      err.code = 'REVISION_BELOW_PAID_AMOUNT';
      throw err;
    }

    return db.transaction(async (trx) => {
      let adjustmentJournalEntryId = null;

      // Jurnal penyesuaian jika tagihan sudah terbit
      if (bill.status !== 'draft' && bill.status !== 'pending_approval') {
        const amountDiff = previousAmount - newAmount;

        // Tagihan berkurang -> Debit Diskon, Kredit Piutang
        if (amountDiff > 0) {
          try {
            const feeType = await trx('fee_types').where({ id: bill.fee_type_id }).first();
            const jrn = await recordJournal({
              schoolUnitId,
              transactionCode: 'student_bill_discount',
              amount: amountDiff,
              sourceType: 'ppdb_bill_revision',
              sourceId: bill.id,
              description: `Penyesuaian diskon tagihan PPDB #${bill.id} v${bill.version + 1} (${bill.registrant_name_snapshot}): ${revisionReason}`,
              journalDate: new Date(),
              userId,
              trx
            });
            adjustmentJournalEntryId = jrn.journal_id || jrn.id || null;
          } catch (jErr) {
            console.warn('[PpdbBilling] Gagal mencatat jurnal penyesuaian diskon:', jErr.message);
          }
        }
        // Tagihan bertambah -> Debit Piutang, Kredit Pendapatan
        else if (amountDiff < 0) {
          try {
            const feeType = await trx('fee_types').where({ id: bill.fee_type_id }).first();
            const jrn = await recordJournal({
              schoolUnitId,
              transactionCode: 'ppdb_bill_issued',
              amount: Math.abs(amountDiff),
              sourceType: 'ppdb_bill_revision',
              sourceId: bill.id,
              description: `Penambahan piutang tagihan PPDB #${bill.id} v${bill.version + 1} (${bill.registrant_name_snapshot}): ${revisionReason}`,
              journalDate: new Date(),
              overrideDebitAccountId: 199,
              overrideCreditAccountId: feeType ? feeType.related_revenue_account_id : null,
              userId,
              trx
            });
            adjustmentJournalEntryId = jrn.journal_id || jrn.id || null;
          } catch (jErr) {
            console.warn('[PpdbBilling] Gagal mencatat jurnal penambahan piutang:', jErr.message);
          }
        }
      }

      // Tentukan status baru pasca penyesuaian nominal
      let newStatus = bill.status;
      if (bill.status !== 'draft' && bill.status !== 'pending_approval') {
        if (paidAmount >= newAmount && newAmount > 0) {
          newStatus = 'paid';
        } else if (paidAmount > 0 && paidAmount < newAmount) {
          newStatus = 'partially_paid';
        } else if (paidAmount === 0) {
          newStatus = 'unpaid';
        }
      }

      // Catat riwayat ke ppdb_bill_revisions
      const lastRev = await trx('ppdb_bill_revisions')
        .where({ ppdb_registration_bill_id: id })
        .orderBy('revision_number', 'desc')
        .first();
      const nextRevNumber = lastRev ? lastRev.revision_number + 1 : 1;

      await trx('ppdb_bill_revisions').insert({
        ppdb_registration_bill_id: id,
        revision_number: nextRevNumber,
        previous_amount: previousAmount,
        new_amount: newAmount,
        adjustment_journal_entry_id: adjustmentJournalEntryId,
        discount_sk_number: data.discount_sk_number !== undefined ? data.discount_sk_number : bill.discount_sk_number,
        discount_sk_date: data.discount_sk_date !== undefined ? data.discount_sk_date : bill.discount_sk_date,
        discount_sk_document_url: data.discount_sk_document_url !== undefined ? data.discount_sk_document_url : bill.discount_sk_document_url,
        revision_reason: revisionReason,
        revised_by: userId || 1
      });

      // Update baris utama
      await trx('ppdb_registration_bills')
        .where({ id, school_unit_id: schoolUnitId })
        .update({
          amount: newAmount,
          discount_amount: data.new_discount_amount !== undefined ? parseFloat(data.new_discount_amount) : bill.discount_amount,
          discount_sk_number: data.discount_sk_number !== undefined ? data.discount_sk_number : bill.discount_sk_number,
          discount_sk_date: data.discount_sk_date !== undefined ? data.discount_sk_date : bill.discount_sk_date,
          discount_sk_document_url: data.discount_sk_document_url !== undefined ? data.discount_sk_document_url : bill.discount_sk_document_url,
          discount_reason: data.discount_reason !== undefined ? data.discount_reason : bill.discount_reason,
          status: newStatus,
          version: (bill.version || 1) + 1,
          updated_at: trx.fn.now()
        });

      // Sinkronisasikan ke student_bills jika ada
      try {
        await crossModuleServices.syncPpdbBillToStudentBill(id, trx);
      } catch (sErr) {
        console.warn('[reviseRegistrationBill] syncPpdbBillToStudentBill warning:', sErr.message);
      }

      return {
        message: `Tagihan PPDB #${id} berhasil direvisi dari v${bill.version || 1} ke v${(bill.version || 1) + 1}`,
        id,
        version: (bill.version || 1) + 1,
        new_amount: newAmount,
        status: newStatus
      };
    });
  }

  /**
   * 6. Get PPDB Bill Revisions History
   */
  async getRegistrationBillRevisions(billId) {
    return db('ppdb_bill_revisions')
      .leftJoin('journal_entries', 'ppdb_bill_revisions.adjustment_journal_entry_id', 'journal_entries.id')
      .where({ 'ppdb_bill_revisions.ppdb_registration_bill_id': billId })
      .select(
        'ppdb_bill_revisions.*',
        'journal_entries.journal_number as adjustment_journal_number'
      )
      .orderBy('ppdb_bill_revisions.revision_number', 'asc');
  }

  // ============================================================
  // BAGIAN 3: SKEMA CICILAN / TERMIN UANG PANGKAL
  // ============================================================

  /**
   * Generate installment plan dari 1 tagihan enrollment_fee
   */
  async createInstallmentPlan(schoolUnitId, parentBillId, installments = [], userId = null) {
    if (!Array.isArray(installments) || installments.length < 2) {
      const err = new Error('Paket cicilan minimal harus terdiri dari 2 termin');
      err.statusCode = 422;
      throw err;
    }

    const parentBill = await db('ppdb_registration_bills')
      .where({ id: parentBillId, school_unit_id: schoolUnitId })
      .first();

    if (!parentBill) {
      const err = new Error('Tagihan induk PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (parentBill.billing_phase !== 'enrollment_fee') {
      const err = new Error('Hanya tagihan Uang Pangkal / Daftar Ulang (enrollment_fee) yang dapat dipecah menjadi cicilan termin');
      err.statusCode = 422;
      throw err;
    }

    if (parentBill.status === 'paid' || parentBill.paid_amount > 0) {
      const err = new Error('Tagihan yang sudah memiliki transaksi pembayaran tidak dapat dipecah cicilan secara langsung');
      err.statusCode = 422;
      throw err;
    }

    const totalInstallmentAmount = installments.reduce((acc, it) => acc + parseFloat(it.amount || 0), 0);
    const parentAmount = parseFloat(parentBill.amount);

    if (Math.abs(totalInstallmentAmount - parentAmount) > 1.00) {
      const err = new Error(`Total nominal termin cicilan (Rp ${totalInstallmentAmount.toLocaleString('id-ID')}) tidak sesuai dengan total tagihan induk (Rp ${parentAmount.toLocaleString('id-ID')})`);
      err.statusCode = 422;
      throw err;
    }

    return db.transaction(async (trx) => {
      // 1. Tandai parent bill sebagai induk termin & batalkan agar tidak double count piutang
      await trx('ppdb_registration_bills')
        .where({ id: parentBill.id })
        .update({
          is_installment_parent: true,
          status: 'cancelled',
          notes: `[Paket Induk Uang Pangkal] Dipecah menjadi ${installments.length} termin cicilan`,
          updated_at: trx.fn.now()
        });

      // 2. Insert masing-masing termin sebagai baris tagihan terkelola
      const createdChildIds = [];
      const totalCount = installments.length;

      for (let i = 0; i < totalCount; i++) {
        const inst = installments[i];
        const instAmount = parseFloat(inst.amount);
        const instDueDate = inst.due_date || new Date().toISOString().slice(0, 10);

        const [childId] = await trx('ppdb_registration_bills').insert({
          school_unit_id: schoolUnitId,
          academic_year_id: parentBill.academic_year_id,
          target_academic_year_id: parentBill.target_academic_year_id,
          psb_registrant_ref_id: parentBill.psb_registrant_ref_id,
          registrant_name_snapshot: parentBill.registrant_name_snapshot,
          registration_number_snapshot: parentBill.registration_number_snapshot,
          fee_type_id: parentBill.fee_type_id,
          amount: instAmount,
          paid_amount: 0.00,
          version: 1,
          billing_phase: 'enrollment_fee',
          installment_number: i + 1,
          installment_total: totalCount,
          parent_bill_id: parentBill.id,
          is_installment_parent: false,
          status: 'draft', // Masuk sebagai draf siap disahkan
          notes: `Cicilan Uang Pangkal - Termin ${i + 1} dari ${totalCount} (Jatuh tempo: ${instDueDate})`,
          created_by: userId
        });

        const actualChildId = childId || (await trx('ppdb_registration_bills')
          .where({ parent_bill_id: parentBill.id })
          .orderBy('id', 'desc')
          .first()).id;

        createdChildIds.push(actualChildId);
      }

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CREATE_PPDB_INSTALLMENT_PLAN',
        entityType: 'ppdb_registration_bill',
        entityId: parentBill.id,
        dataBefore: parentBill,
        dataAfter: { parentId: parentBill.id, total_installments: totalCount, childIds: createdChildIds }
      });

      return {
        message: `Paket cicilan berhasil dibuat: ${totalCount} termin draf tagihan telah digenerate`,
        parent_bill_id: parentBill.id,
        installment_count: totalCount,
        child_bill_ids: createdChildIds
      };
    });
  }

  // ============================================================
  // BAGIAN 4: REFUND & KUOTA BEASISWA
  // ============================================================

  /**
   * 1. Pengajuan Refund Calon Murid
   */
  async requestRefund(schoolUnitId, billId, data, userId = null) {
    const bill = await db('ppdb_registration_bills')
      .where({ id: billId, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status !== 'paid' && parseFloat(bill.paid_amount || 0) <= 0) {
      const err = new Error('Hanya tagihan yang telah memiliki pembayaran kas yang dapat diajukan refund');
      err.statusCode = 422;
      throw err;
    }

    if (bill.refund_status === 'requested' || bill.refund_status === 'approved' || bill.refund_status === 'processed') {
      const err = new Error(`Permohonan refund untuk tagihan ini sudah dalam status ${bill.refund_status}`);
      err.statusCode = 409;
      throw err;
    }

    await db('ppdb_registration_bills')
      .where({ id: billId })
      .update({
        refund_status: 'requested',
        refund_bank_account_number: data.refund_bank_account_number || null,
        refund_bank_account_holder: data.refund_bank_account_holder || null,
        refund_reason: data.refund_reason || 'Permohonan pengunduran diri calon murid',
        updated_at: db.fn.now()
      });

    return { message: `Permohonan refund tagihan PPDB #${billId} berhasil dicatat, menunggu persetujuan Yayasan` };
  }

  /**
   * 2. Approval Refund (Role Direktur/Ketua Yayasan)
   */
  async approveRefund(schoolUnitId, billId, userId = null, userRoles = []) {
    const isYayasan = userRoles.includes('admin_yayasan') || userRoles.includes('super_admin');
    if (!isYayasan) {
      const err = new Error('Persetujuan refund PPDB merupakan wewenang Direktur Keuangan / Ketua Yayasan');
      err.statusCode = 403;
      throw err;
    }

    const bill = await db('ppdb_registration_bills')
      .where({ id: billId, school_unit_id: schoolUnitId })
      .first();

    if (!bill || bill.refund_status !== 'requested') {
      const err = new Error('Tagihan tidak ditemukan atau tidak sedang menunggu persetujuan refund');
      err.statusCode = 422;
      throw err;
    }

    await db('ppdb_registration_bills')
      .where({ id: billId })
      .update({
        refund_status: 'approved',
        refund_approved_by: userId,
        updated_at: db.fn.now()
      });

    return { message: `Permohonan refund tagihan PPDB #${billId} telah disetujui Yayasan dan siap dicairkan` };
  }

  /**
   * 3. Reject Refund
   */
  async rejectRefund(schoolUnitId, billId, reason = '', userId = null, userRoles = []) {
    const isYayasan = userRoles.includes('admin_yayasan') || userRoles.includes('super_admin');
    if (!isYayasan) {
      const err = new Error('Penolakan refund PPDB merupakan wewenang Yayasan');
      err.statusCode = 403;
      throw err;
    }

    await db('ppdb_registration_bills')
      .where({ id: billId, school_unit_id: schoolUnitId })
      .update({
        refund_status: 'rejected',
        refund_reason: db.raw(`CONCAT(COALESCE(refund_reason, ''), ' [Ditolak: ', ?, ']')`, [reason || 'Ditolak']),
        updated_at: db.fn.now()
      });

    return { message: `Permohonan refund tagihan PPDB #${billId} ditolak` };
  }

  /**
   * 4. Eksekusi Pencairan Refund (Hitung aturan ppdb_refund_policy_rules + Jurnal ppdb_refund_issued)
   */
  async processRefund(schoolUnitId, billId, data, userId = null, userRoles = []) {
    const isYayasan = userRoles.includes('admin_yayasan') || userRoles.includes('super_admin');
    if (!isYayasan) {
      const err = new Error('Eksekusi pencairan refund PPDB hanya dapat dilakukan oleh role Yayasan');
      err.statusCode = 403;
      throw err;
    }

    const cashAccountId = Number(data.cash_account_id);
    if (!cashAccountId) {
      const err = new Error('Pilih rekening kas/bank pengeluaran untuk pencairan refund');
      err.statusCode = 422;
      throw err;
    }

    const bill = await db('ppdb_registration_bills')
      .where({ id: billId, school_unit_id: schoolUnitId })
      .first();

    if (!bill || (bill.refund_status !== 'approved' && bill.refund_status !== 'requested')) {
      const err = new Error('Tagihan tidak memenuhi syarat pencairan refund (harus berstatus approved/requested)');
      err.statusCode = 422;
      throw err;
    }

    const cashAccount = await db('cash_accounts').where({ id: cashAccountId }).first();
    if (!cashAccount) {
      const err = new Error('Rekening kas/bank tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const paidAmount = parseFloat(bill.paid_amount || bill.amount || 0);

    // Hitung berdasarkan aturan ppdb_refund_policy_rules
    const todayStr = new Date().toISOString().slice(0, 10);
    const activeRules = await db('ppdb_refund_policy_rules')
      .where({ school_unit_id: schoolUnitId, fee_component: bill.billing_phase, is_active: true })
      .orderBy('cutoff_date', 'asc');

    let deductionPercentage = 0.00;
    let ruleApplied = null;

    for (const r of activeRules) {
      if (!r.cutoff_date || todayStr <= String(r.cutoff_date).slice(0, 10)) {
        deductionPercentage = parseFloat(r.deduction_percentage || 0);
        ruleApplied = r;
        break;
      }
    }

    if (!ruleApplied && activeRules.length > 0) {
      // Lewat dari semua cutoff date -> ambil aturan terakhir
      const lastRule = activeRules[activeRules.length - 1];
      deductionPercentage = parseFloat(lastRule.deduction_percentage || 0);
      ruleApplied = lastRule;
    }

    const netRefund = Math.max(0, paidAmount * (1 - (deductionPercentage / 100)));

    return db.transaction(async (trx) => {
      const feeType = await trx('fee_types').where({ id: bill.fee_type_id }).first();

      // 1. Update status tagihan ke refunded
      await trx('ppdb_registration_bills')
        .where({ id: bill.id })
        .update({
          status: 'refunded',
          refund_status: 'processed',
          refund_amount: netRefund,
          refund_processed_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });

      // 2. Jurnal Pembalik ppdb_refund_issued
      if (netRefund > 0) {
        try {
          await recordJournal({
            schoolUnitId,
            transactionCode: 'ppdb_refund_issued',
            amount: netRefund,
            sourceType: 'ppdb_registration_refund',
            sourceId: bill.id,
            description: `Pencairan Refund PPDB: ${bill.registrant_name_snapshot} (Potongan ${deductionPercentage}% - ${ruleApplied ? ruleApplied.description : 'Kebijakan Yayasan'})`,
            journalDate: new Date(),
            overrideDebitAccountId: feeType ? feeType.related_revenue_account_id : null, // Mengurangi pendapatan PPDB
            overrideCreditAccountId: cashAccount.chart_of_account_id || null, // Kas/Bank berkurang
            overrideCashAccountId: cashAccountId,
            userId,
            trx
          });
        } catch (jErr) {
          console.warn('[PpdbBilling] Gagal mencatat jurnal refund PPDB:', jErr.message);
        }

        // 3. Mutasi Kantong Dana keluar
        try {
          await fundBalanceEngine.applyFundMutation({
            schoolUnitId,
            fundType: 'fee_type',
            fundRefId: bill.fee_type_id,
            academicYearId: Number(bill.target_academic_year_id || 2),
            direction: 'out',
            amount: netRefund,
            sourceTable: 'ppdb_registration_bills',
            sourceId: bill.id,
            notes: `Refund PPDB ${bill.registrant_name_snapshot}`,
            userId,
            trx
          });
        } catch (fbErr) {
          console.warn('[PpdbBilling] Gagal mutasi kantong dana refund:', fbErr.message);
        }
      }

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'PROCESS_PPDB_REFUND',
        entityType: 'ppdb_registration_bill',
        entityId: bill.id,
        dataBefore: bill,
        dataAfter: { netRefund, deductionPercentage, status: 'refunded' }
      });

      return {
        message: `Refund tagihan PPDB #${bill.id} berhasil dicairkan sebesar Rp ${netRefund.toLocaleString('id-ID')} (Potongan ${deductionPercentage}%)`,
        net_refund_amount: netRefund,
        deduction_percentage: deductionPercentage,
        status: 'refunded'
      };
    });
  }

  // ============================================================
  // CRUD KONFIGURASI KEBIJAKAN REFUND (ppdb_refund_policy_rules)
  // ============================================================

  async listRefundPolicyRules(schoolUnitId) {
    return db('ppdb_refund_policy_rules')
      .where({ school_unit_id: schoolUnitId })
      .orderBy('fee_component', 'asc')
      .orderBy('cutoff_date', 'asc');
  }

  async createRefundPolicyRule(schoolUnitId, data) {
    const [id] = await db('ppdb_refund_policy_rules').insert({
      school_unit_id: schoolUnitId,
      fee_component: data.fee_component || 'enrollment_fee',
      is_refundable: Boolean(data.is_refundable),
      cutoff_date: data.cutoff_date || null,
      deduction_percentage: parseFloat(data.deduction_percentage || 0),
      description: data.description || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
    });
    return db('ppdb_refund_policy_rules').where({ id }).first();
  }

  async updateRefundPolicyRule(id, data) {
    await db('ppdb_refund_policy_rules')
      .where({ id })
      .update({
        fee_component: data.fee_component,
        is_refundable: data.is_refundable !== undefined ? Boolean(data.is_refundable) : undefined,
        cutoff_date: data.cutoff_date || null,
        deduction_percentage: data.deduction_percentage !== undefined ? parseFloat(data.deduction_percentage) : undefined,
        description: data.description,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : undefined,
        updated_at: db.fn.now()
      });
    return db('ppdb_refund_policy_rules').where({ id }).first();
  }

  async deleteRefundPolicyRule(id) {
    await db('ppdb_refund_policy_rules').where({ id }).del();
    return { message: 'Aturan kebijakan refund berhasil dihapus' };
  }

  // ============================================================
  // CRUD KONFIGURASI KUOTA BEASISWA (ppdb_scholarship_quotas)
  // ============================================================

  async listScholarshipQuotas(schoolUnitId, academicYearId = null) {
    let q = db('ppdb_scholarship_quotas').where({ school_unit_id: schoolUnitId });
    if (academicYearId) {
      q = q.where('academic_year_id', Number(academicYearId));
    }
    return q.orderBy('id', 'asc');
  }

  async createScholarshipQuota(schoolUnitId, data) {
    const [id] = await db('ppdb_scholarship_quotas').insert({
      school_unit_id: schoolUnitId,
      academic_year_id: Number(data.academic_year_id || 2),
      quota_category: data.quota_category,
      max_quota: Number(data.max_quota || 5),
      used_quota: 0,
      description: data.description || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
    });
    return db('ppdb_scholarship_quotas').where({ id }).first();
  }

  async updateScholarshipQuota(id, data) {
    await db('ppdb_scholarship_quotas')
      .where({ id })
      .update({
        quota_category: data.quota_category,
        max_quota: data.max_quota !== undefined ? Number(data.max_quota) : undefined,
        description: data.description,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : undefined,
        updated_at: db.fn.now()
      });
    return db('ppdb_scholarship_quotas').where({ id }).first();
  }

  async deleteScholarshipQuota(id) {
    await db('ppdb_scholarship_quotas').where({ id }).del();
    return { message: 'Kategori kuota beasiswa berhasil dihapus' };
  }

  async checkScholarshipQuotaRemaining(schoolUnitId, quotaId) {
    const quota = await db('ppdb_scholarship_quotas')
      .where({ id: quotaId, school_unit_id: schoolUnitId })
      .first();

    if (!quota) return { available: false, remaining: 0 };
    const remaining = Math.max(0, quota.max_quota - quota.used_quota);
    return {
      id: quota.id,
      quota_category: quota.quota_category,
      max_quota: quota.max_quota,
      used_quota: quota.used_quota,
      remaining,
      available: remaining > 0 && Boolean(quota.is_active)
    };
  }

  // ============================================================
  // BAGIAN 5: PEMBAYARAN, BUKTI TRANSFER & PLACEMENT HOOK
  // ============================================================

  /**
   * Record payment for PPDB registration bill
   */
  async recordRegistrationPayment(schoolUnitId, billId, data, userId = null) {
    const cashAccountId = Number(data.cash_account_id);
    const amountPaid = parseFloat(data.amount_paid || 0);

    if (!cashAccountId || isNaN(amountPaid) || amountPaid <= 0) {
      const err = new Error('Rekening kas/bank penerima dan nominal pembayaran valid wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    return db.transaction(async (trx) => {
      const bill = await trx('ppdb_registration_bills')
        .where({ id: billId, school_unit_id: schoolUnitId })
        .first();

      if (!bill) {
        const err = new Error('Tagihan PPDB tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }

      if (bill.status === 'paid') {
        const err = new Error('Tagihan PPDB ini sudah lunas');
        err.statusCode = 409;
        throw err;
      }

      if (bill.status === 'cancelled' || bill.status === 'refunded') {
        const err = new Error(`Tagihan PPDB ini berstatus ${bill.status} dan tidak dapat menerima pembayaran`);
        err.statusCode = 422;
        throw err;
      }

      const cashAccount = await trx('cash_accounts').where({ id: cashAccountId }).first();
      if (!cashAccount) {
        const err = new Error('Rekening kas/bank penerima tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }

      const feeType = await trx('fee_types').where({ id: bill.fee_type_id }).first();

      // Generate Kwitansi PPDB
      const rawDate = data.payment_date instanceof Date
        ? data.payment_date.toISOString().slice(0, 10)
        : String(data.payment_date || new Date().toISOString().slice(0, 10));
      const dateStr = rawDate.replace(/-/g, '').slice(0, 8);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const receiptNumber = `KWT-PPDB-${dateStr}-${randomSuffix}`;

      // Insert Pembayaran
      const [paymentId] = await trx('ppdb_registration_payments').insert({
        ppdb_registration_bill_id: bill.id,
        cash_account_id: cashAccountId,
        receipt_number: receiptNumber,
        amount_paid: amountPaid,
        payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
        payment_method: data.payment_method || 'cash',
        notes: data.notes || `Pembayaran PPDB ${bill.registrant_name_snapshot}`,
        created_by: userId
      });

      const actualPaymentId = paymentId || (await trx('ppdb_registration_payments')
        .where({ ppdb_registration_bill_id: bill.id })
        .orderBy('id', 'desc')
        .first()).id;

      // Update paid_amount dan status
      const newPaidTotal = parseFloat(bill.paid_amount || 0) + amountPaid;
      const isLunas = newPaidTotal >= parseFloat(bill.amount);
      const newStatus = isLunas ? 'paid' : 'partially_paid';

      await trx('ppdb_registration_bills')
        .where({ id: bill.id })
        .update({
          paid_amount: newPaidTotal,
          status: newStatus,
          updated_at: trx.fn.now()
        });

      // Sinkronisasikan ke student_bills jika ada
      try {
        await crossModuleServices.syncPpdbBillToStudentBill(bill.id, trx);
      } catch (sErr) {
        console.warn('[recordRegistrationPayment] syncPpdbBillToStudentBill warning:', sErr.message);
      }

      // Jurnal Otomatis (ppdb_registration_income) Kas vs Piutang (atau Pendapatan jika cash basis)
      try {
        await recordJournal({
          schoolUnitId,
          transactionCode: 'ppdb_registration_income',
          amount: amountPaid,
          sourceType: 'ppdb_registration_payment',
          sourceId: actualPaymentId,
          description: `Penerimaan Pembayaran PPDB: ${bill.registrant_name_snapshot} (${receiptNumber})`,
          journalDate: data.payment_date || new Date(),
          overrideDebitAccountId: cashAccount.chart_of_account_id || null, // Kas bertambah
          overrideCreditAccountId: 199, // Piutang berkurang
          overrideCashAccountId: cashAccountId,
          userId,
          trx
        });
      } catch (journalErr) {
        console.warn('Auto journal for PPDB payment skipped or error:', journalErr.message);
      }

      // Mutasi Kantong Dana
      try {
        await fundBalanceEngine.applyFundMutation({
          schoolUnitId,
          fundType: 'fee_type',
          fundRefId: bill.fee_type_id,
          academicYearId: Number(bill.target_academic_year_id || 2),
          direction: 'in',
          amount: amountPaid,
          sourceTable: 'ppdb_registration_payments',
          sourceId: actualPaymentId,
          notes: `Penerimaan PPDB ${bill.registrant_name_snapshot} (${receiptNumber})`,
          userId,
          trx
        });
      } catch (fbErr) {
        console.warn('Fund balance mutation for PPDB payment skipped or error:', fbErr.message);
      }

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'PAY_PPDB_REGISTRATION_BILL',
        entityType: 'ppdb_registration_bill',
        entityId: bill.id,
        dataBefore: bill,
        dataAfter: { ...bill, status: newStatus, paid_amount: newPaidTotal, payment_id: actualPaymentId, receipt_number: receiptNumber }
      });

      const paymentRecord = await trx('ppdb_registration_payments').where({ id: actualPaymentId }).first();

      return {
        bill: { ...bill, status: newStatus, paid_amount: newPaidTotal },
        payment: paymentRecord,
        receipt_number: receiptNumber
      };
    });
  }

  /**
   * Link official student_id to PPDB registration bill upon placement (Delegates to crossModuleServices.onStudentPlaced)
   */
  async linkStudentAfterPlacement(psbRegistrantRefId, studentId) {
    return crossModuleServices.onStudentPlaced(psbRegistrantRefId, studentId);
  }

  /**
   * Cancel PPDB registration bill
   */
  async cancelRegistrationBill(schoolUnitId, billId, reason = null, userId = null) {
    const bill = await db('ppdb_registration_bills')
      .where({ id: billId, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan pendaftaran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status === 'paid' || parseFloat(bill.paid_amount || 0) > 0) {
      const err = new Error('Tagihan yang sudah memiliki transaksi pembayaran tidak dapat dibatalkan langsung. Silakan ajukan proses refund.');
      err.statusCode = 422;
      throw err;
    }

    await db('ppdb_registration_bills')
      .where({ id: billId })
      .update({
        status: 'cancelled',
        notes: reason ? `${bill.notes || ''} [Dibatalkan: ${reason}]`.trim() : bill.notes,
        updated_at: db.fn.now()
      });

    // Batalkan juga di student_bills jika sudah tertaut
    if (bill.linked_student_id) {
      await db('student_bills')
        .where({ student_id: bill.linked_student_id, fee_type_id: bill.fee_type_id })
        .whereNot('status', 'cancelled')
        .update({
          status: 'cancelled',
          edit_reason: reason ? `[Dibatalkan dari PPDB]: ${reason}` : 'Dibatalkan dari modul PPDB',
          updated_at: db.fn.now()
        });
    }

    return { message: 'Tagihan pendaftaran berhasil dibatalkan' };
  }

  /**
   * Create Registration Bill automatically from Public Website intake
   */
  async createRegistrationBillFromPublic(data) {
    const schoolUnitId = Number(data.school_unit_id) || 1;
    const psbRegistrantRefId = Number(data.psb_registrant_ref_id);

    const existing = await db('ppdb_registration_bills')
      .where({
        school_unit_id: schoolUnitId,
        psb_registrant_ref_id: psbRegistrantRefId,
        billing_phase: 'registration_fee'
      })
      .whereNot('status', 'cancelled')
      .first();

    if (existing) {
      return existing;
    }

    let pendaftaranFee = await db('fee_types')
      .where(b => b.where('school_unit_id', schoolUnitId).orWhere('school_unit_id', 0).orWhereNull('school_unit_id'))
      .where('name', 'like', '%Pendaftaran%')
      .first();

    const feeTypeId = pendaftaranFee ? pendaftaranFee.id : 2;
    const amount = pendaftaranFee && pendaftaranFee.default_amount ? parseFloat(pendaftaranFee.default_amount) : 350000;

    // Intake publik dibuat langsung sebagai unpaid agar calon murid di web langsung dapat bayar
    const [newId] = await db('ppdb_registration_bills').insert({
      school_unit_id: schoolUnitId,
      academic_year_id: Number(data.academic_year_id || 1),
      target_academic_year_id: Number(data.target_academic_year_id || 2),
      psb_registrant_ref_id: psbRegistrantRefId,
      registrant_name_snapshot: data.full_name || 'Calon Santri Baru',
      registration_number_snapshot: data.registration_number || null,
      fee_type_id: feeTypeId,
      amount,
      paid_amount: 0.00,
      version: 1,
      billing_phase: 'registration_fee',
      status: 'unpaid',
      notes: 'Otomatisasi asupan pendaftaran online website'
    });

    return db('ppdb_registration_bills').where({ id: newId }).first();
  }

  /**
   * List transfer proofs for PPDB registration fees
   */
  async listTransferProofs(schoolUnitId, filters = {}) {
    let query = db('ppdb_registration_bill_proofs as prbp')
      .join('ppdb_registration_bills as prb', 'prbp.ppdb_registration_bill_id', 'prb.id')
      .leftJoin('fee_types as ft', 'prb.fee_type_id', 'ft.id')
      .leftJoin('cash_accounts as ca', 'prbp.verified_cash_account_id', 'ca.id')
      .where('prb.school_unit_id', schoolUnitId);

    if (filters.status && filters.status !== 'all') {
      query = query.where('prbp.status', filters.status);
    }
    if (filters.target_academic_year_id) {
      query = query.where('prb.target_academic_year_id', Number(filters.target_academic_year_id));
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      query = query.where(b => {
        b.where('prb.registrant_name_snapshot', 'like', term)
          .orWhere('prb.registration_number_snapshot', 'like', term)
          .orWhere('prbp.bank_sender_name', 'like', term);
      });
    }

    const proofs = await query
      .select(
        'prbp.*',
        'prb.target_academic_year_id',
        'prb.academic_year_id',
        'prb.registrant_name_snapshot',
        'prb.registration_number_snapshot',
        'prb.amount as bill_amount',
        'prb.paid_amount as bill_paid_amount',
        'prb.billing_phase',
        'prb.status as bill_status',
        'ft.name as fee_type_name',
        'ca.name as cash_account_name'
      )
      .orderBy('prbp.submitted_at', 'asc');

    const allProofs = await db('ppdb_registration_bill_proofs as prbp')
      .join('ppdb_registration_bills as prb', 'prbp.ppdb_registration_bill_id', 'prb.id')
      .where('prb.school_unit_id', schoolUnitId);

    const pendingCount = allProofs.filter(p => p.status === 'pending').length;
    const verifiedCount = allProofs.filter(p => p.status === 'verified').length;
    const rejectedCount = allProofs.filter(p => p.status === 'rejected').length;

    return {
      summary: {
        total_proofs: allProofs.length,
        pending_count: pendingCount,
        verified_count: verifiedCount,
        rejected_count: rejectedCount
      },
      proofs
    };
  }

  /**
   * Submit transfer proof for PPDB bill
   */
  async submitTransferProof(data) {
    const billId = Number(data.ppdb_registration_bill_id);
    const amount = parseFloat(data.amount || 0);

    const bill = await db('ppdb_registration_bills').where({ id: billId }).first();
    if (!bill) {
      const err = new Error('Tagihan PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status === 'paid') {
      const err = new Error('Tagihan PPDB ini sudah berstatus lunas');
      err.statusCode = 409;
      throw err;
    }

    const [proofId] = await db('ppdb_registration_bill_proofs').insert({
      ppdb_registration_bill_id: bill.id,
      amount: amount > 0 ? amount : bill.amount,
      bank_sender_name: data.bank_sender_name || null,
      bank_sender_account: data.bank_sender_account || null,
      bank_destination: data.bank_destination || null,
      transfer_date: data.transfer_date || new Date().toISOString().slice(0, 10),
      proof_file_url: data.proof_file_url || null,
      notes: data.notes || null,
      status: 'pending'
    });

    return db('ppdb_registration_bill_proofs').where({ id: proofId }).first();
  }

  /**
   * Verify transfer proof (Kas masuk tercatat & kwitansi diterbitkan)
   */
  async verifyTransferProof(schoolUnitId, proofId, data, userId = null) {
    const cashAccountId = Number(data.cash_account_id);
    if (!cashAccountId) {
      const err = new Error('Rekening kas/bank penerima wajib dipilih saat verifikasi bukti bayar');
      err.statusCode = 422;
      throw err;
    }

    const proof = await db('ppdb_registration_bill_proofs as prbp')
      .join('ppdb_registration_bills as prb', 'prbp.ppdb_registration_bill_id', 'prb.id')
      .where('prbp.id', proofId)
      .andWhere('prb.school_unit_id', schoolUnitId)
      .select('prbp.*', 'prb.school_unit_id', 'prb.registrant_name_snapshot')
      .first();

    if (!proof) {
      const err = new Error('Bukti transfer tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (proof.status === 'verified') {
      const err = new Error('Bukti transfer ini sudah pernah diverifikasi');
      err.statusCode = 409;
      throw err;
    }

    // Catat pembayaran kas via recordRegistrationPayment
    const paymentResult = await this.recordRegistrationPayment(
      schoolUnitId,
      proof.ppdb_registration_bill_id,
      {
        cash_account_id: cashAccountId,
        amount_paid: proof.amount,
        payment_date: proof.transfer_date,
        payment_method: 'bank_transfer',
        notes: `Verifikasi Transfer PPDB #${proof.id} (${proof.bank_sender_name || 'Bank'})`
      },
      userId
    );

    // Update status bukti transfer
    await db('ppdb_registration_bill_proofs')
      .where({ id: proofId })
      .update({
        status: 'verified',
        verified_by: userId,
        verified_at: db.fn.now(),
        verified_cash_account_id: cashAccountId,
        verification_notes: data.verification_notes || 'Bukti bayar valid & saldo bank masuk',
        updated_at: db.fn.now()
      });

    return {
      message: `Bukti transfer berhasil diverifikasi. Kwitansi resmi #${paymentResult.receipt_number} telah diterbitkan.`,
      payment: paymentResult
    };
  }

  /**
   * Reject transfer proof
   */
  async rejectTransferProof(schoolUnitId, proofId, reason = null, userId = null) {
    const proof = await db('ppdb_registration_bill_proofs as prbp')
      .join('ppdb_registration_bills as prb', 'prbp.ppdb_registration_bill_id', 'prb.id')
      .where('prbp.id', proofId)
      .andWhere('prb.school_unit_id', schoolUnitId)
      .first();

    if (!proof) {
      const err = new Error('Bukti transfer tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('ppdb_registration_bill_proofs')
      .where({ id: proofId })
      .update({
        status: 'rejected',
        verified_by: userId,
        verified_at: db.fn.now(),
        verification_notes: reason || 'Bukti transfer tidak valid / mutasi rekening tidak ditemukan',
        updated_at: db.fn.now()
      });

    return { message: 'Bukti transfer berhasil ditolak' };
  }

  /**
   * Get bill proof status
   */
  async getBillProofStatus(billId) {
    const bill = await db('ppdb_registration_bills as prb')
      .leftJoin('fee_types as ft', 'prb.fee_type_id', 'ft.id')
      .where('prb.id', billId)
      .select('prb.*', 'ft.name as fee_type_name')
      .first();

    if (!bill) return null;

    const latestProof = await db('ppdb_registration_bill_proofs')
      .where({ ppdb_registration_bill_id: bill.id })
      .orderBy('submitted_at', 'desc')
      .first();

    const payment = await db('ppdb_registration_payments')
      .where({ ppdb_registration_bill_id: bill.id })
      .first();

    return {
      bill,
      proof: latestProof || null,
      payment: payment || null
    };
  }

  /**
   * Get registration bill receipt for PDF / Print view
   */
  async getRegistrationBillReceipt(schoolUnitId, billId) {
    const bill = await db('ppdb_registration_bills as prb')
      .join('fee_types as ft', 'prb.fee_type_id', 'ft.id')
      .where({ 'prb.id': billId, 'prb.school_unit_id': schoolUnitId })
      .select('prb.*', 'ft.name as fee_type_name')
      .first();

    if (!bill) {
      const err = new Error('Tagihan PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const payment = await db('ppdb_registration_payments as prp')
      .leftJoin('cash_accounts as ca', 'prp.cash_account_id', 'ca.id')
      .where({ 'prp.ppdb_registration_bill_id': bill.id })
      .select('prp.*', 'ca.name as cash_account_name', 'ca.account_number')
      .first();

    const unit = await crossModuleServices.getSchoolUnit(schoolUnitId);

    return {
      bill,
      payment: payment || null,
      school_unit: unit || { name: 'Pondok Pesantren Aldepos', address: 'Bogor, Jawa Barat' }
    };
  }

  /**
   * Get public bank accounts for transfer destination
   */
  async getPublicBankAccounts(schoolUnitId) {
    return db('cash_accounts')
      .where({ school_unit_id: schoolUnitId, is_active: 1 })
      .whereIn('type', ['bank', 'bank_utama'])
      .select('id', 'name', 'bank_name', 'account_number', 'account_holder');
  }

  // Alias methods for controller compatibility
  async listProofs(schoolUnitId, filters) {
    return this.listTransferProofs(schoolUnitId, filters);
  }

  async verifyRegistrationProof(schoolUnitId, proofId, data, userId) {
    return this.verifyTransferProof(schoolUnitId, proofId, data, userId);
  }

  async rejectRegistrationProof(schoolUnitId, proofId, reason, userId) {
    return this.rejectTransferProof(schoolUnitId, proofId, reason, userId);
  }

  async uploadPublicRegistrationProof(billId, data) {
    return this.submitTransferProof({ ...data, ppdb_registration_bill_id: billId });
  }

  async getPublicBillStatus(billId) {
    return this.getBillProofStatus(billId);
  }

  async getReceiptData(schoolUnitId, paymentId) {
    const payment = await db('ppdb_registration_payments').where({ id: paymentId }).first();
    if (!payment) return null;
    return this.getRegistrationBillReceipt(schoolUnitId, payment.ppdb_registration_bill_id);
  }

  // ============================================================
  // TAB 1: PENETAPAN BIAYA PPDB (FEE ASSIGNMENTS FOR TARGET AY)
  // ============================================================

  async getPpdbFeeAssignments(schoolUnitId, filters = {}) {
    const targetAyId = Number(filters.target_academic_year_id || filters.academic_year_id || 1);
    const search = (filters.search || '').trim();
    const status = filters.status || 'all'; // 'all', 'assigned', 'custom', 'unassigned'

    const matchingAyIds = await this.getMatchingAcademicYearIds(targetAyId);

    // 1. Ambil data kandidat calon santri baru & pindahan dari modul PSB untuk target_academic_year_id
    const registrants = await crossModuleServices.listPsbRegistrants(schoolUnitId, {
      target_academic_year_id: targetAyId,
      academic_year_id: targetAyId,
      search
    });

    // 2. Ambil master jenis biaya aktif
    let feeTypesQuery = db('fee_types').where('is_active', true);
    if (isUnit(schoolUnitId)) {
      feeTypesQuery = feeTypesQuery.where(b => {
        b.where('school_unit_id', Number(schoolUnitId)).orWhere('school_unit_id', 0).orWhereNull('school_unit_id');
      });
    }
    const feeTypesRaw = await feeTypesQuery.select('id', 'name', 'code', 'billing_pattern', 'school_unit_id');
    const feeTypes = [...feeTypesRaw].sort((a, b) => {
      const getRank = (f) => {
        const bp = (f.billing_pattern || '').toLowerCase();
        if (bp === 'incidental' || bp === 'one_time' || (bp !== 'monthly' && bp !== 'yearly')) return 1;
        if (bp === 'yearly') return 2;
        if (bp === 'monthly') return 3;
        return 4;
      };
      const rankDiff = getRank(a) - getRank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.id - b.id;
    });

    // 3. Ambil master skema biaya untuk target_academic_year_id
    let schemesQuery = db('fee_schemes');
    if (isUnit(schoolUnitId)) {
      schemesQuery = schemesQuery.where(b => {
        b.where('school_unit_id', Number(schoolUnitId)).orWhere('school_unit_id', 0).orWhereNull('school_unit_id');
      });
    }
    const schemesRaw = await schemesQuery
      .whereIn('academic_year_id', matchingAyIds)
      .select('id', 'code', 'name', 'academic_year_id', 'school_unit_id');

    const schemeIds = schemesRaw.map(s => s.id);
    const schemeItems = schemeIds.length > 0
      ? await db('fee_scheme_items')
          .join('fee_types', 'fee_scheme_items.fee_type_id', 'fee_types.id')
          .whereIn('fee_scheme_id', schemeIds)
          .select('fee_scheme_items.*', 'fee_types.name as fee_type_name', 'fee_types.billing_pattern')
      : [];

    const schemeItemsMap = {};
    schemeItems.forEach(it => {
      if (!schemeItemsMap[it.fee_scheme_id]) schemeItemsMap[it.fee_scheme_id] = [];
      schemeItemsMap[it.fee_scheme_id].push(it);
    });

    const schemes = schemesRaw.map(s => {
      const items = schemeItemsMap[s.id] || [];
      const totalAmount = items.reduce((acc, it) => acc + (it.value_type === 'fixed_amount' ? parseFloat(it.value || 0) : 0), 0);
      return {
        ...s,
        items,
        total_amount: totalAmount
      };
    });

    // 4. Ambil data penugasan skema yang sudah tersimpan
    const regIds = registrants.map(r => r.id);
    const studentIds = registrants.map(r => r.student_id).filter(Boolean);

    let asgQuery = db('student_fee_scheme_assignments')
      .leftJoin('fee_schemes', 'student_fee_scheme_assignments.fee_scheme_id', 'fee_schemes.id')
      .whereIn('student_fee_scheme_assignments.academic_year_id', matchingAyIds)
      .where(b => {
        b.whereIn('student_fee_scheme_assignments.student_id', [...regIds, ...studentIds]);
      });

    if (isUnit(schoolUnitId)) {
      asgQuery = asgQuery.where('student_fee_scheme_assignments.school_unit_id', Number(schoolUnitId));
    }

    const assignments = await asgQuery.select(
      'student_fee_scheme_assignments.*',
      'fee_schemes.code as scheme_code',
      'fee_schemes.name as scheme_name'
    );

    const asgMap = {};
    assignments.forEach(a => {
      asgMap[a.student_id] = a;
    });

    // 5. Ambil penyesuaian khusus (diskon / override)
    let adjQuery = db('student_fee_adjustments')
      .join('fee_types', 'student_fee_adjustments.fee_type_id', 'fee_types.id')
      .where(b => {
        b.whereIn('student_fee_adjustments.student_id', [...regIds, ...studentIds]);
      });

    if (isUnit(schoolUnitId)) {
      adjQuery = adjQuery.where('student_fee_adjustments.school_unit_id', Number(schoolUnitId));
    }

    const adjustments = await adjQuery.select('student_fee_adjustments.*', 'fee_types.name as fee_type_name');

    const adjMap = {};
    adjustments.forEach(adj => {
      if (!adjMap[adj.student_id]) adjMap[adj.student_id] = [];
      adjMap[adj.student_id].push(adj);
    });

    // 6. Rakit baris calon santri beserta fee_breakdown dinamis
    let candidatesList = registrants.map((r) => {
      const matchId = r.student_id || r.id;
      const asg = asgMap[matchId] || asgMap[r.id] || null;
      const adjList = adjMap[matchId] || adjMap[r.id] || [];
      const isCustom = Boolean(asg?.is_custom || adjList.length > 0);
      const isAssigned = Boolean(asg && (asg.fee_scheme_id || asg.is_custom));

      const items = asg?.fee_scheme_id ? (schemeItemsMap[asg.fee_scheme_id] || []) : [];

      // Susun breakdown per pos biaya
      const feeBreakdown = {};
      let totalAmount = 0;

      // 1. Isi dari skema biaya jika ada
      items.forEach(it => {
        const val = it.value_type === 'fixed_amount' ? parseFloat(it.value || 0) : 0;
        feeBreakdown[it.fee_type_id] = {
          fee_type_id: it.fee_type_id,
          fee_type_name: it.fee_type_name,
          final_amount: val,
          has_adjustment: false,
          adjustment_note: null
        };
        totalAmount += val;
      });

      // 2. Timpa dengan penyesuaian khusus jika ada
      if (adjList.length > 0) {
        adjList.forEach(adj => {
          const ftId = adj.fee_type_id;
          const currentVal = feeBreakdown[ftId] ? feeBreakdown[ftId].final_amount : 0;
          let finalVal = currentVal;
          let note = adj.waiver_type || 'Keringanan Khusus';

          if (adj.adjustment_kind === 'waiver') {
            const discPct = parseFloat(adj.waiver_percentage || 0);
            finalVal = Math.max(0, currentVal - (currentVal * discPct / 100));
            note = `Diskon ${discPct}% (${adj.waiver_type || 'Keringanan'})`;
          } else if (adj.adjustment_kind === 'custom_amount' || adj.adjustment_kind === 'override_amount') {
            finalVal = parseFloat(adj.override_amount || 0);
            note = adj.reason ? `Khusus: ${adj.reason}` : 'Nominal Khusus';
          }

          feeBreakdown[ftId] = {
            fee_type_id: ftId,
            fee_type_name: adj.fee_type_name || feeBreakdown[ftId]?.fee_type_name,
            final_amount: finalVal,
            has_adjustment: true,
            adjustment_note: note
          };
        });

        // Recalculate total amount from all breakdown items
        totalAmount = Object.values(feeBreakdown).reduce((acc, it) => acc + (parseFloat(it.final_amount) || 0), 0);
      }

      let assignmentStatus = 'unassigned';
      if (isCustom) assignmentStatus = 'custom';
      else if (isAssigned) assignmentStatus = 'assigned';

      const assignmentObj = asg ? {
        id: asg.id,
        fee_scheme_id: asg.fee_scheme_id || null,
        scheme_code: asg.scheme_code || null,
        scheme_name: asg.scheme_name || (isCustom ? 'Khusus (Custom)' : null),
        is_custom: isCustom,
        total_amount: totalAmount,
        fee_breakdown: feeBreakdown,
        assigned_at: asg.assigned_at || null,
        reason: asg.reason || null
      } : (isCustom ? {
        id: null,
        fee_scheme_id: null,
        scheme_code: null,
        scheme_name: 'Khusus (Custom)',
        is_custom: true,
        total_amount: totalAmount,
        fee_breakdown: feeBreakdown,
        assigned_at: null,
        reason: null
      } : null);

      return {
        candidate_id: r.id,
        student_id: r.student_id || r.id,
        student_name: r.full_name,
        full_name: r.full_name,
        nis: r.registration_number,
        registration_number: r.registration_number,
        psb_status: r.psb_status,
        entry_type: r.entry_type,
        entry_type_label: r.entry_type_label,
        process_name: r.process_name || 'Reguler',
        target_academic_year: r.target_academic_year,
        satuan_pendidikan_id: r.satuan_pendidikan_id,
        assignment: assignmentObj,
        fee_scheme_id: asg?.fee_scheme_id || null,
        scheme_code: asg?.scheme_code || null,
        scheme_name: asg?.scheme_name || null,
        is_custom: isCustom,
        assignment_status: assignmentStatus,
        assigned_at: asg?.assigned_at || null,
        total_amount: totalAmount,
        scheme_items: items,
        fee_breakdown: feeBreakdown,
        custom_adjustments: adjList,
        adjustments: adjList,
        reason: asg?.reason || null
      };
    });

    if (status !== 'all') {
      candidatesList = candidatesList.filter(c => c.assignment_status === status);
    }

    return {
      target_academic_year_id: targetAyId,
      total_candidates: registrants.length,
      assigned_count: candidatesList.filter(c => c.assignment_status === 'assigned').length,
      custom_count: candidatesList.filter(c => c.assignment_status === 'custom').length,
      unassigned_count: candidatesList.filter(c => c.assignment_status === 'unassigned').length,
      candidates: candidatesList,
      schemes,
      fee_types: feeTypes
    };
  }

  async assignPpdbFeeScheme(schoolUnitId, payload, userId = null) {
    const targetAyId = Number(payload.target_academic_year_id || payload.academic_year_id || 1);
    const candidateIds = payload.candidate_ids || (payload.candidate_id ? [payload.candidate_id] : []);
    const feeSchemeId = Number(payload.fee_scheme_id);
    const reason = payload.reason || 'Penetapan skema biaya calon santri PPDB';

    if (candidateIds.length === 0 || !feeSchemeId) {
      const err = new Error('Pilih minimal satu calon santri dan skema biaya yang valid');
      err.statusCode = 422;
      throw err;
    }

    const scheme = await db('fee_schemes').where({ id: feeSchemeId }).first();
    if (!scheme) {
      const err = new Error('Skema biaya tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const effectiveUnitId = isUnit(schoolUnitId) ? Number(schoolUnitId) : (scheme.school_unit_id || 1);
    const matchingAyIds = await this.getMatchingAcademicYearIds(targetAyId);

    let assignedCount = 0;
    await db.transaction(async (trx) => {
      for (const cId of candidateIds) {
        const idNum = Number(cId);
        let existingQuery = trx('student_fee_scheme_assignments')
          .where('student_id', idNum)
          .whereIn('academic_year_id', matchingAyIds);

        if (isUnit(schoolUnitId)) {
          existingQuery = existingQuery.where('school_unit_id', Number(schoolUnitId));
        }
        const existing = await existingQuery.first();

        let assignmentId = existing?.id;
        if (existing) {
          await trx('student_fee_scheme_assignments')
            .where({ id: existing.id })
            .update({
              fee_scheme_id: feeSchemeId,
              is_custom: false,
              assigned_by: userId,
              assigned_at: trx.fn.now(),
              reason: reason,
              updated_at: trx.fn.now()
            });
        } else {
          const [inserted] = await trx('student_fee_scheme_assignments').insert({
            school_unit_id: effectiveUnitId,
            student_id: idNum,
            academic_year_id: scheme.academic_year_id || targetAyId,
            fee_scheme_id: feeSchemeId,
            is_custom: false,
            assigned_by: userId,
            assigned_at: trx.fn.now(),
            reason: reason,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now()
          });
          assignmentId = inserted;
        }

        // Hapus custom adjustments jika ada
        let delQuery = trx('student_fee_adjustments').where('student_id', idNum);
        if (isUnit(schoolUnitId)) {
          delQuery = delQuery.where('school_unit_id', Number(schoolUnitId));
        }
        await delQuery.del();

        try {
          await logFinanceAudit({
            schoolUnitId: effectiveUnitId,
            userId,
            action: 'ASSIGN_PPDB_FEE_SCHEME',
            entityType: 'student_fee_scheme_assignment',
            entityId: assignmentId,
            dataBefore: existing || null,
            dataAfter: { student_id: idNum, fee_scheme_id: feeSchemeId, reason, academic_year_id: targetAyId }
          });
        } catch (aErr) {
          console.warn('[PpdbBillingService] Audit log warning:', aErr.message);
        }

        assignedCount++;
      }
    });

    return {
      success: true,
      assigned_count: assignedCount,
      message: `Berhasil menetapkan skema '${scheme.name}' untuk ${assignedCount} calon santri PPDB`
    };
  }

  async adjustPpdbCandidateFee(schoolUnitId, payload, userId = null) {
    const targetAyId = Number(payload.target_academic_year_id || payload.academic_year_id || 1);
    const candidateId = Number(payload.candidate_id || payload.student_id);
    const reason = payload.reason || 'Penyesuaian biaya khusus / manual PPDB';
    const customItems = payload.custom_items || []; // [{ fee_type_id, adjustment_kind, waiver_percentage, override_amount }]

    if (!candidateId) {
      const err = new Error('Calon santri wajib dipilih');
      err.statusCode = 422;
      throw err;
    }

    const effectiveUnitId = isUnit(schoolUnitId) ? Number(schoolUnitId) : 1;
    const matchingAyIds = await this.getMatchingAcademicYearIds(targetAyId);

    await db.transaction(async (trx) => {
      // 1. Dapatkan atau buat assignment terlebih dahulu
      let existingQuery = trx('student_fee_scheme_assignments')
        .where('student_id', candidateId)
        .whereIn('academic_year_id', matchingAyIds);

      if (isUnit(schoolUnitId)) {
        existingQuery = existingQuery.where('school_unit_id', Number(schoolUnitId));
      }
      const existing = await existingQuery.first();

      let assignmentId = existing?.id;
      if (existing) {
        await trx('student_fee_scheme_assignments')
          .where({ id: existing.id })
          .update({
            is_custom: true,
            reason: reason,
            assigned_by: userId,
            assigned_at: trx.fn.now(),
            updated_at: trx.fn.now()
          });
      } else {
        const [inserted] = await trx('student_fee_scheme_assignments').insert({
          school_unit_id: effectiveUnitId,
          student_id: candidateId,
          academic_year_id: targetAyId,
          fee_scheme_id: null,
          is_custom: true,
          reason: reason,
          assigned_by: userId,
          assigned_at: trx.fn.now(),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });
        assignmentId = inserted;
      }

      // 2. Hapus penyesuaian lama
      let delQuery = trx('student_fee_adjustments').where('student_id', candidateId);
      if (isUnit(schoolUnitId)) {
        delQuery = delQuery.where('school_unit_id', Number(schoolUnitId));
      }
      await delQuery.del();

      // 3. Masukkan penyesuaian baru sesuai skema tabel student_fee_adjustments
      for (const item of customItems) {
        await trx('student_fee_adjustments').insert({
          school_unit_id: effectiveUnitId,
          student_id: candidateId,
          assignment_id: assignmentId,
          fee_type_id: Number(item.fee_type_id),
          adjustment_kind: item.adjustment_kind || 'override_amount', // 'waiver' | 'custom_amount' | 'override_amount'
          waiver_type: item.waiver_type || 'Penetapan Khusus PPDB',
          waiver_percentage: item.waiver_percentage ? parseFloat(item.waiver_percentage) : null,
          override_amount: item.override_amount !== undefined && item.override_amount !== null && item.override_amount !== '' ? parseFloat(item.override_amount) : 0,
          reason: reason,
          status: 'approved',
          approved_by: userId,
          approved_at: trx.fn.now(),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });
      }

      try {
        await logFinanceAudit({
          schoolUnitId: effectiveUnitId,
          userId,
          action: 'CUSTOMIZE_PPDB_FEE',
          entityType: 'student_fee_scheme_assignment',
          entityId: assignmentId,
          dataBefore: existing || null,
          dataAfter: { student_id: candidateId, is_custom: true, reason, custom_items: customItems }
        });
      } catch (aErr) {
        console.warn('[PpdbBillingService] Audit log warning:', aErr.message);
      }
    });

    return {
      success: true,
      message: `Penetapan biaya khusus calon santri #${candidateId} berhasil disimpan`
    };
  }

  // ============================================================
  // TAB 2: MATRIKS PENAGIHAN PPDB (BILLS MATRIX FOR TARGET AY)
  // ============================================================

  async getPpdbBillsMatrix(schoolUnitId, filters = {}) {
    const targetAyId = Number(filters.target_academic_year_id || filters.academic_year_id || 1);
    const search = (filters.search || '').trim();

    const matchingAyIds = await this.getMatchingAcademicYearIds(targetAyId);

    // 1. Ambil data calon santri baru & pindahan untuk target academic year ini
    const registrants = await crossModuleServices.listPsbRegistrants(schoolUnitId, {
      target_academic_year_id: targetAyId,
      academic_year_id: targetAyId,
      search
    });

    // 2. Ambil master jenis biaya aktif
    let ftQuery = db('fee_types').where('is_active', true);
    if (isUnit(schoolUnitId)) {
      ftQuery = ftQuery.where(b => {
        b.where('school_unit_id', Number(schoolUnitId)).orWhere('school_unit_id', 0).orWhereNull('school_unit_id');
      });
    }

    const feeTypesRaw = await ftQuery
      .select('id', 'name', 'code', 'billing_pattern', 'is_system');

    const feeTypes = [...feeTypesRaw].sort((a, b) => {
      const getRank = (f) => {
        const bp = (f.billing_pattern || '').toLowerCase();
        if (bp === 'incidental' || bp === 'one_time' || (bp !== 'monthly' && bp !== 'yearly')) return 1;
        if (bp === 'yearly') return 2;
        if (bp === 'monthly') return 3;
        return 4;
      };
      const rankDiff = getRank(a) - getRank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.id - b.id;
    });

    // Kolom Matriks PPDB (Sama seperti Bills tanpa pembagian fase buatan)
    const columns = feeTypes.map(ft => {
      let badge_text = 'Sekali Bayar';
      let badge_color = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      if (ft.billing_pattern === 'monthly') {
        badge_text = 'Bulanan';
        badge_color = 'bg-amber-50 text-amber-700 border-amber-200';
      } else if (ft.billing_pattern === 'yearly') {
        badge_text = 'Tahunan';
        badge_color = 'bg-purple-50 text-purple-700 border-purple-200';
      }

      return {
        key: `fee_${ft.id}`,
        fee_type_id: ft.id,
        fee_type_name: ft.name,
        fee_type_code: ft.code,
        billing_pattern: ft.billing_pattern,
        label: ft.name,
        badge_text: badge_text,
        badge_color: badge_color
      };
    });

    // 3. Ambil data penetapan biaya calon santri untuk nilai acuan/baseline
    let candidateAssignments = { candidates: [] };
    try {
      candidateAssignments = await this.getPpdbFeeAssignments(schoolUnitId, { target_academic_year_id: targetAyId });
    } catch (e) {
      console.warn('[PpdbBillingService] Warning getPpdbFeeAssignments in matrix:', e.message);
    }
    const candidatesMap = {};
    (candidateAssignments.candidates || []).forEach(c => {
      candidatesMap[c.candidate_id || c.student_id] = c;
    });

    // 4. Ambil seluruh tagihan PPDB untuk target_academic_year_id ini
    const regIds = registrants.map(r => r.id);
    let billsQuery = db('ppdb_registration_bills');
    if (isUnit(schoolUnitId)) {
      billsQuery = billsQuery.where('school_unit_id', Number(schoolUnitId));
    }

    const bills = await billsQuery
      .where(b => {
        b.whereIn('target_academic_year_id', matchingAyIds)
          .orWhereIn('academic_year_id', matchingAyIds)
          .orWhereIn('psb_registrant_ref_id', regIds);
      })
      .whereNot('status', 'cancelled');

    const billsMap = {};
    bills.forEach(b => {
      const k = `${b.psb_registrant_ref_id}_${b.fee_type_id}`;
      billsMap[k] = b;
    });

    // 5. Bangun baris matriks
    let totalBilled = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    const rows = registrants.map(r => {
      const candData = candidatesMap[r.id] || candidatesMap[r.student_id] || {};
      const feeBreakdown = candData.fee_breakdown || candData.assignment?.fee_breakdown || {};
      const cells = {};

      columns.forEach(col => {
        const bill = billsMap[`${r.id}_${col.fee_type_id}`] || billsMap[`${r.student_id}_${col.fee_type_id}`] || null;
        const assignedVal = feeBreakdown[col.fee_type_id]?.final_amount || 0;
        const bAmt = bill ? parseFloat(bill.amount || 0) : assignedVal;
        const bPaid = bill ? parseFloat(bill.paid_amount || 0) : 0;
        const isPaid = bill && (bill.status === 'paid' || (bAmt > 0 && bPaid >= bAmt));
        const isPartiallyPaid = bill && (bill.status === 'partially_paid' || (bPaid > 0 && bPaid < bAmt));
        const isDraft = bill && bill.status === 'draft';
        const isPublished = bill && !isDraft;
        const isOverdue = bill && bill.due_date && new Date(bill.due_date) < new Date() && !isPaid;

        if (bill) {
          totalBilled += bAmt;
          totalPaid += bPaid;
          if (bill.status === 'unpaid' || bill.status === 'partially_paid') {
            totalUnpaid += Math.max(0, bAmt - bPaid);
          }
        }

        cells[col.key] = {
          key: col.key,
          fee_type_id: col.fee_type_id,
          fee_type_name: col.label,
          bill_id: bill ? bill.id : null,
          bill_date: formatDateOnly(bill?.bill_date),
          due_date: formatDateOnly(bill?.due_date),
          status: bill ? bill.status : 'not_published',
          is_published: isPublished,
          is_draft: isDraft,
          is_paid: isPaid,
          is_partially_paid: isPartiallyPaid,
          is_overdue: isOverdue,
          base_amount: assignedVal,
          amount: bAmt,
          paid_amount: bPaid,
          has_discount: bill ? Boolean(bill.discount_amount > 0) : false,
          discount_amount: bill ? parseFloat(bill.discount_amount || 0) : 0,
          discount_reason: bill?.discount_reason || null,
          notes: bill?.notes || null
        };
      });

      return {
        candidate_id: r.id,
        student_id: r.student_id || r.id,
        registration_number: r.registration_number,
        nis: r.registration_number,
        full_name: r.full_name,
        psb_status: r.psb_status,
        scheme_name: candData.scheme_name || candData.assignment?.scheme_name || null,
        process_name: r.process_name || 'Reguler',
        satuan_pendidikan_id: r.satuan_pendidikan_id,
        cells
      };
    });

    return {
      target_academic_year_id: targetAyId,
      columns,
      rows,
      summary: {
        total_students: registrants.length,
        total_candidates: registrants.length,
        total_published_bills: bills.filter(b => b.status !== 'draft').length,
        total_billed: totalBilled,
        total_paid: totalPaid,
        total_unpaid_ar: totalUnpaid,
        total_unpaid: totalUnpaid
      }
    };
  }

  // ============================================================
  // TAB 4: PENGELUARAN PROGRAM PPDB (EXPENSES FOR TARGET AY)
  // ============================================================

  async listPpdbExpenses(schoolUnitId, filters = {}) {
    const targetAyId = Number(filters.target_academic_year_id || filters.academic_year_id || 1);
    const matchingAyIds = await this.getMatchingAcademicYearIds(targetAyId);

    let query = db('expenses')
      .leftJoin('cash_accounts', 'expenses.source_cash_account_id', 'cash_accounts.id')
      .whereNull('expenses.deleted_at')
      .where(b => {
        b.whereIn('expenses.academic_year_id', matchingAyIds)
          .orWhere('expenses.notes', 'like', '%PPDB%')
          .orWhere('expenses.notes', 'like', '%PSB%')
          .orWhere('expenses.notes', 'like', '%Penerimaan Santri Baru%');
      });

    if (isUnit(schoolUnitId)) {
      query = query.where('expenses.school_unit_id', Number(schoolUnitId));
    }

    const expensesList = await query
      .select(
        'expenses.*',
        'cash_accounts.name as cash_account_name'
      )
      .orderBy('expenses.expense_date', 'desc');

    const totalExpense = expensesList.reduce((acc, ex) => acc + parseFloat(ex.amount || 0), 0);

    return {
      target_academic_year_id: targetAyId,
      total_expenses_amount: totalExpense,
      total_count: expensesList.length,
      expenses: expensesList
    };
  }

  async createPpdbExpense(schoolUnitId, data, userId = null) {
    const targetAyId = Number(data.target_academic_year_id || 1);
    const currentAyId = Number(data.academic_year_id || 3); // 2024/2025 default
    const amount = parseFloat(data.amount || 0);
    const expenseDate = data.expense_date || new Date().toISOString().slice(0, 10);
    const cashAccountId = Number(data.cash_account_id || 1);
    const notes = data.notes || data.description || 'Pengeluaran Operasional Program PPDB';
    const categoryName = data.category_name || 'Operasional PPDB';

    if (!amount || amount <= 0) {
      const err = new Error('Nominal pengeluaran PPDB harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    return db.transaction(async (trx) => {
      const [id] = await trx('expenses').insert({
        school_unit_id: schoolUnitId,
        academic_year_id: targetAyId, // Dialokasikan ke Tahun Ajaran Sasaran PPDB
        source_cash_account_id: cashAccountId,
        amount: amount,
        expense_date: expenseDate,
        is_outside_budget: 1,
        fund_source_type: 'opening_pool',
        notes: `[Program PPDB TA ${targetAyId}] ${notes}`,
        created_by: userId,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });

      const expenseId = id || (await trx('expenses').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

      // Jurnal Pengeluaran Kas PPDB
      try {
        await recordJournal({
          schoolUnitId,
          transactionCode: 'ppdb_expense_issued',
          amount: amount,
          sourceType: 'ppdb_expense',
          sourceId: expenseId,
          description: `Pengeluaran Operasional PPDB: ${notes}`,
          journalDate: expenseDate,
          userId,
          trx
        });
      } catch (jErr) {
        console.warn('[PpdbBillingService] recordJournal expense notice:', jErr.message);
      }

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CREATE_PPDB_EXPENSE',
        entityType: 'expense',
        entityId: expenseId,
        dataBefore: null,
        dataAfter: { id: expenseId, amount, target_academic_year_id: targetAyId, notes }
      });

      return await trx('expenses').where({ id: expenseId }).first();
    });
  }

  async deletePpdbExpense(schoolUnitId, id, userId = null) {
    const expense = await db('expenses')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!expense) {
      const err = new Error('Pengeluaran PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('expenses')
      .where({ id })
      .update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'DELETE_PPDB_EXPENSE',
      entityType: 'expense',
      entityId: id,
      dataBefore: expense,
      dataAfter: null
    });

    return { message: 'Pengeluaran PPDB berhasil dibatalkan / dihapus' };
  }
  // ============================================================
  // TAB 5: KARTU BAYAR PPDB (REKAP GABUNGAN & LEDGER INDIVIDUAL)
  // ============================================================

  async getPpdbLedgerRecap(schoolUnitId, filters = {}) {
    const targetAyId = Number(filters.target_academic_year_id || 1);
    const search = filters.search ? filters.search.trim().toLowerCase() : '';
    const statusFilter = filters.payment_status || 'all'; // 'all', 'paid', 'partial', 'unpaid', 'no_bills'

    const matchingAyIds = await this.getMatchingAcademicYearIds(targetAyId);

    // 1. Ambil pendaftar dari PSB dan Siswa Terkait
    const rawRegistrants = await crossModuleServices.listPsbRegistrants(schoolUnitId, {
      academic_year_id: targetAyId,
      target_academic_year_id: targetAyId
    });

    // 2. Ambil seluruh skema biaya yang ditetapkan untuk calon santri pada TA sasaran ini
    let asgQuery = db('student_fee_scheme_assignments')
      .leftJoin('fee_schemes', 'student_fee_scheme_assignments.fee_scheme_id', 'fee_schemes.id')
      .whereIn('student_fee_scheme_assignments.academic_year_id', matchingAyIds);

    if (isUnit(schoolUnitId)) {
      asgQuery = asgQuery.where('student_fee_scheme_assignments.school_unit_id', Number(schoolUnitId));
    }

    const assignments = await asgQuery.select(
      'student_fee_scheme_assignments.student_id',
      'fee_schemes.id as fee_scheme_id',
      'fee_schemes.name as fee_scheme_name'
    );

    const schemeTotalsMap = {};
    if (assignments.length > 0) {
      const allSchemeIds = [...new Set(assignments.map(a => a.fee_scheme_id).filter(Boolean))];
      if (allSchemeIds.length > 0) {
        const allItems = await db('fee_scheme_items').whereIn('fee_scheme_id', allSchemeIds);
        allItems.forEach(it => {
          if (it.value_type === 'fixed_amount') {
            schemeTotalsMap[it.fee_scheme_id] = (schemeTotalsMap[it.fee_scheme_id] || 0) + parseFloat(it.value || 0);
          }
        });
      }
    }

    const assignmentMap = {};
    assignments.forEach(a => {
      assignmentMap[a.student_id] = {
        ...a,
        scheme_total_amount: schemeTotalsMap[a.fee_scheme_id] || 0
      };
    });

    // 3. Ambil seluruh tagihan PPDB untuk TA sasaran
    let billsQuery = db('ppdb_registration_bills');
    if (isUnit(schoolUnitId)) {
      billsQuery = billsQuery.where('school_unit_id', Number(schoolUnitId));
    }

    const bills = await billsQuery
      .where(b => {
        b.whereIn('target_academic_year_id', matchingAyIds)
          .orWhereIn('academic_year_id', matchingAyIds);
      })
      .whereNot('status', 'cancelled');

    const billsByCandidate = {};
    bills.forEach(b => {
      const cId = b.psb_registrant_ref_id || b.linked_student_id;
      if (!billsByCandidate[cId]) billsByCandidate[cId] = [];
      billsByCandidate[cId].push(b);
    });

    // 4. Susun baris buku besar santri
    let totalAllBilled = 0;
    let totalAllPaid = 0;
    let totalAllRemaining = 0;
    let countPaid = 0;
    let countPartial = 0;
    let countUnpaid = 0;
    let countNoBills = 0;

    let candidateRows = rawRegistrants.map(r => {
      const cBills = billsByCandidate[r.id] || billsByCandidate[r.student_id] || [];
      const scheme = assignmentMap[r.student_id] || assignmentMap[r.id] || null;

      const totalBilled = cBills.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
      const totalPaid = cBills.reduce((acc, b) => acc + parseFloat(b.paid_amount || 0), 0);
      const totalDiscount = cBills.reduce((acc, b) => acc + parseFloat(b.discount_amount || 0), 0);
      const remaining = Math.max(0, totalBilled - totalPaid);

      let status = 'no_bills';
      let statusLabel = 'Belum Ada Tagihan';
      let statusBadge = 'bg-slate-100 text-slate-600 border-slate-200';

      if (totalBilled > 0) {
        if (remaining <= 0 && totalPaid >= totalBilled) {
          status = 'paid';
          statusLabel = 'Lunas';
          statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          countPaid++;
        } else if (totalPaid > 0 && remaining > 0) {
          status = 'partial';
          statusLabel = 'Sebagian / Cicilan';
          statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
          countPartial++;
        } else {
          status = 'unpaid';
          statusLabel = 'Belum Bayar';
          statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
          countUnpaid++;
        }
      } else {
        countNoBills++;
      }

      totalAllBilled += totalBilled;
      totalAllPaid += totalPaid;
      totalAllRemaining += remaining;

      return {
        candidate_id: r.id,
        student_id: r.student_id || r.id,
        registration_number: r.registration_number || `REG-${targetAyId}-${String(r.id).padStart(4, '0')}`,
        full_name: r.full_name || 'Calon Santri',
        phone: r.phone_number || r.phone || '-',
        process_name: r.process_name || 'Reguler',
        satuan_pendidikan_id: r.satuan_pendidikan_id,
        gender: r.gender === 'L' ? 'Laki-laki' : r.gender === 'P' ? 'Perempuan' : '-',
        scheme_name: scheme ? scheme.fee_scheme_name : 'Belum Ditetapkan',
        scheme_total_amount: scheme ? parseFloat(scheme.scheme_total_amount || 0) : 0,
        total_bills_count: cBills.length,
        total_billed: totalBilled,
        total_paid: totalPaid,
        total_discount: totalDiscount,
        remaining_amount: remaining,
        payment_status: status,
        payment_status_label: statusLabel,
        payment_status_badge: statusBadge
      };
    });

    // 5. Terapkan Filter
    if (statusFilter !== 'all') {
      candidateRows = candidateRows.filter(c => c.payment_status === statusFilter);
    }

    if (search) {
      candidateRows = candidateRows.filter(c =>
        c.full_name.toLowerCase().includes(search) ||
        c.registration_number.toLowerCase().includes(search) ||
        (c.phone && c.phone.toLowerCase().includes(search))
      );
    }

    const collectionRate = totalAllBilled > 0 ? ((totalAllPaid / totalAllBilled) * 100).toFixed(1) : 0;

    return {
      target_academic_year_id: targetAyId,
      summary: {
        total_candidates: rawRegistrants.length,
        total_billed: totalAllBilled,
        total_paid: totalAllPaid,
        total_remaining: totalAllRemaining,
        collection_rate_percent: parseFloat(collectionRate),
        count_paid: countPaid,
        count_partial: countPartial,
        count_unpaid: countUnpaid,
        count_no_bills: countNoBills
      },
      candidates: candidateRows
    };
  }

  async getPpdbStudentLedger(schoolUnitId, candidateId, query = {}) {
    const targetAyId = Number(query.target_academic_year_id || 1);
    const matchingAyIds = await this.getMatchingAcademicYearIds(targetAyId);

    // 1. Ambil pendaftar
    const registrants = await crossModuleServices.listPsbRegistrants(schoolUnitId, {
      academic_year_id: targetAyId,
      target_academic_year_id: targetAyId
    });

    const candidate = registrants.find(r => String(r.id) === String(candidateId) || String(r.student_id) === String(candidateId));

    if (!candidate) {
      const err = new Error('Data calon santri PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // 2. Ambil skema biaya
    let asgQuery = db('student_fee_scheme_assignments')
      .leftJoin('fee_schemes', 'student_fee_scheme_assignments.fee_scheme_id', 'fee_schemes.id')
      .whereIn('student_fee_scheme_assignments.academic_year_id', matchingAyIds)
      .where(b => {
        b.where('student_fee_scheme_assignments.student_id', candidate.id)
          .orWhere('student_fee_scheme_assignments.student_id', candidate.student_id || candidate.id);
      });

    if (isUnit(schoolUnitId)) {
      asgQuery = asgQuery.where('student_fee_scheme_assignments.school_unit_id', Number(schoolUnitId));
    }

    const assignment = await asgQuery.select(
      'student_fee_scheme_assignments.*',
      'fee_schemes.name as fee_scheme_name'
    ).first();

    let assignedSchemeAmount = 0;
    if (assignment?.fee_scheme_id) {
      const schemeItems = await db('fee_scheme_items').where('fee_scheme_id', assignment.fee_scheme_id);
      assignedSchemeAmount = schemeItems.reduce((acc, it) => acc + (it.value_type === 'fixed_amount' ? parseFloat(it.value || 0) : 0), 0);
    }

    // 3. Ambil rincian tagihan PPDB
    let billsQuery = db('ppdb_registration_bills')
      .leftJoin('fee_types', 'ppdb_registration_bills.fee_type_id', 'fee_types.id')
      .where(b => {
        b.where('ppdb_registration_bills.psb_registrant_ref_id', candidate.id)
          .orWhere('ppdb_registration_bills.linked_student_id', candidate.student_id || candidate.id);
      })
      .whereNot('ppdb_registration_bills.status', 'cancelled');

    if (isUnit(schoolUnitId)) {
      billsQuery = billsQuery.where('ppdb_registration_bills.school_unit_id', Number(schoolUnitId));
    }

    const bills = await billsQuery.select(
      'ppdb_registration_bills.*',
      'fee_types.name as fee_type_name'
    ).orderBy('ppdb_registration_bills.created_at', 'asc');

    // 4. Ambil histori transaksi pembayaran yang terhubung
    const billIds = bills.map(b => b.id);
    let payments = [];
    if (billIds.length > 0) {
      payments = await db('ppdb_registration_payments')
        .leftJoin('cash_accounts', 'ppdb_registration_payments.cash_account_id', 'cash_accounts.id')
        .leftJoin('ppdb_registration_bills', 'ppdb_registration_payments.ppdb_registration_bill_id', 'ppdb_registration_bills.id')
        .leftJoin('fee_types', 'ppdb_registration_bills.fee_type_id', 'fee_types.id')
        .whereIn('ppdb_registration_payments.ppdb_registration_bill_id', billIds)
        .select(
          'ppdb_registration_payments.*',
          'cash_accounts.name as cash_account_name',
          'fee_types.name as fee_type_name',
          'ppdb_registration_bills.billing_phase'
        )
        .orderBy('ppdb_registration_payments.payment_date', 'desc');
    }

    // 5. Hitung kalkulasi ledger
    const totalBilled = bills.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalPaid = bills.reduce((acc, b) => acc + parseFloat(b.paid_amount || 0), 0);
    const totalDiscount = bills.reduce((acc, b) => acc + parseFloat(b.discount_amount || 0), 0);
    const remaining = Math.max(0, totalBilled - totalPaid);

    let overallStatus = 'no_bills';
    let overallStatusLabel = 'Belum Ada Tagihan';
    if (totalBilled > 0) {
      if (remaining <= 0 && totalPaid >= totalBilled) {
        overallStatus = 'paid';
        overallStatusLabel = 'Lunas';
      } else if (totalPaid > 0) {
        overallStatus = 'partial';
        overallStatusLabel = 'Sebagian / Cicilan';
      } else {
        overallStatus = 'unpaid';
        overallStatusLabel = 'Belum Bayar';
      }
    }

    return {
      candidate: {
        id: candidate.id,
        student_id: candidate.student_id || candidate.id,
        registration_number: candidate.registration_number || `REG-${targetAyId}-${String(candidate.id).padStart(4, '0')}`,
        full_name: candidate.full_name,
        phone_number: candidate.phone_number || candidate.phone || '-',
        gender: candidate.gender === 'L' ? 'Laki-laki' : candidate.gender === 'P' ? 'Perempuan' : '-',
        process_name: candidate.process_name || 'Reguler',
        target_academic_year_id: targetAyId,
        assigned_scheme_name: assignment ? assignment.fee_scheme_name : 'Belum Ditetapkan',
        assigned_scheme_amount: assignedSchemeAmount
      },
      summary: {
        total_billed: totalBilled,
        total_paid: totalPaid,
        total_discount: totalDiscount,
        remaining_amount: remaining,
        overall_status: overallStatus,
        overall_status_label: overallStatusLabel,
        bills_count: bills.length,
        payments_count: payments.length
      },
      bills: bills.map(b => ({
        id: b.id,
        fee_type_name: b.fee_type_name || (b.billing_phase === 'registration_fee' ? 'Biaya Pendaftaran' : 'Uang Pangkal'),
        billing_phase: b.billing_phase,
        status: b.status,
        amount: parseFloat(b.amount || 0),
        paid_amount: parseFloat(b.paid_amount || 0),
        discount_amount: parseFloat(b.discount_amount || 0),
        remaining_amount: Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.paid_amount || 0)),
        due_date: b.due_date,
        is_installment: Boolean(b.is_installment_parent || b.installment_parent_id),
        notes: b.notes
      })),
      payments: payments.map(p => ({
        id: p.id,
        receipt_number: p.receipt_number || `KW-PPDB-${p.id}`,
        payment_date: p.payment_date,
        amount_paid: parseFloat(p.amount_paid || 0),
        payment_method: p.payment_method,
        cash_account_name: p.cash_account_name || 'Kas Utama',
        fee_type_name: p.fee_type_name,
        notes: p.notes
      }))
    };
  }
}

module.exports = new PpdbBillingService();

