/**
 * PSB Cross-Module Services Adapter
 * apps/api-backend/src/modules/psb/common/psbCrossModuleServices.js
 *
 * In-Process Bridge for PSB Module adhering to Rule #1 (Zero cross-database JOIN / Foreign Keys):
 * - Modul Akademik: academic_years, class_groups, grade_levels, students, guardians
 * - Modul Keuangan: fee_schemes, fee_scheme_items, fee_types, cash_accounts, ppdb_registration_bills
 * - Modul Core: school_units, users
 */
const dbAkademik = require('../../../config/db/akademik');
const dbKeuangan = require('../../../config/db/keuangan');
const dbCore = require('../../../config/db/core');
const usersService = require('../../core/users/service');

class PsbCrossModuleServices {
  // ==========================================
  // 1. Integrasi Modul Akademik
  // ==========================================

  async listAcademicYears(query = {}) {
    try {
      let q = dbAkademik('academic_years');
      if (query.satuan_pendidikan_id && query.satuan_pendidikan_id !== 'all') {
        q = q.where('satuan_pendidikan_id', Number(query.satuan_pendidikan_id));
      }
      if (query.is_active !== undefined) {
        q = q.where('is_active', Boolean(query.is_active));
      }
      const raw = await q.select('id', 'satuan_pendidikan_id', 'name', 'start_date', 'end_date', 'is_active')
        .orderBy('is_active', 'desc')
        .orderBy('name', 'desc');

      // Jika tanpa satuan_pendidikan_id (konteks gabungan/seluruh yayasan), deduplikasi berdasarkan nama tahun ajaran
      if (!query.satuan_pendidikan_id || query.satuan_pendidikan_id === 'all') {
        const uniqueMap = new Map();
        for (const item of raw) {
          if (!uniqueMap.has(item.name)) {
            uniqueMap.set(item.name, { ...item });
          } else {
            const existing = uniqueMap.get(item.name);
            if (item.is_active) existing.is_active = 1;
            if (!existing.start_date && item.start_date) existing.start_date = item.start_date;
            if (!existing.end_date && item.end_date) existing.end_date = item.end_date;
          }
        }
        return Array.from(uniqueMap.values());
      }

      return raw;
    } catch (err) {
      console.error('[PSB CrossModule] Gagal mengambil daftar tahun ajaran:', err.message);
      return [];
    }
  }

  async getAcademicYear(id) {
    if (!id) return null;
    try {
      return await dbAkademik('academic_years').where({ id: Number(id) }).first();
    } catch (err) {
      console.error(`[PSB CrossModule] Gagal mengambil tahun ajaran ID ${id}:`, err.message);
      return null;
    }
  }

  async listClassGroups(satuanPendidikanId, academicYearId = null) {
    try {
      let q = dbAkademik('class_groups')
        .leftJoin('grade_levels', 'class_groups.grade_level_id', 'grade_levels.id')
        .select(
          'class_groups.id',
          'class_groups.satuan_pendidikan_id',
          'class_groups.academic_year_id',
          'class_groups.name',
          'class_groups.grade_level_id',
          'grade_levels.name as grade_level_name',
          'class_groups.capacity',
          'class_groups.type'
        );

      if (satuanPendidikanId && satuanPendidikanId !== 'all') {
        q = q.where('class_groups.satuan_pendidikan_id', Number(satuanPendidikanId));
      }
      if (academicYearId && academicYearId !== 'all') {
        q = q.where('class_groups.academic_year_id', Number(academicYearId));
      }

      return await q.orderBy('class_groups.name', 'asc');
    } catch (err) {
      console.error('[PSB CrossModule] Gagal mengambil daftar rombel kelas:', err.message);
      return [];
    }
  }

  async getClassGroup(id) {
    if (!id) return null;
    try {
      return await dbAkademik('class_groups')
        .leftJoin('grade_levels', 'class_groups.grade_level_id', 'grade_levels.id')
        .where('class_groups.id', Number(id))
        .select(
          'class_groups.*',
          'grade_levels.name as grade_level_name'
        )
        .first();
    } catch (err) {
      console.error(`[PSB CrossModule] Gagal mengambil rombel ID ${id}:`, err.message);
      return null;
    }
  }

  async listGradeLevels(satuanPendidikanId = null) {
    try {
      let q = dbAkademik('grade_levels');
      if (satuanPendidikanId && satuanPendidikanId !== 'all') {
        q = q.where('satuan_pendidikan_id', Number(satuanPendidikanId));
      }
      return await q.select('id', 'satuan_pendidikan_id', 'name', 'level_order').orderBy('level_order', 'asc');
    } catch (err) {
      console.error('[PSB CrossModule] Gagal mengambil jenjang kelas:', err.message);
      return [];
    }
  }

  // ==========================================
  // 2. Integrasi Modul Keuangan
  // ==========================================

  async listFeeSchemes(satuanPendidikanId, academicYearId = null) {
    try {
      let q = dbKeuangan('fee_schemes');
      if (satuanPendidikanId && satuanPendidikanId !== 'all') {
        q = q.where('fee_schemes.school_unit_id', Number(satuanPendidikanId));
      }
      if (academicYearId && academicYearId !== 'all') {
        q = q.where('fee_schemes.academic_year_id', Number(academicYearId));
      }
      q = q.where('fee_schemes.is_active', true);

      const schemes = await q.select(
        'fee_schemes.id',
        'fee_schemes.school_unit_id',
        'fee_schemes.academic_year_id',
        'fee_schemes.code',
        'fee_schemes.name',
        'fee_schemes.description'
      ).orderBy('fee_schemes.id', 'desc');

      // Ambil rincian komponen biaya & hitung total
      for (const scheme of schemes) {
        scheme.items = await dbKeuangan('fee_scheme_items')
          .join('fee_types', 'fee_scheme_items.fee_type_id', 'fee_types.id')
          .where('fee_scheme_items.fee_scheme_id', scheme.id)
          .select(
            'fee_scheme_items.id',
            'fee_scheme_items.fee_type_id',
            'fee_types.name as fee_type_name',
            'fee_types.billing_pattern',
            'fee_scheme_items.value as amount'
          );
        scheme.total_amount = scheme.items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
      }

      return schemes;
    } catch (err) {
      console.error('[PSB CrossModule] Gagal mengambil skema biaya keuangan:', err.message);
      return [];
    }
  }

  async getFeeScheme(id) {
    if (!id) return null;
    try {
      const scheme = await dbKeuangan('fee_schemes').where({ id: Number(id) }).first();
      if (!scheme) return null;

      scheme.items = await dbKeuangan('fee_scheme_items')
        .join('fee_types', 'fee_scheme_items.fee_type_id', 'fee_types.id')
        .where('fee_scheme_items.fee_scheme_id', scheme.id)
        .select(
          'fee_scheme_items.id',
          'fee_scheme_items.fee_type_id',
          'fee_types.name as fee_type_name',
          'fee_types.billing_pattern',
          'fee_scheme_items.value as amount'
        );
      scheme.total_amount = scheme.items.reduce((sum, it) => sum + Number(it.amount || 0), 0);

      return scheme;
    } catch (err) {
      console.error(`[PSB CrossModule] Gagal mengambil skema biaya ID ${id}:`, err.message);
      return null;
    }
  }

  async listCashAccounts(satuanPendidikanId = null) {
    try {
      let q = dbKeuangan('cash_accounts').where('is_active', true);
      if (satuanPendidikanId && satuanPendidikanId !== 'all') {
        q = q.where('school_unit_id', Number(satuanPendidikanId));
      }
      return await q.select('id', 'school_unit_id', 'name as account_name', 'account_kind as account_type', 'bank_name', 'bank_account_number as account_number');
    } catch (err) {
      console.error('[PSB CrossModule] Gagal mengambil rekening kas/bank:', err.message);
      return [];
    }
  }

  // Tagihan Pendaftaran PPDB ke Modul Keuangan (ppdb_registration_bills)
  async createRegistrationFeeBill(payload) {
    const {
      schoolUnitId,
      registrantId,
      targetAcademicYearId,
      amount,
      registrantName,
      registrationNumber,
      dueDate,
      userId
    } = payload;

    try {
      const existing = await dbKeuangan('ppdb_registration_bills')
        .where({
          psb_registrant_ref_id: Number(registrantId),
          billing_phase: 'registration_fee'
        })
        .first();

      if (existing) {
        return existing;
      }

      const today = new Date().toISOString().slice(0, 10);
      const cleanDueDate = dueDate || today;

      const [id] = await dbKeuangan('ppdb_registration_bills').insert({
        school_unit_id: Number(schoolUnitId),
        target_academic_year_id: Number(targetAcademicYearId || 1),
        academic_year_id: Number(targetAcademicYearId || 1),
        psb_registrant_ref_id: Number(registrantId),
        registrant_name_snapshot: registrantName || 'Calon Murid',
        registration_number_snapshot: registrationNumber || null,
        fee_type_id: 2, // Pendaftaran
        amount: Number(amount) || 0,
        paid_amount: 0.00,
        bill_date: today,
        due_date: cleanDueDate,
        version: 1,
        billing_phase: 'registration_fee',
        status: 'unpaid',
        notes: `Biaya Pendaftaran PSB No. Reg: ${registrationNumber || '-'}`,
        created_by: userId ? Number(userId) : null,
        created_at: dbKeuangan.fn.now(),
        updated_at: dbKeuangan.fn.now()
      });

      return await dbKeuangan('ppdb_registration_bills').where({ id }).first();
    } catch (err) {
      console.error('[PSB CrossModule] Gagal membuat tagihan pendaftaran di keuangan:', err.message);
      return null;
    }
  }

  async getRegistrationFeeBill(registrantId, regNumber = null) {
    try {
      let query = dbKeuangan('ppdb_registration_bills as prb')
        .leftJoin('fee_types as ft', 'prb.fee_type_id', 'ft.id')
        .where((b) => {
          b.where('prb.psb_registrant_ref_id', Number(registrantId))
           .orWhere('prb.linked_student_id', Number(registrantId));
          if (regNumber) {
            b.orWhere('prb.registration_number_snapshot', String(regNumber));
          }
        })
        .where((b) => {
          b.where('prb.billing_phase', 'registration_fee')
           .orWhere('prb.fee_type_id', 2)
           .orWhere('ft.name', 'like', '%daftar%')
           .orWhere('ft.name', 'like', '%formulir%')
           .orWhere('ft.code', 'like', '%REG%')
           .orWhere('ft.code', 'like', '%PSB%');
        });

      const bill = await query
        .select('prb.*', 'ft.name as fee_type_name')
        .orderBy('prb.id', 'desc')
        .first();

      if (bill) {
        const payments = await dbKeuangan('ppdb_registration_payments as prp')
          .leftJoin('cash_accounts as ca', 'prp.cash_account_id', 'ca.id')
          .where('prp.ppdb_registration_bill_id', bill.id)
          .select(
            'prp.*',
            'ca.name as account_name',
            'ca.bank_name'
          )
          .orderBy('prp.payment_date', 'desc')
          .orderBy('prp.id', 'desc');

        const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount_paid || 0), 0);
        const billAmount = parseFloat(bill.amount || 0);

        bill.payments = payments;
        bill.paid_amount = totalPaid > 0 ? totalPaid : parseFloat(bill.paid_amount || 0);
        bill.has_payments = payments.length > 0;
        bill.is_paid = (payments.length > 0 && bill.paid_amount >= billAmount) || bill.status === 'paid';
        return bill;
      }

      // Jika belum diterbitkan sebagai tagihan formal di ppdb_registration_bills,
      // periksa apakah sudah ditetapkan skema biaya / penyesuaian khusus di Keuangan
      const adj = await dbKeuangan('student_fee_adjustments as sfa')
        .join('fee_types as ft', 'sfa.fee_type_id', 'ft.id')
        .where('sfa.student_id', Number(registrantId))
        .where((f) => {
          f.where('sfa.fee_type_id', 2)
           .orWhere('ft.name', 'like', '%daftar%')
           .orWhere('ft.name', 'like', '%formulir%');
        })
        .orderBy('sfa.id', 'desc')
        .first();

      if (adj) {
        const adjAmount = parseFloat(adj.override_amount || 0);
        return {
          id: null,
          amount: adjAmount,
          paid_amount: 0,
          status: 'unpaid',
          is_paid: false,
          has_payments: false,
          fee_type_name: adj.name || 'Pendaftaran',
          payments: []
        };
      }

      const asg = await dbKeuangan('student_fee_scheme_assignments as sfsa')
        .where('sfsa.student_id', Number(registrantId))
        .whereNotNull('sfsa.fee_scheme_id')
        .orderBy('sfsa.id', 'desc')
        .first();

      if (asg && asg.fee_scheme_id) {
        const schemeItem = await dbKeuangan('fee_scheme_items as fsi')
          .join('fee_types as ft', 'fsi.fee_type_id', 'ft.id')
          .where('fsi.fee_scheme_id', asg.fee_scheme_id)
          .where((f) => {
            f.where('fsi.fee_type_id', 2)
             .orWhere('ft.name', 'like', '%daftar%')
             .orWhere('ft.name', 'like', '%formulir%');
          })
          .first();

        if (schemeItem && parseFloat(schemeItem.value || 0) > 0) {
          return {
            id: null,
            amount: parseFloat(schemeItem.value || 0),
            paid_amount: 0,
            status: 'unpaid',
            is_paid: false,
            has_payments: false,
            fee_type_name: schemeItem.name || 'Pendaftaran',
            payments: []
          };
        }
      }

      return null;
    } catch (err) {
      console.error(`[PSB CrossModule] Gagal mengambil tagihan pendaftaran santri ID ${registrantId}:`, err.message);
      return null;
    }
  }

  async recordRegistrationFeePayment(payload) {
    const {
      billId,
      schoolUnitId,
      cashAccountId,
      amountPaid,
      paymentMethod = 'cash',
      paymentDate,
      notes,
      userId
    } = payload;

    try {
      return await dbKeuangan.transaction(async (trx) => {
        const bill = await trx('ppdb_registration_bills').where({ id: Number(billId) }).first();
        if (!bill) {
          throw new Error('Tagihan pendaftaran tidak ditemukan di Keuangan');
        }

        const dateStr = (paymentDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(0, 8);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const receiptNumber = `KWT-PSB-${dateStr}-${randomSuffix}`;

        const [paymentId] = await trx('ppdb_registration_payments').insert({
          ppdb_registration_bill_id: bill.id,
          cash_account_id: Number(cashAccountId || 1),
          receipt_number: receiptNumber,
          amount_paid: Number(amountPaid),
          payment_date: paymentDate || new Date().toISOString().slice(0, 10),
          payment_method: paymentMethod,
          notes: notes || `Pembayaran Biaya Pendaftaran PSB - ${bill.registrant_name_snapshot}`,
          created_by: userId ? Number(userId) : null,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });

        const newPaidTotal = parseFloat(bill.paid_amount || 0) + parseFloat(amountPaid);
        const isLunas = newPaidTotal >= parseFloat(bill.amount);
        const newStatus = isLunas ? 'paid' : 'partially_paid';

        await trx('ppdb_registration_bills').where({ id: bill.id }).update({
          paid_amount: newPaidTotal,
          status: newStatus,
          updated_at: trx.fn.now()
        });

        return {
          payment_id: paymentId,
          receipt_number: receiptNumber,
          amount_paid: Number(amountPaid),
          is_paid: isLunas,
          status: newStatus
        };
      });
    } catch (err) {
      console.error('[PSB CrossModule] Gagal mencatat pembayaran pendaftaran:', err.message);
      throw err;
    }
  }

  // Tagihan Uang Pangkal / Biaya Masuk (Enrollment Fee)
  async createEnrollmentFeeBill(payload) {
    const {
      schoolUnitId,
      registrantId,
      targetAcademicYearId,
      feeSchemeId,
      customAmount = null,
      registrantName,
      registrationNumber,
      dueDate,
      userId
    } = payload;

    try {
      const existing = await dbKeuangan('ppdb_registration_bills')
        .where({
          psb_registrant_ref_id: Number(registrantId),
          billing_phase: 'enrollment_fee'
        })
        .first();

      if (existing) {
        return existing;
      }

      let totalAmount = customAmount ? Number(customAmount) : 0;
      let notes = `Tagihan Uang Pangkal PSB - ${registrationNumber || '-'}`;

      if (!customAmount && feeSchemeId) {
        const scheme = await this.getFeeScheme(feeSchemeId);
        if (scheme) {
          // Uang pangkal mengambil seluruh komponen skema biaya (kecuali biaya pendaftaran jika fee_type_id = 2)
          const enrollmentItems = scheme.items.filter(it => it.fee_type_id !== 2);
          totalAmount = enrollmentItems.reduce((acc, it) => acc + Number(it.amount || 0), 0);
          notes = `Tagihan Uang Pangkal (Skema: ${scheme.name}) - ${registrationNumber || '-'}`;
        }
      }

      if (totalAmount <= 0) {
        totalAmount = 15000000; // Default nominal uang pangkal standar
      }

      const today = new Date().toISOString().slice(0, 10);
      const cleanDueDate = dueDate || today;

      const [id] = await dbKeuangan('ppdb_registration_bills').insert({
        school_unit_id: Number(schoolUnitId),
        target_academic_year_id: Number(targetAcademicYearId || 1),
        academic_year_id: Number(targetAcademicYearId || 1),
        psb_registrant_ref_id: Number(registrantId),
        registrant_name_snapshot: registrantName || 'Calon Murid Diterima',
        registration_number_snapshot: registrationNumber || null,
        fee_type_id: 8, // Bangunan / Uang Pangkal
        amount: totalAmount,
        paid_amount: 0.00,
        bill_date: today,
        due_date: cleanDueDate,
        version: 1,
        billing_phase: 'enrollment_fee',
        status: 'unpaid',
        notes,
        created_by: userId ? Number(userId) : null,
        created_at: dbKeuangan.fn.now(),
        updated_at: dbKeuangan.fn.now()
      });

      return await dbKeuangan('ppdb_registration_bills').where({ id }).first();
    } catch (err) {
      console.error('[PSB CrossModule] Gagal membuat tagihan uang pangkal:', err.message);
      throw err;
    }
  }

  async getEnrollmentFeeBill(registrantId, regNumber = null) {
    try {
      let query = dbKeuangan('ppdb_registration_bills as prb')
        .leftJoin('fee_types as ft', 'prb.fee_type_id', 'ft.id')
        .where((b) => {
          b.where('prb.psb_registrant_ref_id', Number(registrantId))
           .orWhere('prb.linked_student_id', Number(registrantId));
          if (regNumber) {
            b.orWhere('prb.registration_number_snapshot', String(regNumber));
          }
        })
        .where((b) => {
          b.where('prb.fee_type_id', '!=', 2)
           .where('ft.name', 'not like', '%daftar%')
           .where('ft.name', 'not like', '%formulir%')
           .where('prb.billing_phase', '!=', 'registration_fee');
        });

      const bills = await query
        .select('prb.*', 'ft.name as fee_type_name')
        .orderBy('prb.id', 'asc');

      if (!bills || bills.length === 0) return null;

      const billIds = bills.map((b) => b.id);
      const payments = await dbKeuangan('ppdb_registration_payments as prp')
        .leftJoin('cash_accounts as ca', 'prp.cash_account_id', 'ca.id')
        .whereIn('prp.ppdb_registration_bill_id', billIds)
        .select(
          'prp.*',
          'ca.name as account_name',
          'ca.bank_name'
        )
        .orderBy('prp.payment_date', 'desc')
        .orderBy('prp.id', 'desc');

      const totalAmount = bills.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
      const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount_paid || 0), 0);
      const remainingBalance = Math.max(0, totalAmount - totalPaid);
      const hasPayments = payments.length > 0;
      const isPaid = (totalAmount > 0 && remainingBalance <= 0 && hasPayments) || bills.every((b) => b.status === 'paid');
      const isMinPaid = hasPayments && totalPaid > 0;

      return {
        id: bills[0].id,
        all_bill_ids: billIds,
        bills,
        amount: totalAmount,
        paid_amount: totalPaid,
        remaining_balance: remainingBalance,
        status: isPaid ? 'paid' : (isMinPaid ? 'partially_paid' : 'unpaid'),
        is_paid: isPaid,
        is_min_paid: isMinPaid,
        has_payments: hasPayments,
        payments,
        receipt_number: payments[0]?.receipt_number || null,
        payment_date: payments[0]?.payment_date || null
      };
    } catch (err) {
      console.error(`[PSB CrossModule] Gagal mengambil tagihan uang pangkal santri ID ${registrantId}:`, err.message);
      return null;
    }
  }

  async recordEnrollmentFeePayment(payload) {
    const {
      billId,
      schoolUnitId,
      cashAccountId,
      amountPaid,
      paymentMethod = 'cash',
      paymentDate,
      notes,
      userId
    } = payload;

    try {
      return await dbKeuangan.transaction(async (trx) => {
        const bill = await trx('ppdb_registration_bills').where({ id: Number(billId) }).first();
        if (!bill) {
          throw new Error('Tagihan uang pangkal tidak ditemukan di Keuangan');
        }

        const dateStr = (paymentDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(0, 8);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const receiptNumber = `KWT-PSB-UP-${dateStr}-${randomSuffix}`;

        const [paymentId] = await trx('ppdb_registration_payments').insert({
          ppdb_registration_bill_id: bill.id,
          cash_account_id: Number(cashAccountId || 1),
          receipt_number: receiptNumber,
          amount_paid: Number(amountPaid),
          payment_date: paymentDate || new Date().toISOString().slice(0, 10),
          payment_method: paymentMethod,
          notes: notes || `Pembayaran Uang Pangkal PPDB - ${bill.registrant_name_snapshot}`,
          created_by: userId ? Number(userId) : null,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });

        const newPaidTotal = parseFloat(bill.paid_amount || 0) + parseFloat(amountPaid);
        const isLunas = newPaidTotal >= parseFloat(bill.amount);
        const newStatus = isLunas ? 'paid' : 'partially_paid';

        await trx('ppdb_registration_bills').where({ id: bill.id }).update({
          paid_amount: newPaidTotal,
          status: newStatus,
          updated_at: trx.fn.now()
        });

        return {
          payment_id: paymentId,
          receipt_number: receiptNumber,
          amount_paid: Number(amountPaid),
          total_paid: newPaidTotal,
          remaining_balance: Math.max(0, Number(bill.amount) - newPaidTotal),
          is_paid: isLunas,
          status: newStatus
        };
      });
    } catch (err) {
      console.error('[PSB CrossModule] Gagal mencatat pembayaran uang pangkal:', err.message);
      throw err;
    }
  }

  // ==========================================
  // Kuota Rombel & Penempatan Siswa di Akademik
  // ==========================================

  async checkClassGroupQuota(classGroupId, processId = null, gender = null) {
    const classGroup = await dbAkademik('class_groups').where({ id: Number(classGroupId) }).first();
    if (!classGroup) {
      const error = new Error('Rombel kelas tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Ambil kuota terkonfigurasi jika ada di psb_process_class_quotas
    let quotaConfig = null;
    if (processId) {
      quotaConfig = await dbAkademik('psb_process_class_quotas')
        .where({
          class_group_id: Number(classGroupId),
          psb_process_id: Number(processId)
        })
        .first();
    }

    // Ambil santri aktif yang terdaftar di rombel ini
    const enrollments = await dbAkademik('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .where({
        'student_class_enrollments.class_group_id': Number(classGroupId),
        'student_class_enrollments.status': 'aktif'
      })
      .select('students.id', 'students.gender');

    const enrolledMale = enrollments.filter(s => s.gender === 'L').length;
    const enrolledFemale = enrollments.filter(s => s.gender === 'P').length;
    const totalEnrolled = enrollments.length;

    const maxCapacity = quotaConfig?.total_quota || classGroup.capacity || 30;
    const quotaMale = quotaConfig?.quota_male || Math.floor(maxCapacity / 2);
    const quotaFemale = quotaConfig?.quota_female || Math.ceil(maxCapacity / 2);

    const remainingMale = Math.max(0, quotaMale - enrolledMale);
    const remainingFemale = Math.max(0, quotaFemale - enrolledFemale);
    const remainingTotal = Math.max(0, maxCapacity - totalEnrolled);

    let isAvailable = remainingTotal > 0;
    if (gender === 'L') {
      isAvailable = remainingMale > 0 && remainingTotal > 0;
    } else if (gender === 'P') {
      isAvailable = remainingFemale > 0 && remainingTotal > 0;
    }

    return {
      class_group_id: classGroup.id,
      class_group_name: classGroup.name,
      capacity: maxCapacity,
      total_enrolled: totalEnrolled,
      remaining_total: remainingTotal,
      gender_stats: {
        quota_male: quotaMale,
        enrolled_male: enrolledMale,
        remaining_male: remainingMale,
        quota_female: quotaFemale,
        enrolled_female: enrolledFemale,
        remaining_female: remainingFemale
      },
      is_available: isAvailable
    };
  }

  async enrollAndPlaceStudent(payload) {
    const {
      registrantId,
      classGroupId,
      academicYearId,
      placedBy = null,
      customNipd = null,
      notes = null
    } = payload;

    const reg = await dbAkademik('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Cek kuota rombel terlebih dahulu
    const quota = await this.checkClassGroupQuota(classGroupId, reg.psb_process_id, reg.gender);
    if (!quota.is_available) {
      const error = new Error(`Kuota rombel "${quota.class_group_name}" untuk jenis kelamin ${reg.gender === 'L' ? 'Laki-laki' : 'Perempuan'} sudah penuh (Tersedia: ${reg.gender === 'L' ? quota.gender_stats.remaining_male : quota.gender_stats.remaining_female})`);
      error.statusCode = 400;
      throw error;
    }

    return await dbAkademik.transaction(async (trx) => {
      // 1. Generate NIPD & NIS
      const yearPrefix = new Date().getFullYear().toString().slice(-2);
      const unitCode = String(reg.satuan_pendidikan_id || 1).padStart(2, '0');
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const nipd = customNipd || `${yearPrefix}${unitCode}${randomSeq}`;
      const nis = nipd;

      // 2. Insert ke students di Akademik
      const [studentId] = await trx('students').insert({
        satuan_pendidikan_id: reg.satuan_pendidikan_id,
        entry_academic_year_id: Number(academicYearId || 1),
        nipd,
        nis,
        nisn: reg.nisn || null,
        full_name: reg.full_name,
        gender: reg.gender,
        birth_place: reg.birth_place,
        birth_date: reg.birth_date,
        address: reg.address,
        user_id: reg.user_account_id || null,
        status: 'aktif',
        enrolled_at: trx.fn.now(),
        created_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });

      // 3. Insert ke student_class_enrollments
      const [enrollmentId] = await trx('student_class_enrollments').insert({
        satuan_pendidikan_id: reg.satuan_pendidikan_id,
        student_id: studentId,
        class_group_id: Number(classGroupId),
        academic_year_id: Number(academicYearId || 1),
        status: 'aktif',
        created_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });

      // 4. Catat di psb_placement_logs
      await trx('psb_placement_logs').insert({
        psb_registrant_id: reg.id,
        academic_year_id: Number(academicYearId || 1),
        class_group_id: Number(classGroupId),
        nipd,
        placed_by: placedBy ? String(placedBy) : 'Panitia PSB',
        placed_at: trx.fn.now(),
        notes: notes || `Penempatan siswa baru ke rombel ${quota.class_group_name}`
      });

      // 5. Update data psb_registrants
      await trx('psb_registrants').where({ id: reg.id }).update({
        status: 'placed',
        placed_class_group_id: Number(classGroupId),
        placed_student_id: studentId,
        placed_nipd: nipd,
        updated_at: trx.fn.now()
      });

      // 6. Hubungkan ke tagihan Keuangan & tetapkan skema biaya siswa aktif
      try {
        await dbKeuangan('ppdb_registration_bills')
          .where({ psb_registrant_ref_id: reg.id })
          .update({ linked_student_id: studentId, updated_at: dbKeuangan.fn.now() });

        // Pastikan juga penetapan skema biaya siswa baru di Keuangan tercatat jika pendaftar memiliki skema
        const effectiveAyId = Number(academicYearId || 1);
        const existingAsg = await dbKeuangan('student_fee_scheme_assignments')
          .where({ student_id: studentId, academic_year_id: effectiveAyId })
          .first();

        if (!existingAsg) {
          let targetSchemeId = reg.fee_group_id ? Number(reg.fee_group_id) : null;
          if (!targetSchemeId) {
            const defaultScheme = await dbKeuangan('fee_schemes')
              .where(b => {
                b.where('school_unit_id', Number(reg.satuan_pendidikan_id || 1)).orWhere('school_unit_id', 0).orWhereNull('school_unit_id');
              })
              .where('academic_year_id', effectiveAyId)
              .orderBy('id', 'asc')
              .first();
            if (defaultScheme) targetSchemeId = defaultScheme.id;
          }

          if (targetSchemeId) {
            await dbKeuangan('student_fee_scheme_assignments').insert({
              school_unit_id: Number(reg.satuan_pendidikan_id || 1),
              student_id: studentId,
              academic_year_id: effectiveAyId,
              fee_scheme_id: targetSchemeId,
              reason: 'Penetapan otomatis dari PPDB Placement (Transisi Siswa Baru)',
              is_custom: false,
              created_at: dbKeuangan.fn.now(),
              updated_at: dbKeuangan.fn.now()
            });
          }
        }
      } catch (kErr) {
        console.warn('[PSB Placement] Warning sync to Keuangan:', kErr.message);
      }

      return {
        student_id: studentId,
        enrollment_id: enrollmentId,
        nipd,
        class_group_id: Number(classGroupId),
        class_group_name: quota.class_group_name,
        full_name: reg.full_name,
        gender: reg.gender,
        status: 'placed'
      };
    });
  }

  async releaseClassPlacement(studentId, classGroupId) {
    if (!studentId) return;
    try {
      if (classGroupId) {
        await dbAkademik('student_class_enrollments')
          .where({
            student_id: Number(studentId),
            class_group_id: Number(classGroupId)
          })
          .update({
            status: 'pindah',
            updated_at: dbAkademik.fn.now()
          });
      }
      await dbAkademik('students')
        .where({ id: Number(studentId) })
        .update({
          status: 'keluar',
          updated_at: dbAkademik.fn.now()
        });
    } catch (err) {
      console.error(`[PSB CrossModule] Gagal melepaskan penempatan siswa ID ${studentId}:`, err.message);
    }
  }

  async updateBillRefundStatus(registrantId, refundStatus, refundAmount = null, details = {}) {
    try {
      const updates = {
        refund_status: refundStatus,
        updated_at: dbKeuangan.fn.now()
      };
      if (refundAmount !== null) updates.refund_amount = Number(refundAmount);
      if (details.bank_name || details.account_number) {
        updates.refund_bank_account_number = `${details.bank_name || ''} - ${details.account_number || ''}`.trim();
      }
      if (details.account_holder) updates.refund_bank_account_holder = details.account_holder;
      if (details.reason) updates.refund_reason = details.reason;
      if (details.approved_by) updates.refund_approved_by = Number(details.approved_by);

      await dbKeuangan('ppdb_registration_bills')
        .where({ psb_registrant_ref_id: Number(registrantId) })
        .update(updates);
    } catch (err) {
      console.error(`[PSB CrossModule] Gagal update refund status tagihan calon murid ID ${registrantId}:`, err.message);
    }
  }

  async recordRefundDisbursementInKeuangan(payload) {
    const {
      registrantId,
      schoolUnitId,
      cashAccountId,
      amount,
      recipientName,
      proofNumber = null,
      disbursementDate = null,
      notes = null
    } = payload;

    try {
      const today = disbursementDate || new Date().toISOString().slice(0, 10);
      const proof = proofNumber || `BKK-REFUND-${Date.now().toString().slice(-6)}`;

      // 1. Catat Pengeluaran di keuangan.expenses
      const [expenseId] = await dbKeuangan('expenses').insert({
        school_unit_id: Number(schoolUnitId || 1),
        cash_account_id: Number(cashAccountId || 1),
        item_name: `Pengembalian Dana (Refund) PSB: ${recipientName || 'Calon Santri'}`,
        unit_price: Number(amount),
        quantity: 1,
        total_amount: Number(amount),
        expense_date: today,
        proof_number: proof,
        notes: notes || `Pengembalian dana santri mengundurkan diri (Ref Registrant ID ${registrantId})`,
        created_at: dbKeuangan.fn.now(),
        updated_at: dbKeuangan.fn.now()
      });

      // 2. Perbarui status tagihan Keuangan menjadi 'processed'
      await dbKeuangan('ppdb_registration_bills')
        .where({ psb_registrant_ref_id: Number(registrantId) })
        .update({
          refund_status: 'processed',
          refund_processed_at: dbKeuangan.fn.now(),
          updated_at: dbKeuangan.fn.now()
        });

      return {
        expense_id: expenseId,
        proof_number: proof,
        disbursed_amount: Number(amount),
        disbursement_date: today
      };
    } catch (err) {
      console.error('[PSB CrossModule] Gagal mencatat pengeluaran refund di Keuangan:', err.message);
      throw err;
    }
  }

  async listSchoolUnits() {
    try {
      return await dbCore('school_units')
        .select('id', 'name', 'level', 'npsn', 'address', 'is_active')
        .where('is_active', true)
        .orderBy('id', 'asc');
    } catch (err) {
      console.error('[PSB CrossModule] Gagal mengambil satuan pendidikan:', err.message);
      return [];
    }
  }

  async getSchoolUnit(id) {
    if (!id) return null;
    try {
      return await dbCore('school_units').where({ id: Number(id) }).first();
    } catch (err) {
      console.error(`[PSB CrossModule] Gagal mengambil satuan pendidikan ID ${id}:`, err.message);
      return null;
    }
  }

  async createStudentUserAccount(payload) {
    return await usersService.internalCreateUser(payload);
  }
}

module.exports = new PsbCrossModuleServices();
