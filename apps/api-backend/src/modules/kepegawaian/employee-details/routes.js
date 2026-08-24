/**
 * Employee Details Routes
 * Modul Kepegawaian - Fitur: Detail Pegawai, Pendidikan, Diklat, Keahlian, Keluarga,
 * Alamat KTP/Domisili, Karya Tulis, Karir Eksternal, Organisasi, Berkas, Rekening, SP, Pensiun
 */
const express = require('express');
const router = express.Router();
const employeeDetailsController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Pendidikan, Pelatihan, Sertifikasi & Keahlian
router.get('/employees/:id/education-trainings', authenticate, employeeDetailsController.listEducation);
router.post('/employees/:id/education-trainings', authenticate, requirePermission('kepegawaian.employee_details.manage'), employeeDetailsController.createEducation);
router.put('/education-trainings/:id', authenticate, requirePermission('kepegawaian.employee_details.manage'), employeeDetailsController.updateEducation);
router.delete('/education-trainings/:id', authenticate, requirePermission('kepegawaian.employee_details.manage'), employeeDetailsController.deleteEducation);

// 2. Data Keluarga
router.get('/employees/:id/family-members', authenticate, employeeDetailsController.listFamily);
router.post('/employees/:id/family-members', authenticate, employeeDetailsController.createFamily);
router.put('/family-members/:id', authenticate, employeeDetailsController.updateFamily);
router.delete('/family-members/:id', authenticate, employeeDetailsController.deleteFamily);

// 3. Alamat KTP & Domisili
router.get('/employees/:id/addresses', authenticate, employeeDetailsController.listAddresses);
router.post('/employees/:id/addresses', authenticate, employeeDetailsController.createAddress);
router.put('/addresses/:id', authenticate, employeeDetailsController.updateAddress);
router.delete('/addresses/:id', authenticate, requirePermission('kepegawaian.employee_details.manage'), employeeDetailsController.deleteAddress);

// 4. Karya Tulis & Publikasi
router.get('/employees/:id/publications', authenticate, employeeDetailsController.listPublications);
router.post('/employees/:id/publications', authenticate, employeeDetailsController.createPublication);
router.put('/publications/:id', authenticate, employeeDetailsController.updatePublication);
router.delete('/publications/:id', authenticate, employeeDetailsController.deletePublication);

// 5. Pengalaman Kerja Eksternal
router.get('/employees/:id/work-experiences', authenticate, employeeDetailsController.listWorkExperiences);
router.post('/employees/:id/work-experiences', authenticate, employeeDetailsController.createWorkExperience);
router.put('/work-experiences/:id', authenticate, employeeDetailsController.updateWorkExperience);
router.delete('/work-experiences/:id', authenticate, employeeDetailsController.deleteWorkExperience);

// 6. Surat Peringatan (SP) - Akses Kelola Ketat
router.get('/employees/:id/warning-letters', authenticate, employeeDetailsController.listWarningLetters);
router.post('/employees/:id/warning-letters', authenticate, requirePermission('kepegawaian.employee_warning_letters.manage'), employeeDetailsController.createWarningLetter);
router.put('/warning-letters/:id', authenticate, requirePermission('kepegawaian.employee_warning_letters.manage'), employeeDetailsController.updateWarningLetter);
router.delete('/warning-letters/:id', authenticate, requirePermission('kepegawaian.employee_warning_letters.manage'), employeeDetailsController.deleteWarningLetter);

// 7. Kegiatan Organisasi
router.get('/employees/:id/organization-activities', authenticate, employeeDetailsController.listOrganizationActivities);
router.post('/employees/:id/organization-activities', authenticate, employeeDetailsController.createOrganizationActivity);
router.put('/organization-activities/:id', authenticate, employeeDetailsController.updateOrganizationActivity);
router.delete('/organization-activities/:id', authenticate, employeeDetailsController.deleteOrganizationActivity);

// 8. Kelengkapan Berkas Pegawai
router.get('/employees/:id/document-checklists', authenticate, employeeDetailsController.listDocumentChecklists);
router.post('/employees/:id/document-checklists', authenticate, requirePermission('kepegawaian.employee_details.manage'), employeeDetailsController.createDocumentChecklist);
router.put('/document-checklists/:id', authenticate, requirePermission('kepegawaian.employee_details.manage'), employeeDetailsController.updateDocumentChecklist);
router.delete('/document-checklists/:id', authenticate, requirePermission('kepegawaian.employee_details.manage'), employeeDetailsController.deleteDocumentChecklist);

// 9. Data Rekening Bank (1:N) - Akses Kelola Ketat
router.get('/employees/:id/bank-accounts', authenticate, employeeDetailsController.listBankAccounts);
router.post('/employees/:id/bank-accounts', authenticate, requirePermission('kepegawaian.employee_bank_accounts.manage'), employeeDetailsController.createBankAccount);
router.put('/bank-accounts/:id', authenticate, requirePermission('kepegawaian.employee_bank_accounts.manage'), employeeDetailsController.updateBankAccount);
router.delete('/bank-accounts/:id', authenticate, requirePermission('kepegawaian.employee_bank_accounts.manage'), employeeDetailsController.deleteBankAccount);
// Fallback single endpoint
router.get('/employees/:id/bank-account', authenticate, employeeDetailsController.listBankAccounts);
router.put('/employees/:id/bank-account', authenticate, requirePermission('kepegawaian.employee_bank_accounts.manage'), employeeDetailsController.createBankAccount);

// 10. Data Pensiun
router.get('/employees/:id/retirement-plan', authenticate, employeeDetailsController.getRetirement);
router.put('/employees/:id/retirement-plan', authenticate, requirePermission('kepegawaian.employee_details.manage'), employeeDetailsController.upsertRetirement);

// 11. Riwayat Gaji Pegawai
router.get('/employees/:id/payroll-history', authenticate, employeeDetailsController.listPayrollHistory);

module.exports = router;
