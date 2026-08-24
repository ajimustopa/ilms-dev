/**
 * Payroll Controller for Keuangan Module
 */
const payrollService = require('./service');

class PayrollController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  ingestPayrollInternal = async (req, res, next) => {
    try {
      const data = await payrollService.ingestPayrollDisbursement(req.body);
      res.status(201).json({ success: true, data, message: 'Data payroll berhasil di-ingest', errors: null });
    } catch (err) { next(err); }
  };

  listPayrollDisbursements = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await payrollService.listPayrollDisbursements(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar pencairan gaji berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  disbursePayroll = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await payrollService.disbursePayroll(schoolUnitId, req.params.id, req.body.cash_account_id, req.user?.id);
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'CONFLICT') {
        return res.status(409).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.json({ success: true, data: result.data, message: 'Pencairan gaji berhasil dieksekusi', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new PayrollController();
