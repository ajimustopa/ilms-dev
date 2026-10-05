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

      let receiptNumber = data.receipt_number || null;
      if (!receiptNumber && data.bank_statement_id && !isLegacy) {
        // Cek apakah data rekening koran ini sudah pernah direferensikan ke pembayaran sebelumnya
        const existingRef = await trx('bank_statement_references')
          .join('bill_payments', 'bank_statement_references.reference_id', 'bill_payments.id')
          .where('bank_statement_references.bank_statement_id', Number(data.bank_statement_id))
          .where('bank_statement_references.reference_type', 'student_bill_payment')
          .whereNotNull('bill_payments.receipt_number')
          .select('bill_payments.receipt_number')
          .first();

        if (existingRef && existingRef.receipt_number) {
          receiptNumber = existingRef.receipt_number;
        } else {
          // Fallback cek di bank_statements.reconciled_reference_id
          const stmtRow = await trx('bank_statements')
            .where({ id: Number(data.bank_statement_id) })
            .where('reconciled_reference_type', 'student_bill_payment')
            .whereNotNull('reconciled_reference_id')
            .first();
          if (stmtRow && stmtRow.reconciled_reference_id) {
            const pRow = await trx('bill_payments')
              .where({ id: stmtRow.reconciled_reference_id })
              .first();
            if (pRow && pRow.receipt_number) {
              receiptNumber = pRow.receipt_number;
            }
          }
        }
      }

      if (!receiptNumber) {
        receiptNumber = await this.generateReceiptNumber(trx, schoolUnitId);
      }
      const cashAccountId = isLegacy
        ? (data.cash_account_id ? Number(data.cash_account_id) : null)
        : (data.override_cash_account_id ? Number(data.override_cash_account_id) : (data.cash_account_id ? Number(data.cash_account_id) : 1));
      const paymentMethod = isLegacy ? (data.payment_method || 'historical') : (data.payment_method || 'cash');

      // 1. Handle Multi-Allocation Mode (Array of allocations)
      if (data.allocations && Array.isArray(data.allocations) && data.allocations.length > 0) {
        const validAllocations = data.allocations.filter(a => parseFloat(a.amount || 0) > 0 || (a.has_discount && parseFloat(a.discount_amount || 0) > 0));
        if (validAllocations.length === 0) {
          return { error: 'VALIDATION', message: 'Nominal alokasi pembayaran atau diskon harus lebih besar dari 0' };
        }

        const createdPaymentIds = [];

        let lastBillUnitId = schoolUnitId;
        let refStudentId = data.student_id || null;

        const allAllocatedStudentIds = [];

        for (const alloc of validAllocations) {
          const billId = alloc.student_bill_id || alloc.bill_id;
          const allocAmount = parseFloat(alloc.amount || 0);
          const hasDiscount = Boolean(alloc.has_discount && parseFloat(alloc.discount_amount || 0) > 0);
          const discountAmount = hasDiscount ? parseFloat(alloc.discount_amount) : 0;

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
          const billAmount = parseFloat(bill.amount || 0);

          // Update Diskon pada Tagihan Siswa jika ada
          let newDiscountTotal = parseFloat(bill.discount_amount || 0);
          if (hasDiscount && discountAmount > 0) {
            newDiscountTotal += discountAmount;
            await trx('student_bills')
              .where({ id: bill.id })
              .update({
                discount_amount: newDiscountTotal,
                discount_type: alloc.discount_type || (alloc.discount_percentage ? 'percentage' : 'nominal'),
                discount_percentage: alloc.discount_percentage || (billAmount > 0 ? (discountAmount / billAmount * 100) : null),
                discount_reason: alloc.discount_reason || 'Diskon saat pencatatan pembayaran'
              });
          }

          const effectiveBillAmount = Math.max(0, billAmount - newDiscountTotal);
          const billStatusAfter = (newTotalPaid >= effectiveBillAmount) ? 'paid' : (newTotalPaid > 0 ? 'partially_paid' : (newDiscountTotal > 0 ? 'partially_paid' : bill.status));

          let actualPaymentId = null;

          if (allocAmount > 0) {
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

            actualPaymentId = paymentId || (await trx('bill_payments').where({ receipt_number: receiptNumber, student_bill_id: bill.id }).first()).id;
            createdPaymentIds.push(actualPaymentId);
          }

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

          // Auto-journal for Discount (Non-Kas)
          if (hasDiscount && discountAmount > 0 && !isLegacy) {
            try {
              let ftDiscMappingId = alloc.discount_mapping_id || null;
              if (!ftDiscMappingId && bill.fee_type_id) {
                const ft = await trx('fee_types').where({ id: bill.fee_type_id }).first();
                if (ft && ft.payment_discount_account_mapping_id) {
                  ftDiscMappingId = ft.payment_discount_account_mapping_id;
                } else if (ft && ft.billing_discount_account_mapping_id) {
                  ftDiscMappingId = ft.billing_discount_account_mapping_id;
                }
              }

              await recordJournal({
                schoolUnitId: targetUnitId,
                academicYearId: Number(bill.academic_year_id || 2),
                transactionCode: 'student_bill_discount',
                mappingId: ftDiscMappingId,
                amount: discountAmount,
                sourceType: 'student_bill_discount',
                sourceId: bill.id,
                description: `Diskon tagihan #${bill.id} (${bill.fee_type_name || ''}) - Kwitansi ${receiptNumber}${alloc.discount_reason ? `: ${alloc.discount_reason}` : ''}`,
                journalDate: paidAt,
                overrideDebitAccountId: alloc.override_discount_debit_account_id || null,
                overrideCreditAccountId: alloc.override_discount_credit_account_id || null,
                overrideReason: alloc.discount_reason || 'Diskon saat pembayaran tagihan siswa',
                userId,
                trx
              });
            } catch (discJournalErr) {
              if (discJournalErr.statusCode === 422) throw discJournalErr;
              console.warn('Discount auto journal skipped or error:', discJournalErr.message);
            }
          }

          // Auto-journal per pos alokasi (Hanya untuk transaksi kas berjalan / non-historis dan jika ada nominal bayar)
          if (!isLegacy && allocAmount > 0 && actualPaymentId) {
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
                academicYearId: Number(bill.academic_year_id || 2),
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

          // Fund balance mutation (Hanya jika non-historis dan ada nominal bayar)
          if (!isLegacy && allocAmount > 0 && actualPaymentId) {
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
                    transaction_date: stmt.transaction_date,
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

        const primaryPaymentId = createdPaymentIds.length > 0 ? createdPaymentIds[0] : null;

        await logFinanceAudit({
          schoolUnitId: schoolUnitId || lastBillUnitId || 1,
          userId,
          action: isLegacy ? 'RECORD_BILL_PAYMENT_HISTORICAL_MULTI' : 'RECORD_BILL_PAYMENT_MULTI',
          entityType: 'bill_payment',
          entityId: primaryPaymentId || (validAllocations[0] ? (validAllocations[0].student_bill_id || validAllocations[0].bill_id) : 0),
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
                  transaction_date: stmt.transaction_date,
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
            academicYearId: Number(bill.academic_year_id || 2),
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

    // Ambil daftar tahun ajaran untuk mapping nama tahun ajaran
    let ayMap = new Map();
    try {
      const allAys = await crossModuleServices.listAcademicYears();
      allAys.forEach(y => ayMap.set(Number(y.id), y));
    } catch (_) {}

    const studentYearPairs = [...new Set(payments.map(p => `${p.student_id}_${p.academic_year_id || ''}`))];
    const studentsMap = {};
    if (studentYearPairs.length > 0) {
      for (const pair of studentYearPairs) {
        const [sIdStr, ayIdStr] = pair.split('_');
        const sId = Number(sIdStr);
        const ayId = ayIdStr ? Number(ayIdStr) : null;
        try {
          const std = await crossModuleServices.getStudent(sId, ayId);
          if (std) studentsMap[pair] = std;
        } catch (_) {}
      }
    }

    const MONTH_NAMES = {
      1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
      5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
      9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
    };

    let enriched = payments.map(p => {
      const pairKey = `${p.student_id}_${p.academic_year_id || ''}`;
      const student = studentsMap[pairKey] || Object.values(studentsMap).find(s => s.id === p.student_id);
      const monthName = p.period_month ? (MONTH_NAMES[p.period_month] || '') : '';
      const ayName = ayMap.get(Number(p.academic_year_id))?.name || (p.period_year ? `${p.period_year}` : '');
      const isMonthlyOrSpp = (p.fee_type_name && p.fee_type_name.toLowerCase().includes('spp')) || p.billing_pattern === 'monthly';

      let periodDisplay = '';
      if (isMonthlyOrSpp) {
        periodDisplay = monthName ? `${monthName} ${ayName}`.trim() : (ayName || '-');
      } else {
        periodDisplay = ayName || '-';
      }

      const componentDisplay = `${p.fee_type_name} (${periodDisplay})`.trim();

      return {
        ...p,
        paid_at_formatted: formatDateOnly(p.paid_at) || String(p.paid_at).slice(0, 10),
        student_name: student?.full_name || `Siswa ID ${p.student_id}`,
        nis: student?.nis || student?.nipd || '-',
        class_name: student?.class_name || student?.class_group_name || student?.rombel_name || '-',
        academic_year_name: ayName,
        month_name: monthName,
        period_display: periodDisplay,
        component_display: componentDisplay,
        previous_data: p.previous_data ? (typeof p.previous_data === 'string' ? JSON.parse(p.previous_data) : p.previous_data) : null
      };
    });

    // Kelompokkan per transaksi kwitansi (1 Kwitansi = 1 Catatan Riwayat Transaksi Resmi)
    const groupedMap = new Map();
    for (const p of enriched) {
      const groupKey = p.receipt_number ? `R_${p.receipt_number}` : `ID_${p.id}`;
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          ...p,
          items: [p],
          total_items_count: 1,
          all_student_ids: [p.student_id],
          all_student_names: p.student_name ? [p.student_name] : [],
          all_nises: p.nis && p.nis !== '-' ? [p.nis] : [],
          all_classes: p.class_name && p.class_name !== '-' ? [p.class_name] : [],
          all_components: [p.component_display || p.fee_type_name].filter(Boolean),
          all_fee_type_ids: [p.fee_type_id],
          amount: parseFloat(p.amount || 0)
        });
      } else {
        const g = groupedMap.get(groupKey);
        g.items.push(p);
        g.total_items_count += 1;
        g.amount += parseFloat(p.amount || 0);

        if (!g.all_student_ids.includes(p.student_id)) {
          g.all_student_ids.push(p.student_id);
        }
        if (p.student_name && !g.all_student_names.includes(p.student_name)) {
          g.all_student_names.push(p.student_name);
        }
        if (p.nis && p.nis !== '-' && !g.all_nises.includes(p.nis)) {
          g.all_nises.push(p.nis);
        }
        if (p.class_name && p.class_name !== '-' && !g.all_classes.includes(p.class_name)) {
          g.all_classes.push(p.class_name);
        }
        const comp = p.component_display || p.fee_type_name;
        if (comp && !g.all_components.includes(comp)) {
          g.all_components.push(comp);
        }
        if (p.fee_type_id && !g.all_fee_type_ids.includes(p.fee_type_id)) {
          g.all_fee_type_ids.push(p.fee_type_id);
        }

        if (p.previous_data && !g.previous_data) {
          g.previous_data = p.previous_data;
          g.correction_reason = p.correction_reason;
        }
      }
    }

    let result = Array.from(groupedMap.values()).map(g => {
      return {
        ...g,
        amount: g.amount,
        student_name: g.all_student_names.join(', ') || g.student_name,
        nis: g.all_nises.join(', ') || g.nis || '-',
        class_name: g.all_classes.join(', ') || g.class_name || '-',
        component_display: g.all_components.join(', ') || g.component_display,
        fee_type_name: g.all_components.join(', ') || g.fee_type_name
      };
    });

    if (filters.fee_type_id) {
      result = result.filter(g => g.all_fee_type_ids.includes(Number(filters.fee_type_id)));
    }

    if (filters.search) {
      const s = filters.search.toLowerCase().trim();
      result = result.filter(p =>
        p.receipt_number?.toLowerCase().includes(s) ||
        p.student_name?.toLowerCase().includes(s) ||
        p.nis?.toLowerCase().includes(s) ||
        p.class_name?.toLowerCase().includes(s) ||
        p.component_display?.toLowerCase().includes(s) ||
        p.notes?.toLowerCase().includes(s)
      );
    }

    return result;
  }

  // ============================================================
  // 2. EDIT / KOREKSI PEMBAYARAN (Fitur #18)
  // ============================================================

  async getPaymentById(schoolUnitId, id) {
    const payment = await db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .leftJoin('cash_accounts', 'bill_payments.cash_account_id', 'cash_accounts.id')
      .where({ 'bill_payments.id': id })
      .select(
        'bill_payments.*',
        'student_bills.student_id',
        'student_bills.school_unit_id',
        'student_bills.academic_year_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'student_bills.amount as bill_amount',
        'fee_types.id as fee_type_id',
        'fee_types.name as fee_type_name',
        'fee_types.code as fee_type_code',
        'fee_types.billing_pattern',
        'fee_types.payment_account_mapping_id',
        'cash_accounts.name as cash_account_name',
        'cash_accounts.account_kind'
      )
      .first();

    if (!payment) return null;

    // Student Info
    try {
      const std = await crossModuleServices.getStudent(payment.student_id, payment.academic_year_id);
      if (std) {
        payment.student_name = std.full_name || std.name;
        payment.nis = std.nis || std.nipd || '-';
        payment.class_name = std.class_name || '-';
      }
    } catch (_) {}

    // School Unit Info
    try {
      const unit = await crossModuleServices.getSchoolUnit(payment.school_unit_id || schoolUnitId || 1);
      if (unit) {
        payment.school_unit_name = unit.name;
        payment.school_unit_address = unit.address;
      }
    } catch (_) {}

    // Academic Year Name
    try {
      const ay = await crossModuleServices.getAcademicYear(payment.academic_year_id);
      if (ay) payment.academic_year_name = ay.name;
    } catch (_) {}

    // Format Period & Component Display
    const MONTH_NAMES = {
      1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
      5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
      9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
    };
    const monthName = payment.period_month ? (MONTH_NAMES[payment.period_month] || '') : '';
    const isMonthlyOrSpp = (payment.fee_type_name && payment.fee_type_name.toLowerCase().includes('spp')) || payment.billing_pattern === 'monthly';
    payment.period_display = isMonthlyOrSpp
      ? (monthName ? `${monthName} ${payment.academic_year_name || payment.period_year || ''}`.trim() : (payment.academic_year_name || '-'))
      : (payment.academic_year_name || (payment.period_year ? `${payment.period_year}` : '-'));
    payment.component_display = `${payment.fee_type_name} (${payment.period_display})`.trim();

    // Check bank statement reference
    let foundBsId = null;
    const directRef = await db('bank_statement_references')
      .where({ reference_type: 'student_bill_payment', reference_id: id })
      .first();
    if (directRef) {
      foundBsId = directRef.bank_statement_id;
    }

    if (!foundBsId && payment.receipt_number) {
      const siblingRefs = await db('bank_statement_references')
        .join('bill_payments', 'bank_statement_references.reference_id', 'bill_payments.id')
        .where('bank_statement_references.reference_type', 'student_bill_payment')
        .where('bill_payments.receipt_number', payment.receipt_number)
        .select('bank_statement_references.bank_statement_id')
        .first();
      if (siblingRefs) {
        foundBsId = siblingRefs.bank_statement_id;
      }
    }

    if (!foundBsId) {
      const stmt = await db('bank_statements')
        .where({ reconciled_reference_type: 'student_bill_payment', reconciled_reference_id: id })
        .first();
      if (stmt) {
        foundBsId = stmt.id;
      } else if (payment.receipt_number) {
        const stmtSib = await db('bank_statements')
          .join('bill_payments', 'bank_statements.reconciled_reference_id', 'bill_payments.id')
          .where('bank_statements.reconciled_reference_type', 'student_bill_payment')
          .where('bill_payments.receipt_number', payment.receipt_number)
          .select('bank_statements.id')
          .first();
        if (stmtSib) {
          foundBsId = stmtSib.id;
        }
      }
    }

    if (foundBsId) {
      payment.bank_statement_id = foundBsId;
    }

    // Check existing journal entry
    const jEntry = await db('journal_entries')
      .where({ source_type: 'student_bill_payment', source_id: id })
      .first();
    if (jEntry) {
      payment.transaction_mapping_id = jEntry.transaction_mapping_id;
      const jLines = await db('journal_entry_lines').where({ journal_entry_id: jEntry.id });
      const dLine = jLines.find(l => parseFloat(l.debit || 0) > 0);
      const kLine = jLines.find(l => parseFloat(l.credit || 0) > 0);
      if (dLine) payment.override_debit_account_id = dLine.account_id;
      if (kLine) payment.override_credit_account_id = kLine.account_id;
    }

    // Fetch All Sibling Bill Payment Items in the Same Receipt (Multi-Bill / Multi-Student Transactions)
    if (payment.receipt_number) {
      const siblingPayments = await db('bill_payments')
        .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
        .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
        .where('bill_payments.receipt_number', payment.receipt_number)
        .select(
          'bill_payments.*',
          'student_bills.student_id',
          'student_bills.school_unit_id',
          'student_bills.academic_year_id',
          'student_bills.period_month',
          'student_bills.period_year',
          'student_bills.amount as bill_amount',
          'student_bills.discount_amount as bill_discount_amount',
          'student_bills.discount_type as bill_discount_type',
          'student_bills.discount_percentage as bill_discount_percentage',
          'student_bills.discount_reason as bill_discount_reason',
          'fee_types.id as fee_type_id',
          'fee_types.name as fee_type_name',
          'fee_types.code as fee_type_code',
          'fee_types.billing_pattern',
          'fee_types.payment_account_mapping_id'
        );

      payment.items = siblingPayments.map(sp => ({
        ...sp,
        amount: parseFloat(sp.amount || 0)
      }));
      payment.total_amount = siblingPayments.reduce((acc, sp) => acc + parseFloat(sp.amount || 0), 0);
      payment.all_student_ids = [...new Set(siblingPayments.map(sp => sp.student_id))];
    } else {
      payment.items = [{ ...payment, amount: parseFloat(payment.amount || 0) }];
      payment.total_amount = parseFloat(payment.amount || 0);
      payment.all_student_ids = [payment.student_id];
    }

    return payment;
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
    const {
      amount,
      paid_at,
      cash_account_id,
      payment_method,
      notes,
      correction_reason,
      bank_statement_id,
      transaction_mapping_id,
      override_debit_account_id,
      override_credit_account_id,
      override_cash_account_id,
      override_reason,
      allocations,
      is_historical
    } = data;

    if (!correction_reason || !correction_reason.trim()) {
      return { error: 'VALIDATION', message: 'Alasan koreksi (correction_reason) wajib diisi untuk menjaga integritas audit transaksi' };
    }

    return db.transaction(async (trx) => {
      // 1. Ambil record payment utama
      const primaryPayment = await trx('bill_payments')
        .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
        .leftJoin('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
        .where({ 'bill_payments.id': id })
        .select(
          'bill_payments.*',
          'student_bills.student_id',
          'student_bills.school_unit_id',
          'student_bills.academic_year_id',
          'student_bills.amount as bill_amount',
          'fee_types.id as fee_type_id',
          'fee_types.payment_account_mapping_id'
        )
        .first();

      if (!primaryPayment) return { error: 'NOT_FOUND', message: 'Pembayaran tidak ditemukan' };

      const targetUnitId = primaryPayment.school_unit_id || schoolUnitId || 1;
      const receiptNumber = primaryPayment.receipt_number;

      // Ambil seluruh bill_payments lama yang memiliki receipt_number yang sama
      let oldPayments = [];
      if (receiptNumber) {
        oldPayments = await trx('bill_payments').where({ receipt_number: receiptNumber });
      } else {
        oldPayments = [primaryPayment];
      }

      const previousSnapshot = oldPayments.map(op => ({
        id: op.id,
        student_bill_id: op.student_bill_id,
        amount: op.amount,
        paid_at: op.paid_at,
        cash_account_id: op.cash_account_id,
        payment_method: op.payment_method,
        notes: op.notes
      }));

      const newPaidAt = paid_at || primaryPayment.paid_at;
      const isLegacy = is_historical !== undefined ? Boolean(is_historical) : Boolean(primaryPayment.is_legacy);
      const newCashAccountId = isLegacy ? null : (cash_account_id !== undefined ? (cash_account_id ? Number(cash_account_id) : null) : primaryPayment.cash_account_id);
      const newPaymentMethod = isLegacy ? 'cash' : (payment_method !== undefined ? payment_method : primaryPayment.payment_method);
      const newNotes = notes !== undefined ? notes : primaryPayment.notes;

      // Validasi cutover jika non-historis
      if (!isLegacy && paid_at) {
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

      // KASUS 1: Koreksi dengan Rincian Alokasi Lengkap (allocations array)
      if (Array.isArray(allocations) && allocations.length > 0) {
        const oldPaymentIds = oldPayments.map(op => op.id);
        const oldBillIds = [...new Set(oldPayments.map(op => op.student_bill_id))];

        // 1. Ambil bank_statement_id yang sebelumnya terhubung untuk di-recalculate statusnya
        const oldRefs = await trx('bank_statement_references')
          .where({ reference_type: 'student_bill_payment' })
          .whereIn('reference_id', oldPaymentIds);
        const oldBsIds = [...new Set(oldRefs.map(r => r.bank_statement_id))];

        // Hapus bank statement references lama
        await trx('bank_statement_references')
          .where({ reference_type: 'student_bill_payment' })
          .whereIn('reference_id', oldPaymentIds)
          .delete();

        // Recalculate status mutasi bank lama jika referensi dilepas/diganti
        for (const oldBsId of oldBsIds) {
          const stmt = await trx('bank_statements').where({ id: oldBsId }).first();
          if (stmt) {
            const allocSum = await trx('bank_statement_references')
              .where('bank_statement_id', stmt.id)
              .sum('amount as total_allocated')
              .first();
            const curAlloc = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
            const stmtTotal = parseFloat(stmt.amount || 0);
            const isFullyReconciled = curAlloc >= stmtTotal - 0.01 && curAlloc > 0;
            const isPartial = curAlloc > 0 && !isFullyReconciled;

            const remainingRefs = await trx('bank_statement_references')
              .where('bank_statement_id', stmt.id)
              .orderBy('id', 'desc')
              .first();

            await trx('bank_statements')
              .where({ id: stmt.id })
              .update({
                is_reconciled: isFullyReconciled,
                reconciled_reference_type: remainingRefs ? remainingRefs.reference_type : null,
                reconciled_reference_id: remainingRefs ? remainingRefs.reference_id : null,
                reconciliation_notes: isFullyReconciled
                  ? `Lunas teralokasi ke transaksi`
                  : isPartial
                  ? `Teralokasi Rp ${curAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`
                  : null,
                reconciled_at: isFullyReconciled ? stmt.reconciled_at : (isPartial ? stmt.reconciled_at : null),
                updated_at: trx.fn.now()
              });
          }
        }

        const directStmts = await trx('bank_statements')
          .where('reconciled_reference_type', 'student_bill_payment')
          .whereIn('reconciled_reference_id', oldPaymentIds);
        for (const ds of directStmts) {
          if (!oldBsIds.includes(ds.id)) {
            await trx('bank_statements')
              .where({ id: ds.id })
              .update({
                is_reconciled: false,
                reconciled_reference_type: null,
                reconciled_reference_id: null,
                reconciliation_notes: null,
                reconciled_at: null,
                updated_at: trx.fn.now()
              });
          }
        }

        // 2. Hapus journal entries lama
        const oldJournals = await trx('journal_entries')
          .where({ source_type: 'student_bill_payment' })
          .whereIn('source_id', oldPaymentIds);
        const oldJournalIds = oldJournals.map(j => j.id);
        if (oldJournalIds.length > 0) {
          await trx('journal_entry_lines').whereIn('journal_entry_id', oldJournalIds).delete();
          await trx('journal_entries').whereIn('id', oldJournalIds).delete();
        }

        // Hapus journal diskon lama jika ada
        const oldDiscJournals = await trx('journal_entries')
          .where({ source_type: 'student_bill_discount' })
          .whereIn('source_id', oldBillIds);
        const oldDiscJournalIds = oldDiscJournals.map(j => j.id);
        if (oldDiscJournalIds.length > 0) {
          await trx('journal_entry_lines').whereIn('journal_entry_id', oldDiscJournalIds).delete();
          await trx('journal_entries').whereIn('id', oldDiscJournalIds).delete();
        }

        // 3. Hapus bill_payments lama
        await trx('bill_payments').whereIn('id', oldPaymentIds).delete();

        // B. Masukkan alokasi baru
        const createdPaymentIds = [];
        let totalAllocAmount = 0;
        const affectedBillIds = new Set(oldBillIds);

        for (const alloc of allocations) {
          const billId = Number(alloc.student_bill_id);
          affectedBillIds.add(billId);
          const allocAmount = parseFloat(alloc.amount || 0);
          totalAllocAmount += allocAmount;
          const hasDiscount = Boolean(alloc.has_discount);
          const discountAmount = parseFloat(alloc.discount_amount || 0);

          const bill = await trx('student_bills')
            .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
            .where('student_bills.id', billId)
            .select('student_bills.*', 'fee_types.name as fee_type_name', 'fee_types.payment_account_mapping_id')
            .first();

          if (!bill) continue;

          // Update Diskon Tagihan
          const billAmount = parseFloat(bill.amount || 0);
          if (hasDiscount && discountAmount > 0) {
            await trx('student_bills')
              .where({ id: bill.id })
              .update({
                discount_amount: discountAmount,
                discount_type: alloc.discount_type || (alloc.discount_percentage ? 'percentage' : 'nominal'),
                discount_percentage: alloc.discount_percentage || (billAmount > 0 ? (discountAmount / billAmount * 100) : null),
                discount_reason: alloc.discount_reason || 'Diskon saat koreksi pembayaran'
              });
          } else if (bill.discount_amount > 0 && !hasDiscount) {
            await trx('student_bills')
              .where({ id: bill.id })
              .update({
                discount_amount: 0,
                discount_type: null,
                discount_percentage: null,
                discount_reason: null
              });
          }

          // Insert bill_payment baru
          let newPaymentId = null;
          if (allocAmount > 0) {
            const [insertedId] = await trx('bill_payments').insert({
              student_bill_id: bill.id,
              cash_account_id: newCashAccountId,
              paid_at: newPaidAt,
              amount: allocAmount,
              payment_method: newPaymentMethod,
              receipt_number: receiptNumber || `KW/${new Date().getFullYear()}/${id}`,
              is_legacy: isLegacy,
              historical_cash_note: isLegacy ? 'Riwayat Saja (Non-Kas)' : null,
              notes: newNotes,
              previous_data: JSON.stringify(previousSnapshot),
              correction_reason: correction_reason.trim()
            });

            newPaymentId = insertedId || (await trx('bill_payments').where({ receipt_number: receiptNumber, student_bill_id: bill.id }).orderBy('id', 'desc').first()).id;
            createdPaymentIds.push(newPaymentId);
          }

          const billUnitId = bill.school_unit_id || targetUnitId;

          // Auto journal Diskon (Non-Kas)
          if (hasDiscount && discountAmount > 0 && !isLegacy) {
            try {
              let ftDiscMappingId = alloc.discount_mapping_id || null;
              if (!ftDiscMappingId && bill.fee_type_id) {
                const ft = await trx('fee_types').where({ id: bill.fee_type_id }).first();
                if (ft && ft.payment_discount_account_mapping_id) {
                  ftDiscMappingId = ft.payment_discount_account_mapping_id;
                } else if (ft && ft.billing_discount_account_mapping_id) {
                  ftDiscMappingId = ft.billing_discount_account_mapping_id;
                }
              }

              await recordJournal({
                schoolUnitId: billUnitId,
                academicYearId: Number(bill.academic_year_id || 2),
                transactionCode: 'student_bill_discount',
                mappingId: ftDiscMappingId,
                amount: discountAmount,
                sourceType: 'student_bill_discount',
                sourceId: bill.id,
                description: `Diskon tagihan #${bill.id} (${bill.fee_type_name || ''}) - Kwitansi ${receiptNumber}${alloc.discount_reason ? `: ${alloc.discount_reason}` : ''}`,
                journalDate: newPaidAt,
                overrideDebitAccountId: alloc.override_discount_debit_account_id || null,
                overrideCreditAccountId: alloc.override_discount_credit_account_id || null,
                overrideReason: alloc.discount_reason || correction_reason || 'Diskon saat koreksi pembayaran',
                userId,
                trx
              });
            } catch (discJournalErr) {
              console.warn('Discount auto journal skipped:', discJournalErr.message);
            }
          }

          // Auto journal Pembayaran Kas
          if (!isLegacy && allocAmount > 0 && newPaymentId) {
            try {
              let ftMappingId = alloc.transaction_mapping_id || data.transaction_mapping_id || bill.payment_account_mapping_id || null;
              await recordJournal({
                schoolUnitId: billUnitId,
                academicYearId: Number(bill.academic_year_id || 2),
                transactionCode: 'student_bill_payment',
                mappingId: ftMappingId,
                amount: allocAmount,
                sourceType: 'student_bill_payment',
                sourceId: newPaymentId,
                description: `Koreksi Pembayaran tagihan #${bill.id} (${receiptNumber})`,
                journalDate: newPaidAt,
                overrideDebitAccountId: alloc.override_debit_account_id || override_debit_account_id || null,
                overrideCreditAccountId: alloc.override_credit_account_id || override_credit_account_id || null,
                overrideCashAccountId: alloc.override_cash_account_id || override_cash_account_id || newCashAccountId || null,
                overrideReason: override_reason || correction_reason || 'Koreksi pembayaran tagihan siswa',
                userId,
                trx
              });
            } catch (journalErr) {
              console.warn('Auto journal on correctPayment allocations skipped:', journalErr.message);
            }
          }
        }

        // C. Link Rekening Koran jika Non-Tunai
        if (bank_statement_id && !isLegacy && createdPaymentIds.length > 0) {
          try {
            const stmt = await trx('bank_statements').where({ id: Number(bank_statement_id) }).first();
            if (stmt) {
              const allocSum = await trx('bank_statement_references')
                .where('bank_statement_id', stmt.id)
                .sum('amount as total_allocated')
                .first();
              const curAlloc = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
              const stmtTotal = parseFloat(stmt.amount || 0);
              const remainingPlafon = Math.max(0, stmtTotal - curAlloc);
              const thisAlloc = Math.min(totalAllocAmount, remainingPlafon);

              if (thisAlloc > 0) {
                await trx('bank_statement_references').insert({
                  bank_statement_id: stmt.id,
                  school_unit_id: targetUnitId,
                  reference_type: 'student_bill_payment',
                  reference_id: createdPaymentIds[0],
                  amount: thisAlloc,
                  notes: `Koreksi Kwitansi #${receiptNumber || id}`,
                  created_by: userId
                });

                const newAlloc = curAlloc + thisAlloc;
                const isFullyReconciled = newAlloc >= stmtTotal - 0.01;

                await trx('bank_statements')
                  .where({ id: stmt.id })
                  .update({
                    transaction_date: stmt.transaction_date,
                    is_reconciled: isFullyReconciled,
                    reconciled_reference_type: 'student_bill_payment',
                    reconciled_reference_id: createdPaymentIds[0],
                    reconciliation_notes: isFullyReconciled
                      ? `Lunas teralokasi ke transaksi (terakhir Kwitansi #${receiptNumber || id})`
                      : `Teralokasi Rp ${newAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
                    reconciled_at: isFullyReconciled ? trx.fn.now() : stmt.reconciled_at,
                    updated_at: trx.fn.now()
                  });
              }
            }
          } catch (bsErr) {
            console.warn('Bank statement linking on correctPayment skipped:', bsErr.message);
          }
        }

        // D. Hitung ulang status semua tagihan yang terpengaruh
        for (const billId of affectedBillIds) {
          const billRow = await trx('student_bills').where({ id: billId }).first();
          if (!billRow) continue;
          const allPay = await trx('bill_payments')
            .where('student_bill_id', billId)
            .sum('amount as total_paid')
            .first();
          const totalPaid = allPay?.total_paid ? parseFloat(allPay.total_paid) : 0;
          const effectiveBill = Math.max(0, parseFloat(billRow.amount || 0) - parseFloat(billRow.discount_amount || 0));
          const newStatus = (totalPaid >= effectiveBill) ? 'paid' : (totalPaid > 0 ? 'partially_paid' : (parseFloat(billRow.discount_amount || 0) > 0 ? 'partially_paid' : 'unpaid'));

          await trx('student_bills')
            .where({ id: billId })
            .update({ status: newStatus });
        }

        await logFinanceAudit({
          schoolUnitId: targetUnitId,
          userId,
          action: 'CORRECT_BILL_PAYMENT_MULTI',
          entityType: 'bill_payment',
          entityId: createdPaymentIds[0] || id,
          dataBefore: previousSnapshot,
          dataAfter: { receipt_number: receiptNumber, total_amount: totalAllocAmount, paid_at: newPaidAt, allocations },
          trx
        });

        return {
          data: {
            id: createdPaymentIds[0] || id,
            receipt_number: receiptNumber,
            total_amount: totalAllocAmount,
            paid_at: newPaidAt,
            payment_ids: createdPaymentIds
          }
        };
      }

      // KASUS 2: Fallback Single Payment Update (Legacy flow)
      const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(primaryPayment.amount);

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
        .where('student_bill_id', primaryPayment.student_bill_id)
        .sum('amount as total_paid')
        .first();
      const totalPaid = allPayments?.total_paid ? parseFloat(allPayments.total_paid) : 0;
      const billStatus = totalPaid >= parseFloat(primaryPayment.bill_amount) ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');

      await trx('student_bills')
        .where({ id: primaryPayment.student_bill_id })
        .update({ status: billStatus });

      // Bank Statement Linking Update
      if (bank_statement_id !== undefined && !primaryPayment.is_legacy) {
        await trx('bank_statement_references')
          .where({ reference_type: 'student_bill_payment', reference_id: id })
          .delete();

        if (bank_statement_id) {
          const stmt = await trx('bank_statements').where({ id: Number(bank_statement_id) }).first();
          if (stmt) {
            const allocSum = await trx('bank_statement_references')
              .where('bank_statement_id', stmt.id)
              .sum('amount as total_allocated')
              .first();
            const curAlloc = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
            const stmtTotal = parseFloat(stmt.amount || 0);
            const remainingPlafon = Math.max(0, stmtTotal - curAlloc);
            const thisAlloc = Math.min(newAmount, remainingPlafon);

            if (thisAlloc > 0) {
              await trx('bank_statement_references').insert({
                bank_statement_id: stmt.id,
                school_unit_id: primaryPayment.school_unit_id || schoolUnitId || 1,
                reference_type: 'student_bill_payment',
                reference_id: id,
                amount: thisAlloc,
                notes: `Koreksi Kwitansi #${primaryPayment.receipt_number || id}`,
                created_by: userId
              });

              const newAlloc = curAlloc + thisAlloc;
              const isFullyReconciled = newAlloc >= stmtTotal - 0.01;

              await trx('bank_statements')
                .where({ id: stmt.id })
                .update({
                  transaction_date: stmt.transaction_date,
                  is_reconciled: isFullyReconciled,
                  reconciled_reference_type: 'student_bill_payment',
                  reconciled_reference_id: id,
                  reconciliation_notes: isFullyReconciled
                    ? `Lunas teralokasi ke transaksi (terakhir Kwitansi #${primaryPayment.receipt_number})`
                    : `Teralokasi Rp ${newAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
                  reconciled_at: isFullyReconciled ? trx.fn.now() : stmt.reconciled_at,
                  updated_at: trx.fn.now()
                });
            }
          }
        }
      }

      // Update Journal Entry jika non-historis
      if (!primaryPayment.is_legacy) {
        try {
          const oldJ = await trx('journal_entries')
            .where({ source_type: 'student_bill_payment', source_id: id })
            .first();
          if (oldJ) {
            await trx('journal_entry_lines').where({ journal_entry_id: oldJ.id }).delete();
            await trx('journal_entries').where({ id: oldJ.id }).delete();
          }

          let ftMappingId = transaction_mapping_id || primaryPayment.payment_account_mapping_id || null;
          await recordJournal({
            schoolUnitId: primaryPayment.school_unit_id || schoolUnitId || 1,
            academicYearId: Number(primaryPayment.academic_year_id || 2),
            transactionCode: 'student_bill_payment',
            mappingId: ftMappingId,
            amount: newAmount,
            sourceType: 'student_bill_payment',
            sourceId: id,
            description: `Koreksi Pembayaran tagihan #${primaryPayment.student_bill_id} (${primaryPayment.receipt_number})`,
            journalDate: newPaidAt,
            overrideDebitAccountId: override_debit_account_id || null,
            overrideCreditAccountId: override_credit_account_id || null,
            overrideCashAccountId: override_cash_account_id || newCashAccountId || null,
            overrideReason: override_reason || correction_reason || 'Koreksi pembayaran siswa',
            userId,
            trx
          });
        } catch (jErr) {
          console.warn('Journal update on correctPayment skipped:', jErr.message);
        }
      }

      const updated = await trx('bill_payments').where({ id }).first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CORRECT_BILL_PAYMENT',
        entityType: 'bill_payment',
        entityId: id,
        dataBefore: primaryPayment,
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
        'student_bills.school_unit_id',
        'student_bills.academic_year_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern',
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
        'student_bills.school_unit_id',
        'student_bills.academic_year_id',
        'student_bills.period_month',
        'student_bills.period_year',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      );

    // Ambil daftar tahun ajaran untuk mapping nama tahun ajaran
    let ayMap = new Map();
    try {
      const allAys = await crossModuleServices.listAcademicYears();
      allAys.forEach(y => ayMap.set(Number(y.id), y));
    } catch (_) {}

    const distinctStudentIds = [...new Set(siblingPayments.map(p => p.student_id || payment.student_id).filter(Boolean))];
    const studentList = await Promise.all(
      distinctStudentIds.map(async (sid) => {
        try {
          const matchingPayment = siblingPayments.find(p => p.student_id === sid) || payment;
          const s = await crossModuleServices.getStudent(sid, matchingPayment?.academic_year_id);
          return s ? {
            id: sid,
            name: s.full_name || s.name || `Siswa ID ${sid}`,
            nis: s.nis || '-',
            class_name: s.class_name || '-',
            school_unit_id: s.satuan_pendidikan_id || s.school_unit_id
          } : { id: sid, name: `Siswa ID ${sid}`, nis: '-', class_name: '-' };
        } catch (_) {
          return { id: sid, name: `Siswa ID ${sid}`, nis: '-', class_name: '-' };
        }
      })
    );
    const studentMap = new Map(studentList.map(s => [s.id, s]));
    const primaryStudent = studentMap.get(payment.student_id) || studentList[0] || { id: payment.student_id, name: `Siswa ID ${payment.student_id}`, nis: '-', class_name: '-' };
    const combinedStudentNames = studentList.map(s => s.name).join(', ');
    const combinedStudentNis = studentList.map(s => s.nis).filter(n => n !== '-').join(', ') || '-';

    // Ambil data Satuan Pendidikan Siswa Terkait
    const targetSchoolUnitId = payment.school_unit_id || primaryStudent.school_unit_id || schoolUnitId || 1;
    let schoolUnit = null;
    try {
      schoolUnit = await crossModuleServices.getSchoolUnit(targetSchoolUnitId);
    } catch (_) {}

    const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const totalAmount = siblingPayments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    const amountInWords = terbilang(totalAmount);

    const items = siblingPayments.map(p => {
      const sObj = studentMap.get(p.student_id);
      const ayName = ayMap.get(Number(p.academic_year_id))?.name || (p.period_year ? `${p.period_year}` : '');
      const isMonthly = (p.billing_pattern === 'monthly') || (p.period_month != null && Number(p.period_month) > 0) || (p.fee_type_name && p.fee_type_name.toLowerCase().includes('spp'));

      let periodStr = '';
      if (isMonthly) {
        const monthName = MONTH_NAMES[p.period_month] || (p.period_month ? `Bulan ${p.period_month}` : '');
        periodStr = monthName ? `${monthName} ${ayName}`.trim() : (ayName || '-');
      } else {
        periodStr = ayName || (p.period_year ? `${p.period_year}` : '-');
      }

      return {
        payment_id: p.payment_id,
        bill_id: p.bill_id,
        student_id: p.student_id,
        student_name: sObj?.name || '',
        student_nis: sObj?.nis || '',
        class_name: sObj?.class_name || primaryStudent.class_name || '-',
        fee_type_name: p.fee_type_name,
        billing_pattern: p.billing_pattern,
        academic_year_id: p.academic_year_id,
        academic_year_name: ayName,
        period: periodStr,
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
      school_unit: schoolUnit ? {
        id: schoolUnit.id,
        name: schoolUnit.name,
        address: schoolUnit.address
      } : null,
      student: {
        id: payment.student_id,
        name: isMultiStudent ? combinedStudentNames : primaryStudent.name,
        nis: isMultiStudent ? combinedStudentNis : primaryStudent.nis,
        class_name: primaryStudent.class_name || '-',
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
          academicYearId: Number(bill.academic_year_id || 2),
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

        // Mutasi kantong dana (Fund Balance Mutation)
        try {
          await fundBalanceEngine.applyFundMutation({
            schoolUnitId,
            fundType: 'fee_type',
            fundRefId: bill.fee_type_id,
            academicYearId: Number(bill.academic_year_id || 2),
            direction: 'in',
            amount: parseFloat(alloc.allocated_amount),
            sourceTable: 'bill_payments',
            sourceId: paymentId,
            notes: `Penerimaan pos biaya verifikasi bukti transfer #${proof.id} tagihan #${bill.id} (${receiptNumber})`,
            userId,
            trx
          });
        } catch (fbErr) {
          console.warn('Fund balance mutation for proof verification skipped or error:', fbErr.message);
        }
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
    const refundAyId = bill ? Number(bill.academic_year_id || 2) : 2;
    try {
      await recordJournal({
        schoolUnitId,
        academicYearId: refundAyId,
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

      // Group studentRows by receipt_number so multi-split payments are 1 unified inflow entry
      const studentMap = new Map();
      studentRows.forEach(r => {
        const k = r.receipt_number ? `R_${r.receipt_number}` : `ID_${r.id}`;
        if (!studentMap.has(k)) {
          studentMap.set(k, { ...r, amount: parseFloat(r.amount || 0) });
        } else {
          studentMap.get(k).amount += parseFloat(r.amount || 0);
        }
      });

      studentMap.forEach(r => {
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
          description: r.notes || `Pembayaran Tagihan (${r.receipt_number || `Siswa #${r.student_id}`})`,
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

      const ppdbMap = new Map();
      ppdbRows.forEach(r => {
        const k = r.receipt_number ? `R_${r.receipt_number}` : `ID_${r.id}`;
        if (!ppdbMap.has(k)) {
          ppdbMap.set(k, { ...r, amount: parseFloat(r.amount || 0) });
        } else {
          ppdbMap.get(k).amount += parseFloat(r.amount || 0);
        }
      });

      ppdbMap.forEach(r => {
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

  // ============================================================
  // 8. SISWA YANG BERHAK MEMBAYAR TAGIHAN (Fitur Pembayaran Siswa)
  // Siswa Aktif, Siswa Baru/Pindahan T.A. Depan, & Alumni Bertunggakan
  // ============================================================
  async getEligibleStudentsForPayments(schoolUnitId, params = {}) {
    const selectedAcademicYearId = params.academic_year_id || null;

    // 1. Resolve Academic Year Context
    let currentAy = null;
    if (selectedAcademicYearId && selectedAcademicYearId !== 'all') {
      currentAy = await dbAkademik('academic_years').where('id', Number(selectedAcademicYearId)).first();
    }
    if (!currentAy) {
      currentAy = await dbAkademik('academic_years').where('is_active', 1).first() || await dbAkademik('academic_years').first();
    }

    const allAys = await dbAkademik('academic_years').orderBy('name', 'asc');
    const currentMatchingAys = currentAy ? allAys.filter(a => a.name === currentAy.name).map(a => a.id) : [];
    const unitIdFilter = (q) => {
      if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' && Number(schoolUnitId) > 0) {
        q.where('students.satuan_pendidikan_id', Number(schoolUnitId));
      }
    };

    // 2. KELOMPOK 1: SISWA AKTIF TERDAFTAR DI TAHUN AJARAN INI
    const enrollmentsInAy = await dbAkademik('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .leftJoin('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
      .whereIn('student_class_enrollments.academic_year_id', currentMatchingAys)
      .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal', 'calon'])
      .whereNotIn('students.status', ['batal', 'calon', 'pendaftaran', 'ppdb'])
      .modify(unitIdFilter)
      .select(
        'students.id',
        'students.full_name',
        'students.nis',
        'students.nipd',
        'students.nisn',
        'students.status as student_status',
        'student_class_enrollments.status as enrollment_status',
        'students.satuan_pendidikan_id',
        'class_groups.name as class_name',
        'class_groups.type as class_type'
      );

    // 3. KELOMPOK 2: ALUMNI / SISWA LULUS YANG MASIH MEMILIKI TUNGGAKAN
    const unpaidBills = await db('student_bills')
      .where('student_bills.status', '!=', 'paid')
      .whereRaw('(student_bills.amount - COALESCE(student_bills.discount_amount, 0) - COALESCE(student_bills.paid_amount, 0)) > 0')
      .select('student_bills.student_id');

    const unpaidStudentIds = [...new Set(unpaidBills.map(b => b.student_id))];

    let extraStudentsWithBills = [];
    if (unpaidStudentIds.length > 0) {
      extraStudentsWithBills = await dbAkademik('students')
        .whereIn('students.id', unpaidStudentIds)
        .whereIn('students.status', ['lulus', 'alumni'])
        .modify(unitIdFilter)
        .select(
          'students.id',
          'students.full_name',
          'students.nis',
          'students.nipd',
          'students.nisn',
          'students.status as student_status',
          'students.satuan_pendidikan_id'
        );
    }

    // 4. Gabungkan ke Map untuk deduplikasi dan standarisasi output
    const resultMap = new Map();

    const getBadgeInfo = (studentStatus, enrollmentStatus, className) => {
      const st = (studentStatus || '').toLowerCase();
      const en = (enrollmentStatus || '').toLowerCase();

      if (st === 'pindah') {
        return {
          category: 'transfer',
          badge: className ? `${className} (Pindah)` : 'Pindah',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      }
      if (st === 'keluar' || st === 'dikeluarkan' || en === 'keluar') {
        return {
          category: 'withdrawn',
          badge: className ? `${className} (Keluar)` : 'Keluar',
          badgeClass: 'bg-red-50 text-red-700 border-red-200'
        };
      }
      if (st === 'lulus' || st === 'alumni') {
        return {
          category: 'alumni_arrears',
          badge: className ? `${className} (Alumni)` : 'Alumni',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      }
      return {
        category: 'active',
        badge: className || 'Aktif',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    };

    // Masukkan siswa aktif terdaftar di T.A. ini
    enrollmentsInAy.forEach(s => {
      const { category, badge, badgeClass } = getBadgeInfo(s.student_status, s.enrollment_status, s.class_name);
      resultMap.set(s.id, {
        id: s.id,
        name: s.full_name || `Siswa #${s.id}`,
        nis: s.nipd || s.nis || s.nisn || '-',
        class_name: s.class_name || 'Siswa Aktif',
        student_status: s.student_status,
        category,
        badge,
        badgeClass
      });
    });

    // Masukkan alumni yang masih memiliki sisa tunggakan
    extraStudentsWithBills.forEach(s => {
      if (!resultMap.has(s.id)) {
        resultMap.set(s.id, {
          id: s.id,
          name: s.full_name || `Siswa #${s.id}`,
          nis: s.nipd || s.nis || s.nisn || '-',
          class_name: 'Alumni (Tunggakan)',
          student_status: s.student_status,
          category: 'alumni_arrears',
          badge: 'Alumni (Tunggakan)',
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 font-bold'
        });
      }
    });

    const finalStudentsList = Array.from(resultMap.values());
    finalStudentsList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return finalStudentsList;
  }
}

module.exports = new PaymentsService();

