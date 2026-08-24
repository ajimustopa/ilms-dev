/**
 * Payroll Service Implementation
 * Modul Kepegawaian - Fitur 4: Penggajian (Payroll)
 */
const db = require('../../../config/db/kepegawaian');

class PayrollService {
  // ==========================================
  // 1. Periode Payroll
  // ==========================================
  async createPeriod(payload) {
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

    return db('payroll_periods').where({ id }).first();
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

  async updatePeriodStatus(id, { status }) {
    const period = await this.getPeriodById(id);

    const allowed = ['draft', 'calculated', 'verified', 'sent_to_finance'];
    if (!allowed.includes(status)) {
      const error = new Error(`Status payroll harus salah satu dari: ${allowed.join(', ')}`);
      error.statusCode = 422;
      throw error;
    }

    await db('payroll_periods').where({ id }).update({
      status,
      updated_at: db.fn.now()
    });

    return this.getPeriodById(id);
  }

  /**
   * Hitung / Generate kerangka Payroll Items untuk seluruh pegawai aktif di periode ini
   */
  async calculatePeriod(id) {
    const period = await this.getPeriodById(id);

    if (period.status !== 'draft' && period.status !== 'calculated') {
      const error = new Error(`Periode berstatus '${period.status}' tidak dapat dihitung ulang`);
      error.statusCode = 409;
      throw error;
    }

    // Ambil daftar pegawai aktif
    let empQuery = db('employees').where('account_status', 'active');
    if (period.school_unit_id) {
      empQuery = empQuery.where('school_unit_id', period.school_unit_id);
    }
    const employees = await empQuery;

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
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    // Update status periode menjadi 'calculated'
    await db('payroll_periods').where({ id }).update({
      status: 'calculated',
      updated_at: db.fn.now()
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
        ['super_admin', 'admin_yayasan', 'hrd', 'keuangan'].includes(user.active_role) ||
        (Array.isArray(user.roles) && user.roles.some((r) => ['super_admin', 'admin_yayasan', 'hrd', 'keuangan'].includes(typeof r === 'string' ? r : r.role_name || r.name)));
      if (!isPrivileged) {
        query = query.where('payroll_items.employee_id', user.ref_id);
      }
    }

    const items = await query.orderBy('payroll_items.id', 'asc');

    return items.map((it) => ({
      ...it,
      salary_components: typeof it.salary_components === 'string' ? JSON.parse(it.salary_components) : it.salary_components,
      deductions: typeof it.deductions === 'string' ? JSON.parse(it.deductions) : it.deductions,
      net_salary: parseFloat(it.net_salary)
    }));
  }

  async updateItem(id, payload) {
    const item = await db('payroll_items').where({ id }).first();
    if (!item) {
      const error = new Error('Rincian payroll item tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
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
    return {
      ...updated,
      salary_components: typeof updated.salary_components === 'string' ? JSON.parse(updated.salary_components) : updated.salary_components,
      deductions: typeof updated.deductions === 'string' ? JSON.parse(updated.deductions) : updated.deductions,
      net_salary: parseFloat(updated.net_salary)
    };
  }

  async verifyItem(id, user = null) {
    const item = await db('payroll_items').where({ id }).first();
    if (!item) {
      const error = new Error('Rincian payroll item tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const verifierId = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    await db('payroll_items').where({ id }).update({
      verified_by: verifierId,
      verified_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const updated = await db('payroll_items').where({ id }).first();
    return {
      ...updated,
      salary_components: typeof updated.salary_components === 'string' ? JSON.parse(updated.salary_components) : updated.salary_components,
      deductions: typeof updated.deductions === 'string' ? JSON.parse(updated.deductions) : updated.deductions,
      net_salary: parseFloat(updated.net_salary)
    };
  }
}

module.exports = new PayrollService();
