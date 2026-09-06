/**
 * Payments Service for Keuangan Module
 * Covers Features #17, #18, #19, #20, #21
 */
const db = require('../../../config/db/keuangan');
const dbAkademik = require('../../../config/db/akademik');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');
const { terbilang } = require('../common/terbilang');
const crossModuleServices = require('../common/crossModuleServices');
const fundBalanceEngine = require('../bookkeeping/fundBalanceEngine');

function formatDateOnly(d) {
  if (!d) return null;
  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(d).slice(0, 10);
}

class PaymentsService {
  // ============================================================
  // 1. CATAT PEMBAYARAN TAGIHAN (Fitur #17)
  // ============================================================

  async generateReceiptNumber(trx, schoolUnitId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `KWT-${schoolUnitId}-${today}-`;
    const lastPayment = await trx('bill_payments')
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

  async recordBillPayment(schoolUnitId, data, userId = null, existingTrx = null) {
    const exec = async (trx) => {
      const cutoverSetting = await trx('finance_cutover_settings')
        .where({ school_unit_id: schoolUnitId })
        .first();

      const isLegacy = Boolean(data.is_legacy || data.is_historical_only);
      const historicalCashNote = data.historical_cash_note || (isLegacy ? (data.historical_note || 'Pencatatan Riwayat Saja (Non-Kas / Tanpa Mutasi Saldo)') : null);
      const paidAt = data.paid_at || new Date().toISOString();
      const paidAtStr = String(paidAt).slice(0, 10);

      if (cutoverSetting?.cutover_date && !isLegacy) {
        const cutoverDateStr = formatDateOnly(cutoverSetting.cutover_date);
        if (paidAtStr < cutoverDateStr) {
          const err = new Error(`Tanggal pembayaran normal (${paidAtStr}) tidak boleh sebelum Tanggal Mulai Pencatatan Sistem (${cutoverDateStr}).`);
          err.statusCode = 422;
          throw err;
        }
      }

      const receiptNumber = await this.generateReceiptNumber(trx, schoolUnitId);
      const cashAccountId = isLegacy
        ? (data.cash_account_id ? Number(data.cash_account_id) : null)
        : (data.override_cash_account_id ? Number(data.override_cash_account_id) : (data.cash_account_id ? Number(data.cash_account_id) : 1));
      const paymentMethod = isLegacy ? (data.payment_method || 'historical') : (data.payment_method || 'cash');

      // 1. Handle Multi-Allocation Mode (Array of allocations)
      if (data.allocations && Array.isArray(data.allocations) && data.allocations.length > 0) {
        const validAllocations = data.allocations.filter(a => parseFloat(a.amount || 0) > 0);
        if (validAllocations.length === 0) {
          return { error: 'VALIDATION', message: 'Nominal alokasi pembayaran harus lebih besar dari 0' };
        }

        const createdPaymentIds = [];

        let lastBillUnitId = schoolUnitId;
        let refStudentId = data.student_id || null;

        const allAllocatedStudentIds = [];

        for (const alloc of validAllocations) {
          const billId = alloc.student_bill_id || alloc.bill_id;
          const allocAmount = parseFloat(alloc.amount || 0);

          const bill = await trx('student_bills')
            .where({ id: billId })
            .first();

          if (!bill) {
            throw new Error(`Tagihan #${billId} tidak ditemukan`);
          }

          if (bill.school_unit_id) {
            lastBillUnitId = bill.school_unit_id;
          }
          if (bill.student_id) {
            refStudentId = bill.student_id;
            if (!allAllocatedStudentIds.includes(bill.student_id)) {
              allAllocatedStudentIds.push(bill.student_id);
            }
          }

          if (bill.status === 'paid') {
            throw new Error(`Tagihan #${billId} (${bill.fee_type_name || ''}) sudah berstatus lunas`);
          }

          const existingPayments = await trx('bill_payments')
            .where('student_bill_id', bill.id)
            .sum('amount as total_paid')
            .first();
          const currentPaid = existingPayments?.total_paid ? parseFloat(existingPayments.total_paid) : 0;
          const newTotalPaid = currentPaid + allocAmount;
          const billAmount = parseFloat(bill.amount);
          const billStatusAfter = newTotalPaid >= billAmount ? 'paid' : 'partially_paid';

          const [paymentId] = await trx('bill_payments').insert({
            student_bill_id: bill.id,
            cash_account_id: cashAccountId,
            paid_at: paidAt,
            amount: allocAmount,
            payment_method: paymentMethod,
            receipt_number: receiptNumber,
            is_legacy: isLegacy,
            historical_cash_note: historicalCashNote,
            notes: data.notes || (data.bank_statement_reference ? `Ref RK: ${data.bank_statement_reference}` : null)
          });

          const actualPaymentId = paymentId || (await trx('bill_payments').where({ receipt_number: receiptNumber, student_bill_id: bill.id }).first()).id;
          createdPaymentIds.push(actualPaymentId);

          await trx('student_bills')
            .where({ id: bill.id })
            .update({ status: billStatusAfter });

          // Keep ppdb_registration_bills in sync if linked
          try {
            await trx('ppdb_registration_bills')
              .where(b => {
                b.where({ linked_student_id: bill.student_id, fee_type_id: bill.fee_type_id })
                 .orWhere({ psb_registrant_ref_id: bill.student_id, fee_type_id: bill.fee_type_id });
              })
              .update({
                status: billStatusAfter,
                paid_amount: newTotalPaid
              });
          } catch (syncPpdbErr) {
            console.warn('[recordBillPayment] Sync PPDB bill status skipped:', syncPpdbErr.message);
          }

          const targetUnitId = bill.school_unit_id || schoolUnitId || 1;

          // Auto-journal per pos alokasi (Hanya untuk transaksi kas berjalan / non-historis)
          if (!isLegacy) {
            try {
              let ftMappingId = alloc.transaction_mapping_id || data.transaction_mapping_id || null;
              if (!ftMappingId && bill.fee_type_id) {
                const ft = await trx('fee_types').where({ id: bill.fee_type_id }).first();
                if (ft && ft.payment_account_mapping_id) {
                  ftMappingId = ft.payment_account_mapping_id;
                }
              }

              const overrideDebit = alloc.override_debit_account_id || data.override_debit_account_id || null;
              const overrideCredit = alloc.override_credit_account_id || data.override_credit_account_id || null;
              const overrideCash = alloc.override_cash_account_id || data.override_cash_account_id || null;
              const overrideReason = alloc.override_reason || data.override_reason || null;

              await recordJournal({
                schoolUnitId: targetUnitId,
                transactionCode: 'student_bill_payment',
                mappingId: ftMappingId,
                amount: allocAmount,
                sourceType: 'student_bill_payment',
                sourceId: actualPaymentId,
                description: `Pembayaran tagihan #${bill.id} (${receiptNumber}) - ${bill.fee_type_name || ''}`,
                journalDate: paidAt,
                overrideDebitAccountId: overrideDebit,
                overrideCreditAccountId: overrideCredit,
                overrideCashAccountId: overrideCash,
                overrideReason: overrideReason,
                userId,
                trx
              });
            } catch (journalErr) {
              if (journalErr.statusCode === 422) throw journalErr;
              console.warn('Auto journal skipped or error:', journalErr.message);
            }
          }

          // Fund balance mutation (Hanya jika non-historis)
          if (!isLegacy) {
            try {
              await fundBalanceEngine.applyFundMutation({
                schoolUnitId: targetUnitId,
                fundType: 'fee_type',
                fundRefId: bill.fee_type_id,
                academicYearId: Number(bill.academic_year_id || 2),
                direction: 'in',
                amount: allocAmount,
                sourceTable: 'bill_payments',
                sourceId: actualPaymentId,
                notes: `Penerimaan pos biaya tagihan #${bill.id} (${receiptNumber})`,
                userId,
                trx
              });
            } catch (fbErr) {
              console.warn('Fund balance mutation skipped or error:', fbErr.message);
            }
          }
        }

        // Jika ada referensi rekening koran bank
        if (data.bank_statement_id && !isLegacy) {
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
              const totalAllocatedPayment = validAllocations.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
              const thisAlloc = Math.min(totalAllocatedPayment, remainingPlafon);

              if (thisAlloc > 0) {
                let studentNameLabel = '';
                try {
                  if (allAllocatedStudentIds.length > 0) {
                    const stus = await dbAkademik('students').whereIn('id', allAllocatedStudentIds).select('name');
                    const names = stus.map(s => s.name).filter(Boolean);
                    if (names.length > 0) {
                      studentNameLabel = ` (${names.join(', ')})`;
                    }
                  } else if (refStudentId) {
                    const sRow = await dbAkademik('students').where({ id: refStudentId }).first();
                    if (sRow) studentNameLabel = ` (${sRow.name})`;
                  }
                } catch (e) {}

                await trx('bank_statement_references').insert({
                  bank_statement_id: stmt.id,
                  school_unit_id: schoolUnitId || lastBillUnitId || 1,
                  reference_type: 'student_bill_payment',
                  reference_id: createdPaymentIds[0] || null,
                  amount: thisAlloc,
                  notes: `Kwitansi #${receiptNumber}${studentNameLabel}`,
                  created_by: userId
                });

                const newAlloc = curAlloc + thisAlloc;
                const isFullyReconciled = newAlloc >= stmtTotal - 0.01;

                await trx('bank_statements')
                  .where({ id: stmt.id })
                  .update({
                    is_reconciled: isFullyReconciled,
                    reconciled_reference_type: 'student_bill_payment',
                    reconciled_reference_id: createdPaymentIds[0] || null,
                    reconciliation_notes: isFullyReconciled
                      ? `Lunas teralokasi ke transaksi (terakhir Kwitansi #${receiptNumber})`
                      : `Teralokasi Rp ${newAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
                    reconciled_at: isFullyReconciled ? trx.fn.now() : stmt.reconciled_at,
                    updated_at: trx.fn.now()
                  });
              }
            }
          } catch (bsErr) {
            console.warn('Bank statement reconciliation update skipped:', bsErr.message);
          }
        }

        const primaryPaymentId = createdPaymentIds[0];
        const primaryPaymentRecord = await trx('bill_payments').where({ id: primaryPaymentId }).first();

        await logFinanceAudit({
          schoolUnitId: schoolUnitId || lastBillUnitId || 1,
          userId,
          action: isLegacy ? 'RECORD_BILL_PAYMENT_HISTORICAL_MULTI' : 'RECORD_BILL_PAYMENT_MULTI',
          entityType: 'bill_payment',
          entityId: primaryPaymentId,
          dataAfter: {
            receipt_number: receiptNumber,
            allocations_count: validAllocations.length,
            created_payment_ids: createdPaymentIds,
            paid_at: paidAt,
            is_legacy: isLegacy
          },
          trx
        });

        return {
          data: {
            id: primaryPaymentId,
            receipt_number: receiptNumber,
            paid_at: paidAt,
            payment_ids: createdPaymentIds,
            is_legacy: isLegacy,
            historical_cash_note: historicalCashNote
          }
        };
      }

      // 2. Single Bill Payment Mode
      const bill = await trx('student_bills')
        .where({ id: data.student_bill_id })
        .first();

      if (!bill) {
        return { error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan' };
      }

      const targetUnitId = bill.school_unit_id || schoolUnitId || 1;

      if (bill.status === 'paid') {
        return { error: 'CONFLICT', message: 'Tagihan ini sudah berstatus lunas' };
      }

      if (bill.status === 'cancelled') {
        return { error: 'CONFLICT', message: 'Tagihan ini telah dibatalkan' };
      }

      const existingPayments = await trx('bill_payments')
        .where('student_bill_id', bill.id)
        .sum('amount as total_paid')
        .first();
      const currentPaid = existingPayments?.total_paid ? parseFloat(existingPayments.total_paid) : 0;
      const paymentAmount = parseFloat(data.amount);
      const newTotalPaid = currentPaid + paymentAmount;
      const billAmount = parseFloat(bill.amount);

      const billStatusAfter = newTotalPaid >= billAmount ? 'paid' : 'partially_paid';

      const [paymentId] = await trx('bill_payments').insert({
        student_bill_id: bill.id,
        cash_account_id: cashAccountId,
        paid_at: paidAt,
        amount: paymentAmount,
        payment_method: paymentMethod,
        receipt_number: receiptNumber,
        is_legacy: isLegacy,
        historical_cash_note: historicalCashNote,
        notes: data.notes || (data.bank_statement_reference ? `Ref RK: ${data.bank_statement_reference}` : null)
      });

      const actualPaymentId = paymentId || (await trx('bill_payments').where({ receipt_number: receiptNumber }).first()).id;

      await trx('student_bills')
        .where({ id: bill.id })
        .update({ status: billStatusAfter });

      // Keep ppdb_registration_bills in sync if linked
      try {
        await trx('ppdb_registration_bills')
          .where(b => {
            b.where({ linked_student_id: bill.student_id, fee_type_id: bill.fee_type_id })
             .orWhere({ psb_registrant_ref_id: bill.student_id, fee_type_id: bill.fee_type_id });
          })
          .update({
            status: billStatusAfter,
            paid_amount: newTotalPaid
          });
      } catch (syncPpdbErr) {
        console.warn('[recordBillPayment] Sync PPDB bill status skipped:', syncPpdbErr.message);
      }

      // Link Rekening Koran jika ada
      if (data.bank_statement_id && !isLegacy) {
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
            const thisAlloc = Math.min(paymentAmount, remainingPlafon);

            if (thisAlloc > 0) {
              let studentNameLabel = '';
              try {
                const sRow = await dbAkademik('students').where({ id: bill.student_id }).first();
                if (sRow) studentNameLabel = ` (${sRow.name})`;
              } catch (e) {}

              await trx('bank_statement_references').insert({
                bank_statement_id: stmt.id,
                school_unit_id: schoolUnitId || targetUnitId,
                reference_type: 'student_bill_payment',
                reference_id: actualPaymentId || null,
                amount: thisAlloc,
                notes: `Kwitansi #${receiptNumber}${studentNameLabel}`,
                created_by: userId
              });

              const newAlloc = curAlloc + thisAlloc;
              const isFullyReconciled = newAlloc >= stmtTotal - 0.01;

              await trx('bank_statements')
                .where({ id: stmt.id })
                .update({
                  is_reconciled: isFullyReconciled,
                  reconciled_reference_type: 'student_bill_payment',
                  reconciled_reference_id: actualPaymentId || null,
                  reconciliation_notes: isFullyReconciled
                    ? `Lunas teralokasi ke transaksi (terakhir Kwitansi #${receiptNumber})`
                    : `Teralokasi Rp ${newAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
                  reconciled_at: isFullyReconciled ? trx.fn.now() : stmt.reconciled_at,
                  updated_at: trx.fn.now()
                });
            }
          }
        } catch (bsErr) {
          console.warn('Bank statement reconciliation update skipped:', bsErr.message);
        }
      }

      // Otomatisasi Jurnal Transaksi (Hanya jika non-historis)
      if (!isLegacy) {
        try {
          let ftMappingId = data.transaction_mapping_id || null;
          if (!ftMappingId && bill.fee_type_id) {
            const ft = await trx('fee_types').where({ id: bill.fee_type_id }).first();
            if (ft && ft.payment_account_mapping_id) {
              ftMappingId = ft.payment_account_mapping_id;
            }
          }

          await recordJournal({
            schoolUnitId: targetUnitId,
            transactionCode: 'student_bill_payment',
            mappingId: ftMappingId,
            amount: paymentAmount,
            sourceType: 'student_bill_payment',
            sourceId: actualPaymentId,
            description: `Pembayaran tagihan #${bill.id} (${receiptNumber})`,
            journalDate: paidAt,
            overrideDebitAccountId: data.override_debit_account_id || null,
            overrideCreditAccountId: data.override_credit_account_id || null,
            overrideCashAccountId: data.override_cash_account_id || null,
            overrideReason: data.override_reason || null,
            userId,
            trx
          });
        } catch (journalErr) {
          if (journalErr.statusCode === 422) throw journalErr;
          console.warn('Auto journal skipped or error:', journalErr.message);
        }
      }

      // Mutasi kantong dana (Hanya jika non-historis)
      if (!isLegacy) {
        try {
          await fundBalanceEngine.applyFundMutation({
            schoolUnitId: targetUnitId,
            fundType: 'fee_type',
            fundRefId: bill.fee_type_id,
            academicYearId: Number(bill.academic_year_id || 2),
            direction: 'in',
            amount: paymentAmount,
            sourceTable: 'bill_payments',
            sourceId: actualPaymentId,
            notes: `Penerimaan pos biaya pendidikan tagihan #${bill.id} (${receiptNumber})`,
            userId,
            trx
          });
        } catch (fbErr) {
          console.warn('Fund balance mutation skipped or error:', fbErr.message);
        }
      }

      const paymentRecord = await trx('bill_payments').where({ id: actualPaymentId }).first();

      await logFinanceAudit({
        schoolUnitId: schoolUnitId || targetUnitId,
        userId,
        action: isLegacy ? 'RECORD_BILL_PAYMENT_HISTORICAL' : 'RECORD_BILL_PAYMENT',
        entityType: 'bill_payment',
        entityId: actualPaymentId,
        dataAfter: paymentRecord,
        trx
      });

      return {
        data: {
          id: actualPaymentId,
          student_bill_id: bill.id,
          amount: paymentAmount,
          status_after: billStatusAfter,
          receipt_number: receiptNumber,
          paid_at: paidAt,
          is_legacy: isLegacy,
          historical_cash_note: historicalCashNote
        }
      };
    };

    if (existingTrx) {
      return exec(existingTrx);
    }
    return db.transaction(exec);
  }

  // ============================================================
  // 1.2 DAFTAR SELURUH RIWAYAT PEMBAYARAN SISWA (Fitur Riwayat Kasir)
  // ============================================================

  async listBillPayments(schoolUnitId, filters = {}) {
    const isTargetUnit = (id) => id && id !== 'all' && id !== 'foundation' && id !== 'null' && Number(id) !== 0;
    const targetUnit = isTargetUnit(schoolUnitId) ? schoolUnitId : null;

    let q = db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .leftJoin('cash_accounts', 'bill_payments.cash_account_id', 'cash_accounts.id')
      .select(
        'bill_payments.*',
        'student_bills.student_id',
        'student_bills.school_unit_id',
        'student_bills.academic_year_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'student_bills.amount as bill_amount',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern',
        'cash_accounts.name as cash_account_name',
        'cash_accounts.account_kind'
      );

    if (targetUnit) {
      q = q.where('student_bills.school_unit_id', targetUnit);
    }
    if (filters.academic_year_id) {
      q = q.where('student_bills.academic_year_id', filters.academic_year_id);
    }
    if (filters.student_id) {
      q = q.where('student_bills.student_id', filters.student_id);
    }
    if (filters.cash_account_id) {
      q = q.where('bill_payments.cash_account_id', filters.cash_account_id);
    }
    if (filters.start_date) {
      q = q.where('bill_payments.paid_at', '>=', `${filters.start_date} 00:00:00`);
    }
    if (filters.end_date) {
      q = q.where('bill_payments.paid_at', '<=', `${filters.end_date} 23:59:59`);
    }
    if (filters.payment_method) {
      q = q.where('bill_payments.payment_method', filters.payment_method);
    }

    const payments = await q.orderBy('bill_payments.paid_at', 'desc').orderBy('bill_payments.id', 'desc');

    const studentIds = [...new Set(payments.map(p => p.student_id))];
    const studentsMap = {};
    if (studentIds.length > 0) {
      for (const sId of studentIds) {
        const std = await crossModuleServices.getStudent(sId);
        if (std) studentsMap[sId] = std;
      }
    }

    const MONTH_NAMES = {
      1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
      5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
      9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
    };

    let enriched = payments.map(p => {
      const student = studentsMap[p.student_id];
      const monthName = p.period_month ? (MONTH_NAMES[p.period_month] || '') : '';
      const isMonthlyOrSpp = (p.fee_type_name && p.fee_type_name.toLowerCase().includes('spp')) || p.billing_pattern === 'monthly';
      const componentDisplay = isMonthlyOrSpp && monthName
        ? `${p.fee_type_name} (${monthName} ${p.period_year || ''})`.trim()
        : `${p.fee_type_name} (${p.period_year || ''})`.trim();

      return {
        ...p,
        paid_at_formatted: formatDateOnly(p.paid_at) || String(p.paid_at).slice(0, 10),
        student_name: student?.full_name || `Siswa ID ${p.student_id}`,
        nis: student?.nis || student?.nipd || '-',
        class_name: student?.class_name || student?.class_group_name || student?.rombel_name || '-',
        month_name: monthName,
        component_display: componentDisplay,
        previous_data: p.previous_data ? (typeof p.previous_data === 'string' ? JSON.parse(p.previous_data) : p.previous_data) : null
      };
    });

    if (filters.search) {
      const s = filters.search.toLowerCase().trim();
      enriched = enriched.filter(p =>
        p.receipt_number?.toLowerCase().includes(s) ||
        p.student_name?.toLowerCase().includes(s) ||
        p.nis?.toLowerCase().includes(s) ||
        p.class_name?.toLowerCase().includes(s) ||
        p.component_display?.toLowerCase().includes(s) ||
        p.notes?.toLowerCase().includes(s)
      );
    }

    return enriched;
  }

  // ============================================================
  // 2. EDIT / KOREKSI PEMBAYARAN (Fitur #18)
  // ============================================================

  async getPaymentById(schoolUnitId, id) {
    return db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .where({ 'bill_payments.id': id })
      .select('bill_payments.*', 'student_bills.school_unit_id', 'student_bills.amount as bill_amount')
      .first();
  }

  async getPaymentHistory(schoolUnitId, id) {
    const payment = await this.getPaymentById(schoolUnitId, id);
    if (!payment) return null;
    return {
      payment_id: payment.id,
      current_data: payment,
      previous_data: payment.previous_data ? (typeof payment.previous_data === 'string' ? JSON.parse(payment.previous_data) : payment.previous_data) : null,
      correction_reason: payment.correction_reason
    };
  }

  async correctPayment(schoolUnitId, id, data, userId = null) {
    const { amount, paid_at, cash_account_id, payment_method, notes, correction_reason } = data;
    if (!correction_reason || !correction_reason.trim()) {
      return { error: 'VALIDATION', message: 'Alasan koreksi (correction_reason) wajib diisi' };
    }

    return db.transaction(async (trx) => {
      const payment = await trx('bill_payments')
        .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
        .where({ 'bill_payments.id': id })
        .select('bill_payments.*', 'student_bills.school_unit_id', 'student_bills.amount as bill_amount')
        .first();

      if (!payment) return { error: 'NOT_FOUND', message: 'Pembayaran tidak ditemukan' };

      const previousSnapshot = {
        amount: payment.amount,
        paid_at: payment.paid_at,
        cash_account_id: payment.cash_account_id,
        payment_method: payment.payment_method,
        notes: payment.notes
      };

      const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(payment.amount);
      const newPaidAt = paid_at || payment.paid_at;
      const newCashAccountId = cash_account_id !== undefined ? Number(cash_account_id) : payment.cash_account_id;
      const newPaymentMethod = payment_method !== undefined ? payment_method : payment.payment_method;
      const newNotes = notes !== undefined ? notes : payment.notes;

      if (!payment.is_legacy && paid_at) {
        const cutoverSetting = await trx('finance_cutover_settings')
          .where({ school_unit_id: schoolUnitId })
          .first();
        if (cutoverSetting?.cutover_date) {
          const cutoverDateStr = formatDateOnly(cutoverSetting.cutover_date);
          const newPaidAtStr = formatDateOnly(paid_at);
          if (newPaidAtStr < cutoverDateStr) {
            return {
              error: 'VALIDATION',
              message: `Tanggal pembayaran normal setelah koreksi (${newPaidAtStr}) tidak boleh sebelum Tanggal Mulai Pencatatan Sistem (${cutoverDateStr}).`
            };
          }
        }
      }

      await trx('bill_payments')
        .where({ id })
        .update({
          amount: newAmount,
          paid_at: newPaidAt,
          cash_account_id: newCashAccountId,
          payment_method: newPaymentMethod,
          notes: newNotes,
          previous_data: JSON.stringify(previousSnapshot),
          correction_reason: correction_reason.trim()
        });

      // Recalculate status tagihan
      const allPayments = await trx('bill_payments')
        .where('student_bill_id', payment.student_bill_id)
        .sum('amount as total_paid')
        .first();
      const totalPaid = allPayments?.total_paid ? parseFloat(allPayments.total_paid) : 0;
      const billStatus = totalPaid >= parseFloat(payment.bill_amount) ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');

      await trx('student_bills')
        .where({ id: payment.student_bill_id })
        .update({ status: billStatus });

      const updated = await trx('bill_payments').where({ id }).first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CORRECT_BILL_PAYMENT',
        entityType: 'bill_payment',
        entityId: id,
        dataBefore: payment,
        dataAfter: updated,
        trx
      });

      return { data: updated };
    });
  }

  // ============================================================
  // 3. CETAK KWITANSI PEMBAYARAN (Fitur #19)
  // ============================================================

  async getReceiptData(schoolUnitId, paymentId) {
    const payment = await db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .leftJoin('cash_accounts', 'bill_payments.cash_account_id', 'cash_accounts.id')
      .where({ 'bill_payments.id': paymentId })
      .select(
        'bill_payments.*',
        'student_bills.student_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'fee_types.name as fee_type_name',
        'cash_accounts.name as cash_account_name'
      )
      .first();

    if (!payment) return null;

    let receiptNumber = payment.receipt_number;
    if (!receiptNumber) {
      receiptNumber = await this.generateReceiptNumber(db, payment.school_unit_id || schoolUnitId || 1);
      await db('bill_payments').where({ id: paymentId }).update({ receipt_number: receiptNumber });
      payment.receipt_number = receiptNumber;
    }

    // Dapatkan semua pembayaran yang berbagi nomor kwitansi yang sama (Multi-Pos Split Allocation & Multi-Student Sibling Payment)
    const siblingPayments = await db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where({
        'bill_payments.receipt_number': payment.receipt_number
      })
      .select(
        'bill_payments.id as payment_id',
        'bill_payments.amount',
        'student_bills.id as bill_id',
        'student_bills.student_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'fee_types.name as fee_type_name'
      );

    const distinctStudentIds = [...new Set(siblingPayments.map(p => p.student_id || payment.student_id).filter(Boolean))];
    const studentList = await Promise.all(
      distinctStudentIds.map(async (sid) => {
        try {
          const s = await crossModuleServices.getStudent(sid);
          return s ? { id: sid, name: s.full_name || s.name || `Siswa ID ${sid}`, nis: s.nis || '-' } : { id: sid, name: `Siswa ID ${sid}`, nis: '-' };
        } catch (_) {
          return { id: sid, name: `Siswa ID ${sid}`, nis: '-' };
        }
      })
    );
    const studentMap = new Map(studentList.map(s => [s.id, s]));
    const primaryStudent = studentMap.get(payment.student_id) || studentList[0] || { id: payment.student_id, name: `Siswa ID ${payment.student_id}`, nis: '-' };
    const combinedStudentNames = studentList.map(s => s.name).join(', ');
    const combinedStudentNis = studentList.map(s => s.nis).filter(n => n !== '-').join(', ') || '-';

    const totalAmount = siblingPayments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    const amountInWords = terbilang(totalAmount);

    const items = siblingPayments.map(p => {
      const sObj = studentMap.get(p.student_id);
      return {
        payment_id: p.payment_id,
        bill_id: p.bill_id,
        student_id: p.student_id,
        student_name: sObj?.name || '',
        student_nis: sObj?.nis || '',
        fee_type_name: p.fee_type_name,
        period: p.period_month ? `${p.period_month}/${p.period_year}` : `${p.period_year}`,
        amount: parseFloat(p.amount)
      };
    });

    const isMultiStudent = studentList.length > 1;

    return {
      receipt_number: payment.receipt_number,
      payment_id: payment.id,
      paid_at: payment.paid_at,
      amount: totalAmount,
      amount_in_words: amountInWords,
      payment_method: payment.payment_method,
      student: {
        id: payment.student_id,
        name: isMultiStudent ? combinedStudentNames : primaryStudent.name,
        nis: isMultiStudent ? combinedStudentNis : primaryStudent.nis,
        list: studentList
      },
      is_multi_student: isMultiStudent,
      payment_for: items.map(it => `${isMultiStudent ? `[${it.student_name}] ` : ''}${it.fee_type_name} (${it.period})`).join(', '),
      items,
      is_legacy: Boolean(payment.is_legacy),
      historical_cash_note: payment.historical_cash_note,
      cash_account_name: payment.is_legacy ? (payment.historical_cash_note || 'Pencatatan Riwayat Saja (Non-Kas)') : payment.cash_account_name
    };
  }

  // ============================================================
  // 4. INTEGRASI PAYMENT GATEWAY (Fitur #20)
  // ============================================================

  async checkoutGateway(schoolUnitId, data) {
    const { student_bill_id, channel = 'qris' } = data;
    const bill = await db('student_bills')
      .where({ id: student_bill_id })
      .first();

    if (!bill) return { error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan' };

    const providerReference = `PG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [pgtId] = await db('payment_gateway_transactions').insert({
      provider: 'midtrans_or_xendit',
      provider_reference: providerReference,
      channel: channel,
      amount: bill.amount,
      status: 'pending'
    });

    return {
      data: {
        transaction_id: pgtId,
        provider_reference: providerReference,
        amount: bill.amount,
        channel,
        payment_url: `https://mock-gateway.aldepos.sch.id/pay/${providerReference}`,
        status: 'pending'
      }
    };
  }

  async handleGatewayCallback(callbackPayload) {
    const { provider_reference, status } = callbackPayload;
    const pgt = await db('payment_gateway_transactions')
      .where({ provider_reference })
      .first();

    if (!pgt) return { error: 'NOT_FOUND', message: 'Transaksi gateway tidak ditemukan' };

    await db('payment_gateway_transactions')
      .where({ id: pgt.id })
      .update({
        status: status || 'success',
        callback_payload: JSON.stringify(callbackPayload)
      });

    return { data: { id: pgt.id, status: status || 'success' } };
  }

  async listGatewayTransactions(status = null) {
    let query = db('payment_gateway_transactions');
    if (status) query = query.where('status', status);
    return query.orderBy('created_at', 'desc');
  }

  // ============================================================
  // 5. REKONSILIASI PEMBAYARAN PPDB & KANTIN (Fitur #21)
  // ============================================================

  async listReconciliations(schoolUnitId, filters = {}) {
    let query = db('payment_reconciliations').where('school_unit_id', schoolUnitId);
    if (filters.source_module) {
      query = query.where('source_module', filters.source_module);
    }
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    return query.orderBy('created_at', 'desc');
  }

  async matchReconciliation(schoolUnitId, id, billPaymentId = null, userId = null) {
    const rec = await db('payment_reconciliations')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!rec) return null;

    await db('payment_reconciliations')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'matched',
        reconciled_at: db.fn.now()
      });

    return db('payment_reconciliations').where({ id }).first();
  }

  async flagDiscrepancy(schoolUnitId, id, notes, userId = null) {
    const rec = await db('payment_reconciliations')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!rec) return null;

    await db('payment_reconciliations')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'discrepancy'
      });

    return db('payment_reconciliations').where({ id }).first();
  }

  async ingestReconciliationInternal(data) {
    const { school_unit_id = 1, source_module, source_reference, amount } = data;

    const [id] = await db('payment_reconciliations').insert({
      school_unit_id,
      source_module,
      source_reference,
      amount,
      status: 'pending'
    });

    return db('payment_reconciliations').where({ id }).first();
  }

  // ============================================================
  // 6. BUKTI TRANSFER MANUAL & VERIFIKASI MULTI-ALOKASI (Split Tagihan)
  // ============================================================

  async listPaymentProofs(schoolUnitId, filters = {}) {
    let q = db('bill_payment_proofs')
      .leftJoin('student_bills', 'bill_payment_proofs.student_bill_id', 'student_bills.id')
      .leftJoin('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .select(
        'bill_payment_proofs.*',
        'student_bills.student_id as bill_student_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'student_bills.amount as bill_amount',
        'student_bills.status as bill_status',
        'fee_types.name as fee_type_name'
      );

    if (schoolUnitId) {
      q = q.where('bill_payment_proofs.school_unit_id', schoolUnitId);
    }
    if (filters.status) {
      q = q.where('bill_payment_proofs.status', filters.status);
    }

    const proofs = await q.orderBy('bill_payment_proofs.created_at', 'desc');
    const proofIds = proofs.map(p => p.id);

    const allAllocations = proofIds.length > 0
      ? await db('bill_payment_proof_allocations')
          .join('student_bills', 'bill_payment_proof_allocations.student_bill_id', 'student_bills.id')
          .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
          .whereIn('bill_payment_proof_allocations.bill_payment_proof_id', proofIds)
          .select(
            'bill_payment_proof_allocations.*',
            'student_bills.student_id',
            'student_bills.period_month',
            'student_bills.period_year',
            'student_bills.amount as bill_amount',
            'student_bills.status as bill_status',
            'fee_types.name as fee_type_name'
          )
      : [];

    const allocMap = {};
    allAllocations.forEach(a => {
      if (!allocMap[a.bill_payment_proof_id]) allocMap[a.bill_payment_proof_id] = [];
      allocMap[a.bill_payment_proof_id].push(a);
    });

    return Promise.all(proofs.map(async p => {
      const proofAllocs = allocMap[p.id] || [];
      const targetStudentId = p.student_id || p.bill_student_id || (proofAllocs[0]?.student_id) || null;
      const student = targetStudentId ? await crossModuleServices.getStudent(targetStudentId) : null;

      return {
        ...p,
        student_id: targetStudentId,
        student_name: student?.full_name || (targetStudentId ? `Siswa ID ${targetStudentId}` : 'Umum'),
        student_nis: student?.nis || '-',
        student_class: student?.class_name || '-',
        allocations: proofAllocs,
        allocations_count: proofAllocs.length
      };
    }));
  }

  async getPaymentProofAllocations(proofId) {
    return db('bill_payment_proof_allocations')
      .join('student_bills', 'bill_payment_proof_allocations.student_bill_id', 'student_bills.id')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where('bill_payment_proof_allocations.bill_payment_proof_id', proofId)
      .select(
        'bill_payment_proof_allocations.*',
        'student_bills.student_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'student_bills.amount as bill_amount',
        'student_bills.status as bill_status',
        'fee_types.name as fee_type_name'
      );
  }

  async savePaymentProofAllocations(schoolUnitId, proofId, allocations = [], userId = null) {
    const proof = await db('bill_payment_proofs')
      .where({ id: proofId, school_unit_id: schoolUnitId })
      .first();

    if (!proof) {
      const err = new Error('Bukti transfer tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (proof.status !== 'pending') {
      const err = new Error(`Bukti transfer ini sudah berstatus ${proof.status} sehingga alokasi tidak dapat diubah`);
      err.statusCode = 422;
      throw err;
    }

    const totalTransfer = parseFloat(proof.total_transfer_amount || proof.amount || 0);
    const sumAllocated = allocations.reduce((acc, a) => acc + parseFloat(a.allocated_amount || 0), 0);

    if (sumAllocated > totalTransfer + 0.01) {
      const err = new Error(`Total alokasi (Rp ${sumAllocated.toLocaleString('id-ID')}) melebihi total transfer pada bukti pembayaran (Rp ${totalTransfer.toLocaleString('id-ID')})`);
      err.statusCode = 422;
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('bill_payment_proof_allocations').where({ bill_payment_proof_id: proofId }).delete();

      if (allocations.length > 0) {
        const toInsert = allocations.map(a => ({
          bill_payment_proof_id: proofId,
          student_bill_id: a.student_bill_id,
          allocated_amount: parseFloat(a.allocated_amount)
        }));
        await trx('bill_payment_proof_allocations').insert(toInsert);

        // Set student_bill_id dan student_id pada bukti transfer jika belum ada
        const firstBill = await trx('student_bills').where({ id: allocations[0].student_bill_id }).first();
        if (firstBill) {
          await trx('bill_payment_proofs').where({ id: proofId }).update({
            student_bill_id: allocations[0].student_bill_id,
            student_id: firstBill.student_id
          });
        }
      }
    });

    return this.getPaymentProofAllocations(proofId);
  }

  async verifyPaymentProof(schoolUnitId, proofId, userId, cashAccountId = null) {
    return db.transaction(async (trx) => {
      const proof = await trx('bill_payment_proofs')
        .where({ id: proofId, school_unit_id: schoolUnitId })
        .first();

      if (!proof) {
        return { error: 'NOT_FOUND', message: 'Bukti transfer tidak ditemukan' };
      }

      if (proof.status !== 'pending') {
        return { error: 'CONFLICT', message: `Bukti transfer ini sudah berstatus ${proof.status}` };
      }

      // 1. Ambil baris alokasi
      let allocations = await trx('bill_payment_proof_allocations')
        .where({ bill_payment_proof_id: proofId });

      // Jika belum ada di tabel allocations tapi proof punya student_bill_id (fallback legacy 1-to-1)
      if (allocations.length === 0 && proof.student_bill_id) {
        const legacyAmount = parseFloat(proof.total_transfer_amount || proof.amount);
        await trx('bill_payment_proof_allocations').insert({
          bill_payment_proof_id: proof.id,
          student_bill_id: proof.student_bill_id,
          allocated_amount: legacyAmount
        });
        allocations = await trx('bill_payment_proof_allocations').where({ bill_payment_proof_id: proofId });
      }

      if (allocations.length === 0) {
        return { error: 'VALIDATION', message: 'Belum ada rincian alokasi tagihan untuk bukti transfer ini. Mohon tentukan alokasi tagihan terlebih dahulu.' };
      }

      const totalTransfer = parseFloat(proof.total_transfer_amount || proof.amount || 0);
      const sumAllocated = allocations.reduce((acc, a) => acc + parseFloat(a.allocated_amount || 0), 0);

      if (Math.abs(sumAllocated - totalTransfer) > 0.01) {
        return {
          error: 'VALIDATION',
          message: `Total alokasi tagihan (Rp ${sumAllocated.toLocaleString('id-ID')}) belum sama dengan nominal transfer (Rp ${totalTransfer.toLocaleString('id-ID')}). Sisa yang belum teralokasi: Rp ${(totalTransfer - sumAllocated).toLocaleString('id-ID')}`
        };
      }

      // 2. Tentukan rekening kas/bank tujuan
      let targetCashAccountId = cashAccountId;
      if (!targetCashAccountId) {
        const bankAcc = await trx('cash_accounts')
          .where({ school_unit_id: schoolUnitId, account_kind: 'bank', is_active: true })
          .first();
        targetCashAccountId = bankAcc ? bankAcc.id : 1;
      }

      // 3. Generate nomor kwitansi resmi master untuk seluruh split payment ini
      const receiptNumber = await this.generateReceiptNumber(trx, schoolUnitId);
      const createdPayments = [];

      for (const alloc of allocations) {
        const bill = await trx('student_bills')
          .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
          .where({ 'student_bills.id': alloc.student_bill_id })
          .select('student_bills.*', 'fee_types.name as fee_type_name')
          .first();

        if (!bill) {
          throw new Error(`Tagihan ID #${alloc.student_bill_id} tidak ditemukan`);
        }

        const paymentPaidAt = proof.transfer_date ? new Date(proof.transfer_date).toISOString() : new Date().toISOString();

        // Insert baris bill_payments
        const [paymentId] = await trx('bill_payments').insert({
          student_bill_id: alloc.student_bill_id,
          cash_account_id: targetCashAccountId,
          amount: alloc.allocated_amount,
          payment_method: 'bank_transfer',
          paid_at: paymentPaidAt,
          receipt_number: receiptNumber,
          notes: `Verifikasi Bukti Transfer #${proof.id} (Bank: ${proof.bank_name || '-'}, Pengirim: ${proof.sender_account_name || '-'})`
        });

        const createdPayment = await trx('bill_payments').where({ id: paymentId }).first();
        createdPayments.push(createdPayment);

        // Recalculate status student_bills
        const allPayments = await trx('bill_payments')
          .where('student_bill_id', alloc.student_bill_id)
          .sum('amount as total_paid')
          .first();

        const totalPaid = allPayments?.total_paid ? parseFloat(allPayments.total_paid) : 0;
        const billStatus = totalPaid >= parseFloat(bill.amount) ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');

        await trx('student_bills')
          .where({ id: alloc.student_bill_id })
          .update({ status: billStatus });

        // Jurnal otomatis per alokasi
        let proofFtMappingId = null;
        if (bill.fee_type_id) {
          const ft = await trx('fee_types').where({ id: bill.fee_type_id }).first();
          if (ft && ft.payment_account_mapping_id) {
            proofFtMappingId = ft.payment_account_mapping_id;
          }
        }

        await recordJournal({
          schoolUnitId,
          transactionCode: 'student_bill_payment',
          mappingId: proofFtMappingId,
          amount: alloc.allocated_amount,
          sourceType: 'student_bill_payment',
          sourceId: paymentId,
          description: `Penerimaan Pembayaran SPP/Tagihan Siswa #${bill.id} (${bill.fee_type_name}) - Bukti #${proof.id}`,
          journalDate: paymentPaidAt,
          userId,
          trx
        });
      }

      // 4. Update status bukti transfer menjadi verified
      const verifiedAt = trx.fn.now();
      await trx('bill_payment_proofs')
        .where({ id: proof.id })
        .update({
          status: 'verified',
          verified_by: userId,
          verified_at: verifiedAt,
          bill_payment_id: createdPayments[0]?.id || null
        });

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'VERIFY_PAYMENT_PROOF_ALLOCATIONS',
        entityType: 'bill_payment_proof',
        entityId: proof.id,
        dataBefore: proof,
        dataAfter: {
          status: 'verified',
          verified_by: userId,
          total_amount: totalTransfer,
          allocations_count: allocations.length,
          receipt_number: receiptNumber
        },
        trx
      });

      const updatedProof = await trx('bill_payment_proofs').where({ id: proof.id }).first();

      return {
        data: {
          proof: updatedProof,
          payments: createdPayments,
          receipt_number: receiptNumber,
          primary_payment_id: createdPayments[0]?.id || null
        }
      };
    });
  }

  async rejectPaymentProof(schoolUnitId, proofId, rejectionReason, userId) {
    if (!rejectionReason || !rejectionReason.trim()) {
      return { error: 'VALIDATION', message: 'Alasan penolakan (rejection_reason) wajib diisi' };
    }

    const proof = await db('bill_payment_proofs')
      .where({ id: proofId, school_unit_id: schoolUnitId })
      .first();

    if (!proof) {
      return { error: 'NOT_FOUND', message: 'Bukti transfer tidak ditemukan' };
    }

    if (proof.status !== 'pending') {
      return { error: 'CONFLICT', message: `Bukti transfer ini sudah berstatus ${proof.status}` };
    }

    await db('bill_payment_proofs')
      .where({ id: proof.id })
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
        verified_by: userId,
        verified_at: db.fn.now()
      });

    const updatedProof = await db('bill_payment_proofs').where({ id: proof.id }).first();
    return { data: updatedProof };
  }

  async refundBillPayment(schoolUnitId, id, refundCashAccountId, reason, userId = null) {
    if (!reason || !reason.trim()) {
      const err = new Error('Alasan pengembalian dana (refund reason) wajib diisi');
      err.statusCode = 400;
      throw err;
    }

    const payment = await db('bill_payments')
      .leftJoin('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .where('bill_payments.id', id)
      .select('bill_payments.*', 'student_bills.school_unit_id')
      .first();

    if (!payment) {
      const err = new Error('Pembayaran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const cashAccId = refundCashAccountId || payment.cash_account_id;
    const refundAmount = parseFloat(payment.amount);

    // Update status tagihan terkait agar kembali unpaid / partially_paid
    if (payment.student_bill_id) {
      const bill = await db('student_bills').where({ id: payment.student_bill_id }).first();
      if (bill) {
        const otherPaymentsSum = await db('bill_payments')
          .where({ student_bill_id: bill.id })
          .whereNot({ id })
          .sum('amount as total_paid')
          .first();
        const otherPaid = otherPaymentsSum?.total_paid ? parseFloat(otherPaymentsSum.total_paid) : 0;
        const newStatus = otherPaid <= 0 ? 'unpaid' : (otherPaid < parseFloat(bill.amount) ? 'partially_paid' : 'paid');

        await db('student_bills').where({ id: bill.id }).update({
          status: newStatus,
          edit_reason: `Pengembalian pembayaran #${id}: ${reason}`
        });
      }
    }

    // Catat auto-journal refund
    try {
      await recordJournal({
        schoolUnitId,
        transactionCode: 'student_bill_refund',
        amount: refundAmount,
        sourceType: 'student_bill_refund',
        sourceId: id,
        overrideCashAccountId: cashAccId,
        description: `Pengembalian Kelebihan Bayar Pembayaran #${id} (Kwitansi: ${payment.receipt_number || '-'}, Alasan: ${reason})`,
        userId
      });
    } catch (journalErr) {
      console.warn('Auto journal for refund skipped or error:', journalErr.message);
    }

    // Mutasi saldo kantong dana keluar jika ada
    try {
      const refundAyId = bill ? Number(bill.academic_year_id || 2) : 2;
      await fundBalanceEngine.applyFundMutation({
        schoolUnitId,
        fundType: bill ? 'fee_type' : 'opening_pool',
        fundRefId: bill ? bill.fee_type_id : 0,
        academicYearId: refundAyId,
        direction: 'out',
        amount: refundAmount,
        sourceTable: 'bill_payments',
        sourceId: id,
        notes: `Refund pembayaran tagihan #${payment.student_bill_id || id}: ${reason}`,
        userId
      });
    } catch (fbErr) {
      console.warn('Fund balance mutation for refund skipped or error:', fbErr.message);
    }

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'REFUND_BILL_PAYMENT',
      entityType: 'bill_payment',
      entityId: id,
      dataBefore: payment,
      dataAfter: { ...payment, refund_cash_account_id: cashAccId, reason }
    });

    return {
      payment,
      refund_amount: refundAmount,
      message: `Pengembalian dana untuk Pembayaran #${id} (Rp ${refundAmount.toLocaleString('id-ID')}) berhasil diproses`
    };
  }

  /**
   * 8. Unified Cash Inflows Timeline (Siswa Aktif + PPDB + RAPBS)
   */
  async getAllInflows(schoolUnitId, filters = {}) {
    const { start_date, end_date, academic_year_id, category, search, page = 1, per_page = 25 } = filters;
    const records = [];

    // 1. Student Bill Payments
    if (!category || category === 'all' || category === 'student') {
      let q = db('bill_payments')
        .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
        .leftJoin('cash_accounts', 'bill_payments.cash_account_id', 'cash_accounts.id')
        .where('student_bills.school_unit_id', schoolUnitId)
        .where('bill_payments.is_legacy', false);

      if (academic_year_id) q = q.where('student_bills.academic_year_id', Number(academic_year_id));
      if (start_date) q = q.where('bill_payments.paid_at', '>=', `${start_date} 00:00:00`);
      if (end_date) q = q.where('bill_payments.paid_at', '<=', `${end_date} 23:59:59`);

      const studentRows = await q.select(
        'bill_payments.id',
        'bill_payments.paid_at as transaction_date',
        'bill_payments.receipt_number',
        'bill_payments.amount',
        'bill_payments.payment_method',
        'bill_payments.notes',
        'student_bills.student_id',
        'student_bills.academic_year_id',
        'cash_accounts.name as cash_account_name'
      );

      studentRows.forEach(r => {
        records.push({
          id: `STU-${r.id}`,
          source_type: 'student_bill_payment',
          category_label: 'Siswa Aktif',
          receipt_number: r.receipt_number,
          transaction_date: formatDateOnly(r.transaction_date),
          amount: parseFloat(r.amount || 0),
          cash_account_name: r.cash_account_name || 'Kasir Loket',
          payment_method: r.payment_method || 'cash',
          payer_info: `Siswa #${r.student_id}`,
          description: r.notes || `Pembayaran Tagihan Siswa #${r.student_id}`,
          academic_year_id: r.academic_year_id,
          raw_id: r.id
        });
      });
    }

    // 2. PPDB Payments
    if (!category || category === 'all' || category === 'ppdb') {
      let q = db('ppdb_registration_payments')
        .join('ppdb_registration_bills', 'ppdb_registration_payments.ppdb_registration_bill_id', 'ppdb_registration_bills.id')
        .leftJoin('cash_accounts', 'ppdb_registration_payments.cash_account_id', 'cash_accounts.id')
        .where('ppdb_registration_bills.school_unit_id', schoolUnitId);

      if (filters.ppdb_academic_year_id || academic_year_id) {
        const targetAy = filters.ppdb_academic_year_id || academic_year_id;
        q = q.where('ppdb_registration_bills.target_academic_year_id', Number(targetAy));
      }
      if (start_date) q = q.where('ppdb_registration_payments.payment_date', '>=', `${start_date} 00:00:00`);
      if (end_date) q = q.where('ppdb_registration_payments.payment_date', '<=', `${end_date} 23:59:59`);

      const ppdbRows = await q.select(
        'ppdb_registration_payments.id',
        'ppdb_registration_payments.payment_date as transaction_date',
        'ppdb_registration_payments.receipt_number',
        'ppdb_registration_payments.amount_paid as amount',
        'ppdb_registration_payments.payment_method',
        'ppdb_registration_payments.notes',
        'ppdb_registration_bills.registrant_name_snapshot',
        'ppdb_registration_bills.target_academic_year_id',
        'cash_accounts.name as cash_account_name'
      );

      ppdbRows.forEach(r => {
        records.push({
          id: `PPDB-${r.id}`,
          source_type: 'ppdb_registration_payment',
          category_label: 'PPDB (Calon Murid)',
          receipt_number: r.receipt_number,
          transaction_date: formatDateOnly(r.transaction_date),
          amount: parseFloat(r.amount || 0),
          cash_account_name: r.cash_account_name || 'Bank/Kasir PPDB',
          payment_method: r.payment_method || 'cash',
          payer_info: r.registrant_name_snapshot || 'Calon Murid',
          description: r.notes || `Pembayaran PPDB: ${r.registrant_name_snapshot}`,
          academic_year_id: r.target_academic_year_id,
          raw_id: r.id
        });
      });
    }

    // 3. Other Incomes (RAPBS)
    if (!category || category === 'all' || category === 'other') {
      let q = db('other_incomes')
        .leftJoin('budget_plan_income_items', 'other_incomes.budget_plan_income_item_id', 'budget_plan_income_items.id')
        .leftJoin('cash_accounts', 'other_incomes.cash_account_id', 'cash_accounts.id')
        .where('other_incomes.school_unit_id', schoolUnitId);

      if (academic_year_id) q = q.where('other_incomes.academic_year_id', Number(academic_year_id));
      if (start_date) q = q.where('other_incomes.received_at', '>=', start_date);
      if (end_date) q = q.where('other_incomes.received_at', '<=', end_date);

      const otherRows = await q.select(
        'other_incomes.id',
        'other_incomes.received_at as transaction_date',
        'other_incomes.amount',
        'other_incomes.notes',
        'other_incomes.academic_year_id',
        'budget_plan_income_items.name as budget_income_name',
        'cash_accounts.name as cash_account_name'
      );

      otherRows.forEach(r => {
        records.push({
          id: `OTH-${r.id}`,
          source_type: 'other_income',
          category_label: 'Sumber Lain (RAPBS)',
          receipt_number: `KWT-NONSPP-${r.id}`,
          transaction_date: formatDateOnly(r.transaction_date),
          amount: parseFloat(r.amount || 0),
          cash_account_name: r.cash_account_name || 'Kas Utama',
          payment_method: 'cash',
          payer_info: r.budget_income_name || 'Penyetor Lain',
          description: r.notes || r.budget_income_name || 'Penerimaan Sumber Lain',
          academic_year_id: r.academic_year_id,
          raw_id: r.id
        });
      });
    }

    // Filter search
    let filtered = records;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(x => 
        (x.receipt_number && x.receipt_number.toLowerCase().includes(s)) ||
        (x.payer_info && x.payer_info.toLowerCase().includes(s)) ||
        (x.description && x.description.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

    let totalAmount = 0;
    let studentAmount = 0;
    let ppdbAmount = 0;
    let otherAmount = 0;

    filtered.forEach(r => {
      totalAmount += r.amount;
      if (r.source_type === 'student_bill_payment') studentAmount += r.amount;
      else if (r.source_type === 'ppdb_registration_payment') ppdbAmount += r.amount;
      else if (r.source_type === 'other_income') otherAmount += r.amount;
    });

    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.max(1, parseInt(per_page, 10) || 25);
    const paginated = filtered.slice((p - 1) * pp, p * pp);

    return {
      summary: {
        total_records: filtered.length,
        total_amount: totalAmount,
        student_amount: studentAmount,
        ppdb_amount: ppdbAmount,
        other_amount: otherAmount
      },
      pagination: {
        current_page: p,
        per_page: pp,
        total_pages: Math.ceil(filtered.length / pp) || 1,
        total_records: filtered.length
      },
      inflows: paginated
    };
  }
}

module.exports = new PaymentsService();
