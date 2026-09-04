/**
 * Bills (Tagihan Siswa) Service for Keuangan Module
 * Covers Features #13, #14, #15, #16
 */
const db = require('../../../config/db/keuangan');
const dbAkademik = require('../../../config/db/akademik');
const { logFinanceAudit } = require('../common/auditLogService');
const crossModuleServices = require('../common/crossModuleServices');
const { recordJournal } = require('../bookkeeping/journalEngine');

const isUnit = (id) => id && id !== 'all' && id !== 'foundation' && id !== 'null' && Number(id) !== 0;

/**
 * Stubs untuk integrasi ke Modul 12 (Komunikasi & Notifikasi)
 * Sesuai ARSITEKTUR-SISTEM.md Bagian 6 (In-Process Mock Services)
 */
async function notifyBillIssued(billId) {
  console.log(`[STUB NOTIFIKASI] Modul 12 - Tagihan #${billId} telah diterbitkan resmi.`);
}

async function notifyBillRevised(billId, revisionId) {
  console.log(`[STUB NOTIFIKASI] Modul 12 - Tagihan #${billId} telah direvisi (Revisi ID: ${revisionId}).`);
}

/**
 * Evaluasi Persetujuan Berjenjang untuk Diskon Kasuistik (Bagian 4)
 * - Tingkat 1 (Diskon <= 15% atau <= Rp 200.000): Langsung disahkan role keuangan (status 'draft')
 * - Tingkat 2 (Diskon > 15% s.d. 50% atau > Rp 200.000): Butuh approval Kepala Satuan Pendidikan (status 'pending_approval', tier 'unit')
 * - Tingkat 3 (Diskon full_waiver / 100% atau > 50%): Butuh approval Yayasan (status 'pending_approval', tier 'yayasan') DAN wajib lampiran SK resmi
 */
function determineDiscountApprovalTier({ discountType, discountAmount, discountPercentage, baseAmount, discountSkDocUrl }) {
  const numericDiscount = parseFloat(discountAmount || 0);
  const numericPct = parseFloat(discountPercentage || 0);
  const numericBase = parseFloat(baseAmount || 0);

  // Jika tidak ada diskon sama sekali
  if (numericDiscount <= 0 && (!discountType || discountType === 'none') && numericPct <= 0) {
    return { required: false, tier: null, status: 'draft' };
  }

  // Tingkat 3: Full waiver (100%) atau diskon > 50%
  if (discountType === 'full_waiver' || numericPct >= 100 || (numericBase > 0 && numericDiscount >= numericBase) || numericPct > 50) {
    return { required: true, tier: 'yayasan', status: 'pending_approval' };
  }

  // Tingkat 2: Diskon > 15% s.d. 50% atau nominal diskon > Rp 200.000
  const effectivePct = numericPct > 0 ? numericPct : (numericBase > 0 ? (numericDiscount / numericBase) * 100 : 0);
  if (effectivePct > 15 || numericDiscount > 200000) {
    return { required: true, tier: 'unit', status: 'pending_approval' };
  }

  // Tingkat 1: Diskon <= 15% atau <= Rp 200.000
  return { required: false, tier: null, status: 'draft' };
}

function formatDateOnly(d) {
  if (!d) return null;
  if (typeof d === 'string') {
    const clean = d.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return clean;
  }
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

class BillsService {
  // ============================================================
  // 1. GENERATE TAGIHAN MASSAL & PREVIEW (Fitur #13)
  // ============================================================

  /**
   * Menghitung preview atau eksekusi tagihan untuk sekumpulan siswa
   * Sesuai Bagian 4 (Approval Berjenjang) & Bagian 5 (Pola Penagihan billing_pattern)
   */
  async calculateBillsForStudents(schoolUnitId, params) {
    const { fee_type_id, target, class_id = null, student_ids = [] } = params;

    // 1. Dapatkan jenis biaya & periksa pola penagihan
    const feeType = await db('fee_types')
      .where({ id: fee_type_id })
      .first();

    if (!feeType) {
      throw new Error('Jenis biaya tidak ditemukan');
    }

    // Resolusi period_month berdasarkan billing_pattern
    let resolvedMonth = null;
    if (feeType.billing_pattern === 'monthly') {
      resolvedMonth = params.period_month ? Number(params.period_month) : (new Date().getMonth() + 1);
    } else {
      // 'yearly' & 'incidental' tidak terikat bulan tertentu
      resolvedMonth = null;
    }

    // Resolusi period_year (mengacu pada Tahun Ajaran terkait)
    let periodYear = params.period_year ? Number(params.period_year) : null;
    if (!periodYear && params.academic_year_id) {
      try {
        const ay = await crossModuleServices.getAcademicYear(params.academic_year_id);
        if (ay && ay.name) {
          const parts = ay.name.split('/');
          if (parts.length === 2) {
            const startY = parseInt(parts[0], 10);
            const endY = parseInt(parts[1], 10);
            if (resolvedMonth && resolvedMonth <= 6) {
              periodYear = endY || startY;
            } else {
              periodYear = startY || endY;
            }
          } else {
            const matchYear = ay.name.match(/\d{4}/);
            if (matchYear) periodYear = parseInt(matchYear[0], 10);
          }
        }
      } catch (e) {
        console.warn('[BillsService] Gagal resolve academic_year_id:', e.message);
      }
    }
    if (!periodYear) {
      periodYear = new Date().getFullYear();
    }

    // Resolusi defaultDueDate
    let defaultDueDate = null;
    if (feeType.billing_pattern === 'monthly') {
      defaultDueDate = params.due_date || `${periodYear}-${String(resolvedMonth).padStart(2, '0')}-10`;
    } else if (feeType.billing_pattern === 'yearly') {
      defaultDueDate = params.due_date || `${periodYear}-08-10`;
    } else {
      // 'incidental'
      defaultDueDate = params.due_date || `${periodYear}-10-10`;
    }

    // 2. Dapatkan target siswa via crossModuleServices
    let targetStudents = [];
    if (target === 'class' && class_id) {
      targetStudents = await crossModuleServices.getStudentsByClass(class_id, schoolUnitId);
    } else if ((target === 'individual' || target === 'selected') && Array.isArray(student_ids) && student_ids.length > 0) {
      for (const sId of student_ids) {
        const std = await crossModuleServices.getStudent(sId);
        if (std) targetStudents.push(std);
      }
    } else {
      // 'all'
      targetStudents = await crossModuleServices.getAllActiveStudents(schoolUnitId);
    }

    // 3. Dapatkan nominal acuan per grade level
    const referenceAmounts = await db('fee_reference_amounts')
      .where({ fee_type_id, school_unit_id: schoolUnitId });
    const refAmountMap = {};
    referenceAmounts.forEach(ra => {
      refAmountMap[ra.grade_level_id] = parseFloat(ra.reference_amount);
    });

    // 4. Dapatkan penetapan skema biaya siswa (student_fee_scheme_assignments) pada tahun ajaran terkait
    let asgQuery = db('student_fee_scheme_assignments')
      .leftJoin('fee_schemes', 'student_fee_scheme_assignments.fee_scheme_id', 'fee_schemes.id')
      .where({
        'student_fee_scheme_assignments.school_unit_id': schoolUnitId
      });

    if (params.academic_year_id) {
      const countForAY = await db('student_fee_scheme_assignments')
        .where('school_unit_id', schoolUnitId)
        .where(function() {
          this.where('academic_year_id', params.academic_year_id)
            .orWhereNull('academic_year_id');
        })
        .count('* as total')
        .first();

      if (countForAY && Number(countForAY.total) > 0) {
        asgQuery = asgQuery.where(function() {
          this.where('student_fee_scheme_assignments.academic_year_id', params.academic_year_id)
            .orWhereNull('student_fee_scheme_assignments.academic_year_id');
        });
      }
    }

    const assignments = await asgQuery.select(
      'student_fee_scheme_assignments.*',
      'fee_schemes.name as scheme_name',
      'fee_schemes.code as scheme_code'
    );
    const assignmentMap = {};
    assignments.forEach(a => {
      assignmentMap[a.student_id] = a;
    });

    // Dapatkan rincian pos biaya per skema (fee_scheme_items)
    const schemeItems = await db('fee_scheme_items')
      .where({ fee_type_id });
    const schemeItemMap = {};
    schemeItems.forEach(si => {
      schemeItemMap[si.fee_scheme_id] = si;
    });

    // 5. Dapatkan penyesuaian biaya custom aktif (student_fee_adjustments)
    const adjustments = await db('student_fee_adjustments')
      .where({ fee_type_id, school_unit_id: schoolUnitId, status: 'approved' });
    const adjMap = {};
    adjustments.forEach(adj => {
      adjMap[adj.student_id] = adj;
    });

    // 6. Kalkulasi nominal per siswa & evaluasi approval tier
    const calculatedBills = [];

    for (const student of targetStudents) {
      const asg = assignmentMap[student.id];

      // Sesuai requirement: Ketika generate harus mengacu kepada penetapan biaya siswa pada tahun ajaran terkait,
      // yang tidak ditetapkan disana tidak perlu ditetapkan (dilewati).
      if (params.academic_year_id && !asg) {
        continue;
      }

      const gradeLevelId = student.current_grade_level_id || student.grade_level_id || 1;
      let baseAmount = refAmountMap[gradeLevelId] || 350000.00; // fallback acuan

      let finalAmount = baseAmount;
      let discountAmount = 0;
      let discountType = null;
      let discountPercentage = null;
      let discountSkNumber = null;
      let discountSkDate = null;
      let discountSkDocUrl = null;
      let discountReason = null;
      let adjustmentNotes = null;

      if (asg && asg.fee_scheme_id && !asg.is_custom) {
        // Prioritas 1: Hitung berdasarkan skema biaya yang terpasang
        const sItem = schemeItemMap[asg.fee_scheme_id];
        if (sItem) {
          if (sItem.value_type === 'fixed_amount') {
            finalAmount = parseFloat(sItem.value || 0);
            discountAmount = Math.max(0, baseAmount - finalAmount);
            discountType = 'fixed_amount';
            adjustmentNotes = `Skema ${asg.scheme_name || asg.scheme_code} (Tarif Tetap: Rp ${finalAmount.toLocaleString('id-ID')})`;
          } else if (sItem.value_type === 'percentage_of_reference') {
            discountPercentage = parseFloat(sItem.value || 0);
            discountAmount = (discountPercentage / 100) * baseAmount;
            finalAmount = Math.max(0, baseAmount - discountAmount);
            discountType = 'percentage';
            adjustmentNotes = `Skema ${asg.scheme_name || asg.scheme_code} (Diskon ${sItem.value}%: Rp ${discountAmount.toLocaleString('id-ID')})`;
          } else if (sItem.value_type === 'waiver_full') {
            discountAmount = baseAmount;
            finalAmount = 0;
            discountType = 'full_waiver';
            discountPercentage = 100.00;
            adjustmentNotes = `Skema ${asg.scheme_name || asg.scheme_code} (Bebas Biaya 100%)`;
          }
        } else {
          adjustmentNotes = `Skema ${asg.scheme_name || asg.scheme_code} (Mengikuti Acuan)`;
        }
      } else {
        // Prioritas 2: Penyesuaian khusus custom (student_fee_adjustments)
        const adj = adjMap[student.id];
        if (adj) {
          discountSkNumber = adj.sk_number || null;
          discountSkDate = adj.sk_date || null;
          discountSkDocUrl = adj.sk_document_url || null;
          discountReason = adj.reason || null;

          if (adj.adjustment_kind === 'override_amount' && adj.override_amount !== null) {
            finalAmount = parseFloat(adj.override_amount);
            discountAmount = Math.max(0, baseAmount - finalAmount);
            discountType = 'fixed_amount';
            adjustmentNotes = `Penetapan Khusus: Rp ${finalAmount.toLocaleString('id-ID')}`;
          } else if (adj.adjustment_kind === 'waiver') {
            if (adj.waiver_percentage !== null) {
              discountPercentage = parseFloat(adj.waiver_percentage);
              discountAmount = (discountPercentage / 100) * baseAmount;
              finalAmount = Math.max(0, baseAmount - discountAmount);
              discountType = discountPercentage >= 100 ? 'full_waiver' : 'percentage';
              adjustmentNotes = `Keringanan (${adj.waiver_type || 'Beasiswa'} ${adj.waiver_percentage}%): Diskon Rp ${discountAmount.toLocaleString('id-ID')}`;
            } else if (adj.waiver_amount !== null) {
              discountAmount = parseFloat(adj.waiver_amount);
              finalAmount = Math.max(0, baseAmount - discountAmount);
              discountType = 'fixed_amount';
              adjustmentNotes = `Keringanan Potongan: Rp ${discountAmount.toLocaleString('id-ID')}`;
            }
          }
        }
      }

      // Evaluasi Persetujuan Berjenjang
      const approvalEval = determineDiscountApprovalTier({
        discountType,
        discountAmount,
        discountPercentage,
        baseAmount,
        discountSkDocUrl
      });

      calculatedBills.push({
        school_unit_id: Number(schoolUnitId),
        student_id: student.id,
        student_name: student.full_name,
        fee_type_id: Number(fee_type_id),
        fee_type_name: feeType.name,
        billing_pattern: feeType.billing_pattern,
        period_month: resolvedMonth,
        period_year: Number(periodYear),
        academic_year_id: params.academic_year_id ? Number(params.academic_year_id) : null,
        base_amount: baseAmount,
        discount_amount: discountAmount,
        discount_type: discountType,
        discount_percentage: discountPercentage,
        discount_sk_number: discountSkNumber,
        discount_sk_date: discountSkDate,
        discount_sk_document_url: discountSkDocUrl,
        discount_reason: discountReason,
        final_amount: finalAmount,
        adjustment_applied: adjustmentNotes,
        due_date: defaultDueDate,
        status: approvalEval.status,
        approval_tier: approvalEval.tier
      });
    }

    return calculatedBills;
  }

  async previewBillGeneration(schoolUnitId, params) {
    const bills = await this.calculateBillsForStudents(schoolUnitId, params);
    const totalAmount = bills.reduce((acc, b) => acc + b.final_amount, 0);

    return {
      total_students: bills.length,
      total_amount: totalAmount,
      bills
    };
  }

  async generateBills(schoolUnitId, params, userId = null) {
    const billsToCreate = await this.calculateBillsForStudents(schoolUnitId, params);
    const createdIds = [];

    await db.transaction(async (trx) => {
      for (const b of billsToCreate) {
        // Cek duplikasi tagihan untuk student_id, fee_type_id, period_year, period_month yang sama
        let existQuery = trx('student_bills')
          .where({
            school_unit_id: schoolUnitId,
            student_id: b.student_id,
            fee_type_id: b.fee_type_id,
            period_year: b.period_year
          })
          .whereNot('status', 'cancelled');

        if (b.period_month) {
          existQuery = existQuery.where('period_month', b.period_month);
        } else {
          existQuery = existQuery.whereNull('period_month');
        }

        const existing = await existQuery.first();
        if (!existing) {
          const [id] = await trx('student_bills').insert({
            school_unit_id: schoolUnitId,
            student_id: b.student_id,
            academic_year_id: params.academic_year_id || null,
            fee_type_id: b.fee_type_id,
            period_month: b.period_month,
            period_year: b.period_year,
            amount: b.final_amount,
            paid_amount: 0.00,
            discount_amount: b.discount_amount || 0.00,
            discount_type: b.discount_type || null,
            discount_percentage: b.discount_percentage || null,
            discount_sk_number: b.discount_sk_number || null,
            discount_sk_date: b.discount_sk_date || null,
            discount_sk_document_url: b.discount_sk_document_url || null,
            discount_reason: b.discount_reason || null,
            due_date: b.due_date,
            version: 1,
            status: b.status || 'draft',
            approval_tier: b.approval_tier || null
          });
          createdIds.push(id);
        }
      }
    });

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'GENERATE_BILLS_MASSAL',
      entityType: 'student_bills',
      dataAfter: { generated_count: createdIds.length, params, status: 'draft' }
    });

    return {
      generated_count: createdIds.length,
      bill_ids: createdIds
    };
  }

  async updateDraftBill(schoolUnitId, id, data, userId = null) {
    const bill = await db('student_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan siswa tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Jika tagihan sudah terbit (bukan draft), delegasikan ke alur revisi pasca-terbit
    if (bill.status !== 'draft') {
      return this.reviseIssuedBill(schoolUnitId, id, data, userId);
    }

    if (!data.edit_reason || !data.edit_reason.trim()) {
      const err = new Error('Alasan pengubahan draft tagihan (edit_reason) wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const previousSnapshot = {
      amount: bill.amount,
      discount_amount: bill.discount_amount,
      discount_type: bill.discount_type,
      discount_percentage: bill.discount_percentage,
      discount_sk_number: bill.discount_sk_number,
      discount_sk_date: bill.discount_sk_date,
      discount_sk_document_url: bill.discount_sk_document_url,
      discount_reason: bill.discount_reason,
      due_date: bill.due_date,
      status: bill.status
    };

    const newAmount = data.amount !== undefined ? parseFloat(data.amount) : parseFloat(bill.amount);
    const newDiscount = data.discount_amount !== undefined ? parseFloat(data.discount_amount) : parseFloat(bill.discount_amount);
    const newDueDate = data.due_date || bill.due_date;
    const discountType = data.discount_type !== undefined ? data.discount_type : bill.discount_type;
    const discountPercentage = data.discount_percentage !== undefined ? data.discount_percentage : bill.discount_percentage;
    const discountSkNumber = data.discount_sk_number !== undefined ? data.discount_sk_number : bill.discount_sk_number;
    const discountSkDate = data.discount_sk_date !== undefined ? data.discount_sk_date : bill.discount_sk_date;
    const discountSkDocUrl = data.discount_sk_document_url !== undefined ? data.discount_sk_document_url : bill.discount_sk_document_url;
    const discountReason = data.discount_reason !== undefined ? data.discount_reason : bill.discount_reason;

    await db('student_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        amount: newAmount,
        discount_amount: newDiscount,
        discount_type: discountType,
        discount_percentage: discountPercentage,
        discount_sk_number: discountSkNumber,
        discount_sk_date: discountSkDate,
        discount_sk_document_url: discountSkDocUrl,
        discount_reason: discountReason,
        due_date: newDueDate,
        previous_data: JSON.stringify(previousSnapshot),
        edit_reason: data.edit_reason.trim()
      });

    const updated = await this.getBillById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_DRAFT_BILL',
      entityType: 'student_bills',
      entityId: id,
      dataBefore: previousSnapshot,
      dataAfter: {
        amount: newAmount,
        discount_amount: newDiscount,
        discount_sk_number: discountSkNumber,
        due_date: newDueDate,
        edit_reason: data.edit_reason.trim()
      }
    });

    return updated;
  }

  async publishBills(schoolUnitId, params = {}, userId = null) {
    let query = db('student_bills')
      .leftJoin('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where({
        'student_bills.school_unit_id': schoolUnitId,
        'student_bills.status': 'draft'
      })
      .select(
        'student_bills.id as id',
        'student_bills.school_unit_id',
        'student_bills.student_id',
        'student_bills.fee_type_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'student_bills.amount',
        'student_bills.discount_amount',
        'student_bills.due_date',
        'student_bills.status',
        'fee_types.name as fee_type_name'
      );

    if (params.bill_ids && Array.isArray(params.bill_ids) && params.bill_ids.length > 0) {
      const pendingBills = await db('student_bills')
        .whereIn('id', params.bill_ids)
        .where('school_unit_id', schoolUnitId)
        .where('status', 'pending_approval');
      if (pendingBills.length > 0) {
        const err = new Error(
          `Tagihan #${pendingBills.map(b => b.id).join(', ')} tidak dapat diterbitkan karena masih berstatus 'pending_approval' (menunggu persetujuan diskon). Harap setujui diskon terlebih dahulu.`
        );
        err.statusCode = 422;
        throw err;
      }
      query = query.whereIn('student_bills.id', params.bill_ids);
    }
    if (params.fee_type_id) {
      query = query.where('student_bills.fee_type_id', params.fee_type_id);
    }
    if (params.period_year) {
      query = query.where('student_bills.period_year', params.period_year);
    }
    if (params.period_month) {
      query = query.where('student_bills.period_month', params.period_month);
    }

    const draftBills = await query;
    if (draftBills.length === 0) {
      return {
        published_count: 0,
        bill_ids: [],
        message: 'Tidak ada tagihan berstatus draft yang sesuai untuk diterbitkan'
      };
    }

    const publishedIds = [];

    await db.transaction(async (trx) => {
      for (const bill of draftBills) {
        const now = trx.fn.now();
        await trx('student_bills')
          .where({ id: bill.id })
          .update({
            status: 'unpaid',
            published_at: now,
            published_by: userId
          });

        publishedIds.push(bill.id);

        // Buat jurnal piutang via recordJournal jika nominal tagihan > 0
        const billAmount = parseFloat(bill.amount || 0);
        if (billAmount > 0) {
          let targetMappingId = bill.billing_account_mapping_id || null;
          let targetDebitId = null;
          let targetCreditId = bill.related_revenue_account_id || null;

          if (!targetMappingId && bill.fee_type_id) {
            const ft = await trx('fee_types').where({ id: bill.fee_type_id }).first();
            if (ft) {
              targetMappingId = ft.billing_account_mapping_id || null;
              targetCreditId = ft.related_revenue_account_id || targetCreditId;
            }
          }

          if (targetMappingId) {
            const rule = await trx('transaction_account_mappings').where({ id: targetMappingId }).first();
            if (rule) {
              if (rule.debit_account_id) targetDebitId = rule.debit_account_id;
              if (rule.credit_account_id) targetCreditId = rule.credit_account_id;
            }
          }

          await recordJournal({
            schoolUnitId,
            mappingId: targetMappingId,
            transactionCode: 'student_bill_issued',
            amount: billAmount,
            sourceType: 'student_bill_issued',
            sourceId: bill.id,
            description: `Penerbitan tagihan #${bill.id} (${bill.fee_type_name || 'Tagihan Siswa'} Periode ${bill.period_month || '-'}/${bill.period_year})`,
            journalDate: new Date(),
            overrideDebitAccountId: targetDebitId,
            overrideCreditAccountId: targetCreditId,
            userId,
            trx
          });
        }

        await logFinanceAudit({
          schoolUnitId,
          userId,
          action: 'PUBLISH_STUDENT_BILL',
          entityType: 'student_bills',
          entityId: bill.id,
          dataBefore: { status: 'draft' },
          dataAfter: { status: 'unpaid', published_by: userId, amount: bill.amount },
          trx
        });

        // Trigger notifikasi stub ke orang tua (Modul 12)
        notifyBillIssued(bill.id);
      }
    });

    return {
      published_count: publishedIds.length,
      bill_ids: publishedIds
    };
  }

  // ============================================================
  // 2. LIST & DETAIL TAGIHAN (Fitur #14)
  // ============================================================

  async listBills(schoolUnitId, filters = {}) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : null;

    let query = db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .select(
        'student_bills.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      );

    if (targetUnit) {
      query = query.where('student_bills.school_unit_id', targetUnit);
    }

    if (filters.academic_year_id) {
      query = query.where('student_bills.academic_year_id', filters.academic_year_id);
    }
    if (filters.status) {
      query = query.where('student_bills.status', filters.status);
    }
    if (filters.student_id) {
      query = query.where('student_bills.student_id', filters.student_id);
    }
    if (filters.fee_type_id) {
      query = query.where('student_bills.fee_type_id', filters.fee_type_id);
    }
    if (filters.period_year) {
      query = query.where('student_bills.period_year', filters.period_year);
    }
    if (filters.period_month) {
      query = query.where('student_bills.period_month', filters.period_month);
    }

    const bills = await query.orderBy('student_bills.id', 'desc');

    const studentIds = [...new Set(bills.map(b => b.student_id))];
    const studentsMap = {};
    if (studentIds.length > 0) {
      for (const sId of studentIds) {
        const std = await crossModuleServices.getStudent(sId);
        if (std) studentsMap[sId] = std;
      }
    }

    let enrichedBills = bills.map(b => {
      const student = studentsMap[b.student_id];
      return {
        ...b,
        bill_date: formatDateOnly(b.bill_date),
        due_date: formatDateOnly(b.due_date),
        created_at: formatDateOnly(b.created_at) || b.created_at,
        student_name: student?.full_name || `Siswa ID ${b.student_id}`,
        nis: student?.nis || student?.nipd || '-',
        nipd: student?.nipd || student?.nis || '-',
        class_id: student?.class_id || student?.class_group_id || null,
        class_name: student?.class_name || student?.class_group_name || student?.rombel_name || '-'
      };
    });

    if (filters.class_id) {
      enrichedBills = enrichedBills.filter(b => String(b.class_id) === String(filters.class_id));
    }

    return enrichedBills;
  }

  async getBillById(schoolUnitId, id) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : null;
    let query = db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where('student_bills.id', id)
      .select(
        'student_bills.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      );

    if (targetUnit) {
      query = query.where('student_bills.school_unit_id', targetUnit);
    }

    const bill = await query.first();

    if (!bill) return null;

    const payments = await db('bill_payments')
      .where('student_bill_id', id)
      .orderBy('paid_at', 'asc');

    const reminders = await db('bill_reminder_logs')
      .where('student_bill_id', id)
      .orderBy('sent_at', 'desc');

    const revisions = await db('student_bill_revisions')
      .leftJoin('journal_entries', 'student_bill_revisions.adjustment_journal_entry_id', 'journal_entries.id')
      .where('student_bill_revisions.student_bill_id', id)
      .select(
        'student_bill_revisions.*',
        'journal_entries.journal_number as adjustment_journal_number'
      )
      .orderBy('student_bill_revisions.revision_number', 'asc');

    const student = await crossModuleServices.getStudent(bill.student_id);

    return {
      ...bill,
      bill_date: formatDateOnly(bill.bill_date),
      due_date: formatDateOnly(bill.due_date),
      created_at: formatDateOnly(bill.created_at) || bill.created_at,
      student_name: student?.full_name || `Siswa ID ${bill.student_id}`,
      nis: student?.nis || student?.nipd || '-',
      nipd: student?.nipd || student?.nis || '-',
      class_id: student?.class_id || student?.class_group_id || null,
      class_name: student?.class_name || student?.class_group_name || student?.rombel_name || '-',
      payments: payments.map(p => ({
        ...p,
        paid_at: formatDateOnly(p.paid_at) || p.paid_at
      })),
      reminders,
      revisions
    };
  }

  // ============================================================
  // 3. BATALKAN TAGIHAN (Fitur #15)
  // ============================================================

  async cancelBill(schoolUnitId, id, cancelReason, userId = null, cancelledAt = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : null;
    const bill = await this.getBillById(schoolUnitId, id);
    if (!bill) return { error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan' };

    // Validasi: tagihan yang sudah dibayar sebagian/lunas tidak boleh dibatalkan
    if ((bill.payments && bill.payments.length > 0) || parseFloat(bill.paid_amount || 0) > 0 || bill.status === 'paid' || bill.status === 'partially_paid') {
      return {
        error: 'CONFLICT',
        message: `Tagihan #${id} sudah memiliki riwayat pembayaran sebesar Rp ${parseFloat(bill.paid_amount || 0).toLocaleString('id-ID')} dari orang tua/santri, sehingga tidak dapat dibatalkan.`
      };
    }

    const cancelDateVal = cancelledAt ? new Date(cancelledAt) : new Date();

    return db.transaction(async (trx) => {
      let updateQuery = trx('student_bills').where({ id });
      if (targetUnit) {
        updateQuery = updateQuery.where({ school_unit_id: targetUnit });
      }
      await updateQuery.update({
        status: 'cancelled',
        cancel_reason: cancelReason || 'Dibatalkan oleh pengelola keuangan',
        cancelled_at: cancelDateVal
      });

      // Jurnal Pembalik (Reversal) jika tagihan sudah terbit (bukan draft) dan ada nominal piutang
      if (bill.status !== 'draft' && parseFloat(bill.amount || 0) > 0) {
        try {
          const feeType = await trx('fee_types').where({ id: bill.fee_type_id }).first();
          let targetDebitId = null;
          let targetCreditId = feeType?.related_revenue_account_id || null;

          const mappingId = feeType?.billing_account_mapping_id || null;
          if (mappingId) {
            const rule = await trx('transaction_account_mappings').where({ id: mappingId }).first();
            if (rule) {
              if (rule.debit_account_id) targetDebitId = rule.debit_account_id;
              if (rule.credit_account_id) targetCreditId = rule.credit_account_id;
            }
          }

          // Pembalik: Debit akun Pendapatan (targetCreditId), Kredit akun Piutang (targetDebitId)
          await recordJournal({
            schoolUnitId: bill.school_unit_id || targetUnit || 1,
            mappingId: null,
            transactionCode: 'student_bill_cancelled',
            amount: parseFloat(bill.amount),
            sourceType: 'student_bill_cancelled',
            sourceId: bill.id,
            description: `Pembatalan tagihan #${bill.id} (${feeType?.name || bill.fee_type_name || 'Tagihan'}) - Siswa ${bill.student_name || 'ID ' + bill.student_id}: ${cancelReason || 'Dibatalkan'}`,
            journalDate: cancelDateVal,
            overrideDebitAccountId: targetCreditId,
            overrideCreditAccountId: targetDebitId,
            userId,
            trx
          });
        } catch (jErr) {
          console.warn('[BillsService] Notice jurnal pembalik pembatalan tagihan:', jErr.message);
        }
      }

      const updated = await trx('student_bills').where({ id }).first();
      await logFinanceAudit({
        schoolUnitId: bill.school_unit_id,
        userId,
        action: 'CANCEL_BILL',
        entityType: 'student_bills',
        entityId: id,
        dataBefore: bill,
        dataAfter: updated,
        trx
      });

      return { data: updated };
    });
  }

  // ============================================================
  // 4. REMINDER TAGIHAN (Fitur #16)
  // ============================================================

  async sendBillReminder(schoolUnitId, billId, channel = 'whatsapp', userId = null) {
    const validChannels = ['whatsapp', 'email', 'sms'];
    const chosenChannel = validChannels.includes(channel) ? channel : 'whatsapp';

    const bill = await db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where({
        'student_bills.id': billId,
        'student_bills.school_unit_id': schoolUnitId
      })
      .select('student_bills.*', 'fee_types.name as fee_type_name')
      .first();

    if (!bill) {
      return { error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan' };
    }

    if (bill.status === 'paid') {
      return { error: 'CONFLICT', message: 'Tagihan ini sudah lunas, tidak perlu dikirim pengingat' };
    }

    if (bill.status === 'cancelled') {
      return { error: 'CONFLICT', message: 'Tagihan ini telah dibatalkan' };
    }

    const student = await crossModuleServices.getStudent(bill.student_id);
    const sentAt = new Date();

    // 1. Simpan baris baru ke bill_reminder_logs
    const [logId] = await db('bill_reminder_logs').insert({
      student_bill_id: bill.id,
      channel: chosenChannel,
      sent_at: sentAt
    });

    // 2. Logging STUB pengiriman pesan ke console aplikasi
    const dueDateStr = bill.due_date ? (typeof bill.due_date === 'string' ? bill.due_date.slice(0, 10) : bill.due_date.toISOString().slice(0, 10)) : '-';
    console.log(
      `[STUB REMINDER] Tagihan #${bill.id} - Kirim ke wali siswa "${student?.full_name || 'ID ' + bill.student_id}" via ${chosenChannel.toUpperCase()}: ` +
      `Assalamu'alaikum, mengingatkan tagihan ${bill.fee_type_name} (Periode: ${bill.period_month ? bill.period_month + '/' : ''}${bill.period_year}) ` +
      `sebesar Rp ${parseFloat(bill.amount).toLocaleString('id-ID')} jatuh tempo pada ${dueDateStr}. Terima kasih.`
    );

    // 3. Audit log finansial
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'SEND_BILL_REMINDER',
      entityType: 'bill_reminder_logs',
      entityId: logId,
      dataAfter: { student_bill_id: bill.id, channel: chosenChannel, sent_at: sentAt }
    });

    const createdLog = await db('bill_reminder_logs').where({ id: logId }).first();

    return {
      data: {
        id: logId,
        student_bill_id: bill.id,
        channel: chosenChannel,
        sent_at: createdLog?.sent_at || sentAt,
        message: `Pengingat tagihan #${bill.id} berhasil dikirim via ${chosenChannel.toUpperCase()}`
      }
    };
  }

  async runReminders(schoolUnitId, userId = null) {
    // Ambil tagihan unpaid yang mendekati / lewat jatuh tempo
    const bills = await db('student_bills')
      .where({ school_unit_id: schoolUnitId, status: 'unpaid' })
      .limit(50);

    const logEntries = [];
    for (const b of bills) {
      const [logId] = await db('bill_reminder_logs').insert({
        student_bill_id: b.id,
        channel: 'whatsapp'
      });
      logEntries.push(logId);
    }

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'RUN_BILL_REMINDERS',
      entityType: 'bill_reminder_logs',
      dataAfter: { reminded_count: logEntries.length }
    });

    return {
      reminded_count: logEntries.length,
      message: `Berhasil memproses reminder untuk ${logEntries.length} tagihan`
    };
  }

  async getReminderLogs(schoolUnitId, billId) {
    return db('bill_reminder_logs')
      .join('student_bills', 'bill_reminder_logs.student_bill_id', 'student_bills.id')
      .where({ 'bill_reminder_logs.student_bill_id': billId, 'student_bills.school_unit_id': schoolUnitId })
      .select('bill_reminder_logs.*')
      .orderBy('bill_reminder_logs.sent_at', 'desc');
  }

  async writeOffBill(schoolUnitId, id, reason, userId = null) {
    if (!reason || !reason.trim()) {
      const err = new Error('Alasan penghapusan buku piutang (write-off) wajib diisi');
      err.statusCode = 400;
      throw err;
    }

    const bill = await db('student_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status === 'paid' || bill.status === 'written_off' || bill.status === 'cancelled') {
      const err = new Error(`Tagihan dengan status '${bill.status}' tidak dapat dihapus-bukukan`);
      err.statusCode = 400;
      throw err;
    }

    const paidSum = await db('bill_payments')
      .where({ student_bill_id: id })
      .sum('amount as total_paid')
      .first();
    const totalPaid = paidSum?.total_paid ? parseFloat(paidSum.total_paid) : 0;
    const remainingAmount = Math.max(0, parseFloat(bill.amount) - totalPaid);

    if (remainingAmount <= 0) {
      const err = new Error('Tagihan sudah lunas, tidak ada sisa piutang yang dapat dihapus-bukukan');
      err.statusCode = 400;
      throw err;
    }

    const before = { ...bill };

    await db('student_bills').where({ id }).update({
      status: 'written_off',
      cancel_reason: reason,
      edit_reason: reason
    });

    const updated = await db('student_bills').where({ id }).first();

    // Catat auto-journal write off piutang
    try {
      await recordJournal({
        schoolUnitId,
        transactionCode: 'student_bill_write_off',
        amount: remainingAmount,
        sourceType: 'student_bill_write_off',
        sourceId: id,
        description: `Penghapusan Piutang Tagihan #${id} (Alasan: ${reason})`,
        userId
      });
    } catch (journalErr) {
      console.warn('Auto journal for write-off skipped or error:', journalErr.message);
    }

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'WRITE_OFF_STUDENT_BILL',
      entityType: 'student_bill',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, write_off_amount: remainingAmount, reason }
    });

    return {
      bill: updated,
      write_off_amount: remainingAmount,
      message: `Tagihan #${id} berhasil dihapus-bukukan sebesar Rp ${remainingAmount.toLocaleString('id-ID')}`
    };
  }

  // ============================================================
  // 6. DRAFT MANUAL AD-HOC (INDIVIDUAL) - BAGIAN 2
  // ============================================================

  async createManualDraftBill(schoolUnitId, data, userId = null) {
    const studentId = Number(data.student_id);
    const feeTypeId = Number(data.fee_type_id);
    const amount = parseFloat(data.amount);
    const dueDate = data.due_date;
    const periodMonth = data.period_month !== undefined && data.period_month !== '' && data.period_month !== null
      ? Number(data.period_month)
      : null;

    if (!studentId || isNaN(studentId)) {
      const err = new Error('student_id wajib diisi berupa ID siswa yang valid');
      err.statusCode = 422;
      throw err;
    }

    if (!feeTypeId || isNaN(feeTypeId)) {
      const err = new Error('fee_type_id wajib diisi berupa ID jenis biaya yang valid');
      err.statusCode = 422;
      throw err;
    }

    if (isNaN(amount) || amount < 0) {
      const err = new Error('Nominal tagihan (amount) wajib diisi berupa angka valid >= 0');
      err.statusCode = 422;
      throw err;
    }

    if (!dueDate) {
      const err = new Error('Jatuh tempo (due_date) wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    // 1. Verifikasi jenis biaya & pola penagihan
    const feeType = await db('fee_types')
      .where({ id: feeTypeId })
      .first();
    if (!feeType) {
      const err = new Error('Jenis biaya tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // 2. Resolve academic_year_id & period_year
    let academicYearId = data.academic_year_id ? Number(data.academic_year_id) : null;
    let periodYear = data.period_year ? Number(data.period_year) : null;

    if (!periodYear) {
      if (academicYearId) {
        try {
          const ay = await crossModuleServices.getAcademicYear(academicYearId);
          if (ay && ay.name) {
            const parts = ay.name.split('/');
            if (parts.length === 2) {
              const startY = parseInt(parts[0], 10);
              const endY = parseInt(parts[1], 10);
              if (periodMonth && periodMonth <= 6) {
                periodYear = endY || startY;
              } else {
                periodYear = startY || endY;
              }
            } else {
              const matchYear = ay.name.match(/\d{4}/);
              if (matchYear) periodYear = parseInt(matchYear[0], 10);
            }
          }
        } catch (e) {
          console.warn('[BillsService] Gagal resolve academic_year_id:', e.message);
        }
      }
      if (!periodYear) {
        periodYear = new Date(dueDate).getFullYear() || new Date().getFullYear();
      }
    }

    // 3. Verifikasi siswa via crossModuleServices
    const student = await crossModuleServices.getStudent(studentId);
    if (!student) {
      const err = new Error(`Data siswa dengan ID ${studentId} tidak ditemukan di modul Akademik`);
      err.statusCode = 404;
      throw err;
    }

    // 4. Cek duplikasi tagihan aktif yang serupa
    let dupQuery = db('student_bills')
      .where({
        school_unit_id: schoolUnitId,
        student_id: studentId,
        fee_type_id: feeTypeId,
        period_year: periodYear
      })
      .whereNot('status', 'cancelled');

    if (periodMonth) {
      dupQuery = dupQuery.where('period_month', periodMonth);
    } else {
      dupQuery = dupQuery.whereNull('period_month');
    }

    const existing = await dupQuery.first();
    if (existing) {
      const err = new Error(
        `Tagihan aktif untuk siswa ${student.full_name || studentId} pada jenis biaya '${feeType.name}' periode ${periodMonth ? periodMonth + '/' : ''}${periodYear} sudah ada (ID #${existing.id}, Status: ${existing.status}).`
      );
      err.statusCode = 409;
      throw err;
    }

    // 5. Data diskon kasuistik jika ada & evaluasi approval berjenjang (Bagian 4)
    const discountAmount = parseFloat(data.discount_amount || 0.00);
    const discountType = data.discount_type || null;
    const discountPercentage = data.discount_percentage ? parseFloat(data.discount_percentage) : null;
    const discountSkNumber = data.discount_sk_number ? String(data.discount_sk_number).trim() : null;
    const discountSkDate = data.discount_sk_date || null;
    const discountSkDocumentUrl = data.discount_sk_document_url || null;
    const discountReason = data.discount_reason || data.edit_reason || null;

    const approvalEval = determineDiscountApprovalTier({
      discountType,
      discountAmount,
      discountPercentage,
      baseAmount: amount + discountAmount,
      discountSkDocUrl: discountSkDocumentUrl
    });

    // 6. Simpan baris draf tagihan baru
    const [insertedId] = await db('student_bills').insert({
      school_unit_id: schoolUnitId,
      student_id: studentId,
      academic_year_id: academicYearId,
      fee_type_id: feeTypeId,
      period_month: periodMonth,
      period_year: periodYear,
      amount: amount,
      paid_amount: 0.00,
      discount_amount: discountAmount,
      discount_type: discountType,
      discount_percentage: discountPercentage,
      discount_sk_number: discountSkNumber,
      discount_sk_date: discountSkDate,
      discount_sk_document_url: discountSkDocumentUrl,
      discount_reason: discountReason,
      due_date: dueDate,
      version: 1,
      status: approvalEval.status,
      approval_tier: approvalEval.tier,
      edit_reason: data.notes || 'Pembuatan draf tagihan manual individual'
    });

    const billId = insertedId || (await db('student_bills').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CREATE_MANUAL_DRAFT_BILL',
      entityType: 'student_bills',
      entityId: billId,
      dataAfter: {
        student_id: studentId,
        fee_type_id: feeTypeId,
        academic_year_id: academicYearId,
        amount,
        discount_amount: discountAmount,
        discount_sk_number: discountSkNumber,
        status: approvalEval.status,
        approval_tier: approvalEval.tier
      }
    });

    return this.getBillById(schoolUnitId, billId);
  }

  // ============================================================
  // 7. REVISI PASCA-TERBIT & RIWAYAT REVISI - BAGIAN 3
  // ============================================================

  async reviseIssuedBill(schoolUnitId, id, data, userId = null) {
    const bill = await db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where({ 'student_bills.id': id, 'student_bills.school_unit_id': schoolUnitId })
      .select('student_bills.*', 'fee_types.name as fee_type_name')
      .first();

    if (!bill) {
      const err = new Error('Tagihan siswa tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status === 'cancelled') {
      const err = new Error('Tagihan yang telah dibatalkan tidak dapat direvisi');
      err.statusCode = 400;
      throw err;
    }

    const revisionReason = data.revision_reason ? String(data.revision_reason).trim() : (data.edit_reason ? String(data.edit_reason).trim() : '');
    if (!revisionReason) {
      const err = new Error('Alasan revisi tagihan (revision_reason) wajib diisi untuk rekam jejak audit');
      err.statusCode = 422;
      throw err;
    }

    // 1. SAFEGUARD WAJIB: Ambil akumulasi nominal yang sudah terbayar
    const paidAgg = await db('bill_payments')
      .where({ student_bill_id: id })
      .sum('amount as sum')
      .first();
    const paidAmount = parseFloat(paidAgg?.sum || bill.paid_amount || 0);

    const previousAmount = parseFloat(bill.amount);
    const newAmount = data.new_amount !== undefined
      ? parseFloat(data.new_amount)
      : (data.amount !== undefined ? parseFloat(data.amount) : previousAmount);

    if (isNaN(newAmount) || newAmount < 0) {
      const err = new Error('Nominal tagihan baru hasil revisi harus berupa angka valid >= 0');
      err.statusCode = 422;
      throw err;
    }

    // Tolak revisi jika new_amount < paid_amount
    if (newAmount < paidAmount) {
      const err = new Error(
        `Revisi ditolak: Nominal baru tagihan (Rp ${newAmount.toLocaleString('id-ID')}) tidak boleh lebih kecil dari jumlah yang telah dibayar oleh santri (Rp ${paidAmount.toLocaleString('id-ID')}). Silakan gunakan alur 'Pengembalian Lebih Bayar / Restitusi' jika diperlukan.`
      );
      err.statusCode = 422;
      throw err;
    }

    const previousDiscountAmount = parseFloat(bill.discount_amount || 0);
    const newDiscountAmount = data.new_discount_amount !== undefined
      ? parseFloat(data.new_discount_amount)
      : (data.discount_amount !== undefined ? parseFloat(data.discount_amount) : previousDiscountAmount);

    const previousDueDate = bill.due_date;
    const newDueDate = data.new_due_date || data.due_date || previousDueDate;

    const discountSkNumber = data.discount_sk_number !== undefined ? data.discount_sk_number : bill.discount_sk_number;
    const discountSkDate = data.discount_sk_date !== undefined ? data.discount_sk_date : bill.discount_sk_date;
    const discountSkDocumentUrl = data.discount_sk_document_url !== undefined ? data.discount_sk_document_url : bill.discount_sk_document_url;
    const discountReason = data.discount_reason !== undefined ? data.discount_reason : bill.discount_reason;
    const discountType = data.discount_type !== undefined ? data.discount_type : bill.discount_type;
    const discountPercentage = data.discount_percentage !== undefined ? data.discount_percentage : bill.discount_percentage;

    return db.transaction(async (trx) => {
      let adjustmentJournalEntryId = null;

      // 2. JURNAL PENYESUAIAN OTOMATIS jika tagihan sudah terbit (bukan draft)
      if (bill.status !== 'draft' && bill.status !== 'pending_approval') {
        const amountDiff = previousAmount - newAmount;

        // Tagihan berkurang (Diskon atau Koreksi Turun) -> Debit Beban Diskon, Kredit Piutang
        if (amountDiff > 0) {
          try {
            const jrn = await recordJournal({
              schoolUnitId,
              transactionCode: 'student_bill_discount',
              amount: amountDiff,
              sourceType: 'student_bill_revision',
              sourceId: bill.id,
              description: `Penyesuaian diskon tagihan #${bill.id} v${bill.version + 1} (${bill.fee_type_name}): ${revisionReason}`,
              journalDate: new Date(),
              userId,
              trx
            });
            adjustmentJournalEntryId = jrn.journal_id || jrn.id || null;
          } catch (jErr) {
            console.warn('[BillsService] Gagal mencatat jurnal penyesuaian diskon:', jErr.message);
          }
        }
        // Tagihan bertambah (Koreksi Naik) -> Debit Piutang, Kredit Pendapatan
        else if (amountDiff < 0) {
          try {
            const jrn = await recordJournal({
              schoolUnitId,
              transactionCode: 'student_bill_issued',
              amount: Math.abs(amountDiff),
              sourceType: 'student_bill_revision',
              sourceId: bill.id,
              description: `Penambahan piutang tagihan #${bill.id} v${bill.version + 1} (${bill.fee_type_name}): ${revisionReason}`,
              journalDate: new Date(),
              userId,
              trx
            });
            adjustmentJournalEntryId = jrn.journal_id || jrn.id || null;
          } catch (jErr) {
            console.warn('[BillsService] Gagal mencatat jurnal penambahan piutang:', jErr.message);
          }
        }
      }

      // 3. Tentukan status baru pasca penyesuaian nominal
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

      // 4. Catat riwayat ke student_bill_revisions
      const lastRev = await trx('student_bill_revisions')
        .where({ student_bill_id: id })
        .orderBy('revision_number', 'desc')
        .first();
      const nextRevNumber = lastRev ? lastRev.revision_number + 1 : 1;

      const [revId] = await trx('student_bill_revisions').insert({
        student_bill_id: id,
        revision_number: nextRevNumber,
        previous_amount: previousAmount,
        new_amount: newAmount,
        previous_discount_amount: previousDiscountAmount,
        new_discount_amount: newDiscountAmount,
        previous_due_date: previousDueDate,
        new_due_date: newDueDate,
        discount_sk_number: discountSkNumber,
        discount_sk_date: discountSkDate,
        discount_sk_document_url: discountSkDocumentUrl,
        discount_reason: discountReason,
        revision_reason: revisionReason,
        adjustment_journal_entry_id: adjustmentJournalEntryId,
        created_by: userId || 1
      });

      const actualRevId = revId || (await trx('student_bill_revisions').where({ student_bill_id: id }).orderBy('id', 'desc').first()).id;

      // 5. Update baris student_bills utama
      await trx('student_bills')
        .where({ id, school_unit_id: schoolUnitId })
        .update({
          amount: newAmount,
          paid_amount: paidAmount,
          discount_amount: newDiscountAmount,
          discount_type: discountType,
          discount_percentage: discountPercentage,
          discount_sk_number: discountSkNumber,
          discount_sk_date: discountSkDate,
          discount_sk_document_url: discountSkDocumentUrl,
          discount_reason: discountReason,
          due_date: newDueDate,
          version: bill.version + 1,
          status: newStatus,
          edit_reason: revisionReason,
          previous_data: JSON.stringify({
            amount: previousAmount,
            discount_amount: previousDiscountAmount,
            due_date: previousDueDate,
            version: bill.version,
            revised_at: new Date()
          })
        });

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'REVISE_STUDENT_BILL',
        entityType: 'student_bills',
        entityId: id,
        dataBefore: { amount: previousAmount, discount: previousDiscountAmount, version: bill.version },
        dataAfter: { amount: newAmount, discount: newDiscountAmount, version: bill.version + 1, revision_id: actualRevId },
        trx
      });

      // Panggil stub notifikasi Modul 12
      notifyBillRevised(id, actualRevId);

      return {
        bill_id: id,
        revision_id: actualRevId,
        revision_number: nextRevNumber,
        version: bill.version + 1,
        status: newStatus,
        previous_amount: previousAmount,
        new_amount: newAmount,
        adjustment_journal_entry_id: adjustmentJournalEntryId
      };
    });
  }

  async getBillRevisions(schoolUnitId, billId) {
    const bill = await db('student_bills')
      .where({ id: billId, school_unit_id: schoolUnitId })
      .first();
    if (!bill) return null;

    return db('student_bill_revisions')
      .leftJoin('journal_entries', 'student_bill_revisions.adjustment_journal_entry_id', 'journal_entries.id')
      .where({ 'student_bill_revisions.student_bill_id': billId })
      .select(
        'student_bill_revisions.*',
        'journal_entries.journal_number as adjustment_journal_number'
      )
      .orderBy('student_bill_revisions.revision_number', 'asc');
  }

  // ============================================================
  // 8. APPROVAL BERJENJANG DISKON KASUISTIK - BAGIAN 4
  // ============================================================

  async approveBillDiscount(schoolUnitId, id, userId = null, userRoles = []) {
    const bill = await db('student_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan siswa tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status !== 'pending_approval') {
      const err = new Error(`Tagihan #${id} tidak sedang menunggu persetujuan diskon (status saat ini: ${bill.status})`);
      err.statusCode = 422;
      throw err;
    }

    // Cek wewenang approval berdasarkan tier
    const isSuper = userRoles.includes('super_admin');
    const isYayasan = userRoles.includes('admin_yayasan') || isSuper;
    const isUnit = userRoles.includes('admin_satuan_pendidikan') || isYayasan;

    if (bill.approval_tier === 'yayasan') {
      if (!isYayasan) {
        const err = new Error('Persetujuan diskon tingkat Yayasan / Full Waiver hanya dapat dilakukan oleh role admin_yayasan atau super_admin');
        err.statusCode = 403;
        throw err;
      }
      // Validasi dokumen SK wajib terisi sebelum disahkan jika full waiver / > 50%
      if (!bill.discount_sk_document_url || !String(bill.discount_sk_document_url).trim()) {
        const err = new Error('Persetujuan diskon tingkat Yayasan / Full Waiver gagal: Dokumen SK resmi (discount_sk_document_url) wajib dilampirkan sebelum status dapat disahkan');
        err.statusCode = 422;
        throw err;
      }
    } else if (bill.approval_tier === 'unit' && !isUnit) {
      const err = new Error('Persetujuan diskon tingkat Satuan Pendidikan hanya dapat dilakukan oleh Kepala Satuan Pendidikan (admin_satuan_pendidikan) atau di atasnya');
      err.statusCode = 403;
      throw err;
    }

    // Perbarui status menjadi draft (sekarang siap diterbitkan)
    await db('student_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'draft',
        approved_by: userId,
        approved_at: db.fn.now()
      });

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'APPROVE_BILL_DISCOUNT',
      entityType: 'student_bills',
      entityId: id,
      dataBefore: { status: 'pending_approval', tier: bill.approval_tier },
      dataAfter: {
        status: 'draft',
        approval_tier: bill.approval_tier,
        approved_by: userId
      }
    });

    return this.getBillById(schoolUnitId, id);
  }

  async rejectBillDiscount(schoolUnitId, id, reason, userId = null, userRoles = []) {
    if (!reason || !String(reason).trim()) {
      const err = new Error('Alasan penolakan diskon wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const bill = await db('student_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!bill) {
      const err = new Error('Tagihan siswa tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (bill.status !== 'pending_approval') {
      const err = new Error(`Tagihan #${id} tidak sedang menunggu persetujuan diskon (status saat ini: ${bill.status})`);
      err.statusCode = 422;
      throw err;
    }

    // Cek hak tolak (sama dengan hak approve)
    const isSuper = userRoles.includes('super_admin');
    const isYayasan = userRoles.includes('admin_yayasan') || isSuper;
    const isUnit = userRoles.includes('admin_satuan_pendidikan') || isYayasan;

    if (bill.approval_tier === 'yayasan' && !isYayasan) {
      const err = new Error('Penolakan diskon tingkat Yayasan hanya dapat dilakukan oleh role admin_yayasan atau super_admin');
      err.statusCode = 403;
      throw err;
    }
    if (bill.approval_tier === 'unit' && !isUnit) {
      const err = new Error('Penolakan diskon tingkat Satuan Pendidikan hanya dapat dilakukan oleh Kepala Satuan Pendidikan atau di atasnya');
      err.statusCode = 403;
      throw err;
    }

    // Kembalikan ke nominal bruto tanpa diskon, status menjadi 'draft'
    const restoredAmount = parseFloat(bill.amount) + parseFloat(bill.discount_amount || 0);

    await db('student_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        amount: restoredAmount,
        discount_amount: 0.00,
        discount_type: null,
        discount_percentage: null,
        discount_sk_number: null,
        discount_sk_date: null,
        discount_sk_document_url: null,
        discount_reason: null,
        approval_tier: null,
        rejection_reason: reason.trim(),
        status: 'draft'
      });

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'REJECT_BILL_DISCOUNT',
      entityType: 'student_bills',
      entityId: id,
      dataBefore: { amount: bill.amount, discount_amount: bill.discount_amount, tier: bill.approval_tier },
      dataAfter: { amount: restoredAmount, discount_amount: 0.00, rejection_reason: reason.trim(), status: 'draft' }
    });

    return this.getBillById(schoolUnitId, id);
  }

  // ============================================================
  // 9. GENERATOR BULANAN POLA HIBRIDA (CRON + ONE-CLICK) - BAGIAN 5
  // ============================================================

  async autoGenerateMonthlyDraftBills(targetAcademicYearId = null, targetMonth = null) {
    const today = new Date();
    // Default target month = bulan berikutnya (misal tgl 25 Agustus -> bulan target September)
    const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const resolvedMonth = targetMonth !== null ? Number(targetMonth) : (nextMonthDate.getMonth() + 1);
    const resolvedYear = nextMonthDate.getFullYear();

    // Dapatkan semua satuan pendidikan aktif
    let schoolUnits = [];
    try {
      schoolUnits = await crossModuleServices.listSchoolUnits();
    } catch (e) {
      console.warn('[BillsScheduler] Gagal mengambil list school units, fallback default:', e.message);
      schoolUnits = [{ id: 1 }, { id: 2 }];
    }

    const results = [];

    for (const unit of schoolUnits) {
      const unitId = unit.id;

      // Ambil seluruh fee_types dengan billing_pattern = 'monthly' dan is_active = 1
      const monthlyFeeTypes = await db('fee_types')
        .where({
          school_unit_id: unitId,
          billing_pattern: 'monthly',
          is_active: 1
        });

      let unitGeneratedTotal = 0;

      for (const ft of monthlyFeeTypes) {
        try {
          const genRes = await this.generateBills(unitId, {
            fee_type_id: ft.id,
            period_month: resolvedMonth,
            period_year: resolvedYear,
            academic_year_id: targetAcademicYearId,
            target: 'all'
          }, 1);
          unitGeneratedTotal += genRes.generated_count || 0;
        } catch (err) {
          console.warn(`[BillsScheduler] Gagal generate fee_type #${ft.id} unit #${unitId}:`, err.message);
        }
      }

      results.push({
        school_unit_id: unitId,
        period_month: resolvedMonth,
        period_year: resolvedYear,
        generated_count: unitGeneratedTotal
      });
    }

    console.log(`[BillsScheduler] Selesai auto-generate draf bulanan periode ${resolvedMonth}/${resolvedYear}:`, results);
    return results;
  }

  /**
   * Dapatkan acuan / penetapan biaya spesifik untuk 1 siswa
   * Digunakan pada form Buat Draf Tagihan Manual agar otomatis terisi sesuai penetapan
   */
  async getStudentFeeReference(schoolUnitId, { student_id, fee_type_id, academic_year_id }) {
    const studentId = Number(student_id);
    const feeTypeId = Number(fee_type_id) || 1;
    const ayId = academic_year_id ? Number(academic_year_id) : null;

    if (!studentId) {
      return {
        base_amount: 0,
        final_amount: 0,
        amount: 0,
        has_discount: false,
        discount_type: null,
        discount_value: 0,
        scheme_name: null,
        scheme_note: null
      };
    }

    const student = await crossModuleServices.getStudent(studentId);
    if (!student) {
      throw new Error(`Data siswa #${studentId} tidak ditemukan`);
    }

    // 1. Dapatkan informasi rombel reguler & jenjang kelas siswa pada tahun ajaran terkait
    let enrollment = null;
    if (ayId) {
      enrollment = await dbAkademik('student_class_enrollments')
        .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
        .where('student_class_enrollments.student_id', studentId)
        .where('student_class_enrollments.academic_year_id', ayId)
        .where('class_groups.type', 'reguler')
        .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
        .select('class_groups.id as class_id', 'class_groups.name as class_name', 'class_groups.grade_level_id')
        .first();
    }
    if (!enrollment) {
      enrollment = await dbAkademik('student_class_enrollments')
        .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
        .where('student_class_enrollments.student_id', studentId)
        .where('class_groups.type', 'reguler')
        .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
        .select('class_groups.id as class_id', 'class_groups.name as class_name', 'class_groups.grade_level_id')
        .orderBy('student_class_enrollments.id', 'desc')
        .first();
    }

    const gradeLevelId = enrollment?.grade_level_id || student.current_grade_level_id || student.grade_level_id || 1;
    const className = enrollment?.class_name || '';

    // 2. Dapatkan penetapan skema siswa (student_fee_scheme_assignments)
    let asg = null;
    if (ayId) {
      asg = await db('student_fee_scheme_assignments')
        .leftJoin('fee_schemes', 'student_fee_scheme_assignments.fee_scheme_id', 'fee_schemes.id')
        .where({
          'student_fee_scheme_assignments.school_unit_id': schoolUnitId,
          'student_fee_scheme_assignments.student_id': studentId,
          'student_fee_scheme_assignments.academic_year_id': ayId
        })
        .select(
          'student_fee_scheme_assignments.*',
          'fee_schemes.name as scheme_name',
          'fee_schemes.code as scheme_code'
        )
        .orderBy('student_fee_scheme_assignments.id', 'desc')
        .first();
    }

    // Jika belum ada assignment di tahun ajaran ini, cari assignment historis siswa di tahun ajaran lain
    if (!asg) {
      asg = await db('student_fee_scheme_assignments')
        .leftJoin('fee_schemes', 'student_fee_scheme_assignments.fee_scheme_id', 'fee_schemes.id')
        .where({
          'student_fee_scheme_assignments.school_unit_id': schoolUnitId,
          'student_fee_scheme_assignments.student_id': studentId
        })
        .select(
          'student_fee_scheme_assignments.*',
          'fee_schemes.name as scheme_name',
          'fee_schemes.code as scheme_code'
        )
        .orderBy('student_fee_scheme_assignments.id', 'desc')
        .first();
    }

    // 3. Jika siswa belum pernah di-assign secara individual, cari skema default berdasarkan jenjang kelasnya
    let defaultScheme = null;
    if (!asg || (!asg.fee_scheme_id && !asg.is_custom)) {
      if (gradeLevelId == 2) {
        defaultScheme = await db('fee_schemes')
          .where({ school_unit_id: schoolUnitId, is_active: 1 })
          .where(function() {
            this.where('name', 'like', '%Kelas 8%').orWhere('code', 'K8');
          })
          .orderBy('id', 'desc')
          .first();
      } else if (gradeLevelId == 3) {
        defaultScheme = await db('fee_schemes')
          .where({ school_unit_id: schoolUnitId, is_active: 1 })
          .where(function() {
            this.where('name', 'like', '%Kelas 9%').orWhere('code', 'K9');
          })
          .orderBy('id', 'desc')
          .first();
      } else {
        defaultScheme = await db('fee_schemes')
          .where({ school_unit_id: schoolUnitId, is_active: 1 })
          .where(function() {
            this.where('name', 'like', '%Santri Baru%').orWhere('code', 'like', 'PSB%').orWhere('name', 'like', '%Kelas 7%');
          })
          .orderBy('id', 'desc')
          .first();
      }
      if (!defaultScheme) {
        defaultScheme = await db('fee_schemes')
          .where({ school_unit_id: schoolUnitId, is_active: 1 })
          .orderBy('id', 'asc')
          .first();
      }
    }

    const activeSchemeId = asg?.fee_scheme_id || defaultScheme?.id;
    const activeSchemeName = asg?.scheme_name || defaultScheme?.name || null;
    const activeSchemeCode = asg?.scheme_code || defaultScheme?.code || null;

    // 4. Cari nilai pos biaya (fee_scheme_items) dari skema tersebut
    let schemeItem = null;
    if (activeSchemeId) {
      schemeItem = await db('fee_scheme_items')
        .where({ fee_scheme_id: activeSchemeId, fee_type_id: feeTypeId })
        .first();
    }

    // 5. Cek apakah ada acuan tarif di fee_reference_amounts sebagai acuan jenjang
    const refAmountRow = await db('fee_reference_amounts')
      .where({ fee_type_id: feeTypeId, school_unit_id: schoolUnitId, grade_level_id: gradeLevelId })
      .first();

    let standardTariff = 0;
    if (schemeItem && schemeItem.value_type === 'fixed_amount') {
      standardTariff = parseFloat(schemeItem.value || 0);
    } else if (refAmountRow) {
      standardTariff = parseFloat(refAmountRow.reference_amount || 0);
    } else if (feeTypeId === 1) {
      standardTariff = 2250000.00; // Standar SPP
    }

    let baseAmount = standardTariff;
    let finalAmount = standardTariff;
    let discountAmount = 0;
    let hasDiscount = false;
    let discountType = null;
    let discountValue = 0;
    let note = activeSchemeName ? `Skema: ${activeSchemeName}${className ? ` (${className})` : ''}` : 'Standar Acuan Jenjang';

    // 6. Cek penyesuaian khusus / dispensasi siswa (student_fee_adjustments)
    const adj = await db('student_fee_adjustments')
      .where({
        student_id: studentId,
        fee_type_id: feeTypeId,
        school_unit_id: schoolUnitId,
        status: 'approved'
      })
      .orderBy('id', 'desc')
      .first();

    if (adj) {
      if (adj.adjustment_kind === 'override_amount' && adj.override_amount !== null) {
        finalAmount = parseFloat(adj.override_amount || 0);
        baseAmount = finalAmount;
        note = `Penyesuaian Khusus: Override Rp ${finalAmount.toLocaleString('id-ID')}`;
      } else if (adj.adjustment_kind === 'waiver') {
        if (adj.waiver_percentage !== null && adj.waiver_percentage !== undefined) {
          const pct = parseFloat(adj.waiver_percentage);
          discountAmount = (pct / 100) * baseAmount;
          finalAmount = Math.max(0, baseAmount - discountAmount);
          hasDiscount = true;
          discountType = 'percentage';
          discountValue = pct;
          note = `Keringanan Khusus: Diskon ${pct}% (${adj.waiver_type || 'Dispensasi'})`;
        } else if (adj.waiver_amount !== null && adj.waiver_amount !== undefined) {
          const wAmt = parseFloat(adj.waiver_amount);
          discountAmount = wAmt;
          finalAmount = Math.max(0, baseAmount - discountAmount);
          hasDiscount = true;
          discountType = 'fixed_amount';
          discountValue = wAmt;
          note = `Keringanan Khusus: Potongan Rp ${wAmt.toLocaleString('id-ID')}`;
        }
      }
    }

    return {
      base_amount: baseAmount,
      final_amount: finalAmount,
      amount: baseAmount,
      discount_amount: discountAmount,
      has_discount: hasDiscount,
      discount_type: discountType,
      discount_value: discountValue,
      scheme_name: activeSchemeName,
      scheme_code: activeSchemeCode,
      scheme_note: note
    };
  }

  // ============================================================
  // 12. MATRIX TAGIHAN SISWA & PENERBITAN MATRIX
  // ============================================================

  async getBillsMatrix(schoolUnitId, query = {}) {
    const academicYearId = query.academic_year_id ? Number(query.academic_year_id) : 1;
    const classId = query.class_id ? Number(query.class_id) : null;
    const search = query.search ? String(query.search).trim() : '';

    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : null;

    // 1. Ambil info Tahun Ajaran
    const ay = await crossModuleServices.getAcademicYear(academicYearId);
    let startYear = new Date().getFullYear();
    let endYear = startYear + 1;
    if (ay && ay.name) {
      const parts = ay.name.split('/');
      if (parts.length === 2) {
        startYear = parseInt(parts[0], 10) || startYear;
        endYear = parseInt(parts[1], 10) || (startYear + 1);
      } else {
        const match = ay.name.match(/\d{4}/);
        if (match) startYear = parseInt(match[0], 10);
      }
    }

    // 2. Ambil seluruh Jenis Biaya aktif
    let feeTypesQuery = db('fee_types')
      .where('is_active', true);
    if (targetUnit) {
      feeTypesQuery = feeTypesQuery.where(function () {
        this.where('school_unit_id', targetUnit).orWhere('school_unit_id', 0);
      });
    }
    const feeTypes = await feeTypesQuery.orderByRaw('is_system DESC, id ASC');

    const oneTimeFeeTypes = feeTypes.filter(f => f.billing_pattern === 'incidental' || f.billing_pattern === 'one_time' || (f.billing_pattern !== 'monthly' && f.billing_pattern !== 'yearly'));
    const yearlyFeeTypes = feeTypes.filter(f => f.billing_pattern === 'yearly');
    const monthlyFeeTypes = feeTypes.filter(f => f.billing_pattern === 'monthly');

    const MONTH_ORDER = [
      { month: 7, name: 'Juli', semester: 'Ganjil' },
      { month: 8, name: 'Agustus', semester: 'Ganjil' },
      { month: 9, name: 'September', semester: 'Ganjil' },
      { month: 10, name: 'Oktober', semester: 'Ganjil' },
      { month: 11, name: 'November', semester: 'Ganjil' },
      { month: 12, name: 'Desember', semester: 'Ganjil' },
      { month: 1, name: 'Januari', semester: 'Genap' },
      { month: 2, name: 'Februari', semester: 'Genap' },
      { month: 3, name: 'Maret', semester: 'Genap' },
      { month: 4, name: 'April', semester: 'Genap' },
      { month: 5, name: 'Mei', semester: 'Genap' },
      { month: 6, name: 'Juni', semester: 'Genap' }
    ];

    const columns = [];

    // A. Kolom Sekali Bayar
    oneTimeFeeTypes.forEach(ft => {
      columns.push({
        key: `fee_${ft.id}`,
        fee_type_id: ft.id,
        fee_type_name: ft.name,
        fee_type_code: ft.code,
        billing_pattern: 'one_time',
        period_month: null,
        period_year: startYear,
        month_label: null,
        label: ft.name,
        badge_type: 'one_time',
        badge_text: 'Sekali Bayar',
        badge_color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
      });
    });

    // B. Kolom Tahunan
    yearlyFeeTypes.forEach(ft => {
      columns.push({
        key: `fee_${ft.id}`,
        fee_type_id: ft.id,
        fee_type_name: ft.name,
        fee_type_code: ft.code,
        billing_pattern: 'yearly',
        period_month: null,
        period_year: startYear,
        month_label: null,
        label: ft.name,
        badge_type: 'yearly',
        badge_text: 'Tahunan',
        badge_color: 'bg-purple-50 text-purple-700 border-purple-200'
      });
    });

    // C. Kolom Bulanan (12 Bulan dari Juli s.d. Juni)
    monthlyFeeTypes.forEach(ft => {
      MONTH_ORDER.forEach(mObj => {
        const resolvedPeriodYear = (mObj.month >= 1 && mObj.month <= 6) ? endYear : startYear;
        columns.push({
          key: `fee_${ft.id}_m${mObj.month}`,
          fee_type_id: ft.id,
          fee_type_name: ft.name,
          fee_type_code: ft.code,
          billing_pattern: 'monthly',
          period_month: mObj.month,
          period_year: resolvedPeriodYear,
          month_label: mObj.name,
          semester: mObj.semester,
          label: `${ft.name} - ${mObj.name}`,
          badge_type: 'monthly',
          badge_text: `${mObj.name}`,
          badge_color: ft.is_system
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : (mObj.semester === 'Ganjil' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-teal-50 text-teal-700 border-teal-200')
        });
      });
    });

    // 3. Ambil Siswa
    const students = await crossModuleServices.getStudentsByAcademicYear(targetUnit, {
      academic_year_id: academicYearId,
      class_id: classId,
      search: search
    });

    // 4. Ambil Penetapan Skema Siswa
    let asgQuery = db('student_fee_scheme_assignments')
      .where('academic_year_id', academicYearId);
    if (targetUnit) asgQuery = asgQuery.where('school_unit_id', targetUnit);
    const assignments = await asgQuery;
    const assignmentMap = {};
    assignments.forEach(a => { assignmentMap[a.student_id] = a; });

    const schemeIds = [...new Set(assignments.map(a => a.fee_scheme_id).filter(Boolean))];
    const schemeItemsMap = {};
    if (schemeIds.length > 0) {
      const allSchemeItems = await db('fee_scheme_items').whereIn('fee_scheme_id', schemeIds);
      allSchemeItems.forEach(item => {
        if (!schemeItemsMap[item.fee_scheme_id]) schemeItemsMap[item.fee_scheme_id] = {};
        schemeItemsMap[item.fee_scheme_id][item.fee_type_id] = item;
      });
    }

    let adjQuery = db('student_fee_adjustments');
    if (targetUnit) adjQuery = adjQuery.where('school_unit_id', targetUnit);
    const adjustments = await adjQuery;
    const adjustmentMap = {};
    adjustments.forEach(adj => {
      if (!adjustmentMap[adj.student_id]) adjustmentMap[adj.student_id] = {};
      adjustmentMap[adj.student_id][adj.fee_type_id] = adj;
    });

    // 5. Ambil semua tagihan yang sudah ada di student_bills
    let billsQuery = db('student_bills')
      .where('academic_year_id', academicYearId)
      .whereNot('status', 'cancelled');
    if (targetUnit) billsQuery = billsQuery.where('school_unit_id', targetUnit);
    const existingBills = await billsQuery;

    const billsMap = {};
    existingBills.forEach(b => {
      const k = `${b.student_id}_${b.fee_type_id}_${b.period_month || 0}`;
      billsMap[k] = b;
    });

    // 5b. Ambil tagihan PPDB calon santri / siswa baru yang tertaut
    const studentIds = students.map(s => s.id);
    let ppdbBillsQuery = db('ppdb_registration_bills')
      .whereIn('linked_student_id', studentIds)
      .where('is_installment_parent', false)
      .whereNot('status', 'cancelled');
    if (academicYearId) {
      ppdbBillsQuery = ppdbBillsQuery.where(b => {
        b.where('target_academic_year_id', academicYearId)
         .orWhere('academic_year_id', academicYearId);
      });
    }
    const ppdbBills = studentIds.length > 0 ? await ppdbBillsQuery : [];
    const ppdbMap = {};
    ppdbBills.forEach(pb => {
      const k = `${pb.linked_student_id}_${pb.fee_type_id}`;
      ppdbMap[k] = pb;
    });

    // 6. Bangun baris per siswa
    const rows = students.map(st => {
      const asg = assignmentMap[st.id] || null;
      const studentSchemeItems = asg?.fee_scheme_id ? (schemeItemsMap[asg.fee_scheme_id] || {}) : {};
      const studentAdjustments = adjustmentMap[st.id] || {};

      const cells = {};

      columns.forEach(col => {
        const sItem = studentSchemeItems[col.fee_type_id];
        const cItem = studentAdjustments[col.fee_type_id];

        let baseAmount = 0;
        let isCustom = false;
        let customNote = '';

        if (cItem) {
          isCustom = true;
          if (cItem.adjustment_kind === 'waiver') {
            const discPct = parseFloat(cItem.waiver_percentage || 0);
            const nominal = sItem ? parseFloat(sItem.value || 0) : 0;
            baseAmount = Math.max(0, nominal - (nominal * discPct / 100));
            customNote = `Diskon ${cItem.waiver_type || ''} ${discPct}%`;
          } else if (cItem.adjustment_kind === 'custom_amount' || cItem.adjustment_kind === 'override_amount') {
            baseAmount = parseFloat(cItem.override_amount || 0);
            customNote = cItem.reason || 'Nominal Khusus';
          }
        } else if (sItem) {
          baseAmount = parseFloat(sItem.value || 0);
        }

        const billKey = `${st.id}_${col.fee_type_id}_${col.period_month || 0}`;
        const bill = billsMap[billKey] || null;
        const ppdbBill = ppdbMap[`${st.id}_${col.fee_type_id}`];

        if (!bill && ppdbBill && !col.period_month) {
          const ppdbPaid = parseFloat(ppdbBill.paid_amount || 0);
          const ppdbAmt = parseFloat(ppdbBill.amount || 0);
          const ppdbIsPaid = ppdbBill.status === 'paid' || (ppdbAmt > 0 && ppdbPaid >= ppdbAmt);
          const ppdbIsPartiallyPaid = ppdbBill.status === 'partially_paid' || (ppdbPaid > 0 && ppdbPaid < ppdbAmt);

          cells[col.key] = {
            key: col.key,
            fee_type_id: col.fee_type_id,
            fee_type_name: col.fee_type_name,
            fee_type_code: col.fee_type_code,
            billing_pattern: col.billing_pattern,
            period_month: col.period_month,
            period_year: col.period_year,
            month_label: col.month_label,
            base_amount: baseAmount || ppdbAmt,
            is_custom: isCustom,
            custom_note: customNote,
            bill_id: `PPDB-${ppdbBill.id}`,
            status: ppdbBill.status,
            is_published: true,
            is_paid: ppdbIsPaid,
            is_partially_paid: ppdbIsPartiallyPaid,
            is_overdue: false,
            bill_date: formatDateOnly(ppdbBill.created_at),
            due_date: formatDateOnly(ppdbBill.created_at) || `${col.period_year}-${col.period_month ? String(col.period_month).padStart(2, '0') : '10'}-10`,
            amount: ppdbAmt,
            paid_amount: ppdbPaid,
            discount_amount: parseFloat(ppdbBill.discount_amount || 0),
            discount_reason: ppdbBill.discount_reason || null,
            notes: ppdbBill.notes ? `[PPDB] ${ppdbBill.notes}` : 'Dibayar pada masa PPDB (TA Sebelumnya)'
          };
          return;
        }

        const isPublished = Boolean(bill && bill.status !== 'draft');
        const isPaid = Boolean(bill && bill.status === 'paid');
        const isPartiallyPaid = Boolean(bill && bill.status === 'partially_paid');
        const isOverdue = Boolean(bill && bill.status === 'unpaid' && bill.due_date && new Date(bill.due_date) < new Date());

        cells[col.key] = {
          key: col.key,
          fee_type_id: col.fee_type_id,
          fee_type_name: col.fee_type_name,
          fee_type_code: col.fee_type_code,
          billing_pattern: col.billing_pattern,
          period_month: col.period_month,
          period_year: col.period_year,
          month_label: col.month_label,
          base_amount: baseAmount,
          is_custom: isCustom,
          custom_note: customNote,
          bill_id: bill ? bill.id : null,
          status: bill ? bill.status : 'not_published',
          is_published: isPublished,
          is_paid: isPaid,
          is_partially_paid: isPartiallyPaid,
          is_overdue: isOverdue,
          bill_date: formatDateOnly(bill?.bill_date),
          due_date: formatDateOnly(bill?.due_date) || `${col.period_year}-${col.period_month ? String(col.period_month).padStart(2, '0') : '10'}-10`,
          amount: bill ? parseFloat(bill.amount) : baseAmount,
          paid_amount: bill ? parseFloat(bill.paid_amount || 0) : 0,
          discount_amount: bill ? parseFloat(bill.discount_amount || 0) : 0,
          discount_reason: bill?.discount_reason || null,
          notes: bill?.edit_reason || null
        };
      });

      return {
        student_id: st.id,
        nis: st.nis || '-',
        nipd: st.nipd || st.nis || '-',
        nisn: st.nisn || '-',
        name: st.full_name,
        class_id: st.class_id || st.class_group_id || null,
        class_name: st.class_name || st.class_group_name || st.rombel_name || 'Belum Ada Rombel',
        scheme_name: asg?.scheme_name || (asg?.is_custom ? 'Penetapan Khusus' : 'Belum Ditetapkan'),
        cells
      };
    });

    let totalPublished = 0;
    let totalUnpaidAR = 0;
    let totalPaid = 0;

    existingBills.forEach(b => {
      if (b.status !== 'draft') {
        totalPublished++;
        const amt = parseFloat(b.amount || 0);
        const paid = parseFloat(b.paid_amount || 0);
        totalPaid += paid;
        if (b.status === 'unpaid' || b.status === 'partially_paid') {
          totalUnpaidAR += (amt - paid);
        }
      }
    });

    return {
      academic_year: {
        id: academicYearId,
        name: ay?.name || `T.A. ${academicYearId}`,
        start_year: startYear,
        end_year: endYear,
        is_active: ay?.is_active
      },
      columns,
      rows,
      summary: {
        total_students: students.length,
        total_columns: columns.length,
        total_published_bills: totalPublished,
        total_unpaid_ar: totalUnpaidAR,
        total_paid: totalPaid
      }
    };
  }

  async publishCellBill(schoolUnitId, data, userId = null) {
    const studentId = Number(data.student_id);
    const feeTypeId = Number(data.fee_type_id);
    const periodMonth = data.period_month !== null && data.period_month !== undefined && data.period_month !== '' ? Number(data.period_month) : null;
    const periodYear = Number(data.period_year) || new Date().getFullYear();
    const academicYearId = data.academic_year_id ? Number(data.academic_year_id) : 1;
    const amount = parseFloat(data.amount || 0);
    const billDate = data.bill_date || new Date().toISOString().slice(0, 10);
    const dueDate = data.due_date || `${periodYear}-${periodMonth ? String(periodMonth).padStart(2, '0') : '10'}-10`;
    const discountAmount = parseFloat(data.discount_amount || 0);
    const discountReason = data.discount_reason || null;
    const notes = data.notes || data.edit_reason || 'Penerbitan tagihan dari matriks penagihan';

    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;

    const feeType = await db('fee_types').where({ id: feeTypeId }).first();
    if (!feeType) {
      const err = new Error('Jenis biaya tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Cek apakah sudah ada tagihan aktif
    let dupQuery = db('student_bills')
      .where({
        school_unit_id: targetUnit,
        student_id: studentId,
        fee_type_id: feeTypeId,
        period_year: periodYear
      })
      .whereNot('status', 'cancelled');
    if (periodMonth) {
      dupQuery = dupQuery.where('period_month', periodMonth);
    } else {
      dupQuery = dupQuery.whereNull('period_month');
    }
    const existing = await dupQuery.first();

    return db.transaction(async (trx) => {
      let finalBillId = null;

      if (existing) {
        finalBillId = existing.id;
        await trx('student_bills')
          .where({ id: existing.id })
          .update({
            academic_year_id: academicYearId,
            amount: amount,
            bill_date: billDate,
            due_date: dueDate,
            discount_amount: discountAmount,
            discount_reason: discountReason,
            status: 'unpaid',
            published_at: trx.fn.now(),
            published_by: userId,
            edit_reason: notes
          });
      } else {
        const [insertedId] = await trx('student_bills').insert({
          school_unit_id: targetUnit,
          student_id: studentId,
          academic_year_id: academicYearId,
          fee_type_id: feeTypeId,
          period_month: periodMonth,
          period_year: periodYear,
          amount: amount,
          paid_amount: 0.00,
          discount_amount: discountAmount,
          discount_reason: discountReason,
          bill_date: billDate,
          due_date: dueDate,
          version: 1,
          status: 'unpaid',
          published_at: trx.fn.now(),
          published_by: userId,
          edit_reason: notes
        });
        finalBillId = insertedId;
      }

      // Record Piutang Journal (student_bill_issued) jika amount > 0
      if (amount > 0) {
        try {
          const mappingId = data.mapping_id ? Number(data.mapping_id) : (feeType.billing_account_mapping_id || null);
          let targetDebitId = null;
          let targetCreditId = feeType.related_revenue_account_id || null;

          if (mappingId) {
            const rule = await trx('transaction_account_mappings').where({ id: mappingId }).first();
            if (rule) {
              if (rule.debit_account_id) targetDebitId = rule.debit_account_id;
              if (rule.credit_account_id) targetCreditId = rule.credit_account_id;
            }
          }

          await recordJournal({
            schoolUnitId: targetUnit,
            mappingId: mappingId,
            transactionCode: 'student_bill_issued',
            amount: amount,
            sourceType: 'student_bill_issued',
            sourceId: finalBillId,
            description: `Penerbitan tagihan #${finalBillId} (${feeType.name} Periode ${periodMonth ? periodMonth + '/' : ''}${periodYear})`,
            journalDate: billDate,
            overrideDebitAccountId: targetDebitId,
            overrideCreditAccountId: targetCreditId,
            userId,
            trx
          });
        } catch (jErr) {
          console.warn('[BillsService] recordJournal issued notice:', jErr.message);
        }
      }

      await logFinanceAudit({
        schoolUnitId: targetUnit,
        userId,
        action: 'PUBLISH_CELL_BILL',
        entityType: 'student_bills',
        entityId: finalBillId,
        dataAfter: { student_id: studentId, fee_type_id: feeTypeId, period_month: periodMonth, amount },
        trx
      });

      return trx('student_bills').where({ id: finalBillId }).first();
    });
  }

  async publishBatchColumnBills(schoolUnitId, data, userId = null) {
    const feeTypeId = Number(data.fee_type_id);
    const periodMonth = data.period_month !== null && data.period_month !== undefined && data.period_month !== '' ? Number(data.period_month) : null;
    const periodYear = Number(data.period_year) || new Date().getFullYear();
    const academicYearId = data.academic_year_id ? Number(data.academic_year_id) : 1;
    const studentIds = Array.isArray(data.student_ids) ? data.student_ids.map(Number) : [];
    const billDate = data.bill_date || new Date().toISOString().slice(0, 10);
    const dueDate = data.due_date || `${periodYear}-${periodMonth ? String(periodMonth).padStart(2, '0') : '10'}-10`;
    const notes = data.notes || 'Penerbitan massal kolom matriks penagihan';

    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const feeType = await db('fee_types').where({ id: feeTypeId }).first();
    if (!feeType) {
      const err = new Error('Jenis biaya tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Ambil siswa target
    let targetStudents = [];
    if (studentIds.length > 0) {
      targetStudents = await crossModuleServices.getStudentsByIds(studentIds);
    } else {
      targetStudents = await crossModuleServices.getStudentsByAcademicYear(targetUnit, {
        academic_year_id: academicYearId,
        class_id: data.class_id || null
      });
    }

    if (targetStudents.length === 0) {
      return { success: true, count: 0, message: 'Tidak ada siswa target yang ditemukan' };
    }

    // Ambil penetapan skema
    const assignments = await db('student_fee_scheme_assignments')
      .where({ academic_year_id: academicYearId })
      .whereIn('student_id', targetStudents.map(s => s.id));
    const asgMap = {};
    assignments.forEach(a => { asgMap[a.student_id] = a; });

    const schemeIds = [...new Set(assignments.map(a => a.fee_scheme_id).filter(Boolean))];
    const schemeItemsMap = {};
    if (schemeIds.length > 0) {
      const allSchemeItems = await db('fee_scheme_items').whereIn('fee_scheme_id', schemeIds);
      allSchemeItems.forEach(item => {
        if (!schemeItemsMap[item.fee_scheme_id]) schemeItemsMap[item.fee_scheme_id] = {};
        schemeItemsMap[item.fee_scheme_id][item.fee_type_id] = item;
      });
    }

    const adjustments = await db('student_fee_adjustments')
      .whereIn('student_id', targetStudents.map(s => s.id))
      .where({ fee_type_id: feeTypeId });
    const adjMap = {};
    adjustments.forEach(adj => { adjMap[adj.student_id] = adj; });

    // Ambil tagihan yang sudah terbit agar tidak duplikat
    let existQuery = db('student_bills')
      .where({
        school_unit_id: targetUnit,
        fee_type_id: feeTypeId,
        period_year: periodYear
      })
      .whereIn('student_id', targetStudents.map(s => s.id))
      .whereNot('status', 'cancelled');
    if (periodMonth) {
      existQuery = existQuery.where('period_month', periodMonth);
    } else {
      existQuery = existQuery.whereNull('period_month');
    }
    const existingBills = await existQuery;
    const existingStudentIds = new Set(existingBills.map(b => b.student_id));

    let publishedCount = 0;
    const publishedIds = [];

    await db.transaction(async (trx) => {
      for (const st of targetStudents) {
        if (existingStudentIds.has(st.id)) continue; // skip already existing bill

        const asg = asgMap[st.id] || null;
        const sItem = asg?.fee_scheme_id ? (schemeItemsMap[asg.fee_scheme_id]?.[feeTypeId]) : null;
        const cItem = adjMap[st.id] || null;

        let baseAmount = 0;
        let discountAmount = 0;
        let discountReason = null;

        if (cItem) {
          if (cItem.adjustment_kind === 'waiver') {
            const discPct = parseFloat(cItem.waiver_percentage || 0);
            const nominal = sItem ? parseFloat(sItem.value || 0) : 0;
            discountAmount = (nominal * discPct / 100);
            baseAmount = Math.max(0, nominal - discountAmount);
            discountReason = `Diskon ${cItem.waiver_type || ''} ${discPct}%`;
          } else if (cItem.adjustment_kind === 'custom_amount' || cItem.adjustment_kind === 'override_amount') {
            baseAmount = parseFloat(cItem.override_amount || 0);
            discountReason = cItem.reason || 'Nominal Khusus';
          }
        } else if (sItem) {
          baseAmount = parseFloat(sItem.value || 0);
        }

        // Jika user menetapkan diskon massal pada popup penerbitan kolom
        if (data.has_discount) {
          if (data.discount_percent && parseFloat(data.discount_percent) > 0) {
            const pct = parseFloat(data.discount_percent);
            const batchDisc = (baseAmount * pct) / 100;
            discountAmount = Math.max(discountAmount, batchDisc);
            baseAmount = Math.max(0, baseAmount - batchDisc);
            discountReason = data.discount_reason || `Diskon Kolom ${pct}%`;
          } else if (data.discount_amount && parseFloat(data.discount_amount) > 0) {
            const batchDisc = parseFloat(data.discount_amount);
            discountAmount = Math.max(discountAmount, batchDisc);
            baseAmount = Math.max(0, baseAmount - batchDisc);
            discountReason = data.discount_reason || 'Diskon Kolom Massal';
          }
        }

        // Hanya lakukan penagihan pada baris yang nominalnya > 0
        if (baseAmount <= 0) {
          continue;
        }

        const [insertedId] = await trx('student_bills').insert({
          school_unit_id: targetUnit,
          student_id: st.id,
          academic_year_id: academicYearId,
          fee_type_id: feeTypeId,
          period_month: periodMonth,
          period_year: periodYear,
          amount: baseAmount,
          paid_amount: 0.00,
          discount_amount: discountAmount,
          discount_reason: discountReason,
          bill_date: billDate,
          due_date: dueDate,
          version: 1,
          status: 'unpaid',
          published_at: trx.fn.now(),
          published_by: userId,
          edit_reason: notes
        });

        publishedIds.push(insertedId);
        publishedCount++;

        // Catat Jurnal Piutang
        if (baseAmount > 0) {
          try {
            const mappingId = data.mapping_id ? Number(data.mapping_id) : (feeType.billing_account_mapping_id || null);
            let targetDebitId = null;
            let targetCreditId = feeType.related_revenue_account_id || null;

            if (mappingId) {
              const rule = await trx('transaction_account_mappings').where({ id: mappingId }).first();
              if (rule) {
                if (rule.debit_account_id) targetDebitId = rule.debit_account_id;
                if (rule.credit_account_id) targetCreditId = rule.credit_account_id;
              }
            }

            await recordJournal({
              schoolUnitId: targetUnit,
              mappingId: mappingId,
              transactionCode: 'student_bill_issued',
              amount: baseAmount,
              sourceType: 'student_bill_issued',
              sourceId: insertedId,
              description: `Penerbitan massal kolom tagihan #${insertedId} (${feeType.name} Periode ${periodMonth ? periodMonth + '/' : ''}${periodYear}) - Siswa ${st.full_name}`,
              journalDate: billDate,
              overrideDebitAccountId: targetDebitId,
              overrideCreditAccountId: targetCreditId,
              userId,
              trx
            });
          } catch (jErr) {
            console.warn('[BillsService] Batch recordJournal notice:', jErr.message);
          }
        }
      }
    });

    return {
      success: true,
      count: publishedCount,
      total_candidates: targetStudents.length,
      skipped_already_exist: targetStudents.length - publishedCount
    };
  }

  async listReminderLogs(schoolUnitId, filters = {}) {
    let query = db('bill_reminder_logs')
      .join('student_bills', 'bill_reminder_logs.student_bill_id', 'student_bills.id')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .select(
        'bill_reminder_logs.*',
        'student_bills.student_id',
        'student_bills.amount as bill_amount',
        'student_bills.paid_amount as bill_paid_amount',
        'student_bills.due_date as bill_due_date',
        'student_bills.status as bill_status',
        'fee_types.name as fee_type_name'
      );

    if (isUnit(schoolUnitId)) {
      query = query.where('student_bills.school_unit_id', schoolUnitId);
    }
    if (filters.student_id) {
      query = query.where('student_bills.student_id', filters.student_id);
    }

    const logs = await query.orderBy('bill_reminder_logs.id', 'desc').limit(200);

    return Promise.all(logs.map(async l => {
      const student = await crossModuleServices.getStudent(l.student_id);
      return {
        ...l,
        student_name: student?.full_name || `Siswa ID ${l.student_id}`,
        nis: student?.nis || '-',
        class_name: student?.class_group_name || 'Reguler'
      };
    }));
  }

  async broadcastReminders(schoolUnitId, data, userId = null) {
    const billIds = Array.isArray(data.bill_ids) ? data.bill_ids.map(Number) : [];
    if (billIds.length === 0) {
      const err = new Error('Pilih minimal 1 tagihan untuk pengiriman reminder');
      err.statusCode = 422;
      throw err;
    }

    const bills = await db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .whereIn('student_bills.id', billIds)
      .select('student_bills.*', 'fee_types.name as fee_type_name');

    const createdLogs = [];
    const channel = data.channel || 'portal_notification';
    const customMessage = data.custom_message || null;

    for (const b of bills) {
      const student = await crossModuleServices.getStudent(b.student_id);
      const remainingAmount = parseFloat(b.amount || 0) - parseFloat(b.paid_amount || 0);
      const defaultMsg = `Pengingat Tagihan: Tagihan ${b.fee_type_name} untuk ${student?.full_name || 'Santri'} sebesar Rp ${remainingAmount.toLocaleString('id-ID')} jatuh tempo pada ${b.due_date || '-'}. Mohon segera menyelesaikan pembayaran via portal.`;

      const msg = customMessage || defaultMsg;

      const [logId] = await db('bill_reminder_logs').insert({
        student_bill_id: b.id,
        channel: channel,
        recipient_name: student?.full_name || 'Orang Tua/Wali Siswa',
        phone_or_email: student?.phone || null,
        message: msg,
        status: 'delivered',
        created_by: userId
      });

      createdLogs.push(logId);
    }

    return {
      success: true,
      sent_count: createdLogs.length,
      message: `Berhasil mengirim ${createdLogs.length} pengingat tagihan ke notifikasi Portal Orang Tua`
    };
  }

  async importColumnBills(schoolUnitId, data, userId = null) {
    const feeTypeId = Number(data.fee_type_id);
    const periodMonth = data.period_month !== null && data.period_month !== undefined && data.period_month !== '' ? Number(data.period_month) : null;
    const periodYear = Number(data.period_year) || new Date().getFullYear();
    const academicYearId = data.academic_year_id ? Number(data.academic_year_id) : 1;
    const publishMode = data.publish_mode === 'publish' ? 'publish' : 'draft';
    const mappingId = data.mapping_id ? Number(data.mapping_id) : null;
    const rows = Array.isArray(data.rows) ? data.rows : [];

    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const feeType = await db('fee_types').where({ id: feeTypeId }).first();
    if (!feeType) {
      const err = new Error('Jenis biaya tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let effectiveRuleDebitId = null;
    let effectiveRuleCreditId = feeType.related_revenue_account_id || null;
    const effectiveMappingId = mappingId || feeType.billing_account_mapping_id || null;

    if (effectiveMappingId) {
      const rule = await db('transaction_account_mappings').where({ id: effectiveMappingId }).first();
      if (rule) {
        if (rule.debit_account_id) effectiveRuleDebitId = rule.debit_account_id;
        if (rule.credit_account_id) effectiveRuleCreditId = rule.credit_account_id;
      }
    }

    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let skippedZeroCount = 0;
    let publishedCount = 0;
    let draftCount = 0;

    await db.transaction(async (trx) => {
      for (const item of rows) {
        let studentId = item.student_id ? Number(item.student_id) : null;
        if (!studentId && (item.nis || item.nipd)) {
          const matchedStudent = await crossModuleServices.getStudentByNis(item.nis || item.nipd);
          if (matchedStudent) studentId = matchedStudent.id;
        }

        if (!studentId) continue;

        const amount = parseFloat(item.amount || 0);

        // 1. Data dengan nominal 0 atau kosong sama sekali tidak diinput ke sistem
        if (amount <= 0 || isNaN(amount)) {
          skippedZeroCount++;
          continue;
        }

        const billDate = item.bill_date || new Date().toISOString().slice(0, 10);
        const dueDate = item.due_date || `${periodYear}-${periodMonth ? String(periodMonth).padStart(2, '0') : '10'}-10`;
        const notes = item.notes || `Import Excel Kolom ${feeType.name}`;

        const cleanBillDate = typeof billDate === 'string' ? billDate.slice(0, 10) : '';
        const cleanDueDate = typeof dueDate === 'string' ? dueDate.slice(0, 10) : '';

        // Cek apakah sudah ada tagihan untuk siswa & periode ini
        let dupQuery = trx('student_bills')
          .where({
            school_unit_id: targetUnit,
            student_id: studentId,
            fee_type_id: feeTypeId,
            period_year: periodYear
          })
          .whereNot('status', 'cancelled');
        if (periodMonth) {
          dupQuery = dupQuery.where('period_month', periodMonth);
        } else {
          dupQuery = dupQuery.whereNull('period_month');
        }
        const existing = await dupQuery.first();

        let finalBillId = null;
        let needJournal = false;

        if (existing) {
          finalBillId = existing.id;
          const existingAmount = parseFloat(existing.amount || 0);
          const existingBillDate = existing.bill_date ? (typeof existing.bill_date === 'string' ? existing.bill_date.slice(0, 10) : new Date(existing.bill_date).toISOString().slice(0, 10)) : '';
          const existingDueDate = existing.due_date ? (typeof existing.due_date === 'string' ? existing.due_date.slice(0, 10) : new Date(existing.due_date).toISOString().slice(0, 10)) : '';
          const existingNotes = existing.edit_reason || '';
          const existingStatus = existing.status || 'draft';

          const isPaid = existingStatus === 'paid' || existingStatus === 'partially_paid';
          const targetStatus = isPaid 
            ? existingStatus 
            : (publishMode === 'publish' ? 'unpaid' : 'draft');

          const hasDiff =
            Math.abs(existingAmount - amount) > 0.001 ||
            existingBillDate !== cleanBillDate ||
            existingDueDate !== cleanDueDate ||
            (notes && notes !== existingNotes) ||
            (publishMode === 'publish' && existingStatus === 'draft');

          // 2. Jika tidak diubah oleh user (data sama persis), tidak perlu ditimpa atau diubah
          if (!hasDiff) {
            unchangedCount++;
            continue;
          }

          // 3. Jika ada perbedaan data, timpa dengan data baru
          const updatePayload = {
            academic_year_id: academicYearId,
            amount: amount,
            bill_date: cleanBillDate,
            due_date: cleanDueDate,
            status: targetStatus,
            edit_reason: notes
          };

          if (publishMode === 'publish' && existingStatus === 'draft') {
            updatePayload.published_at = trx.fn.now();
            updatePayload.published_by = userId;
            needJournal = true;
          }

          await trx('student_bills')
            .where({ id: existing.id })
            .update(updatePayload);

          updatedCount++;
          if (targetStatus !== 'draft') {
            publishedCount++;
          } else {
            draftCount++;
          }
        } else {
          // Data Baru
          const [insertedId] = await trx('student_bills').insert({
            school_unit_id: targetUnit,
            student_id: studentId,
            academic_year_id: academicYearId,
            fee_type_id: feeTypeId,
            period_month: periodMonth,
            period_year: periodYear,
            amount: amount,
            paid_amount: 0.00,
            discount_amount: 0.00,
            discount_reason: null,
            bill_date: cleanBillDate,
            due_date: cleanDueDate,
            version: 1,
            status: publishMode === 'publish' ? 'unpaid' : 'draft',
            published_at: publishMode === 'publish' ? trx.fn.now() : null,
            published_by: publishMode === 'publish' ? userId : null,
            edit_reason: notes
          });
          finalBillId = insertedId;
          if (publishMode === 'publish') {
            needJournal = true;
            publishedCount++;
          } else {
            draftCount++;
          }
          newCount++;
        }

        // Record Journal jika publish_mode === 'publish' & amount > 0
        if (needJournal && amount > 0) {
          try {
            const student = await crossModuleServices.getStudent(studentId);
            await recordJournal({
              schoolUnitId: targetUnit,
              mappingId: effectiveMappingId,
              transactionCode: 'student_bill_issued',
              amount: amount,
              sourceType: 'student_bill_issued',
              sourceId: finalBillId,
              description: `Penerbitan tagihan #${finalBillId} via Import Excel (${feeType.name} Periode ${periodMonth ? periodMonth + '/' : ''}${periodYear}) - Siswa ${student?.full_name || studentId}`,
              journalDate: cleanBillDate,
              overrideDebitAccountId: effectiveRuleDebitId,
              overrideCreditAccountId: effectiveRuleCreditId,
              userId,
              trx
            });
          } catch (jErr) {
            console.warn('[BillsService] Import recordJournal notice:', jErr.message);
          }
        }
      }
    });

    const totalProcessed = newCount + updatedCount;
    return {
      success: true,
      total_processed: totalProcessed,
      new_count: newCount,
      updated_count: updatedCount,
      unchanged_count: unchangedCount,
      skipped_zero_count: skippedZeroCount,
      published_count: publishedCount,
      draft_count: draftCount,
      publish_mode: publishMode,
      message: publishMode === 'publish' 
        ? `Selesai: ${totalProcessed} data diproses (${newCount} baru, ${updatedCount} ditimpa), ${unchangedCount} tidak berubah, ${skippedZeroCount} nominal 0 dilewati.` 
        : `Selesai: ${totalProcessed} data draf disimpan (${newCount} baru, ${updatedCount} ditimpa), ${unchangedCount} tidak berubah, ${skippedZeroCount} nominal 0 dilewati.`
    };
  }
}

const billsServiceInstance = new BillsService();
billsServiceInstance.determineDiscountApprovalTier = determineDiscountApprovalTier;

module.exports = billsServiceInstance;
module.exports.determineDiscountApprovalTier = determineDiscountApprovalTier;
