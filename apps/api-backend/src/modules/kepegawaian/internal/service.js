/**
 * Internal Service Implementation
 * Modul Kepegawaian - Fitur 6: Endpoint Data Pegawai & Struktur Jabatan untuk Konsumsi Modul Lain (Service-to-Service)
 */
const db = require('../../../config/db/kepegawaian');
const organizationService = require('../organization/service');

class KepegawaianInternalService {
  /**
   * Mengambil data ringkas pegawai (dipakai Akademik untuk daftar guru, Perpustakaan, dsb.)
   */
  async listInternalEmployees(query = {}) {
    let baseQuery = db('employees')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .where('employees.account_status', 'active');

    if (query.school_unit_id) {
      baseQuery = baseQuery.where('employees.school_unit_id', query.school_unit_id);
    }

    if (query.employment_status) {
      baseQuery = baseQuery.where('employees.employment_status', query.employment_status);
    }

    // Batch lookup jika parameter ids diberikan (mis. ids=1,2,3)
    if (query.ids) {
      const idArray = query.ids.split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean);
      if (idArray.length > 0) {
        baseQuery = baseQuery.whereIn('employees.id', idArray);
      }
    }

    const rows = await baseQuery
      .select(
        'employees.id',
        'employees.employee_number',
        'employees.nip',
        'employees.nuptk',
        'employees.full_name',
        'employees.academic_title',
        'employees.gender',
        'employees.school_unit_id',
        'employees.employment_status',
        'employees.current_position_id',
        'job_positions.name as current_position_name'
      )
      .orderBy('employees.id', 'asc');

    return rows.map((r) => ({
      id: r.id,
      employee_number: r.employee_number,
      nip: r.nip,
      nuptk: r.nuptk,
      full_name: r.full_name,
      academic_title: r.academic_title,
      school_unit_id: r.school_unit_id,
      employment_status: r.employment_status,
      current_position: r.current_position_name || null
    }));
  }

  async getInternalEmployeeById(id) {
    const employee = await db('employees')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .where('employees.id', id)
      .select(
        'employees.id',
        'employees.employee_number',
        'employees.nip',
        'employees.nuptk',
        'employees.full_name',
        'employees.academic_title',
        'employees.gender',
        'employees.school_unit_id',
        'employees.employment_status',
        'employees.account_status',
        'employees.phone_number',
        'employees.email',
        'employees.current_position_id',
        'job_positions.name as current_position_name'
      )
      .first();

    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return {
      ...employee,
      current_position: employee.current_position_name || null
    };
  }

  async getJobPositionsTree(schoolUnitId = null) {
    return organizationService.getJobPositionsTree(schoolUnitId);
  }
}

module.exports = new KepegawaianInternalService();
