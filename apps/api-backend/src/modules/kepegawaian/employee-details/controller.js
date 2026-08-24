/**
 * Employee Details Controller Implementation
 * Modul Kepegawaian - Fitur: Detail Pegawai, Pendidikan, Diklat, Keahlian, Keluarga,
 * Alamat KTP/Domisili, Karya Tulis, Karir Eksternal, Organisasi, Berkas, Rekening, SP, Pensiun
 */
const employeeDetailsService = require('./service');

class EmployeeDetailsController {
  // 1. Pendidikan, Pelatihan, Sertifikasi & Keahlian
  async listEducation(req, res, next) {
    try {
      const result = await employeeDetailsService.listEducationTrainings(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pendidikan, pelatihan & keahlian berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createEducation(req, res, next) {
    try {
      const result = await employeeDetailsService.createEducationTraining(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Data pendidikan/pelatihan/keahlian berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateEducation(req, res, next) {
    try {
      const result = await employeeDetailsService.updateEducationTraining(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data pendidikan/pelatihan/keahlian berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteEducation(req, res, next) {
    try {
      const result = await employeeDetailsService.deleteEducationTraining(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data pendidikan/pelatihan/keahlian berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Anggota Keluarga
  async listFamily(req, res, next) {
    try {
      const result = await employeeDetailsService.listFamilyMembers(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar anggota keluarga berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createFamily(req, res, next) {
    try {
      const result = await employeeDetailsService.createFamilyMember(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Anggota keluarga berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateFamily(req, res, next) {
    try {
      const result = await employeeDetailsService.updateFamilyMember(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data anggota keluarga berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteFamily(req, res, next) {
    try {
      const result = await employeeDetailsService.deleteFamilyMember(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data anggota keluarga berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Alamat KTP & Domisili
  async listAddresses(req, res, next) {
    try {
      const result = await employeeDetailsService.listAddresses(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar alamat pegawai berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createAddress(req, res, next) {
    try {
      const result = await employeeDetailsService.createAddress(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Alamat pegawai berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAddress(req, res, next) {
    try {
      const result = await employeeDetailsService.updateAddress(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Alamat pegawai berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAddress(req, res, next) {
    try {
      const result = await employeeDetailsService.deleteAddress(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Alamat pegawai berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Karya Tulis & Publikasi
  async listPublications(req, res, next) {
    try {
      const result = await employeeDetailsService.listPublications(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar karya tulis berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createPublication(req, res, next) {
    try {
      const result = await employeeDetailsService.createPublication(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Karya tulis berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePublication(req, res, next) {
    try {
      const result = await employeeDetailsService.updatePublication(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Karya tulis berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deletePublication(req, res, next) {
    try {
      const result = await employeeDetailsService.deletePublication(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Karya tulis berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Pengalaman Kerja Eksternal
  async listWorkExperiences(req, res, next) {
    try {
      const result = await employeeDetailsService.listWorkExperiences(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengalaman kerja berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createWorkExperience(req, res, next) {
    try {
      const result = await employeeDetailsService.createWorkExperience(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pengalaman kerja berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateWorkExperience(req, res, next) {
    try {
      const result = await employeeDetailsService.updateWorkExperience(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengalaman kerja berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteWorkExperience(req, res, next) {
    try {
      const result = await employeeDetailsService.deleteWorkExperience(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengalaman kerja berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Surat Peringatan / SP
  async listWarningLetters(req, res, next) {
    try {
      const result = await employeeDetailsService.listWarningLetters(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar surat peringatan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createWarningLetter(req, res, next) {
    try {
      const result = await employeeDetailsService.createWarningLetter(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Surat peringatan berhasil diterbitkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateWarningLetter(req, res, next) {
    try {
      const result = await employeeDetailsService.updateWarningLetter(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Surat peringatan berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteWarningLetter(req, res, next) {
    try {
      const result = await employeeDetailsService.deleteWarningLetter(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Surat peringatan berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 7. Kegiatan Organisasi
  async listOrganizationActivities(req, res, next) {
    try {
      const result = await employeeDetailsService.listOrganizationActivities(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar kegiatan organisasi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createOrganizationActivity(req, res, next) {
    try {
      const result = await employeeDetailsService.createOrganizationActivity(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Kegiatan organisasi berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateOrganizationActivity(req, res, next) {
    try {
      const result = await employeeDetailsService.updateOrganizationActivity(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Kegiatan organisasi berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteOrganizationActivity(req, res, next) {
    try {
      const result = await employeeDetailsService.deleteOrganizationActivity(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Kegiatan organisasi berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 8. Kelengkapan Berkas
  async listDocumentChecklists(req, res, next) {
    try {
      const result = await employeeDetailsService.listDocumentChecklists(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar kelengkapan berkas berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createDocumentChecklist(req, res, next) {
    try {
      const result = await employeeDetailsService.createDocumentChecklist(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Item berkas berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateDocumentChecklist(req, res, next) {
    try {
      const result = await employeeDetailsService.updateDocumentChecklist(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Item berkas berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteDocumentChecklist(req, res, next) {
    try {
      const result = await employeeDetailsService.deleteDocumentChecklist(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Item berkas berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 9. Data Rekening Bank (1:N)
  async listBankAccounts(req, res, next) {
    try {
      const result = await employeeDetailsService.listBankAccounts(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar rekening bank berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createBankAccount(req, res, next) {
    try {
      const result = await employeeDetailsService.createBankAccount(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Rekening bank berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateBankAccount(req, res, next) {
    try {
      const result = await employeeDetailsService.updateBankAccount(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Rekening bank berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteBankAccount(req, res, next) {
    try {
      const result = await employeeDetailsService.deleteBankAccount(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Rekening bank berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 10. Rencana Pensiun
  async getRetirement(req, res, next) {
    try {
      const result = await employeeDetailsService.getRetirementPlan(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data rencana pensiun berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async upsertRetirement(req, res, next) {
    try {
      const result = await employeeDetailsService.upsertRetirementPlan(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data rencana pensiun berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 11. Riwayat Gaji Pegawai
  async listPayrollHistory(req, res, next) {
    try {
      const result = await employeeDetailsService.listEmployeePayrollHistory(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Riwayat gaji pegawai berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EmployeeDetailsController();
