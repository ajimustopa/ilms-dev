const productReturnsService = require('./service');

class ProductReturnsController {
  async listReturns(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await productReturnsService.listReturns(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createReturn(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { vendor_product_id, return_type, qty } = req.body;
      if (!vendor_product_id || !return_type || !qty) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'vendor_product_id, return_type, dan qty wajib diisi',
          errors: null
        });
      }
      const data = await productReturnsService.createReturn(schoolUnitId, req.body, req.user?.id || 1);
      res.status(201).json({ success: true, data, message: 'Retur produk berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductReturnsController();
