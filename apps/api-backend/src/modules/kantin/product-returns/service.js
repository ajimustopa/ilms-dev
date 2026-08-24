/**
 * Product Returns Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.8
 */
const db = require('../../../config/db/kantin');

class ProductReturnsService {
  async listReturns(schoolUnitId, query = {}) {
    let q = db('product_returns')
      .join('vendor_products', 'product_returns.vendor_product_id', 'vendor_products.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where('product_returns.school_unit_id', schoolUnitId)
      .select(
        'product_returns.*',
        'vendor_products.product_name',
        'vendor_products.unit',
        'vendors.vendor_name as vendor'
      );

    if (query.return_type) {
      q = q.where('product_returns.return_type', query.return_type);
    }
    if (query.vendor_product_id) {
      q = q.where('product_returns.vendor_product_id', query.vendor_product_id);
    }

    return q.orderBy('product_returns.returned_at', 'desc').orderBy('product_returns.id', 'desc');
  }

  async createReturn(schoolUnitId, payload, userId) {
    const { vendor_product_id, return_type, qty, note = null } = payload;

    const product = await db('vendor_products')
      .where({ id: vendor_product_id, school_unit_id: schoolUnitId })
      .first();

    if (!product) {
      const err = new Error('Produk vendor tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const returnQty = Number(qty);
    if (returnQty <= 0) {
      const err = new Error('Jumlah retur harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const [id] = await db('product_returns').insert({
      school_unit_id: schoolUnitId,
      vendor_product_id,
      return_type,
      qty: returnQty,
      note,
      returned_by: userId,
      returned_at: db.fn.now()
    });

    // Kurangi current_stock di vendor_products (jika sisa > 0)
    await db('vendor_products')
      .where({ id: vendor_product_id })
      .decrement('current_stock', Math.min(product.current_stock, returnQty));

    return db('product_returns')
      .join('vendor_products', 'product_returns.vendor_product_id', 'vendor_products.id')
      .where('product_returns.id', id)
      .select('product_returns.*', 'vendor_products.product_name', 'vendor_products.unit')
      .first();
  }
}

module.exports = new ProductReturnsService();
