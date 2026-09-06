/**
 * Bank Statements Controller for Keuangan Module
 */
const service = require('./service');

class BankStatementsController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  listBankStatements = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await service.listBankStatements(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar mutasi rekening koran berhasil dimuat',
        errors: null
      });
    } catch (err) { next(err); }
  };

  getBankStatementById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await service.getBankStatementById(schoolUnitId, req.params.id);
      if (!data) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Mutasi rekening koran tidak ditemukan',
          errors: null
        });
      }
      res.json({
        success: true,
        data,
        message: 'Detail mutasi rekening koran berhasil dimuat',
        errors: null
      });
    } catch (err) { next(err); }
  };

  createBankStatement = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await service.createBankStatement(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({
        success: true,
        data,
        message: 'Baris mutasi rekening koran berhasil dicatat',
        errors: null
      });
    } catch (err) { next(err); }
  };

  updateBankStatement = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await service.updateBankStatement(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({
        success: true,
        data,
        message: 'Baris mutasi rekening koran berhasil diperbarui',
        errors: null
      });
    } catch (err) { next(err); }
  };

  deleteBankStatement = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await service.deleteBankStatement(schoolUnitId, req.params.id, req.user?.id);
      res.json({
        success: true,
        data,
        message: 'Baris mutasi rekening koran berhasil dihapus',
        errors: null
      });
    } catch (err) { next(err); }
  };

  bulkDeleteBankStatements = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const { ids } = req.body;
      const data = await service.bulkDeleteBankStatements(schoolUnitId, ids, req.user?.id);
      res.json({
        success: true,
        data,
        message: `Berhasil menghapus ${data.deleted_count} baris mutasi rekening koran (${data.reconciled_count} tertaut, ${data.unreconciled_count} belum tertaut)`,
        errors: null
      });
    } catch (err) { next(err); }
  };

  reconcileStatement = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await service.reconcileStatement(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({
        success: true,
        data,
        message: 'Baris rekening koran berhasil ditautkan ke transaksi internal',
        errors: null
      });
    } catch (err) { next(err); }
  };

  unreconcileStatement = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const referenceSubId = req.body?.reference_record_id || req.query?.reference_record_id || req.body?.reference_id;
      const data = await service.unreconcileStatement(schoolUnitId, req.params.id, req.user?.id, referenceSubId);
      res.json({
        success: true,
        data,
        message: referenceSubId ? '1 Rujukan rekonsiliasi berhasil dilepas' : 'Seluruh rujukan rekonsiliasi berhasil dilepas',
        errors: null
      });
    } catch (err) { next(err); }
  };

  getReconcileCandidates = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await service.getReconcileCandidates(schoolUnitId, req.params.id);
      res.json({
        success: true,
        data,
        message: 'Kandidat transaksi rekonsiliasi berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  importBankStatements = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await service.importBankStatements(schoolUnitId, req.body, req.user?.id);
      res.json({
        success: true,
        data,
        message: `Berhasil mengimpor ${data.imported_count} baris mutasi rekening koran`,
        errors: data.errors?.length > 0 ? data.errors : null
      });
    } catch (err) { next(err); }
  };

  exportBankStatementsExcel = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const buffer = await service.exportBankStatementsExcel(schoolUnitId, req.query);

      const filename = `rekening-koran-${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) { next(err); }
  };

  getTemplateExcel = async (req, res, next) => {
    try {
      const buffer = service.getTemplateExcel();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="template-rekening-koran.xlsx"');
      res.send(buffer);
    } catch (err) { next(err); }
  };
}

module.exports = new BankStatementsController();
