const productReturnsService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class ProductReturnsController {
  async listReturns(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await productReturnsService.listReturns(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getEligibleReceiptItems(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await productReturnsService.getEligibleReceiptItems(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createReturn(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { vendor_product_id, return_type, qty } = req.body;
      if (!vendor_product_id || !return_type || !qty) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'vendor_product_id, return_type, dan qty wajib diisi',
          errors: null
        });
      }
      const data = await productReturnsService.createReturn(schoolUnitId, req.body, req.user?.id || null);
      res.status(201).json({ success: true, data, message: 'Retur produk berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductReturnsController();
