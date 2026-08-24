/**
 * Members Controller Implementation
 * Modul Perpustakaan: Data Anggota & Riwayat Peminjaman
 */
const membersService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  registerMemberSchema,
  updateMemberStatusSchema,
} = require('./validators');

class MembersController {
  async listMembers(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await membersService.listMembers(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar anggota perpustakaan berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMemberById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await membersService.getMemberById(schoolUnitId, req.params.id);
      res.json({
        success: true,
        data,
        message: 'Detail anggota perpustakaan berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async registerMember(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = registerMemberSchema.parse(req.body);
      const registeredByUserId = req.user?.id || req.user?.sub || null;
      const data = await membersService.registerMember(schoolUnitId, parsed, registeredByUserId);
      res.status(201).json({
        success: true,
        data,
        message: 'Anggota perpustakaan berhasil didaftarkan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMemberStatus(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateMemberStatusSchema.parse(req.body);
      const data = await membersService.updateMemberStatus(schoolUnitId, req.params.id, parsed.status);
      res.json({
        success: true,
        data,
        message: 'Status anggota perpustakaan berhasil diperbarui',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMemberLoanHistory(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await membersService.getMemberLoanHistory(schoolUnitId, req.params.id, req.query);
      res.json({
        success: true,
        data,
        message: 'Riwayat peminjaman buku anggota berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MembersController();
