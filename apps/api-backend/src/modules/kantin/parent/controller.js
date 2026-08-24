const parentService = require('./service');

class ParentController {
  async getStudentWallet(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await parentService.getStudentWallet(schoolUnitId, req.params.student_id);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getWalletHistory(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await parentService.getWalletHistory(schoolUnitId, req.params.student_id);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getSpendingHistory(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await parentService.getSpendingHistory(schoolUnitId, req.params.student_id);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async changeParentPin(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { new_pin } = req.body;
      if (!new_pin) {
        return res.status(422).json({ success: false, data: null, message: 'new_pin wajib diisi', errors: null });
      }
      const data = await parentService.changeParentPin(schoolUnitId, req.params.student_id, req.body);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async setSpendingLimit(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await parentService.setSpendingLimit(schoolUnitId, req.params.student_id, req.body);
      res.json({ success: true, data, message: 'Limit jajan kustom orangtua berhasil disimpan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async toggleBlock(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { is_blocked } = req.body;
      if (is_blocked === undefined) {
        return res.status(422).json({ success: false, data: null, message: 'is_blocked wajib diisi (true/false)', errors: null });
      }
      const data = await parentService.toggleBlock(schoolUnitId, req.params.student_id, req.body);
      res.json({ success: true, data, message: 'Status blokir jajan berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ParentController();
