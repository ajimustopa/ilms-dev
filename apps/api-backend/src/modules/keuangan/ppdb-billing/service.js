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
const { terbilang } = require('../common/terbilang');

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
    let feeTypeId = data.fee_type_id ? Number(data.fee_type_id) : null;
    const isRegFee = feeTypeId === 2;
    const billingPhase = data.billing_phase || (isRegFee ? 'registration_fee' : 'enrollment_fee');

    if (!registrantRefId || isNaN(baseAmount) || baseAmount <= 0) {
      const err = new Error('Data calon santri dan nominal tagihan PPDB valid wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    // 1.1 Ambil data calon santri dari modul PSB / Akademik
    const registrant = await crossModuleServices.getPsbRegistrant(registrantRefId);
    let resolvedUnitId = isUnit(schoolUnitId) ? Number(schoolUnitId) : (registrant?.satuan_pendidikan_id || data.satuan_pendidikan_id || 1);

    // 1.2 Resolusi fee_type
    if (!feeTypeId) {
      const searchKeyword = billingPhase === 'registration_fee' ? '%Pendaftaran%' : '%Pangkal%';
      const fee = await db('fee_types')
        .where(b => b.where('school_unit_id', resolvedUnitId).orWhere('school_unit_id', 0).orWhereNull('school_unit_id'))
        .where('name', 'like', searchKeyword)
        .first();
      feeTypeId = fee ? fee.id : (billingPhase === 'registration_fee' ? 2 : 8);
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
      if (registrant?.placed_student_id) {
        linkedStudentId = Number(registrant.placed_student_id);
      } else {
        try {
          const studentMatch = await crossModuleServices.getStudent(registrantRefId);
          if (studentMatch) linkedStudentId = studentMatch.id;
        } catch (_) {}
      }
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
              academicYearId: Number(bill.academic_year_id || bill.target_academic_year_id || 2),
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
              academicYearId: Number(bill.academic_year_id || bill.target_academic_year_id || 2),
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
              academicYearId: Number(bill.academic_year_id || bill.target_academic_year_id || 2),
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
            academicYearId: Number(bill.target_academic_year_id || bill.academic_year_id || 2),
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
   * Helper generator nomor kwitansi resmi PPDB terurut per unit dan tanggal
   */
  async generatePpdbReceiptNumber(trx, schoolUnitId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const unitPart = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const prefix = `KWT-PPDB-${unitPart}-${today}-`;
    const lastPayment = await trx('ppdb_registration_payments')
      .where('receipt_number', 'like', `${prefix}%`)
      .orderBy('id', 'desc')
      .first();

    let counter = 1;
    if (lastPayment && lastPayment.receipt_number) {
      const parts = lastPayment.receipt_number.split('-');
      const lastCounter = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastCounter)) counter = lastCounter + 1;
    }
    return `${prefix}${String(counter).padStart(4, '0')}`;
  }

  /**
   * Catat Pembayaran Tagihan PPDB Terpadu Multi-Pos / Multi-Allocation (Fitur Multipayment PPDB)
   */
  async recordPpdbMultiPayment(schoolUnitId, data, userId = null) {
    const isLegacy = Boolean(data.is_legacy || data.is_historical_only);
    const paidAt = data.payment_date || data.paid_at || new Date().toISOString();
    const paidAtStr = formatDateOnly(paidAt) || new Date().toISOString().slice(0, 10);

    // Normalisasi alokasi tagihan
    let rawAllocations = data.allocations;
    if (!rawAllocations && (data.ppdb_registration_bill_id || data.bill_id)) {
      rawAllocations = [{
        ppdb_registration_bill_id: data.ppdb_registration_bill_id || data.bill_id,
        amount: data.amount_paid || data.amount || 0,
        has_discount: data.has_discount,
        discount_amount: data.discount_amount,
        discount_type: data.discount_type,
        discount_percentage: data.discount_percentage,
        discount_reason: data.discount_reason
      }];
    }

    if (!Array.isArray(rawAllocations) || rawAllocations.length === 0) {
      const err = new Error('Daftar alokasi pembayaran PPDB tidak boleh kosong');
      err.statusCode = 422;
      throw err;
    }

    const validAllocations = rawAllocations.filter(a =>
      parseFloat(a.amount || a.amount_paid || 0) > 0 || (a.has_discount && parseFloat(a.discount_amount || 0) > 0)
    );

    if (validAllocations.length === 0) {
      const err = new Error('Nominal alokasi pembayaran atau diskon harus lebih besar dari 0');
      err.statusCode = 422;
      throw err;
    }

    return db.transaction(async (trx) => {
      // 1. Validasi Tanggal Cutover (hanya untuk transaksi kas normal berjalan)
      if (!isLegacy && isUnit(schoolUnitId)) {
        const cutoverSetting = await trx('finance_cutover_settings')
          .where({ school_unit_id: Number(schoolUnitId) })
          .first();
        if (cutoverSetting?.cutover_date) {
          const cutoverDateStr = formatDateOnly(cutoverSetting.cutover_date);
          if (paidAtStr < cutoverDateStr) {
            const err = new Error(`Tanggal pembayaran normal (${paidAtStr}) tidak boleh sebelum Tanggal Mulai Pencatatan Sistem (${cutoverDateStr}).`);
            err.statusCode = 422;
            throw err;
          }
        }
      }

      // 2. Tentukan Rekening Kas / Bank Penerima
      let cashAccountId = data.cash_account_id ? Number(data.cash_account_id) : null;
      let cashAccount = null;

      if (cashAccountId) {
        cashAccount = await trx('cash_accounts').where({ id: cashAccountId }).first();
      }
      if (!cashAccount && isUnit(schoolUnitId)) {
        cashAccount = await trx('cash_accounts')
          .where({ school_unit_id: Number(schoolUnitId), is_active: 1 })
          .first();
        if (cashAccount) cashAccountId = cashAccount.id;
      }
      if (!cashAccount && !isLegacy) {
        cashAccount = await trx('cash_accounts').where({ is_active: 1 }).first();
        if (cashAccount) cashAccountId = cashAccount.id;
      }
      if (!cashAccountId) {
        cashAccountId = 1;
      }

      // 3. Tentukan Nomor Kwitansi Resmi Tunggal
      let receiptNumber = data.receipt_number || null;
      if (!receiptNumber && data.bank_statement_id && !isLegacy) {
        const existingRef = await trx('bank_statement_references')
          .join('ppdb_registration_payments', 'bank_statement_references.reference_id', 'ppdb_registration_payments.id')
          .where('bank_statement_references.bank_statement_id', Number(data.bank_statement_id))
          .where('bank_statement_references.reference_type', 'ppdb_registration_payment')
          .whereNotNull('ppdb_registration_payments.receipt_number')
          .select('ppdb_registration_payments.receipt_number')
          .first();
        if (existingRef && existingRef.receipt_number) {
          receiptNumber = existingRef.receipt_number;
        }
      }

      if (!receiptNumber) {
        receiptNumber = await this.generatePpdbReceiptNumber(trx, schoolUnitId);
      }

      const createdPaymentIds = [];
      const updatedBills = [];
      let totalAmountPaid = 0;
      let totalDiscountsGiven = 0;
      let lastRegistrantName = '';
      let targetAyId = null;
      let effectiveUnitId = isUnit(schoolUnitId) ? Number(schoolUnitId) : 1;

      for (const alloc of validAllocations) {
        const billId = Number(alloc.ppdb_registration_bill_id || alloc.bill_id || alloc.student_bill_id);
        const allocAmount = parseFloat(alloc.amount || alloc.amount_paid || 0);
        const hasDiscount = Boolean(alloc.has_discount && parseFloat(alloc.discount_amount || 0) > 0);
        const discountAmount = hasDiscount ? parseFloat(alloc.discount_amount) : 0;

        let billQuery = trx('ppdb_registration_bills').where({ id: billId });
        if (isUnit(schoolUnitId)) {
          billQuery = billQuery.where('school_unit_id', Number(schoolUnitId));
        }
        const bill = await billQuery.first();

        if (!bill) {
          const err = new Error(`Tagihan PPDB #${billId} tidak ditemukan`);
          err.statusCode = 404;
          throw err;
        }

        if (bill.status === 'paid') {
          const err = new Error(`Tagihan PPDB #${billId} (${bill.registrant_name_snapshot}) sudah berstatus lunas`);
          err.statusCode = 409;
          throw err;
        }

        if (bill.status === 'cancelled' || bill.status === 'refunded') {
          const err = new Error(`Tagihan PPDB #${billId} berstatus ${bill.status} dan tidak dapat menerima pembayaran`);
          err.statusCode = 422;
          throw err;
        }

        lastRegistrantName = bill.registrant_name_snapshot;
        targetAyId = bill.target_academic_year_id || bill.academic_year_id;
        if (bill.school_unit_id) effectiveUnitId = bill.school_unit_id;

        const currentPaid = parseFloat(bill.paid_amount || 0);
        const billAmount = parseFloat(bill.amount || 0);

        // Update Diskon Kasuistik jika diberikan saat pembayaran
        let newDiscountTotal = parseFloat(bill.discount_amount || 0);
        if (hasDiscount && discountAmount > 0) {
          newDiscountTotal += discountAmount;
          totalDiscountsGiven += discountAmount;

          const rawDiscType = alloc.discount_type || 'fixed_amount';
          const mappedDiscType = (rawDiscType === 'percentage' || rawDiscType === 'percent')
            ? 'percentage'
            : (rawDiscType === 'full_waiver' ? 'full_waiver' : 'fixed_amount');
          const discPct = alloc.discount_percentage || (billAmount > 0 ? (discountAmount / billAmount * 100) : null);

          await trx('ppdb_registration_bills')
            .where({ id: bill.id })
            .update({
              discount_amount: newDiscountTotal,
              discount_type: mappedDiscType,
              discount_percentage: discPct,
              discount_reason: alloc.discount_reason || data.discount_reason || 'Diskon kasuistik saat pencatatan pembayaran PPDB',
              updated_at: trx.fn.now()
            });
        }

        const effectiveBillAmount = Math.max(0, billAmount - newDiscountTotal);
        const newTotalPaid = currentPaid + allocAmount;
        const isLunas = newTotalPaid >= effectiveBillAmount;
        const billStatusAfter = isLunas ? 'paid' : (newTotalPaid > 0 ? 'partially_paid' : (newDiscountTotal > 0 ? 'partially_paid' : bill.status));

        let actualPaymentId = null;

        if (allocAmount > 0) {
          totalAmountPaid += allocAmount;

          let rawMethod = data.payment_method || 'cash';
          let validMethod = 'cash';
          if (rawMethod === 'bank_transfer' || rawMethod === 'transfer') validMethod = 'bank_transfer';
          else if (rawMethod === 'payment_gateway') validMethod = 'payment_gateway';

          const [paymentId] = await trx('ppdb_registration_payments').insert({
            ppdb_registration_bill_id: bill.id,
            cash_account_id: cashAccountId,
            receipt_number: receiptNumber,
            amount_paid: allocAmount,
            payment_date: paidAtStr,
            payment_method: isLegacy ? 'cash' : validMethod,
            notes: data.notes || (isLegacy ? `[Riwayat Historis Non-Kas] PPDB ${bill.registrant_name_snapshot}` : `Pembayaran PPDB ${bill.registrant_name_snapshot}`),
            created_by: userId
          });

          actualPaymentId = paymentId || (await trx('ppdb_registration_payments')
            .where({ receipt_number: receiptNumber, ppdb_registration_bill_id: bill.id })
            .orderBy('id', 'desc')
            .first()).id;

          createdPaymentIds.push(actualPaymentId);
        }

        // Update tagihan PPDB
        await trx('ppdb_registration_bills')
          .where({ id: bill.id })
          .update({
            paid_amount: newTotalPaid,
            status: billStatusAfter,
            updated_at: trx.fn.now()
          });

        updatedBills.push({
          id: bill.id,
          registrant_name: bill.registrant_name_snapshot,
          status: billStatusAfter,
          paid_amount: newTotalPaid,
          amount: billAmount
        });

        // Auto-journal untuk Alokasi Pembayaran Kas (Hanya jika non-historis dan ada nominal bayar)
        if (!isLegacy && allocAmount > 0 && actualPaymentId) {
          try {
            await recordJournal({
              schoolUnitId: bill.school_unit_id || effectiveUnitId,
              academicYearId: Number(targetAyId || 2),
              transactionCode: 'ppdb_registration_income',
              amount: allocAmount,
              sourceType: 'ppdb_registration_payment',
              sourceId: actualPaymentId,
              description: `Penerimaan Pembayaran PPDB: ${bill.registrant_name_snapshot} (${receiptNumber})`,
              journalDate: paidAtStr,
              overrideDebitAccountId: cashAccount?.account_id || cashAccount?.chart_of_account_id || alloc.override_debit_account_id || null,
              overrideCreditAccountId: alloc.override_credit_account_id || 199,
              overrideCashAccountId: cashAccountId,
              userId,
              trx
            });
          } catch (journalErr) {
            console.warn('[recordPpdbMultiPayment] Auto journal skipped or error:', journalErr.message);
          }

          // Mutasi Saldo Kantong Dana
          try {
            await fundBalanceEngine.applyFundMutation({
              schoolUnitId: bill.school_unit_id || effectiveUnitId,
              fundType: 'fee_type',
              fundRefId: bill.fee_type_id,
              academicYearId: Number(targetAyId || 2),
              direction: 'in',
              amount: allocAmount,
              sourceTable: 'ppdb_registration_payments',
              sourceId: actualPaymentId,
              notes: `Penerimaan PPDB ${bill.registrant_name_snapshot} (${receiptNumber})`,
              userId,
              trx
            });
          } catch (fbErr) {
            console.warn('[recordPpdbMultiPayment] Fund balance mutation skipped:', fbErr.message);
          }
        }

        // Sinkronisasi lintas modul
        try {
          await crossModuleServices.syncPpdbBillToStudentBill(bill.id, trx);
        } catch (sErr) {
          console.warn('[recordPpdbMultiPayment] syncPpdbBillToStudentBill skipped:', sErr.message);
        }

        try {
          await crossModuleServices.syncPsbRegistrantPaymentStatus(bill, {
            amountPaid: allocAmount,
            receiptNumber,
            isLunas,
            userId
          });
        } catch (pErr) {
          console.warn('[recordPpdbMultiPayment] syncPsbRegistrantPaymentStatus skipped:', pErr.message);
        }
      }

      // Rekonsiliasi Rekening Koran Bank jika ada
      if (data.bank_statement_id && !isLegacy && createdPaymentIds.length > 0) {
        try {
          const stmt = await trx('bank_statements').where({ id: Number(data.bank_statement_id) }).first();
          if (stmt) {
            const allocSum = await trx('bank_statement_references')
              .where('bank_statement_id', stmt.id)
              .sum('amount as total_allocated')
              .first();
            const curAlloc = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
            const stmtTotal = parseFloat(stmt.amount || 0);
            const remainingPlafon = Math.max(0, stmtTotal - curAlloc);
            const thisAlloc = Math.min(totalAmountPaid, remainingPlafon);

            if (thisAlloc > 0) {
              await trx('bank_statement_references').insert({
                bank_statement_id: stmt.id,
                school_unit_id: effectiveUnitId,
                reference_type: 'ppdb_registration_payment',
                reference_id: createdPaymentIds[0],
                amount: thisAlloc,
                notes: `Kwitansi PPDB #${receiptNumber} (${lastRegistrantName})`,
                created_by: userId
              });

              const newAlloc = curAlloc + thisAlloc;
              const isFullyReconciled = newAlloc >= stmtTotal - 0.01;

              await trx('bank_statements')
                .where({ id: stmt.id })
                .update({
                  is_reconciled: isFullyReconciled,
                  reconciled_reference_type: 'ppdb_registration_payment',
                  reconciled_reference_id: createdPaymentIds[0],
                  reconciliation_notes: isFullyReconciled
                    ? `Lunas teralokasi ke PPDB (Kwitansi #${receiptNumber})`
                    : `Teralokasi Rp ${newAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
                  reconciled_at: isFullyReconciled ? trx.fn.now() : stmt.reconciled_at,
                  updated_at: trx.fn.now()
                });
            }
          }
        } catch (bsErr) {
          console.warn('[recordPpdbMultiPayment] Bank statement reconciliation skipped:', bsErr.message);
        }
      }

      const primaryPaymentId = createdPaymentIds[0] || null;

      // Audit Log Keuangan
      await logFinanceAudit({
        schoolUnitId: effectiveUnitId,
        userId,
        action: isLegacy ? 'RECORD_PPDB_PAYMENT_HISTORICAL_MULTI' : 'RECORD_PPDB_PAYMENT_MULTI',
        entityType: 'ppdb_registration_payment',
        entityId: primaryPaymentId || (validAllocations[0] ? (validAllocations[0].ppdb_registration_bill_id || validAllocations[0].bill_id) : 0),
        dataAfter: {
          receipt_number: receiptNumber,
          allocations_count: validAllocations.length,
          created_payment_ids: createdPaymentIds,
          total_paid: totalAmountPaid,
          total_discounts: totalDiscountsGiven,
          paid_at: paidAtStr,
          is_legacy: isLegacy
        },
        trx
      });

      return {
        receipt_number: receiptNumber,
        payment_ids: createdPaymentIds,
        total_paid: totalAmountPaid,
        total_discounts: totalDiscountsGiven,
        allocations_count: validAllocations.length,
        updated_bills: updatedBills,
        is_legacy: isLegacy
      };
    });
  }

  /**
   * Record payment for PPDB registration bill (Single or Delegated Multi-allocation)
   */
  async recordRegistrationPayment(schoolUnitId, billId, data, userId = null) {
    if (data.allocations && Array.isArray(data.allocations) && data.allocations.length > 0) {
      return this.recordPpdbMultiPayment(schoolUnitId, data, userId);
    }

    const payload = {
      ...data,
      allocations: [{
        ppdb_registration_bill_id: billId,
        amount: data.amount_paid || data.amount || 0,
        has_discount: data.has_discount,
        discount_amount: data.discount_amount,
        discount_type: data.discount_type,
        discount_percentage: data.discount_percentage,
        discount_reason: data.discount_reason
      }]
    };

    const multiRes = await this.recordPpdbMultiPayment(schoolUnitId, payload, userId);
    const updatedBill = await db('ppdb_registration_bills').where({ id: billId }).first();
    const paymentRecord = multiRes.payment_ids?.[0]
      ? await db('ppdb_registration_payments').where({ id: multiRes.payment_ids[0] }).first()
      : null;

    return {
      bill: updatedBill,
      payment: paymentRecord,
      receipt_number: multiRes.receipt_number,
      ...multiRes
    };
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
      .leftJoin('cash_accounts as ca', 'prbp.target_cash_account_id', 'ca.id');

    if (isUnit(schoolUnitId)) {
      query = query.where('prb.school_unit_id', Number(schoolUnitId));
    }

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
          .orWhere('prbp.sender_account_name', 'like', term);
      });
    }

    const proofs = await query
      .select(
        'prbp.*',
        'prbp.transfer_amount as amount',
        'prbp.sender_account_name as bank_sender_name',
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
      .orderBy('prbp.created_at', 'asc');

    let allQuery = db('ppdb_registration_bill_proofs as prbp')
      .join('ppdb_registration_bills as prb', 'prbp.ppdb_registration_bill_id', 'prb.id');
    if (isUnit(schoolUnitId)) {
      allQuery = allQuery.where('prb.school_unit_id', Number(schoolUnitId));
    }
    const allProofs = await allQuery.select('prbp.status');

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

  async listProofs(schoolUnitId, filters = {}) {
    return this.listTransferProofs(schoolUnitId, filters);
  }

  /**
   * Submit transfer proof for PPDB bill
   */
  async submitTransferProof(data) {
    const billId = Number(data.ppdb_registration_bill_id);
    const amount = parseFloat(data.amount || data.transfer_amount || 0);

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
      transfer_amount: amount > 0 ? amount : parseFloat(bill.amount || 0),
      sender_account_name: data.sender_account_name || data.bank_sender_name || null,
      bank_name: data.bank_name || null,
      transfer_date: data.transfer_date || new Date().toISOString().slice(0, 10),
      proof_file_url: data.proof_file_url || null,
      status: 'pending',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
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

    let proofQuery = db('ppdb_registration_bill_proofs as prbp')
      .join('ppdb_registration_bills as prb', 'prbp.ppdb_registration_bill_id', 'prb.id')
      .where('prbp.id', proofId);
    if (isUnit(schoolUnitId)) {
      proofQuery = proofQuery.andWhere('prb.school_unit_id', Number(schoolUnitId));
    }

    const proof = await proofQuery
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
      proof.school_unit_id || schoolUnitId,
      proof.ppdb_registration_bill_id,
      {
        cash_account_id: cashAccountId,
        amount_paid: proof.transfer_amount || proof.amount,
        payment_date: proof.transfer_date,
        payment_method: 'bank_transfer',
        notes: `Verifikasi Transfer PPDB #${proof.id} (${proof.sender_account_name || proof.bank_name || 'Bank'})`
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
        target_cash_account_id: cashAccountId,
        updated_at: db.fn.now()
      });

    return {
      message: `Bukti transfer berhasil diverifikasi. Kwitansi resmi #${paymentResult.receipt_number} telah diterbitkan.`,
      payment: paymentResult
    };
  }

  async verifyRegistrationProof(schoolUnitId, proofId, data, userId = null) {
    return this.verifyTransferProof(schoolUnitId, proofId, data, userId);
  }

  /**
   * Reject transfer proof
   */
  async rejectTransferProof(schoolUnitId, proofId, reason = null, userId = null) {
    let proofQuery = db('ppdb_registration_bill_proofs as prbp')
      .join('ppdb_registration_bills as prb', 'prbp.ppdb_registration_bill_id', 'prb.id')
      .where('prbp.id', proofId);
    if (isUnit(schoolUnitId)) {
      proofQuery = proofQuery.andWhere('prb.school_unit_id', Number(schoolUnitId));
    }
    const proof = await proofQuery.first();

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
        rejection_reason: reason || 'Bukti transfer tidak valid / mutasi rekening tidak ditemukan',
        updated_at: db.fn.now()
      });

    return { message: 'Bukti transfer berhasil ditolak' };
  }

  async rejectRegistrationProof(schoolUnitId, proofId, reason = null, userId = null) {
    return this.rejectTransferProof(schoolUnitId, proofId, reason, userId);
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
    let billQuery = db('ppdb_registration_bills as prb')
      .join('fee_types as ft', 'prb.fee_type_id', 'ft.id')
      .where('prb.id', billId);

    if (isUnit(schoolUnitId)) {
      billQuery = billQuery.where('prb.school_unit_id', Number(schoolUnitId));
    }

    const bill = await billQuery.select('prb.*', 'ft.name as fee_type_name').first();

    if (!bill) {
      const err = new Error('Tagihan PPDB tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const payment = await db('ppdb_registration_payments as prp')
      .where({ 'prp.ppdb_registration_bill_id': bill.id })
      .orderBy('prp.id', 'desc')
      .first();

    if (payment) {
      return this.getReceiptData(schoolUnitId, payment.id);
    }

    const unit = await crossModuleServices.getSchoolUnit(bill.school_unit_id);

    return {
      bill,
      payment: null,
      school_unit: unit || { name: 'Pondok Pesantren Aldepos', address: 'Bogor, Jawa Barat' }
    };
  }

  /**
   * List PPDB Registration Payments (Riwayat Pembayaran PPDB)
   */
  async listRegistrationPayments(schoolUnitId, filters = {}) {
    let query = db('ppdb_registration_payments as prp')
      .join('ppdb_registration_bills as prb', 'prp.ppdb_registration_bill_id', 'prb.id')
      .leftJoin('fee_types as ft', 'prb.fee_type_id', 'ft.id')
      .leftJoin('cash_accounts as ca', 'prp.cash_account_id', 'ca.id');

    if (isUnit(schoolUnitId)) {
      query = query.where('prb.school_unit_id', Number(schoolUnitId));
    }

    if (filters.target_academic_year_id) {
      const matchingTargetAyIds = await this.getMatchingAcademicYearIds(filters.target_academic_year_id);
      query = query.whereIn('prb.target_academic_year_id', matchingTargetAyIds);
    }

    if (filters.cash_account_id) {
      query = query.where('prp.cash_account_id', Number(filters.cash_account_id));
    }

    if (filters.payment_method && filters.payment_method !== 'all') {
      query = query.where('prp.payment_method', filters.payment_method);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.where('prp.status', filters.status);
    }

    if (filters.start_date) {
      query = query.where('prp.payment_date', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('prp.payment_date', '<=', filters.end_date);
    }

    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      query = query.where(b => {
        b.where('prb.registrant_name_snapshot', 'like', term)
          .orWhere('prb.registration_number_snapshot', 'like', term)
          .orWhere('prp.receipt_number', 'like', term)
          .orWhere('ft.name', 'like', term)
          .orWhere('prp.notes', 'like', term);
      });
    }

    const payments = await query
      .select(
        'prp.*',
        'prb.registration_number_snapshot',
        'prb.registrant_name_snapshot',
        'prb.amount as bill_amount',
        'prb.paid_amount as bill_paid_amount',
        'prb.status as bill_status',
        'prb.billing_phase',
        'prb.target_academic_year_id',
        'prb.school_unit_id',
        'ft.name as fee_type_name',
        'ca.name as cash_account_name'
      )
      .orderBy('prp.payment_date', 'desc')
      .orderBy('prp.id', 'desc');

    const validPayments = payments.filter(p => p.status !== 'voided');
    const totalAmount = validPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);

    return {
      payments: payments.map(p => ({
        ...p,
        payment_date: formatDateOnly(p.payment_date)
      })),
      total_count: payments.length,
      valid_count: validPayments.length,
      voided_count: payments.filter(p => p.status === 'voided').length,
      total_amount: totalAmount
    };
  }

  /**
   * Batalkan Pembayaran Kasir PPDB (Void) dengan Alasan Wajib & Audit Log
   * Sesuai aturan AGENTS.md: Data uang tidak dihapus fisik, gunakan Void dengan alasan wajib dan catat di audit log.
   */
  async voidRegistrationPayment(schoolUnitId, paymentId, voidReason, user = {}) {
    if (!voidReason || voidReason.trim().length < 5) {
      const err = new Error('Alasan pembatalan (void) pembayaran wajib diisi (minimal 5 karakter)');
      err.statusCode = 422;
      throw err;
    }

    const userId = user?.id || 1;

    return await db.transaction(async (trx) => {
      // 1. Ambil data payment
      let paymentQuery = trx('ppdb_registration_payments as prp')
        .join('ppdb_registration_bills as prb', 'prp.ppdb_registration_bill_id', 'prb.id')
        .where('prp.id', Number(paymentId));

      if (isUnit(schoolUnitId)) {
        paymentQuery = paymentQuery.where('prb.school_unit_id', Number(schoolUnitId));
      }

      const payment = await paymentQuery
        .select(
          'prp.*',
          'prb.id as bill_id',
          'prb.school_unit_id',
          'prb.amount as bill_amount',
          'prb.paid_amount as bill_paid_amount',
          'prb.discount_amount as bill_discount_amount',
          'prb.status as bill_status',
          'prb.registrant_name_snapshot',
          'prb.registration_number_snapshot'
        )
        .first();

      if (!payment) {
        const err = new Error('Transaksi pembayaran PPDB tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }

      if (payment.status === 'voided') {
        const err = new Error(`Pembayaran ini sudah pernah dibatalkan (void) pada ${payment.voided_at || ''}`);
        err.statusCode = 409;
        throw err;
      }

      const paymentAmount = parseFloat(payment.amount_paid || 0);
      const currentBillPaid = parseFloat(payment.bill_paid_amount || 0);
      const billAmount = parseFloat(payment.bill_amount || 0);
      const discountAmount = parseFloat(payment.bill_discount_amount || 0);
      const effectiveBillAmount = Math.max(0, billAmount - discountAmount);

      // 2. Hitung pengembalian saldo tagihan
      const restoredPaidAmount = Math.max(0, currentBillPaid - paymentAmount);
      let restoredBillStatus = 'unpaid';
      if (restoredPaidAmount >= effectiveBillAmount && effectiveBillAmount > 0) {
        restoredBillStatus = 'paid';
      } else if (restoredPaidAmount > 0) {
        restoredBillStatus = 'partially_paid';
      } else {
        restoredBillStatus = 'unpaid';
      }

      // Update status tagihan
      await trx('ppdb_registration_bills')
        .where({ id: payment.bill_id })
        .update({
          paid_amount: restoredPaidAmount,
          status: restoredBillStatus,
          updated_at: trx.fn.now()
        });

      // 3. Update status pembayaran menjadi voided
      const voidedAt = new Date();
      await trx('ppdb_registration_payments')
        .where({ id: payment.id })
        .update({
          status: 'voided',
          void_reason: voidReason.trim(),
          voided_at: voidedAt,
          voided_by: userId,
          updated_at: trx.fn.now()
        });

      // 4. Jika ada rekonsiliasi rekening koran, update mutasi
      try {
        const ref = await trx('bank_statement_references')
          .where({
            reference_type: 'ppdb_registration_payment',
            reference_id: payment.id
          })
          .first();

        if (ref) {
          await trx('bank_statement_references').where({ id: ref.id }).del();
          const curAllocSum = await trx('bank_statement_references')
            .where('bank_statement_id', ref.bank_statement_id)
            .sum('amount as total_allocated')
            .first();
          const curAlloc = curAllocSum?.total_allocated ? parseFloat(curAllocSum.total_allocated) : 0;
          const stmt = await trx('bank_statements').where({ id: ref.bank_statement_id }).first();
          if (stmt) {
            const stmtTotal = parseFloat(stmt.amount || 0);
            const isStillFully = curAlloc >= stmtTotal - 0.01;
            await trx('bank_statements')
              .where({ id: stmt.id })
              .update({
                is_reconciled: isStillFully,
                reconciliation_notes: isStillFully
                  ? stmt.reconciliation_notes
                  : `Penyesuaian void PPDB #${payment.receipt_number} (Teralokasi Rp ${curAlloc.toLocaleString('id-ID')})`,
                updated_at: trx.fn.now()
              });
          }
        }
      } catch (bsErr) {
        console.warn('[voidRegistrationPayment] Reverting bank statement reference skipped:', bsErr.message);
      }

      // 5. Catat ke finance_audit_logs (sesuai aturan wajib Core Aldepos)
      await logFinanceAudit({
        schoolUnitId: payment.school_unit_id,
        userId,
        action: 'VOID_PPDB_PAYMENT',
        entityType: 'ppdb_registration_payment',
        entityId: payment.id,
        dataBefore: {
          receipt_number: payment.receipt_number,
          amount_paid: payment.amount_paid,
          bill_paid_amount: currentBillPaid,
          bill_status: payment.bill_status
        },
        dataAfter: {
          void_reason: voidReason.trim(),
          restored_bill_paid_amount: restoredPaidAmount,
          restored_bill_status: restoredBillStatus,
          voided_at: voidedAt
        },
        trx
      });

      return {
        message: `Pembayaran sebesar Rp ${paymentAmount.toLocaleString('id-ID')} dengan Kwitansi #${payment.receipt_number} berhasil dibatalkan (void). Status tagihan dikembalikan menjadi '${restoredBillStatus}'.`,
        payment_id: payment.id,
        receipt_number: payment.receipt_number,
        restored_bill_status: restoredBillStatus,
        restored_paid_amount: restoredPaidAmount
      };
    });
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
    const payment = await db('ppdb_registration_payments as prp')
      .leftJoin('cash_accounts as ca', 'prp.cash_account_id', 'ca.id')
      .where('prp.id', paymentId)
      .select('prp.*', 'ca.name as cash_account_name', 'ca.bank_account_number as account_number')
      .first();

    if (!payment) return null;

    let billQuery = db('ppdb_registration_bills as prb')
      .join('fee_types as ft', 'prb.fee_type_id', 'ft.id')
      .where('prb.id', payment.ppdb_registration_bill_id);

    if (isUnit(schoolUnitId)) {
      billQuery = billQuery.where('prb.school_unit_id', Number(schoolUnitId));
    }

    const bill = await billQuery.select('prb.*', 'ft.name as fee_type_name').first();
    if (!bill) return null;

    // Ambil semua item sibling yang berbagi nomor kwitansi yang sama (Multi-Alokasi PPDB)
    let siblingItems = [];
    if (payment.receipt_number) {
      siblingItems = await db('ppdb_registration_payments as prp')
        .join('ppdb_registration_bills as prb', 'prp.ppdb_registration_bill_id', 'prb.id')
        .join('fee_types as ft', 'prb.fee_type_id', 'ft.id')
        .where('prp.receipt_number', payment.receipt_number)
        .select(
          'prp.id as payment_id',
          'prp.amount_paid',
          'prp.payment_date',
          'prp.payment_method',
          'prb.id as bill_id',
          'prb.registrant_name_snapshot',
          'prb.registration_number_snapshot',
          'prb.amount as bill_amount',
          'prb.paid_amount as bill_paid_amount',
          'prb.discount_amount',
          'ft.name as fee_type_name',
          'ft.code as fee_type_code'
        );
    }

    const totalAmount = siblingItems.length > 0
      ? siblingItems.reduce((acc, it) => acc + parseFloat(it.amount_paid || 0), 0)
      : parseFloat(payment.amount_paid || 0);

    const isVoid = payment.status === 'voided';

    let schoolUnit = null;
    const targetUnitId = bill.school_unit_id || schoolUnitId || 1;
    try {
      schoolUnit = await crossModuleServices.getSchoolUnit(targetUnitId);
    } catch (_) {}

    return {
      bill,
      payment: {
        ...payment,
        payment_date: formatDateOnly(payment.payment_date),
        total_amount: totalAmount,
        terbilang_words: terbilang(totalAmount),
        is_void: isVoid,
        void_reason: payment.void_reason || null,
        voided_at: payment.voided_at ? formatDateOnly(payment.voided_at) : null,
        items: siblingItems.length > 0 ? siblingItems : [{
          payment_id: payment.id,
          amount_paid: payment.amount_paid,
          fee_type_name: bill.fee_type_name,
          bill_amount: bill.amount
        }]
      },
      school_unit: schoolUnit || { name: 'Pondok Pesantren Aldepos', address: 'Bogor, Jawa Barat' }
    };
  }

  async getReceiptByNumber(schoolUnitId, receiptNumber) {
    const payment = await db('ppdb_registration_payments')
      .where('receipt_number', receiptNumber)
      .orderBy('id', 'asc')
      .first();

    if (!payment) return null;
    return this.getReceiptData(schoolUnitId, payment.id);
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
        is_placed: Boolean(r.is_placed),
        is_student: Boolean(r.is_student),
        candidate_category: r.candidate_category || (r.is_placed ? 'registrant_placed' : 'registrant_unplaced'),
        candidate_category_label: r.candidate_category_label || (r.is_placed ? 'Siswa Baru (Sudah di Rombel)' : 'Pendaftar PPDB (Belum Masuk Rombel)'),
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
    const customItems = Array.isArray(payload.custom_items) ? payload.custom_items : [];

    if (!candidateId) {
      const err = new Error('Calon santri wajib dipilih');
      err.statusCode = 422;
      throw err;
    }

    const effectiveUnitId = isUnit(schoolUnitId) ? Number(schoolUnitId) : 1;
    const matchingAyIds = await this.getMatchingAcademicYearIds(targetAyId);

    return db.transaction(async (trx) => {
      // 0. Ambil master fee_types valid dari DB untuk mencegah FK constraint error
      const validFeeTypes = await trx('fee_types').select('id');
      const validFeeTypeIds = new Set(validFeeTypes.map(f => Number(f.id)));

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

      // 3. Sanitasi & Masukkan penyesuaian baru sesuai skema tabel student_fee_adjustments
      const sanitizedItems = [];
      for (const item of customItems) {
        const ftId = Number(item.fee_type_id);
        if (!ftId || !validFeeTypeIds.has(ftId)) continue;

        let rawAmt = item.override_amount;
        if (typeof rawAmt === 'string') {
          rawAmt = rawAmt.replace(/[^0-9,-]/g, '').replace(',', '.');
        }
        let overrideAmount = parseFloat(rawAmt);
        if (isNaN(overrideAmount) || overrideAmount < 0) overrideAmount = 0;

        let waiverPct = null;
        if (item.waiver_percentage !== undefined && item.waiver_percentage !== null && item.waiver_percentage !== '') {
          let rawWp = typeof item.waiver_percentage === 'string' ? item.waiver_percentage.replace(/[^0-9,-]/g, '').replace(',', '.') : item.waiver_percentage;
          waiverPct = parseFloat(rawWp);
          if (isNaN(waiverPct)) waiverPct = null;
        }

        const kind = item.adjustment_kind === 'waiver' ? 'waiver' : 'override_amount';
        const waiverType = item.waiver_type || (kind === 'waiver' ? 'Keringanan PPDB' : 'Penetapan Khusus PPDB');

        await trx('student_fee_adjustments').insert({
          school_unit_id: effectiveUnitId,
          student_id: candidateId,
          assignment_id: assignmentId,
          fee_type_id: ftId,
          adjustment_kind: kind,
          waiver_type: waiverType,
          waiver_percentage: waiverPct,
          override_amount: overrideAmount,
          reason: item.reason || reason,
          status: 'approved',
          approved_by: userId,
          approved_at: trx.fn.now(),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });

        sanitizedItems.push({
          fee_type_id: ftId,
          adjustment_kind: kind,
          waiver_percentage: waiverPct,
          override_amount: overrideAmount
        });
      }

      // 4. Sinkronkan ke ppdb_registration_bills yang belum terbit/lunas (draft atau unpaid dengan paid_amount == 0)
      for (const item of sanitizedItems) {
        let billQuery = trx('ppdb_registration_bills')
          .whereIn('academic_year_id', matchingAyIds)
          .where(b => {
            b.where('psb_registrant_ref_id', candidateId)
              .orWhere('linked_student_id', candidateId);
          })
          .where('fee_type_id', item.fee_type_id)
          .where(b => {
            b.where('status', 'draft')
              .orWhere(sub => sub.where('status', 'unpaid').where(p => p.whereNull('paid_amount').orWhere('paid_amount', 0)));
          });

        if (isUnit(schoolUnitId)) {
          billQuery = billQuery.where('school_unit_id', effectiveUnitId);
        }

        const existingBill = await billQuery.first();
        if (existingBill) {
          if (item.adjustment_kind === 'waiver') {
            const originalAmount = parseFloat(existingBill.amount || 0);
            const discPct = item.waiver_percentage || 0;
            const discAmt = originalAmount * discPct / 100;
            await trx('ppdb_registration_bills')
              .where({ id: existingBill.id })
              .update({
                discount_type: 'custom_waiver',
                discount_percentage: discPct,
                discount_amount: discAmt,
                discount_reason: reason,
                updated_at: trx.fn.now()
              });
          } else {
            await trx('ppdb_registration_bills')
              .where({ id: existingBill.id })
              .update({
                amount: item.override_amount,
                discount_reason: reason,
                updated_at: trx.fn.now()
              });
          }
        }
      }

      try {
        await logFinanceAudit({
          schoolUnitId: effectiveUnitId,
          userId,
          action: 'CUSTOMIZE_PPDB_FEE',
          entityType: 'student_fee_scheme_assignment',
          entityId: assignmentId,
          dataBefore: existing || null,
          dataAfter: { student_id: candidateId, is_custom: true, reason, custom_items: sanitizedItems }
        });
      } catch (aErr) {
        console.warn('[PpdbBillingService] Audit log warning:', aErr.message);
      }

      return {
        success: true,
        message: `Penetapan biaya khusus calon santri #${candidateId} berhasil disimpan`
      };
    });
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
        student_name: r.full_name,
        registration_number: r.registration_number,
        nis: r.registration_number,
        full_name: r.full_name,
        is_placed: Boolean(r.is_placed),
        is_student: Boolean(r.is_student),
        candidate_category: r.candidate_category || (r.is_placed ? 'registrant_placed' : 'registrant_unplaced'),
        candidate_category_label: r.candidate_category_label || (r.is_placed ? 'Siswa Baru (Sudah di Rombel)' : 'Pendaftar PPDB (Belum Masuk Rombel)'),
        entry_type: r.entry_type || 'reguler',
        entry_type_label: r.entry_type_label || (r.entry_type === 'pindahan' ? 'Siswa Pindahan' : 'Siswa Baru'),
        registration_type: r.registration_type || (r.entry_type === 'pindahan' ? 'pindahan' : 'siswa_baru'),
        registration_type_display: r.registration_type_display || (r.entry_type === 'pindahan' ? 'Siswa Pindahan' : 'Siswa Baru'),
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
      .leftJoin('cash_accounts', 'expenses.cash_account_id', 'cash_accounts.id')
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
        'expenses.total_amount as amount',
        'cash_accounts.name as cash_account_name'
      )
      .orderBy('expenses.expense_date', 'desc');

    const totalExpense = expensesList.reduce((acc, ex) => acc + parseFloat(ex.total_amount || ex.amount || 0), 0);

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
    let rawAmount = data.amount || data.total_amount || 0;
    if (typeof rawAmount === 'string') {
      rawAmount = rawAmount.replace(/[^0-9,-]/g, '').replace(',', '.');
    }
    const amount = parseFloat(rawAmount || 0);
    const expenseDate = data.expense_date || new Date().toISOString().slice(0, 10);
    const cashAccountId = Number(data.cash_account_id || 1);
    const notes = data.notes || data.description || 'Pengeluaran Operasional Program PPDB';
    const categoryName = data.category_name || 'Operasional PPDB';

    if (!amount || amount <= 0) {
      const err = new Error('Nominal pengeluaran PPDB harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const effectiveUnitId = isUnit(schoolUnitId) ? Number(schoolUnitId) : 1;

    return db.transaction(async (trx) => {
      const [id] = await trx('expenses').insert({
        school_unit_id: effectiveUnitId,
        academic_year_id: targetAyId, // Dialokasikan ke Tahun Ajaran Sasaran PPDB
        cash_account_id: cashAccountId,
        total_amount: amount,
        expense_date: expenseDate,
        is_outside_budget: 1,
        fund_source_type: 'opening_pool',
        notes: `[Program PPDB TA ${targetAyId}] ${notes}`,
        created_by: userId,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });

      const expenseId = id || (await trx('expenses').where({ school_unit_id: effectiveUnitId }).orderBy('id', 'desc').first()).id;

      // Jurnal Pengeluaran Kas PPDB
      try {
        await recordJournal({
          schoolUnitId,
          academicYearId: targetAyId,
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

