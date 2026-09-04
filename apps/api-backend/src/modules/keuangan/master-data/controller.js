/**
 * Master Data Controller for Keuangan Module
 */
const masterDataService = require('./service');

class MasterDataController {
  // Helper to extract schoolUnitId from token/request
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  // 1. Cash Accounts
  listCashAccounts = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listCashAccounts(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar jenis kas berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getCashAccountById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.getCashAccountById(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Jenis kas tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail jenis kas berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createCashAccount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createCashAccount(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Jenis kas berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateCashAccount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateCashAccount(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Jenis kas tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Jenis kas berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  updateCashAccountStatus = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateCashAccountStatus(schoolUnitId, req.params.id, req.body.is_active, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Jenis kas tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Status jenis kas berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  getCashAccountBalance = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.getCashAccountBalance(schoolUnitId, req.params.id, req.query.academic_year_id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Jenis kas tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Saldo kas berhasil dihitung', errors: null });
    } catch (err) { next(err); }
  };

  // 2. Opening Balances
  listOpeningBalances = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listOpeningBalances(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar saldo awal kas berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createOpeningBalance = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createOpeningBalance(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Saldo awal kas berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateOpeningBalance = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateOpeningBalance(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Saldo awal kas tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Saldo awal kas berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  // 3. Chart of Accounts
  listChartOfAccounts = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const asTree = req.query.tree === 'true';
      const data = await masterDataService.listChartOfAccounts(schoolUnitId, asTree);
      res.json({ success: true, data, message: 'Chart of Accounts berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getChartOfAccountById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.getChartOfAccountById(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Akun COA tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail COA berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createChartOfAccount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createChartOfAccount(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Akun COA berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateChartOfAccount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateChartOfAccount(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Akun COA tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Akun COA berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  updateChartOfAccountStatus = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateChartOfAccountStatus(schoolUnitId, req.params.id, req.body.is_active, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Akun COA tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Status akun COA berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  // 4. Account Mappings (Aturan Transaksi)
  listAccountMappings = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listAccountMappings(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar aturan transaksi berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getAccountMappingById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.getAccountMappingById(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Aturan transaksi tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail aturan transaksi berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createAccountMapping = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createAccountMapping(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Aturan transaksi kustom berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateAccountMapping = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateAccountMapping(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Aturan transaksi tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Aturan transaksi berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  updateAccountMappingStatus = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateAccountMappingStatus(schoolUnitId, req.params.id, req.body.is_active, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Aturan transaksi tidak ditemukan', errors: null });
      res.json({ success: true, data, message: `Status aturan transaksi berhasil diubah menjadi ${req.body.is_active ? 'Aktif' : 'Non-aktif'}`, errors: null });
    } catch (err) { next(err); }
  };

  overrideSystemTransactionRule = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.overrideSystemTransactionRule(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Override struktural aturan sistem berhasil diterapkan', errors: null });
    } catch (err) { next(err); }
  };

  deleteAccountMapping = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.deleteAccountMapping(schoolUnitId, req.params.id, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Aturan transaksi tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Aturan transaksi dinonaktifkan (kebijakan non-delete)', errors: null });
    } catch (err) { next(err); }
  };

  // 5. Fee Types
  listFeeTypes = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listFeeTypes(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar jenis biaya berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createFeeType = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createFeeType(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Jenis biaya berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateFeeType = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateFeeType(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Jenis biaya tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Jenis biaya berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  updateFeeTypeStatus = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateFeeTypeStatus(schoolUnitId, req.params.id, req.body.is_active, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Jenis biaya tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Status jenis biaya berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  // 6. Fee Groups & Reference Amounts
  listFeeGroups = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listFeeGroups(schoolUnitId);
      res.json({ success: true, data, message: 'Daftar kelompok biaya berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createFeeGroup = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createFeeGroup(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Kelompok biaya berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  };

  updateFeeGroup = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateFeeGroup(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Kelompok biaya berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  listFeeReferenceAmounts = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listFeeReferenceAmounts(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar nominal biaya acuan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createFeeReferenceAmount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createFeeReferenceAmount(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Nominal acuan berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateFeeReferenceAmount = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateFeeReferenceAmount(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Nominal acuan berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  // 7. Transaction Categories
  listTransactionCategories = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listTransactionCategories(schoolUnitId, req.query.category_kind);
      res.json({ success: true, data, message: 'Daftar kategori transaksi berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createTransactionCategory = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createTransactionCategory(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Kategori transaksi berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateTransactionCategory = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateTransactionCategory(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Kategori transaksi berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  // 8. Budget Programs & Catalog Items
  listBudgetPrograms = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listBudgetPrograms(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data, message: 'Daftar program kegiatan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createBudgetProgram = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createBudgetProgram(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Program kegiatan berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateBudgetProgram = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateBudgetProgram(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Program kegiatan berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  listCatalogItems = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listCatalogItems(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Katalog standar biaya berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getCatalogItemById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.getCatalogItemById(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Item katalog tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail item katalog berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createCatalogItem = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createCatalogItem(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Item standar biaya katalog berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateCatalogItem = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateCatalogItem(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Item katalog tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Item standar biaya katalog berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  updateCatalogItemStatus = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.updateCatalogItemStatus(schoolUnitId, req.params.id, req.body.is_active, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Item katalog tidak ditemukan', errors: null });
      res.json({ success: true, data, message: `Status item katalog berhasil diubah menjadi ${req.body.is_active ? 'Aktif' : 'Non-aktif'}`, errors: null });
    } catch (err) { next(err); }
  };

  getCatalogItemPriceHistory = async (req, res, next) => {
    try {
      const data = await masterDataService.getCatalogItemPriceHistory(req.params.id);
      res.json({ success: true, data, message: 'Riwayat harga acuan item katalog berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  // 9. Student Fee Adjustments
  listStudentFeeAdjustments = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.listStudentFeeAdjustments(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar penyesuaian biaya siswa berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createStudentFeeAdjustment = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.createStudentFeeAdjustment(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Pengajuan penyesuaian/keringanan biaya berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  };

  submitStudentFeeAdjustment = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.submitStudentFeeAdjustment(schoolUnitId, req.params.id, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data penyesuaian biaya tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Penyesuaian biaya berhasil diajukan', errors: null });
    } catch (err) { next(err); }
  };

  approveStudentFeeAdjustment = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.approveStudentFeeAdjustment(schoolUnitId, req.params.id, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data penyesuaian biaya tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Penyesuaian biaya berhasil disetujui', errors: null });
    } catch (err) { next(err); }
  };

  rejectStudentFeeAdjustment = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await masterDataService.rejectStudentFeeAdjustment(schoolUnitId, req.params.id, req.body.rejection_reason, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data penyesuaian biaya tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Penyesuaian biaya berhasil ditolak', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new MasterDataController();
