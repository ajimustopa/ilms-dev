/**
 * Payroll Service Implementation
 * Modul Kepegawaian - Fitur 4: Penggajian (Payroll)
 * 
 * Penguatan Batasan Wewenang:
 * - Kalkulasi & Edit Draft
 * - Verifikasi Tiap Slip & Penguncian Periode (Locked)
 * - Serah Terima ke Keuangan (Ingest ke payroll_disbursements dengan Breakdown Snapshot)
 * - Pengembalian untuk Koreksi (Return for Correction) dari Keuangan
 * - Audit Trail Lengkap (payroll_audit_logs)
 */
const db = require('../../../config/db/kepegawaian');
const { logPayrollAudit, listPayrollAuditLogs } = require('../common/auditLogService');
const keuanganPayrollService = require('../../keuangan/payroll/service');

class PayrollService {
  // ==========================================
  // 1. Periode Payroll
  // ==========================================
  async createPeriod(payload, userId = null) {
    const { school_unit_id, period_month, period_year } = payload;
    if (!period_month || !period_year) {
      const error = new Error('Field period_month dan period_year wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const monthNum = parseInt(period_month, 10);
    const yearNum = parseInt(period_year, 10);

    if (monthNum < 1 || monthNum > 12) {
      const error = new Error('period_month harus bernilai antara 1 sampai 12');
      error.statusCode = 422;
      throw error;
    }

    const targetSchoolUnitId = school_unit_id ? parseInt(school_unit_id, 10) : null;

    // Cek duplikasi periode
    let queryExisting = db('payroll_periods')
      .where({ period_month: monthNum, period_year: yearNum });
    
    if (targetSchoolUnitId) {
      queryExisting = queryExisting.where({ school_unit_id: targetSchoolUnitId });
    } else {
      queryExisting = queryExisting.whereNull('school_unit_id');
    }

    const existing = await queryExisting.first();
    if (existing) {
      const error = new Error(`Periode payroll ${monthNum}/${yearNum} untuk Satuan Pendidikan ID ${targetSchoolUnitId || 'Yayasan'} sudah ada`);
      error.statusCode = 409;
      throw error;
    }

    const [id] = await db('payroll_periods').insert({
      school_unit_id: targetSchoolUnitId,
      period_month: monthNum,
      period_year: yearNum,
      status: 'draft',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const created = await db('payroll_periods').where({ id }).first();

    await logPayrollAudit({
      payrollPeriodId: id,
      action: 'CREATE_PERIOD',
      performedBy: userId,
      dataAfter: created,
      reason: 'Inisialisasi draf periode payroll baru'
    });

    return created;
  }

  async getPeriodById(id) {
    const period = await db('payroll_periods').where({ id }).first();
    if (!period) {
      const error = new Error('Periode payroll tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return period;
  }

  async updatePeriodStatus(id, { status }, userId = null) {
    const period = await this.getPeriodById(id);

    const allowed = ['draft', 'calculated', 'verified', 'locked', 'sent_to_finance'];
    if (!allowed.includes(status)) {
      const error = new Error(`Status payroll harus salah satu dari: ${allowed.join(', ')}`);
      error.statusCode = 422;
      throw error;
    }

    await db('payroll_periods').where({ id }).update({
      status,
      updated_at: db.fn.now()
    });

    const updated = await this.getPeriodById(id);

    await logPayrollAudit({
      payrollPeriodId: id,
      action: 'UPDATE_STATUS',
      performedBy: userId,
      dataBefore: { status: period.status },
      dataAfter: { status: updated.status }
    });

    return updated;
  }

  /**
   * Hitung / Generate kerangka Payroll Items untuk seluruh pegawai aktif di periode ini
   */
  async calculatePeriod(id, userId = null) {
    const period = await this.getPeriodById(id);

    if (period.status === 'locked' || period.status === 'sent_to_finance') {
      const error = new Error(`Periode berstatus '${period.status}' sudah terkunci dan tidak dapat dihitung ulang`);
      error.statusCode = 409;
      throw error;
    }

    // Ambil daftar pegawai aktif
    let empQuery = db('employees').where('account_status', 'active');
    if (period.school_unit_id) {
      empQuery = empQuery.where('school_unit_id', period.school_unit_id);
    }
    const employees = await empQuery;

    let processedCount = 0;

    // Untuk setiap pegawai, bentuk komponen default gaji & potongan
    for (const emp of employees) {
      const defaultGajiPokok = emp.employment_status === 'pns' ? 4000000 : (emp.employment_status === 'gtt' ? 3000000 : 2500000);
      const tunjanganJabatan = emp.current_position_id ? 500000 : 0;
      const salaryComponents = {
        gaji_pokok: defaultGajiPokok,
        tunjangan_jabatan: tunjanganJabatan
      };
      const deductions = {
        potongan_alpa: 0,
        bpjs: 50000
      };
      const netSalary = (defaultGajiPokok + tunjanganJabatan) - 50000;

      // Upsert ke payroll_items
      const existingItem = await db('payroll_items')
        .where({ payroll_period_id: id, employee_id: emp.id })
        .first();

      if (existingItem) {
        await db('payroll_items').where({ id: existingItem.id }).update({
          salary_components: JSON.stringify(salaryComponents),
          deductions: JSON.stringify(deductions),
          net_salary: netSalary,
          verified_by: null,
          verified_at: null,
          rejection_reason: null,
          rejected_at: null,
          updated_at: db.fn.now()
        });
      } else {
        await db('payroll_items').insert({
          payroll_period_id: id,
          employee_id: emp.id,
          salary_components: JSON.stringify(salaryComponents),
          deductions: JSON.stringify(deductions),
          net_salary: netSalary,
          verified_by: null,
          verified_at: null,
          rejection_reason: null,
          rejected_at: null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
      processedCount++;
    }

    // Update status periode menjadi 'calculated'
    await db('payroll_periods').where({ id }).update({
      status: 'calculated',
      updated_at: db.fn.now()
    });

    await logPayrollAudit({
      payrollPeriodId: id,
      action: 'CALCULATE',
      performedBy: userId,
      dataBefore: { status: period.status },
      dataAfter: { status: 'calculated', employees_processed: processedCount },
      reason: `Kalkulasi batch payroll otomatis untuk ${processedCount} pegawai aktif`
    });

    return this.listPeriodItems(id);
  }

  // ==========================================
  // 2. Rincian Payroll Items
  // ==========================================
  async listPeriodItems(periodId, user = null) {
    let query = db('payroll_items')
      .leftJoin('employees', 'payroll_items.employee_id', 'employees.id')
      .leftJoin('employees as verifier', 'payroll_items.verified_by', 'verifier.id')
      .where('payroll_items.payroll_period_id', periodId)
      .select(
        'payroll_items.*',
        'employees.full_name as employee_name',
        'employees.employee_number',
        'verifier.full_name as verified_by_name'
      );

    // Jika pegawai biasa (self-service), filter hanya baris miliknya
    if (user && user.ref_type === 'staff' && user.ref_id) {
      const isPrivileged =
        user.is_super_admin ||
        user.account_type === 'super_admin' ||
        ['super_admin', 'admin_yayasan', 'hrd', 'keuangan', 'staff_payroll'].includes(user.active_role) ||
        (Array.isArray(user.roles) && user.roles.some((r) => ['super_admin', 'admin_yayasan', 'hrd', 'keuangan', 'staff_payroll'].includes(typeof r === 'string' ? r : r.role_name || r.name)));
      if (!isPrivileged) {
        query = query.where('payroll_items.employee_id', user.ref_id);
      }
    }

    const items = await query.orderBy('payroll_items.id', 'asc');

    return items.map((it) => ({
      ...it,
      salary_components: typeof it.salary_components === 'string' ? JSON.parse(it.salary_components) : it.salary_components,
      deductions: typeof it.deductions === 'string' ? JSON.parse(it.deductions) : it.deductions,
      previous_data: typeof it.previous_data === 'string' ? JSON.parse(it.previous_data) : it.previous_data,
      net_salary: parseFloat(it.net_salary)
    }));
  }

  async updateItem(id, payload, userId = null) {
    const item = await db('payroll_items').where({ id }).first();
    if (!item) {
      const error = new Error('Rincian payroll item tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const period = await this.getPeriodById(item.payroll_period_id);
    if (period.status === 'locked' || period.status === 'sent_to_finance') {
      const error = new Error(`Periode payroll berstatus '${period.status}', data sudah terkunci dan tidak dapat diedit`);
      error.statusCode = 422;
      throw error;
    }

    const editReason = payload.edit_reason || payload.reason;
    if (!editReason || !String(editReason).trim()) {
      const error = new Error('Alasan pengubahan rincian gaji (edit_reason) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const previousSnapshot = {
      salary_components: typeof item.salary_components === 'string' ? JSON.parse(item.salary_components) : item.salary_components,
      deductions: typeof item.deductions === 'string' ? JSON.parse(item.deductions) : item.deductions,
      net_salary: parseFloat(item.net_salary),
      rejection_reason: item.rejection_reason,
      edit_reason: editReason
    };

    const updateData = {
      previous_data: JSON.stringify(previousSnapshot),
      rejection_reason: null, // Reset rejection reason setelah diedit
      rejected_at: null,
      updated_at: db.fn.now()
    };

    if (payload.salary_components !== undefined) {
      updateData.salary_components = typeof payload.salary_components === 'object' ? JSON.stringify(payload.salary_components) : payload.salary_components;
    }
    if (payload.deductions !== undefined) {
      updateData.deductions = typeof payload.deductions === 'object' ? JSON.stringify(payload.deductions) : payload.deductions;
    }
    if (payload.net_salary !== undefined) {
      updateData.net_salary = parseFloat(payload.net_salary);
    }

    await db('payroll_items').where({ id }).update(updateData);
    const updated = await db('payroll_items').where({ id }).first();

    const formattedUpdated = {
      ...updated,
      salary_components: typeof updated.salary_components === 'string' ? JSON.parse(updated.salary_components) : updated.salary_components,
      deductions: typeof updated.deductions === 'string' ? JSON.parse(updated.deductions) : updated.deductions,
      previous_data: previousSnapshot,
      net_salary: parseFloat(updated.net_salary)
    };

    await logPayrollAudit({
      payrollPeriodId: period.id,
      payrollItemId: id,
      action: 'EDIT_ITEM',
      performedBy: userId,
      dataBefore: previousSnapshot,
      dataAfter: formattedUpdated,
      reason: editReason
    });

    return formattedUpdated;
  }

  async verifyItem(id, user = null) {
    const item = await db('payroll_items').where({ id }).first();
    if (!item) {
      const error = new Error('Rincian payroll item tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const period = await this.getPeriodById(item.payroll_period_id);
    if (period.status === 'locked' || period.status === 'sent_to_finance') {
      const error = new Error(`Periode payroll berstatus '${period.status}', item tidak dapat diverifikasi ulang`);
      error.statusCode = 422;
      throw error;
    }

    const verifierId = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    await db('payroll_items').where({ id }).update({
      verified_by: verifierId,
      verified_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const updated = await db('payroll_items').where({ id }).first();

    // Cek apakah seluruh item pada periode ini sudah terverifikasi
    const unverifiedCount = await db('payroll_items')
      .where({ payroll_period_id: period.id })
      .whereNull('verified_at')
      .count('id as cnt')
      .first();

    if (parseInt(unverifiedCount?.cnt || 0, 10) === 0 && period.status === 'calculated') {
      await db('payroll_periods').where({ id: period.id }).update({
        status: 'verified',
        updated_at: db.fn.now()
      });
    }

    await logPayrollAudit({
      payrollPeriodId: period.id,
      payrollItemId: id,
      action: 'VERIFY_ITEM',
      performedBy: verifierId,
      dataAfter: { verified_by: verifierId, verified_at: new Date() },
      reason: 'Verifikasi slip gaji pegawai selesai'
    });

    return {
      ...updated,
      salary_components: typeof updated.salary_components === 'string' ? JSON.parse(updated.salary_components) : updated.salary_components,
      deductions: typeof updated.deductions === 'string' ? JSON.parse(updated.deductions) : updated.deductions,
      net_salary: parseFloat(updated.net_salary)
    };
  }

  // ==========================================
  // 3. Penguncian Periode & Serah Terima ke Keuangan
  // ==========================================
  async lockPeriod(id, userId = null) {
    const period = await this.getPeriodById(id);

    if (period.status === 'locked' || period.status === 'sent_to_finance') {
      const error = new Error(`Periode payroll sudah berstatus '${period.status}'`);
      error.statusCode = 409;
      throw error;
    }

    // Validasi: seluruh items pada periode ini harus sudah diverifikasi
    const unverifiedItems = await db('payroll_items')
      .where({ payroll_period_id: id })
      .whereNull('verified_at');

    if (unverifiedItems.length > 0) {
      const error = new Error(`Terdapat ${unverifiedItems.length} slip gaji pegawai yang belum diverifikasi. Seluruh slip gaji harus diverifikasi terlebih dahulu sebelum periode dapat dikunci.`);
      error.statusCode = 422;
      throw error;
    }

    const totalItems = await db('payroll_items').where({ payroll_period_id: id }).count('id as cnt').first();
    if (parseInt(totalItems?.cnt || 0, 10) === 0) {
      const error = new Error('Tidak ada rincian slip gaji pada periode ini. Jalankan kalkulasi terlebih dahulu.');
      error.statusCode = 422;
      throw error;
    }

    const now = db.fn.now();
    await db('payroll_periods').where({ id }).update({
      status: 'locked',
      locked_by: userId,
      locked_at: now,
      updated_at: now
    });

    const updated = await this.getPeriodById(id);

    await logPayrollAudit({
      payrollPeriodId: id,
      action: 'LOCK_PERIOD',
      performedBy: userId,
      dataBefore: { status: period.status },
      dataAfter: { status: 'locked', locked_by: userId, locked_at: new Date() },
      reason: 'Penguncian final penetapan nominal payroll oleh SDM/Kepegawaian'
    });

    return updated;
  }

  async sendToFinance(id, userId = null) {
    const period = await this.getPeriodById(id);

    if (period.status !== 'locked') {
      const error = new Error(`Periode payroll harus berstatus 'locked' sebelum dikirim ke Keuangan (status saat ini: '${period.status}')`);
      error.statusCode = 422;
      throw error;
    }

    const items = await db('payroll_items').where({ payroll_period_id: id });
    if (items.length === 0) {
      const error = new Error('Tidak ada rincian payroll untuk dikirim ke Keuangan');
      error.statusCode = 422;
      throw error;
    }

    const schoolUnitId = period.school_unit_id || 1;
    const failedItems = [];
    let successCount = 0;

    for (const item of items) {
      try {
        const breakdownSnapshot = {
          salary_components: typeof item.salary_components === 'string' ? JSON.parse(item.salary_components) : item.salary_components,
          deductions: typeof item.deductions === 'string' ? JSON.parse(item.deductions) : item.deductions,
          net_salary: parseFloat(item.net_salary)
        };

        await keuanganPayrollService.ingestPayrollDisbursement({
          school_unit_id: schoolUnitId,
          employee_id: item.employee_id,
          period_month: period.period_month,
          period_year: period.period_year,
          amount: parseFloat(item.net_salary),
          cash_account_id: 1,
          breakdown_snapshot: breakdownSnapshot,
          source_payroll_period_id: period.id
        });
        successCount++;
      } catch (err) {
        console.error(`Gagal ingest payroll employee_id ${item.employee_id}:`, err.message);
        failedItems.push({
          employee_id: item.employee_id,
          amount: item.net_salary,
          error: err.message
        });
      }
    }

    if (failedItems.length > 0) {
      return {
        success: false,
        partial_success: true,
        message: `Pengiriman parsial: ${successCount} berhasil, ${failedItems.length} gagal di-ingest ke Keuangan`,
        success_count: successCount,
        failed_items: failedItems
      };
    }

    // Jika seluruhnya sukses di-ingest, update status menjadi 'sent_to_finance'
    await db('payroll_periods').where({ id }).update({
      status: 'sent_to_finance',
      updated_at: db.fn.now()
    });

    const updated = await this.getPeriodById(id);

    await logPayrollAudit({
      payrollPeriodId: id,
      action: 'SEND_TO_FINANCE',
      performedBy: userId,
      dataBefore: { status: 'locked' },
      dataAfter: { status: 'sent_to_finance', total_disbursements_ingested: successCount },
      reason: `Penyerahan berkas payroll (${successCount} pegawai) ke Modul Keuangan untuk verifikasi saldo & pencairan`
    });

    return {
      success: true,
      data: updated,
      message: `Seluruh data payroll (${successCount} pegawai) berhasil diserahkan ke Modul Keuangan`,
      total_ingested: successCount
    };
  }

  /**
   * Return Payroll Item for Correction from Keuangan
   */
  async returnForCorrection({ employee_id, period_year, period_month, rejection_reason, userId = null }) {
    const period = await db('payroll_periods')
      .where({ period_month: Number(period_month), period_year: Number(period_year) })
      .first();

    if (!period) {
      const err = new Error(`Periode payroll ${period_month}/${period_year} tidak ditemukan`);
      err.statusCode = 404;
      throw err;
    }

    const item = await db('payroll_items')
      .where({ payroll_period_id: period.id, employee_id: Number(employee_id) })
      .first();

    if (!item) {
      const err = new Error(`Item payroll untuk employee ID ${employee_id} tidak ditemukan pada periode ${period_month}/${period_year}`);
      err.statusCode = 404;
      throw err;
    }

    // Set item unverified so it can be edited, and record rejection reason
    await db('payroll_items')
      .where({ id: item.id })
      .update({
        verified_by: null,
        verified_at: null,
        rejection_reason: rejection_reason || 'Dikembalikan oleh Keuangan untuk koreksi',
        rejected_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    // Un-lock period if locked / sent_to_finance / verified so Kepegawaian can edit
    if (['locked', 'sent_to_finance', 'verified'].includes(period.status)) {
      await db('payroll_periods')
        .where({ id: period.id })
        .update({
          status: 'calculated',
          updated_at: db.fn.now()
        });
    }

    await logPayrollAudit({
      payrollPeriodId: period.id,
      payrollItemId: item.id,
      action: 'RETURNED_FOR_CORRECTION',
      performedBy: userId,
      dataBefore: { net_salary: item.net_salary },
      dataAfter: { status: 'returned_for_correction', rejection_reason },
      reason: rejection_reason || 'Dikembalikan oleh Keuangan untuk koreksi nominal'
    });

    return {
      success: true,
      period_id: period.id,
      item_id: item.id,
      message: 'Item payroll berhasil dikembalikan ke status draft/koreksi'
    };
  }

  async getPeriodAuditLogs(id) {
    await this.getPeriodById(id);
    return listPayrollAuditLogs(id);
  }
}

module.exports = new PayrollService();
