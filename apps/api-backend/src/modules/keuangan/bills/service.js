/**
 * Bills (Tagihan Siswa) Service for Keuangan Module
 * Covers Features #13, #14, #15, #16
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const crossModuleServices = require('../common/crossModuleServices');

class BillsService {
  // ============================================================
  // 1. GENERATE TAGIHAN MASSAL & PREVIEW (Fitur #13)
  // ============================================================

  /**
   * Menghitung preview atau eksekusi tagihan untuk sekumpulan siswa
   */
  async calculateBillsForStudents(schoolUnitId, params) {
    const { fee_type_id, period_month = null, period_year, target, class_id = null, student_ids = [] } = params;

    // 1. Dapatkan jenis biaya
    const feeType = await db('fee_types')
      .where({ id: fee_type_id, school_unit_id: schoolUnitId })
      .first();

    if (!feeType) {
      throw new Error('Jenis biaya tidak ditemukan');
    }

    // 2. Dapatkan target siswa via crossModuleServices
    let targetStudents = [];
    if (target === 'class' && class_id) {
      targetStudents = await crossModuleServices.getStudentsByClass(class_id, schoolUnitId);
    } else if (target === 'individual' && student_ids.length > 0) {
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

    // 4. Dapatkan penyesuaian biaya aktif (approved)
    const adjustments = await db('student_fee_adjustments')
      .where({ fee_type_id, school_unit_id: schoolUnitId, status: 'approved' });
    const adjMap = {};
    adjustments.forEach(adj => {
      adjMap[adj.student_id] = adj;
    });

    // 5. Kalkulasi nominal per siswa
    const calculatedBills = [];
    const defaultDueDate = `${period_year}-${String(period_month || 8).padStart(2, '0')}-10`;

    for (const student of targetStudents) {
      const gradeLevelId = student.current_grade_level_id || student.grade_level_id || 1;
      let baseAmount = refAmountMap[gradeLevelId] || 350000.00; // fallback acuan

      const adj = adjMap[student.id];
      let finalAmount = baseAmount;
      let adjustmentNotes = null;

      if (adj) {
        if (adj.adjustment_kind === 'override_amount' && adj.override_amount !== null) {
          finalAmount = parseFloat(adj.override_amount);
          adjustmentNotes = `Penetapan Khusus: Rp ${finalAmount}`;
        } else if (adj.adjustment_kind === 'waiver') {
          if (adj.waiver_percentage !== null) {
            const disc = (parseFloat(adj.waiver_percentage) / 100) * baseAmount;
            finalAmount = Math.max(0, baseAmount - disc);
            adjustmentNotes = `Keringanan (${adj.waiver_type || 'Beasiswa'} ${adj.waiver_percentage}%): Diskon Rp ${disc}`;
          } else if (adj.waiver_amount !== null) {
            finalAmount = Math.max(0, baseAmount - parseFloat(adj.waiver_amount));
            adjustmentNotes = `Keringanan Potongan: Rp ${adj.waiver_amount}`;
          }
        }
      }

      calculatedBills.push({
        school_unit_id: Number(schoolUnitId),
        student_id: student.id,
        student_name: student.full_name,
        fee_type_id: Number(fee_type_id),
        fee_type_name: feeType.name,
        period_month: period_month ? Number(period_month) : null,
        period_year: Number(period_year),
        base_amount: baseAmount,
        final_amount: finalAmount,
        adjustment_applied: adjustmentNotes,
        due_date: defaultDueDate,
        status: 'unpaid'
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
        }

        const existing = await existQuery.first();
        if (!existing) {
          const [id] = await trx('student_bills').insert({
            school_unit_id: schoolUnitId,
            student_id: b.student_id,
            fee_type_id: b.fee_type_id,
            period_month: b.period_month,
            period_year: b.period_year,
            amount: b.final_amount,
            due_date: b.due_date,
            status: 'unpaid'
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
      dataAfter: { generated_count: createdIds.length, params }
    });

    return {
      generated_count: createdIds.length,
      bill_ids: createdIds
    };
  }

  // ============================================================
  // 2. LIST & DETAIL TAGIHAN (Fitur #14)
  // ============================================================

  async listBills(schoolUnitId, filters = {}) {
    let query = db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where('student_bills.school_unit_id', schoolUnitId)
      .select(
        'student_bills.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      );

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

    const bills = await query.orderBy('student_bills.due_date', 'desc');

    // Enrich dengan data siswa dummy / cross-module
    return Promise.all(bills.map(async b => {
      const student = await crossModuleServices.getStudent(b.student_id);
      return {
        ...b,
        student_name: student?.full_name || `Siswa ID ${b.student_id}`
      };
    }));
  }

  async getBillById(schoolUnitId, id) {
    const bill = await db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where({ 'student_bills.id': id, 'student_bills.school_unit_id': schoolUnitId })
      .select(
        'student_bills.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      )
      .first();

    if (!bill) return null;

    const payments = await db('bill_payments')
      .where('student_bill_id', id)
      .orderBy('paid_at', 'asc');

    const student = await crossModuleServices.getStudent(bill.student_id);

    return {
      ...bill,
      student_name: student?.full_name || `Siswa ID ${bill.student_id}`,
      payments
    };
  }

  // ============================================================
  // 3. BATALKAN TAGIHAN (Fitur #15)
  // ============================================================

  async cancelBill(schoolUnitId, id, cancelReason, userId = null) {
    const bill = await this.getBillById(schoolUnitId, id);
    if (!bill) return { error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan' };

    // Validasi: tagihan yang sudah dibayar sebagian/lunas tidak boleh dibatalkan
    if (bill.payments && bill.payments.length > 0) {
      return { error: 'CONFLICT', message: 'Tagihan yang sudah memiliki riwayat pembayaran tidak dapat dibatalkan' };
    }

    await db('student_bills')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'cancelled',
        cancel_reason: cancelReason,
        cancelled_at: db.fn.now()
      });

    const updated = await this.getBillById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CANCEL_BILL',
      entityType: 'student_bill',
      entityId: id,
      dataBefore: bill,
      dataAfter: updated
    });

    return { data: updated };
  }

  // ============================================================
  // 4. REMINDER TAGIHAN (Fitur #16)
  // ============================================================

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
}

module.exports = new BillsService();
