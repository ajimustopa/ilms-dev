/**
 * Leave & Absence Reports & Calendar Service
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #17, #36, §3.5, §10.2, §11.2
 */

const db = require('../../../config/db/kepegawaian');
const holidayService = require('./holidayService');
const { todayWIB, formatDbDate } = require('./dateHelper');
const { resolveActor, isUnitInScope } = require('../common/actorHelper');
const {
  buildCalendarMatrix,
  calculateReportSummary,
  aggregateByType,
  calculateMonthlyTrend,
  calculateTopAbsent,
  calculateRecap
} = require('./calendarReportEngine');

const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const HR_PERMISSIONS = {
  LEAVE_READ: 'kepegawaian.leave_requests.read',
  LEAVE_MANAGE: 'kepegawaian.leave_requests.manage',
  LEAVE_OVERRIDE: 'kepegawaian.leave_requests.override',
  LEAVE_REPORTS_READ: 'kepegawaian.leave_reports.read',
  OVERTIMES_MANAGE: 'kepegawaian.overtimes.manage'
};

class LeaveReportService {
  /**
   * Helper to resolve actor and permission status
   */
  async resolveActor(user) {
    return resolveActor(user, db);
  }

  isHrUser(actor) {
    if (!actor) return false;
    const p = actor.permissions || [];
    return (
      p.includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
      p.includes(HR_PERMISSIONS.LEAVE_OVERRIDE) ||
      p.includes(HR_PERMISSIONS.LEAVE_REPORTS_READ) ||
      p.includes(HR_PERMISSIONS.OVERTIMES_MANAGE)
    );
  }

  /**
   * Helper to parse date filters (month / from-to / semester)
   */
  resolveDateRange(query = {}) {
    const today = todayWIB();

    if (query.month) {
      const ym = query.month.slice(0, 7);
      const [y, m] = ym.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      return {
        startDate: `${ym}-01`,
        endDate: `${ym}-${String(lastDay).padStart(2, '0')}`,
        month: ym
      };
    }

    if (query.from && query.to) {
      return {
        startDate: query.from.slice(0, 10),
        endDate: query.to.slice(0, 10),
        month: query.from.slice(0, 7)
      };
    }

    if (query.preset === 'semester') {
      const todayDate = new Date(today);
      const y = todayDate.getFullYear();
      const m = todayDate.getMonth(); // 0-indexed
      const isSem1 = m >= 6; // Jul - Dec
      return {
        startDate: isSem1 ? `${y}-07-01` : `${y}-01-01`,
        endDate: isSem1 ? `${y}-12-31` : `${y}-06-30`,
        month: today.slice(0, 7)
      };
    }

    // Default: current month
    const ym = today.slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      startDate: `${ym}-01`,
      endDate: `${ym}-${String(lastDay).padStart(2, '0')}`,
      month: ym
    };
  }

  /**
   * 1. Get Calendar Matrix (SPEC §11.2)
   */
  async getCalendarMatrix(query = {}, actor = null) {
    const { startDate, endDate, month } = this.resolveDateRange(query);
    const targetUnitId = query.school_unit_id ? Number(query.school_unit_id) : null;
    const category = query.category || null;
    const includeOvertime = query.include_overtime !== 'false' && query.include_overtime !== false;
    const includePending = query.include_pending === 'true' || query.include_pending === true;

    const isHr = this.isHrUser(actor);
    const currentEmployeeId = actor?.employeeId || null;

    // 1. Batch Fetch Employees in scope
    let empQuery = db('employees as e')
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .where('e.account_status', 'active');

    if (targetUnitId) {
      empQuery = empQuery.where('e.school_unit_id', targetUnitId);
    } else if (actor && actor.unitScope) {
      if (Array.isArray(actor.unitScope)) empQuery = empQuery.whereIn('e.school_unit_id', actor.unitScope);
      else if (actor.unitScope !== 'ALL') empQuery = empQuery.where('e.school_unit_id', actor.unitScope);
    }

    if (query.position_id) {
      empQuery = empQuery.where('e.current_position_id', query.position_id);
    }

    const employees = await empQuery
      .select('e.id', 'e.full_name', 'e.employee_number', 'e.school_unit_id', 'jp.name as position_name')
      .orderBy('e.full_name', 'asc');

    const employeeIds = employees.map(e => e.id);
    if (employeeIds.length === 0) {
      return buildCalendarMatrix({
        month,
        employees: [],
        leaves: [],
        overtimes: [],
        holidays: [],
        thresholds: [],
        isHr,
        currentEmployeeId,
        includeOvertime
      });
    }

    // 2. Batch Fetch Leaves
    const statusList = includePending ? ['approved', 'pending'] : ['approved'];
    let leaveQuery = db('employee_leave_requests as elr')
      .join('leave_types as lt', 'elr.leave_type_id', 'lt.id')
      .whereIn('elr.employee_id', employeeIds)
      .whereIn('elr.status', statusList)
      .where(b => {
        b.whereBetween('elr.start_date', [startDate, endDate])
          .orWhereBetween('elr.end_date', [startDate, endDate])
          .orWhere(sub => {
            sub.where('elr.start_date', '<=', startDate)
              .andWhere('elr.end_date', '>=', endDate);
          });
      });

    if (category && category !== 'ALL') {
      leaveQuery = leaveQuery.where('lt.category', category);
    }

    const leaves = await leaveQuery.select(
      'elr.id',
      'elr.employee_id',
      'elr.leave_type_id',
      'lt.code as leave_type',
      'lt.name as leave_type_name',
      'lt.category as leave_category',
      'lt.color as leave_type_color',
      'elr.start_date',
      'elr.end_date',
      'elr.start_portion',
      'elr.end_portion',
      'elr.duration_days',
      'elr.status',
      'elr.reason',
      'elr.attachment_url'
    );

    // 3. Batch Fetch Overtimes
    let overtimes = [];
    if (includeOvertime) {
      overtimes = await db('employee_overtimes')
        .whereIn('employee_id', employeeIds)
        .where('status', 'approved')
        .whereBetween('overtime_date', [startDate, endDate])
        .select('id', 'employee_id', 'overtime_date', 'hours', 'payable_hours', 'status', 'task_description', 'day_type');
    }

    // 4. Batch Fetch Holidays
    const holidaysRes = await holidayService.getHolidays({
      schoolUnitId: targetUnitId,
      dateFrom: startDate,
      dateTo: endDate
    });
    const holidays = holidaysRes.data || (Array.isArray(holidaysRes) ? holidaysRes : []);

    // 5. Batch Fetch Absence Thresholds (SPEC §2 #36, §10.2)
    const thresholds = await db('absence_thresholds')
      .where('is_active', 1)
      .where(b => {
        if (targetUnitId) b.whereNull('school_unit_id').orWhere('school_unit_id', targetUnitId);
      });

    return buildCalendarMatrix({
      month,
      employees,
      leaves,
      overtimes,
      holidays,
      thresholds,
      isHr,
      currentEmployeeId,
      includeOvertime
    });
  }

  /**
   * Helper to fetch filtered leaves and overtimes for reports
   */
  async fetchFilteredReportData(query = {}, actor = null) {
    const { startDate, endDate } = this.resolveDateRange(query);
    const targetUnitId = query.school_unit_id ? Number(query.school_unit_id) : null;

    let empQuery = db('employees as e')
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .where('e.account_status', 'active');

    if (targetUnitId) {
      empQuery = empQuery.where('e.school_unit_id', targetUnitId);
    } else if (actor && actor.unitScope) {
      if (Array.isArray(actor.unitScope)) empQuery = empQuery.whereIn('e.school_unit_id', actor.unitScope);
      else if (actor.unitScope !== 'ALL') empQuery = empQuery.where('e.school_unit_id', actor.unitScope);
    }

    if (query.position_id) {
      empQuery = empQuery.where('e.current_position_id', query.position_id);
    }

    const employees = await empQuery
      .select('e.id', 'e.full_name', 'e.employee_number', 'e.school_unit_id', 'jp.name as position_name')
      .orderBy('e.full_name', 'asc');

    const employeeIds = employees.map(e => e.id);
    if (employeeIds.length === 0) {
      return { employees: [], leaves: [], overtimes: [], balances: [], leaveTypes: [], startDate, endDate };
    }

    const leaves = await db('employee_leave_requests as elr')
      .join('leave_types as lt', 'elr.leave_type_id', 'lt.id')
      .join('employees as e', 'elr.employee_id', 'e.id')
      .whereIn('elr.employee_id', employeeIds)
      .where(b => {
        b.whereBetween('elr.start_date', [startDate, endDate])
          .orWhereBetween('elr.end_date', [startDate, endDate]);
      })
      .select(
        'elr.*',
        'e.full_name as employee_name',
        'e.employee_number as nip',
        'lt.code as leave_code',
        'lt.name as leave_type_name',
        'lt.category as leave_category',
        'lt.color as leave_type_color'
      );

    const overtimes = await db('employee_overtimes as eo')
      .join('employees as e', 'eo.employee_id', 'e.id')
      .whereIn('eo.employee_id', employeeIds)
      .whereBetween('eo.overtime_date', [startDate, endDate])
      .select('eo.*', 'e.full_name as employee_name', 'e.employee_number as nip');

    const balances = await db('employee_leave_balances')
      .whereIn('employee_id', employeeIds);

    const leaveTypes = await db('leave_types').where('is_active', 1);

    return {
      employees,
      leaves,
      overtimes,
      balances,
      leaveTypes,
      startDate,
      endDate
    };
  }

  /**
   * 2. Summary KPI Report (SPEC §11.2)
   */
  async getReportsSummary(query = {}, actor = null) {
    const { employees, leaves, overtimes, startDate, endDate } = await this.fetchFilteredReportData(query, actor);
    return calculateReportSummary({
      leaves,
      overtimes,
      employees,
      startDate,
      endDate
    });
  }

  /**
   * 3. By Type Report (SPEC §11.2)
   */
  async getReportsByType(query = {}, actor = null) {
    const { leaves, leaveTypes } = await this.fetchFilteredReportData(query, actor);
    return aggregateByType({
      leaves: leaves.filter(l => l.status === 'approved'),
      leaveTypes
    });
  }

  /**
   * 4. Monthly Trend Report (SPEC §11.2)
   */
  async getReportsTrend(query = {}, actor = null) {
    const { leaves, overtimes, startDate, endDate } = await this.fetchFilteredReportData(query, actor);
    return calculateMonthlyTrend({
      leaves: leaves.filter(l => l.status === 'approved'),
      overtimes: overtimes.filter(o => o.status === 'approved'),
      startDate,
      endDate
    });
  }

  /**
   * 5. Top Absent Employees Report (SPEC §11.2)
   */
  async getReportsTop(query = {}, actor = null) {
    const limit = parseInt(query.limit, 10) || 5;
    const { leaves, employees } = await this.fetchFilteredReportData(query, actor);
    return calculateTopAbsent({
      leaves: leaves.filter(l => l.status === 'approved'),
      employees,
      limit
    });
  }

  /**
   * 6. Detailed Tabular Recap Report (SPEC §11.2)
   */
  async getReportsRecap(query = {}, actor = null) {
    const { employees, leaves, overtimes, balances } = await this.fetchFilteredReportData(query, actor);
    return calculateRecap({
      employees,
      leaves: leaves.filter(l => l.status === 'approved'),
      overtimes: overtimes.filter(o => o.status === 'approved'),
      balances
    });
  }

  /**
   * 7. Export Report to Excel (.xlsx) or PDF (SPEC §11.2)
   */
  async exportReport(query = {}, actor = null) {
    const format = (query.format || 'xlsx').toLowerCase();
    const type = (query.type || 'recap').toLowerCase();
    const { startDate, endDate, month } = this.resolveDateRange(query);

    const recapData = await this.getReportsRecap(query, actor);
    const summaryData = await this.getReportsSummary(query, actor);

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Rekap per Pegawai
      const excelRows = recapData.map((r, idx) => ({
        'No': idx + 1,
        'Nama Pegawai': r.employee_name,
        'NIP': r.nip,
        'Jabatan': r.position_name,
        'Cuti Tahunan (Hari)': r.annual_leave_days,
        'Cuti Khusus (Hari)': r.special_leave_days,
        'Sakit (Hari)': r.sick_days,
        'Izin Pribadi (Hari)': r.permit_days,
        'Dinas Luar (Hari)': r.official_days,
        'Tanpa Gaji (Hari)': r.unpaid_days,
        'Total Tidak Hadir (Hari)': r.total_absent_days,
        'Lembur Payable (Jam)': r.overtime_payable_hours,
        'Sisa Saldo Tahunan (Hari)': r.remaining_annual_balance != null ? r.remaining_annual_balance : '—'
      }));

      const wsRecap = XLSX.utils.json_to_sheet(excelRows);
      XLSX.utils.book_append_sheet(wb, wsRecap, 'Rekapitulasi Pegawai');

      // Sheet 2: Ringkasan Eksekutif
      const summaryRows = [
        { 'Indikator': 'Periode Laporan', 'Nilai': `${startDate} s.d ${endDate}` },
        { 'Indikator': 'Total Pegawai Aktif', 'Nilai': summaryData.total_active_employees },
        { 'Indikator': 'Total Pengajuan Cuti/Izin', 'Nilai': summaryData.total_requests },
        { 'Indikator': 'Pengajuan Disetujui', 'Nilai': summaryData.approved_requests },
        { 'Indikator': 'Pengajuan Menunggu', 'Nilai': summaryData.pending_requests },
        { 'Indikator': 'Pengajuan Ditolak', 'Nilai': summaryData.rejected_requests },
        { 'Indikator': 'Total Hari Cuti/Izin Diambil', 'Nilai': summaryData.total_leave_days_taken },
        { 'Indikator': 'Rata-rata Cuti per Bulan (Hari)', 'Nilai': summaryData.avg_monthly_days },
        { 'Indikator': 'Tingkat Persetujuan (%)', 'Nilai': `${summaryData.approval_rate_percent}%` },
        { 'Indikator': 'Total Jam Lembur Disetujui', 'Nilai': `${summaryData.overtime_total_hours} Jam` }
      ];

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        filename: `Rekap_Ketidakhadiran_Pegawai_${month || startDate}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer
      };
    } else {
      // PDF Export via PDFKit (Landscape A4)
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 30,
            bufferPages: true
          });

          const buffers = [];
          doc.on('data', b => buffers.push(b));
          doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve({
              filename: `Rekap_Ketidakhadiran_Pegawai_${month || startDate}.pdf`,
              contentType: 'application/pdf',
              buffer: pdfBuffer
            });
          });

          const pageWidth = doc.page.width;
          const pageHeight = doc.page.height;
          const startX = 30;
          const usableWidth = pageWidth - 60;

          // 1. Header & Kop
          doc.fontSize(13).font('Helvetica-Bold').fillColor('#006948').text('YAYASAN PENDIDIKAN ALDEPOS ISLAMIC BOARDING SCHOOL', startX, 30, { align: 'center' });
          doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('SISTEM INFORMASI MANAJEMEN KEPEGAWAIAN (HRIS) — REKAPITULASI KETIDAKHADIRAN & LEMBUR', { align: 'center' });
          doc.fontSize(8).fillColor('#64748b').text('Jl. Raya Aldepos No. 01, Tapos, Tenjolaya, Kab. Bogor, Jawa Barat 16370', { align: 'center' });

          doc.moveDown(0.3);
          const lineY = doc.y;
          doc.moveTo(startX, lineY).lineTo(startX + usableWidth, lineY).strokeColor('#006948').lineWidth(1.5).stroke();
          doc.moveDown(0.4);

          // 2. Judul Laporan & Periode
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('LAPORAN REKAPITULASI CUTI, IZIN & LEMBUR PEGAWAI', { align: 'center' });
          doc.fontSize(8.5).font('Helvetica').fillColor('#006948').text(`Periode: ${startDate} s/d ${endDate}`, { align: 'center' });
          doc.moveDown(0.4);

          // 3. KPI Summary Box
          const kpiBoxY = doc.y;
          doc.rect(startX, kpiBoxY, usableWidth, 22).fill('#f8f9fb');
          doc.strokeColor('#cbd5e1').lineWidth(0.5).rect(startX, kpiBoxY, usableWidth, 22).stroke();

          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b');
          const kpiText = `Pegawai: ${summaryData.total_active_employees} Orang  |  Total Permohonan: ${summaryData.total_requests}  |  Disetujui: ${summaryData.approved_requests} (${summaryData.approval_rate_percent}%)  |  Total Hari Cuti/Izin: ${summaryData.total_leave_days_taken} Hari  |  Total Lembur: ${summaryData.overtime_total_hours} Jam`;
          doc.text(kpiText, startX + 5, kpiBoxY + 7, { width: usableWidth - 10, align: 'center' });

          doc.y = kpiBoxY + 28;

          // 4. Tabel Rekapitulasi Data
          // Col Widths total: 781
          // [No(25), Pegawai(175), NIP(85), Jabatan(105), Tahunan(40), Khusus(40), Sakit(35), Izin(35), Dinas(35), Total(42), Lembur(44), Sisa(45)] = 706 -> expanded to 781
          const colWidths = [25, 175, 90, 115, 42, 42, 38, 38, 38, 50, 58, 70];
          const headers = ['No', 'Nama Pegawai', 'NIP', 'Jabatan', 'Tahunan', 'Khusus', 'Sakit', 'Izin', 'Dinas', 'Total Absen', 'Lembur (j)', 'Sisa Jatah'];

          const drawTableHeader = (yPos) => {
            doc.rect(startX, yPos, usableWidth, 16).fill('#006948');
            doc.strokeColor('#005137').lineWidth(0.5).rect(startX, yPos, usableWidth, 16).stroke();
            doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');

            let curX = startX;
            headers.forEach((h, idx) => {
              const w = colWidths[idx];
              const align = idx >= 4 ? 'center' : 'left';
              doc.text(h, curX + 2, yPos + 4, { width: w - 4, align });
              curX += w;
            });
            return yPos + 16;
          };

          let curY = drawTableHeader(doc.y);

          recapData.forEach((it, idx) => {
            if (curY + 15 > pageHeight - 50) {
              doc.addPage();
              curY = drawTableHeader(30);
            }

            const isEven = idx % 2 === 0;
            if (isEven) {
              doc.rect(startX, curY, usableWidth, 14).fill('#f8f9fb');
            }

            doc.strokeColor('#e2e8f0').lineWidth(0.3).rect(startX, curY, usableWidth, 14).stroke();
            doc.fontSize(7).font('Helvetica').fillColor('#0f172a');

            const rowData = [
              String(idx + 1),
              it.employee_name || '',
              it.nip || '-',
              it.position_name || '-',
              it.annual_leave_days > 0 ? `${it.annual_leave_days}h` : '-',
              it.special_leave_days > 0 ? `${it.special_leave_days}h` : '-',
              it.sick_days > 0 ? `${it.sick_days}h` : '-',
              it.permit_days > 0 ? `${it.permit_days}h` : '-',
              it.official_days > 0 ? `${it.official_days}h` : '-',
              `${it.total_absent_days}h`,
              it.overtime_payable_hours > 0 ? `${it.overtime_payable_hours}j` : '-',
              it.remaining_annual_balance != null ? `${it.remaining_annual_balance}h` : '—'
            ];

            let cellX = startX;
            rowData.forEach((val, cIdx) => {
              const w = colWidths[cIdx];
              const align = cIdx >= 4 ? 'center' : 'left';
              const isBold = cIdx === 9 || cIdx === 1;
              doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
              doc.text(val, cellX + 2, curY + 3.5, { width: w - 4, align, lineBreak: false });
              cellX += w;
            });

            curY += 14;
          });

          doc.end();
        } catch (err) {
          reject(err);
        }
      });
    }
  }
}

module.exports = new LeaveReportService();
