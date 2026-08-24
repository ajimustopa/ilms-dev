/**
 * Vendor Products Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.5
 */
const db = require('../../../config/db/kantin');

class VendorProductsService {
  async listProducts(schoolUnitId, query = {}) {
    let q = db('vendor_products')
      .leftJoin('product_categories', 'vendor_products.product_category_id', 'product_categories.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where('vendor_products.school_unit_id', schoolUnitId)
      .select(
        'vendor_products.*',
        'product_categories.category_name as category',
        'vendors.vendor_name as vendor'
      );

    if (query.status) {
      q = q.where('vendor_products.status', query.status);
    }
    if (query.product_category_id) {
      q = q.where('vendor_products.product_category_id', query.product_category_id);
    }
    if (query.vendor_id) {
      q = q.where('vendor_products.vendor_id', query.vendor_id);
    }
    if (query.search) {
      q = q.where(function() {
        this.where('vendor_products.product_name', 'like', `%${query.search}%`)
            .orWhere('vendor_products.barcode', 'like', `%${query.search}%`);
      });
    }

    const rows = await q.orderBy('vendor_products.id', 'desc');

    return rows.map(r => ({
      ...r,
      low_stock_warning: Number(r.current_stock) <= Number(r.min_stock)
    }));
  }

  async getProductById(schoolUnitId, id) {
    const r = await db('vendor_products')
      .leftJoin('product_categories', 'vendor_products.product_category_id', 'product_categories.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where({ 'vendor_products.id': id, 'vendor_products.school_unit_id': schoolUnitId })
      .select(
        'vendor_products.*',
        'product_categories.category_name as category',
        'vendors.vendor_name as vendor'
      )
      .first();

    if (!r) return null;
    return {
      ...r,
      low_stock_warning: Number(r.current_stock) <= Number(r.min_stock)
    };
  }

  async createProduct(schoolUnitId, payload) {
    const {
      barcode = null,
      product_name,
      product_category_id,
      vendor_id,
      unit = 'pcs',
      min_stock = 0,
      current_stock = 0
    } = payload;

    const [id] = await db('vendor_products').insert({
      school_unit_id: schoolUnitId,
      barcode,
      product_name,
      product_category_id,
      vendor_id,
      unit,
      min_stock: Number(min_stock) || 0,
      current_stock: Number(current_stock) || 0,
      status: 'active'
    });

    return this.getProductById(schoolUnitId, id);
  }

  async updateProduct(schoolUnitId, id, payload) {
    const product = await this.getProductById(schoolUnitId, id);
    if (!product) return null;

    const {
      barcode,
      product_name,
      product_category_id,
      vendor_id,
      unit,
      min_stock,
      current_stock
    } = payload;

    await db('vendor_products')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        barcode: barcode !== undefined ? barcode : product.barcode,
        product_name: product_name !== undefined ? product_name : product.product_name,
        product_category_id: product_category_id !== undefined ? product_category_id : product.product_category_id,
        vendor_id: vendor_id !== undefined ? vendor_id : product.vendor_id,
        unit: unit !== undefined ? unit : product.unit,
        min_stock: min_stock !== undefined ? Number(min_stock) : product.min_stock,
        current_stock: current_stock !== undefined ? Number(current_stock) : product.current_stock,
        updated_at: db.fn.now()
      });

    return this.getProductById(schoolUnitId, id);
  }

  async updateStatus(schoolUnitId, id, payload) {
    const product = await this.getProductById(schoolUnitId, id);
    if (!product) return null;

    const { status, status_note = null } = payload;
    await db('vendor_products')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status,
        status_note,
        status_changed_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    return this.getProductById(schoolUnitId, id);
  }

  async generateBarcode(schoolUnitId, payload = {}) {
    const { product_id } = payload;
    if (product_id) {
      const product = await this.getProductById(schoolUnitId, product_id);
      if (!product) return null;

      const generatedBarcode = `899${schoolUnitId.toString().padStart(2, '0')}${product_id.toString().padStart(7, '0')}`;
      await db('vendor_products')
        .where({ id: product_id, school_unit_id: schoolUnitId })
        .update({ barcode: generatedBarcode, updated_at: db.fn.now() });

      return this.getProductById(schoolUnitId, product_id);
    } else {
      // Generate untuk semua produk yang belum punya barcode
      const products = await db('vendor_products')
        .where({ school_unit_id: schoolUnitId })
        .whereNull('barcode');

      for (const p of products) {
        const generated = `899${schoolUnitId.toString().padStart(2, '0')}${p.id.toString().padStart(7, '0')}`;
        await db('vendor_products')
          .where({ id: p.id })
          .update({ barcode: generated, updated_at: db.fn.now() });
      }

      return { generated_count: products.length };
    }
  }

  async updateBarcode(schoolUnitId, id, barcode) {
    const product = await this.getProductById(schoolUnitId, id);
    if (!product) return null;

    await db('vendor_products')
      .where({ id, school_unit_id: schoolUnitId })
      .update({ barcode, updated_at: db.fn.now() });

    return this.getProductById(schoolUnitId, id);
  }
}

module.exports = new VendorProductsService();
