const canteenAccountingService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class CanteenAccountingController {
  async listJournalEntries(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenAccountingService.listJournalEntries(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createJournalEntry(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenAccountingService.createJournalEntry(schoolUnitId, req.body, req.user?.id || null);
      res.status(201).json({
        success: true,
        data,
        message: `Entri Jurnal #${data.entry_number} berhasil dicatat dan diposting`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteJournalEntry(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { id } = req.params;
      const data = await canteenAccountingService.deleteJournalEntry(id, schoolUnitId);
      res.json({ success: true, data, message: 'Entri jurnal berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getGeneralLedger(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenAccountingService.getGeneralLedger(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getWorksheet(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenAccountingService.getWorksheet(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getFinancialStatements(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenAccountingService.getFinancialStatements(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getFinancialRatios(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenAccountingService.getFinancialRatios(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CanteenAccountingController();
