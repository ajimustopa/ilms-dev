/**
 * Vendor Products Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.5
 */
const db = require('../../../config/db/kantin');

class VendorProductsService {
  async listProducts(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('vendor_products')
      .leftJoin('product_categories', 'vendor_products.product_category_id', 'product_categories.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id');

    if (!isAll) {
      q = q.where('vendor_products.school_unit_id', schoolUnitId);
    }

    q = q.select(
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

    if (rows.length === 0) return [];

    const productIds = rows.map(r => r.id);

    // Ambil batch penerimaan barang aktif dengan pengurutan FEFO (First Expired First Out)
    const receiptBatches = await db('goods_receipt_items')
      .join('goods_receipts', 'goods_receipt_items.goods_receipt_id', 'goods_receipts.id')
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
        'goods_receipts.receipt_type'
      )
      .orderByRaw('goods_receipt_items.expired_at IS NULL, goods_receipt_items.expired_at ASC, goods_receipts.receipt_date ASC, goods_receipt_items.id ASC');

    return rows.map(r => {
      const batches = receiptBatches.filter(b => b.vendor_product_id === r.id);
      const activeBatch = batches[0] || null;

      return {
        ...r,
        low_stock_warning: Number(r.current_stock) <= Number(r.min_stock),
        active_batch: activeBatch,
        receipt_batches: batches,
        latest_receipt_date: activeBatch?.receipt_date || null,
        latest_invoice_number: activeBatch?.invoice_number || null,
        active_batch_number: activeBatch?.batch_number || null,
        active_expired_at: activeBatch?.expired_at || null
      };
    });
  }

  async getProductById(schoolUnitId, id) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('vendor_products')
      .leftJoin('product_categories', 'vendor_products.product_category_id', 'product_categories.id')
      .leftJoin('vendors', 'vendor_products.vendor_id', 'vendors.id')
      .where({ 'vendor_products.id': id });

    if (!isAll) {
      q = q.where({ 'vendor_products.school_unit_id': schoolUnitId });
    }

    const r = await q.select(
      'vendor_products.*',
      'product_categories.category_name as category',
      'vendors.vendor_name as vendor'
    ).first();

    if (!r) return null;
    return {
      ...r,
      low_stock_warning: Number(r.current_stock) <= Number(r.min_stock)
    };
  }

  async createProduct(schoolUnitId, payload, user = {}) {
    const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1;
    const {
      barcode = null,
      image_url = null,
      product_name,
      product_category_id,
      vendor_id,
      unit = 'pcs',
      cost_price = 0,
      sale_price = 0,
      min_stock = 0
    } = payload;

    const [id] = await db('vendor_products').insert({
      school_unit_id: effectiveUnitId,
      barcode,
      image_url,
      product_name,
      product_category_id,
      vendor_id,
      unit,
      cost_price: Number(cost_price) || 0,
      sale_price: Number(sale_price) || 0,
      min_stock: Number(min_stock) || 0,
      current_stock: 0,
      status: 'active'
    });

    return this.getProductById(effectiveUnitId, id);
  }

  async updateProduct(schoolUnitId, id, payload) {
    const product = await this.getProductById(schoolUnitId, id);
    if (!product) return null;

    const {
      barcode,
      image_url,
      product_name,
      product_category_id,
      vendor_id,
      unit,
      cost_price,
      sale_price,
      min_stock
    } = payload;

    await db('vendor_products')
      .where({ id: product.id, school_unit_id: product.school_unit_id })
      .update({
        barcode: barcode !== undefined ? barcode : product.barcode,
        image_url: image_url !== undefined ? image_url : product.image_url,
        product_name: product_name !== undefined ? product_name : product.product_name,
        product_category_id: product_category_id !== undefined ? product_category_id : product.product_category_id,
        vendor_id: vendor_id !== undefined ? vendor_id : product.vendor_id,
        unit: unit !== undefined ? unit : product.unit,
        cost_price: cost_price !== undefined ? (Number(cost_price) || 0) : product.cost_price,
        sale_price: sale_price !== undefined ? (Number(sale_price) || 0) : product.sale_price,
        min_stock: min_stock !== undefined ? Number(min_stock) : product.min_stock,
        updated_at: db.fn.now()
      });

    return this.getProductById(schoolUnitId, id);
  }

  async updateStatus(schoolUnitId, id, payload) {
    const product = await this.getProductById(schoolUnitId, id);
    if (!product) return null;

    const { status, status_note = null } = payload;
    await db('vendor_products')
      .where({ id: product.id, school_unit_id: product.school_unit_id })
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

      const generatedBarcode = `899${product.school_unit_id.toString().padStart(2, '0')}${product.id.toString().padStart(7, '0')}`;
      await db('vendor_products')
        .where({ id: product.id, school_unit_id: product.school_unit_id })
        .update({ barcode: generatedBarcode, updated_at: db.fn.now() });

      return this.getProductById(schoolUnitId, product_id);
    } else {
      // Generate untuk semua produk yang belum punya barcode
      let q = db('vendor_products').whereNull('barcode');
      const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
      if (!isAll) {
        q = q.where({ school_unit_id: schoolUnitId });
      }
      const products = await q;

      for (const p of products) {
        const generated = `899${p.school_unit_id.toString().padStart(2, '0')}${p.id.toString().padStart(7, '0')}`;
        await db('vendor_products')
          .where({ id: p.id, school_unit_id: p.school_unit_id })
          .update({ barcode: generated, updated_at: db.fn.now() });
      }

      return { generated_count: products.length };
    }
  }

  async updateBarcode(schoolUnitId, id, barcode) {
    const product = await this.getProductById(schoolUnitId, id);
    if (!product) return null;

    await db('vendor_products')
      .where({ id: product.id, school_unit_id: product.school_unit_id })
      .update({ barcode, updated_at: db.fn.now() });

    return this.getProductById(schoolUnitId, id);
  }

  async getProductHistory(schoolUnitId, id) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';

    // 1. Ambil detail produk
    const product = await this.getProductById(schoolUnitId, id);
    if (!product) return null;

    // 2. Ambil riwayat penerimaan barang (goods_receipt_items join goods_receipts)
    let receiptQuery = db('goods_receipt_items')
      .join('goods_receipts', 'goods_receipt_items.goods_receipt_id', 'goods_receipts.id')
      .leftJoin('vendors', 'goods_receipts.vendor_id', 'vendors.id')
      .where('goods_receipt_items.vendor_product_id', id);

    if (!isAll) {
      receiptQuery = receiptQuery.where('goods_receipts.school_unit_id', schoolUnitId);
    }

    const receipts = await receiptQuery
      .select(
        'goods_receipt_items.id as item_id',
        'goods_receipt_items.goods_receipt_id',
        'goods_receipt_items.qty',
        'goods_receipt_items.cost_price',
        'goods_receipt_items.sale_price',
        'goods_receipt_items.batch_number',
        'goods_receipt_items.expired_at',
        'goods_receipt_items.created_at',
        'goods_receipts.invoice_number',
        'goods_receipts.receipt_date',
        'goods_receipts.receipt_type',
        'vendors.vendor_name as vendor_name'
      )
      .orderBy('goods_receipts.receipt_date', 'desc')
      .orderBy('goods_receipt_items.id', 'desc');

    // 3. Ambil riwayat penjualan (sales_transaction_items join sales_transactions)
    let salesQuery = db('sales_transaction_items')
      .join('sales_transactions', 'sales_transaction_items.sales_transaction_id', 'sales_transactions.id')
      .where('sales_transaction_items.vendor_product_id', id);

    if (!isAll) {
      salesQuery = salesQuery.where('sales_transactions.school_unit_id', schoolUnitId);
    }

    const sales = await salesQuery
      .select(
        'sales_transaction_items.id as item_id',
        'sales_transaction_items.sales_transaction_id',
        'sales_transaction_items.qty',
        'sales_transaction_items.cost_price',
        'sales_transaction_items.sale_price',
        'sales_transaction_items.subtotal_price',
        'sales_transaction_items.subtotal_cost',
        'sales_transactions.transaction_at',
        'sales_transactions.payment_method',
        'sales_transactions.buyer_type',
        'sales_transactions.buyer_name'
      )
      .orderBy('sales_transactions.transaction_at', 'desc')
      .orderBy('sales_transaction_items.id', 'desc');

    // 4. Ambil riwayat retur produk
    let returnsQuery = db('product_returns')
      .where('product_returns.vendor_product_id', id);

    if (!isAll) {
      returnsQuery = returnsQuery.where('product_returns.school_unit_id', schoolUnitId);
    }

    const returns = await returnsQuery
      .select(
        'product_returns.id as return_id',
        'product_returns.return_type',
        'product_returns.qty',
        'product_returns.note',
        'product_returns.returned_at',
        'product_returns.created_at'
      )
      .orderBy('product_returns.returned_at', 'desc')
      .orderBy('product_returns.id', 'desc');

    // 5. Hitung ringkasan statistik
    const totalReceivedQty = receipts.reduce((acc, r) => acc + Number(r.qty || 0), 0);
    const totalSoldQty = sales.reduce((acc, s) => acc + Number(s.qty || 0), 0);
    const totalReturnedQty = returns.reduce((acc, ret) => acc + Number(ret.qty || 0), 0);
    const totalSalesRevenue = sales.reduce((acc, s) => acc + Number(s.subtotal_price || 0), 0);

    // 6. Susun log mutasi harian gabungan (timeline)
    const timeline = [];

    receipts.forEach(r => {
      timeline.push({
        id: `rcv-${r.item_id}`,
        type: 'receipt',
        type_label: 'Penerimaan Barang',
        direction: 'in',
        date: r.receipt_date || r.created_at,
        qty: Number(r.qty),
        unit_price: Number(r.cost_price),
        ref_number: r.invoice_number || `#RCV-${r.goods_receipt_id}`,
        batch_number: r.batch_number || null,
        expired_at: r.expired_at || null,
        description: `Diterima dari ${r.vendor_name || 'Suplier'} (${r.receipt_type === 'titipan' ? 'Konsinyasi' : 'Belanja Mandiri'})`
      });
    });

    sales.forEach(s => {
      timeline.push({
        id: `sls-${s.item_id}`,
        type: 'sale',
        type_label: 'Penjualan Kasir POS',
        direction: 'out',
        date: s.transaction_at,
        qty: Number(s.qty),
        unit_price: Number(s.sale_price),
        ref_number: `#TRX-${s.sales_transaction_id}`,
        batch_number: null,
        expired_at: null,
        description: `Pembeli: ${s.buyer_name || (s.buyer_type === 'student' ? 'Siswa' : 'Umum')} (${(s.payment_method || '').toUpperCase()})`
      });
    });

    returns.forEach(ret => {
      timeline.push({
        id: `ret-${ret.return_id}`,
        type: 'return',
        type_label: 'Retur Produk',
        direction: 'out',
        date: ret.returned_at || ret.created_at,
        qty: Number(ret.qty),
        unit_price: Number(product.cost_price),
        ref_number: `#RET-${ret.return_id}`,
        batch_number: null,
        expired_at: null,
        description: `Retur jenis: ${ret.return_type === 'sisa' ? 'Sisa Titipan' : 'Barang Rusak/Kadaluarsa'}. ${ret.note ? `Catatan: ${ret.note}` : ''}`
      });
    });

    // Urutkan timeline dari terbaru ke terlama
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      product,
      summary: {
        current_stock: Number(product.current_stock || 0),
        min_stock: Number(product.min_stock || 0),
        total_received_qty: totalReceivedQty,
        total_sold_qty: totalSoldQty,
        total_returned_qty: totalReturnedQty,
        total_sales_revenue: totalSalesRevenue,
        calculated_stock: totalReceivedQty - totalSoldQty - totalReturnedQty
      },
      receipts,
      sales,
      returns,
      timeline
    };
  }
}

module.exports = new VendorProductsService();
