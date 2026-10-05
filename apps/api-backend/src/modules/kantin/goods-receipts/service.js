/**
 * Goods Receipts Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.6–2.7
 */
const db = require('../../../config/db/kantin');

class GoodsReceiptsService {
  async listReceipts(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('goods_receipts')
      .leftJoin('vendors', 'goods_receipts.vendor_id', 'vendors.id');

    if (!isAll) {
      q = q.where('goods_receipts.school_unit_id', schoolUnitId);
    }

    q = q.select(
      'goods_receipts.*',
      'vendors.vendor_name as vendor'
    );

    if (query.receipt_type) {
      q = q.where('goods_receipts.receipt_type', query.receipt_type);
    }
    if (query.status) {
      q = q.where('goods_receipts.status', query.status);
    }
    if (query.vendor_id) {
      q = q.where('goods_receipts.vendor_id', query.vendor_id);
    }

    const receipts = await q.orderBy('goods_receipts.receipt_date', 'desc').orderBy('goods_receipts.id', 'desc');

    // Enrich with items
    const receiptIds = receipts.map(r => r.id);
    const items = receiptIds.length > 0
      ? await db('goods_receipt_items')
          .join('vendor_products', 'goods_receipt_items.vendor_product_id', 'vendor_products.id')
          .whereIn('goods_receipt_items.goods_receipt_id', receiptIds)
          .select(
            'goods_receipt_items.*',
            'vendor_products.product_name',
            'vendor_products.unit'
          )
      : [];

    return receipts.map(r => ({
      ...r,
      items: items.filter(it => it.goods_receipt_id === r.id)
    }));
  }

  async getReceiptById(schoolUnitId, id) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('goods_receipts')
      .leftJoin('vendors', 'goods_receipts.vendor_id', 'vendors.id')
      .where({ 'goods_receipts.id': id });

    if (!isAll) {
      q = q.where({ 'goods_receipts.school_unit_id': schoolUnitId });
    }

    const receipt = await q.select(
      'goods_receipts.*',
      'vendors.vendor_name as vendor'
    ).first();

    if (!receipt) return null;

    const items = await db('goods_receipt_items')
      .join('vendor_products', 'goods_receipt_items.vendor_product_id', 'vendor_products.id')
      .where({ 'goods_receipt_items.goods_receipt_id': id })
      .select(
        'goods_receipt_items.*',
        'vendor_products.product_name',
        'vendor_products.unit'
      );

    return {
      ...receipt,
      items
    };
  }

  async createReceipt(schoolUnitId, payload, userId) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1;
    const {
      vendor_id = null,
      invoice_number = null,
      receipt_date,
      receipt_type,
      items = []
    } = payload;

    const normalizedReceiptType = (receipt_type === 'belanja' || receipt_type === 'belanja_sendiri') ? 'belanja_sendiri' : 'titipan';

    const [id] = await db('goods_receipts').insert({
      school_unit_id: effectiveUnitId,
      vendor_id,
      invoice_number,
      receipt_date: receipt_date || new Date().toISOString().slice(0, 10),
      receipt_type: normalizedReceiptType,
      status: items.length > 0 ? 'completed' : 'draft',
      created_by: userId
    });

    if (items.length > 0) {
      for (const item of items) {
        await db('goods_receipt_items').insert({
          goods_receipt_id: id,
          vendor_product_id: item.vendor_product_id,
          qty: Number(item.qty),
          cost_price: parseFloat(item.cost_price),
          sale_price: parseFloat(item.sale_price),
          batch_number: item.batch_number ? String(item.batch_number).trim() : null,
          expired_at: item.expired_at || null
        });

        // Tambah current_stock dan perbarui harga di vendor_products
        const productUpdates = {};
        if (item.cost_price !== undefined && !isNaN(item.cost_price)) {
          productUpdates.cost_price = parseFloat(item.cost_price);
        }
        if (item.sale_price !== undefined && !isNaN(item.sale_price)) {
          productUpdates.sale_price = parseFloat(item.sale_price);
        }

        if (Object.keys(productUpdates).length > 0) {
          await db('vendor_products')
            .where({ id: item.vendor_product_id })
            .update(productUpdates);
        }

        await db('vendor_products')
          .where({ id: item.vendor_product_id })
          .increment('current_stock', Number(item.qty));
      }
    }

    return this.getReceiptById(effectiveUnitId, id);
  }

  async addItem(schoolUnitId, receiptId, payload) {
    const receipt = await this.getReceiptById(schoolUnitId, receiptId);

    if (!receipt) return null;

    const { vendor_product_id, qty, cost_price, sale_price, batch_number = null, expired_at = null } = payload;

    const [itemId] = await db('goods_receipt_items').insert({
      goods_receipt_id: receiptId,
      vendor_product_id,
      qty: Number(qty),
      cost_price: parseFloat(cost_price),
      sale_price: parseFloat(sale_price),
      batch_number: batch_number ? String(batch_number).trim() : null,
      expired_at
    });

    // Update current_stock
    await db('vendor_products')
      .where({ id: vendor_product_id })
      .increment('current_stock', Number(qty));

    // Update status to completed
    await db('goods_receipts')
      .where({ id: receiptId })
      .update({ status: 'completed', updated_at: db.fn.now() });

    return this.getReceiptById(schoolUnitId, receiptId);
  }
}

module.exports = new GoodsReceiptsService();
