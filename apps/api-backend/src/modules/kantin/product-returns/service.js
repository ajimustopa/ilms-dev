/**
 * Product Returns Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.8
 */
const db = require('../../../config/db/kantin');

class ProductReturnsService {
  async listReturns(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('product_returns')
      .join('vendor_products', 'product_returns.vendor_product_id', 'vendor_products.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .leftJoin('goods_receipts', 'product_returns.goods_receipt_id', 'goods_receipts.id')
      .leftJoin('goods_receipt_items', 'product_returns.goods_receipt_item_id', 'goods_receipt_items.id');

    if (!isAll) {
      q = q.where('product_returns.school_unit_id', schoolUnitId);
    }

    q = q.select(
      'product_returns.*',
      'vendor_products.product_name',
      'vendor_products.barcode',
      'vendor_products.unit',
      'vendor_products.cost_price as current_cost_price',
      'vendor_products.sale_price as current_sale_price',
      'vendors.vendor_name as vendor',
      'goods_receipts.receipt_date',
      'goods_receipts.invoice_number',
      'goods_receipts.receipt_type as receipt_origin_type',
      'goods_receipt_items.batch_number as item_batch_number',
      'goods_receipt_items.expired_at as item_expired_at'
    );

    if (query.return_type) {
      q = q.where('product_returns.return_type', query.return_type);
    }
    if (query.vendor_product_id) {
      q = q.where('product_returns.vendor_product_id', query.vendor_product_id);
    }

    return q.orderBy('product_returns.returned_at', 'desc').orderBy('product_returns.id', 'desc');
  }

  async getEligibleReceiptItems(schoolUnitId) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';

    // 1. Ambil semua produk aktif
    let pQ = db('vendor_products')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where('vendor_products.status', 'active');
    if (!isAll) {
      pQ = pQ.where('vendor_products.school_unit_id', schoolUnitId);
    }
    const products = await pQ.select(
      'vendor_products.*',
      'vendors.vendor_name as vendor_name',
      'vendors.vendor_type'
    );

    if (products.length === 0) return [];

    const productIds = products.map(p => p.id);

    // 2. Ambil total penjualan per produk
    const salesSums = await db('sales_transaction_items')
      .whereIn('vendor_product_id', productIds)
      .groupBy('vendor_product_id')
      .select('vendor_product_id')
      .sum('qty as total_sold');

    const salesMap = {};
    salesSums.forEach(s => {
      salesMap[s.vendor_product_id] = Number(s.total_sold || 0);
    });

    // 3. Ambil total retur per produk
    const returnsSums = await db('product_returns')
      .whereIn('vendor_product_id', productIds)
      .groupBy('vendor_product_id')
      .select('vendor_product_id')
      .sum('qty as total_returned');

    const returnsMap = {};
    returnsSums.forEach(r => {
      returnsMap[r.vendor_product_id] = Number(r.total_returned || 0);
    });

    // 4. Ambil semua item penerimaan (goods_receipt_items)
    const receiptItems = await db('goods_receipt_items')
      .join('goods_receipts', 'goods_receipt_items.goods_receipt_id', 'goods_receipts.id')
      .leftJoin('vendors', 'goods_receipts.vendor_id', 'vendors.id')
      .whereIn('goods_receipt_items.vendor_product_id', productIds)
      .select(
        'goods_receipt_items.id as goods_receipt_item_id',
        'goods_receipt_items.goods_receipt_id',
        'goods_receipt_items.vendor_product_id',
        'goods_receipt_items.qty as qty_received',
        'goods_receipt_items.cost_price',
        'goods_receipt_items.sale_price',
        'goods_receipt_items.batch_number',
        'goods_receipt_items.expired_at',
        'goods_receipts.receipt_date',
        'goods_receipts.invoice_number',
        'goods_receipts.receipt_type',
        'vendors.vendor_name as vendor_name'
      )
      .orderBy('goods_receipts.receipt_date', 'desc')
      .orderBy('goods_receipt_items.id', 'desc');

    // 5. Ambil total retur yang sudah tercatat per goods_receipt_item_id
    const itemReturns = await db('product_returns')
      .whereNotNull('goods_receipt_item_id')
      .whereIn('goods_receipt_item_id', receiptItems.map(ri => ri.goods_receipt_item_id))
      .groupBy('goods_receipt_item_id')
      .select('goods_receipt_item_id')
      .sum('qty as total_item_returned');

    const itemReturnsMap = {};
    itemReturns.forEach(ir => {
      itemReturnsMap[ir.goods_receipt_item_id] = Number(ir.total_item_returned || 0);
    });

    // Gabungkan data
    return products.map(prod => {
      const prodReceipts = receiptItems.filter(ri => ri.vendor_product_id === prod.id).map(ri => {
        const itemReturned = itemReturnsMap[ri.goods_receipt_item_id] || 0;
        return {
          ...ri,
          qty_already_returned: itemReturned
        };
      });

      const totalReceived = prodReceipts.reduce((acc, ri) => acc + Number(ri.qty_received || 0), 0);
      const totalSold = salesMap[prod.id] || 0;
      const totalReturned = returnsMap[prod.id] || 0;
      const currentStock = Number(prod.current_stock || 0);

      return {
        product_id: prod.id,
        product_name: prod.product_name,
        barcode: prod.barcode,
        category: prod.category,
        unit: prod.unit || 'pcs',
        cost_price: Number(prod.cost_price || 0),
        sale_price: Number(prod.sale_price || 0),
        vendor_id: prod.vendor_id,
        vendor_name: prod.vendor_name,
        vendor_type: prod.vendor_type,
        current_stock: currentStock,
        total_received: totalReceived,
        total_sold: totalSold,
        total_returned: totalReturned,
        max_returnable: currentStock,
        receipt_batches: prodReceipts
      };
    });
  }

  async createReturn(schoolUnitId, payload, userId) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const {
      vendor_product_id,
      goods_receipt_id = null,
      goods_receipt_item_id = null,
      batch_number = null,
      return_type,
      qty,
      note = null
    } = payload;

    let pQuery = db('vendor_products').where({ id: vendor_product_id });
    if (!isAll) {
      pQuery = pQuery.where({ school_unit_id: schoolUnitId });
    }
    const product = await pQuery.first();

    if (!product) {
      const err = new Error('Produk vendor tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const effectiveUnitId = product.school_unit_id || (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1);

    const returnQty = Number(qty);
    if (returnQty <= 0) {
      const err = new Error('Jumlah retur harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    if (returnQty > product.current_stock) {
      const err = new Error(`Jumlah retur (${returnQty} ${product.unit || 'pcs'}) tidak boleh melebihi sisa stok yang tersedia (${product.current_stock} ${product.unit || 'pcs'}).`);
      err.statusCode = 422;
      throw err;
    }

    const normalizedReturnType = (return_type === 'rusak' || return_type === 'expired' || return_type === 'basi') ? 'rusak' : 'sisa';

    const [id] = await db('product_returns').insert({
      school_unit_id: effectiveUnitId,
      vendor_product_id,
      goods_receipt_id: goods_receipt_id ? Number(goods_receipt_id) : null,
      goods_receipt_item_id: goods_receipt_item_id ? Number(goods_receipt_item_id) : null,
      batch_number: batch_number ? String(batch_number).trim() : null,
      return_type: normalizedReturnType,
      qty: returnQty,
      note,
      returned_by: userId,
      returned_at: db.fn.now()
    });

    // Kurangi current_stock di vendor_products
    await db('vendor_products')
      .where({ id: vendor_product_id })
      .decrement('current_stock', returnQty);

    return db('product_returns')
      .join('vendor_products', 'product_returns.vendor_product_id', 'vendor_products.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .leftJoin('goods_receipts', 'product_returns.goods_receipt_id', 'goods_receipts.id')
      .where('product_returns.id', id)
      .select(
        'product_returns.*',
        'vendor_products.product_name',
        'vendor_products.unit',
        'vendors.vendor_name as vendor',
        'goods_receipts.receipt_date',
        'goods_receipts.invoice_number'
      )
      .first();
  }
}

module.exports = new ProductReturnsService();
