/**
 * Sales Transactions Service
 * Sesuai api-contract-kantin.md Modul 6 & erd-kantin.md §2.12–2.13
 */
const bcrypt = require('bcryptjs');
const db = require('../../../config/db/kantin');
const canteenStudentsService = require('../canteen-students/service');
const dailySpendingLimitsService = require('../daily-spending-limits/service');

class SalesTransactionsService {
  async listTransactions(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('sales_transactions')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id');

    if (!isAll) {
      q = q.where('sales_transactions.school_unit_id', schoolUnitId);
    }

    q = q.select(
      'sales_transactions.*',
      'canteen_students.student_id',
      'canteen_students.cached_student_name as student_name',
      'canteen_students.cached_class_group_name as class_group_name',
      'canteen_students.qr_code as student_qr_code'
    );

    if (query.buyer_type) {
      q = q.where('sales_transactions.buyer_type', query.buyer_type);
    }
    if (query.payment_method) {
      q = q.where('sales_transactions.payment_method', query.payment_method);
    }
    if (query.cashier_id) {
      q = q.where('sales_transactions.cashier_id', query.cashier_id);
    }
    if (query.status) {
      q = q.where('sales_transactions.status', query.status);
    }
    if (query.date_from) {
      q = q.where('sales_transactions.transaction_at', '>=', query.date_from);
    }
    if (query.date_to) {
      // Jika date_to hanya YYYY-MM-DD, tambahkan akhir hari
      const toVal = query.date_to.length === 10 ? `${query.date_to} 23:59:59` : query.date_to;
      q = q.where('sales_transactions.transaction_at', '<=', toVal);
    }
    if (query.search) {
      const term = `%${query.search}%`;
      q = q.where((builder) => {
        builder
          .where('sales_transactions.id', 'like', term)
          .orWhere('sales_transactions.buyer_name', 'like', term)
          .orWhere('sales_transactions.cashier_name', 'like', term)
          .orWhere('canteen_students.cached_student_name', 'like', term)
          .orWhere('canteen_students.qr_code', 'like', term);
      });
    }

    const txs = await q.orderBy('sales_transactions.transaction_at', 'desc').orderBy('sales_transactions.id', 'desc');

    const txIds = txs.map(t => t.id);
    const items = txIds.length > 0
      ? await db('sales_transaction_items')
          .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
          .leftJoin('goods_receipts', 'sales_transaction_items.goods_receipt_id', 'goods_receipts.id')
          .whereIn('sales_transaction_items.sales_transaction_id', txIds)
          .select(
            'sales_transaction_items.*',
            'vendor_products.product_name',
            'vendor_products.unit',
            'goods_receipts.receipt_date',
            'goods_receipts.invoice_number'
          )
      : [];

    return txs.map(t => ({
      ...t,
      items: items.filter(it => it.sales_transaction_id === t.id)
    }));
  }

  async getTransactionById(schoolUnitId, id) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('sales_transactions')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id')
      .where({ 'sales_transactions.id': id });

    if (!isAll) {
      q = q.where({ 'sales_transactions.school_unit_id': schoolUnitId });
    }

    const tx = await q.select(
      'sales_transactions.*',
      'canteen_students.student_id',
      'canteen_students.cached_student_name as student_name',
      'canteen_students.cached_class_group_name as class_group_name',
      'canteen_students.qr_code as student_qr_code',
      'canteen_students.wallet_balance as current_student_wallet_balance'
    ).first();

    if (!tx) return null;

    const items = await db('sales_transaction_items')
      .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
      .leftJoin('goods_receipts', 'sales_transaction_items.goods_receipt_id', 'goods_receipts.id')
      .where({ 'sales_transaction_items.sales_transaction_id': id })
      .select(
        'sales_transaction_items.*',
        'vendor_products.product_name',
        'vendor_products.unit',
        'goods_receipts.receipt_date',
        'goods_receipts.invoice_number'
      );

    const revisions = await this.getRevisionHistory(schoolUnitId, id);

    return {
      ...tx,
      items,
      revisions
    };
  }

  /**
   * Implementasi POS Kasir Transaksi Penjualan
   */
  async createTransaction(schoolUnitId, payload, user) {
    const {
      buyer_type = 'student',
      student_id = null,
      child_pin = null,
      buyer_name = null,
      payment_method = 'wallet',
      discount_amount = 0,
      items = []
    } = payload;

    const cashierId = user?.id || payload.cashier_id || 1;
    const cashierName = user?.full_name || user?.name || user?.username || payload.cashier_name || 'Kasir';

    if (!items || items.length === 0) {
      const err = new Error('Daftar item belanja tidak boleh kosong');
      err.statusCode = 422;
      throw err;
    }

    let canteenStudent = null;

    // =========================================================================
    // 1. Validasi Santri & PIN Anak (child_pin)
    // =========================================================================
    if (buyer_type === 'student') {
      if (!student_id) {
        const err = new Error('student_id wajib diisi untuk transaksi santri');
        err.statusCode = 422;
        throw err;
      }

      canteenStudent = await canteenStudentsService.ensureCanteenStudentRecord(schoolUnitId, student_id);

      // Cek apakah akun jajan diblokir oleh orangtua
      if (canteenStudent.is_blocked_by_parent) {
        const err = new Error('Transaksi ditolak: Akun jajan santri sedang diblokir oleh orangtua');
        err.statusCode = 403;
        throw err;
      }

      // Validasi PIN anak jika pembayaran via dompet (wallet)
      if (payment_method === 'wallet') {
        if (!child_pin) {
          const err = new Error('PIN anak wajib disertakan untuk transaksi menggunakan dompet');
          err.statusCode = 403;
          throw err;
        }

        const pinHash = canteenStudent.child_pin_hash || (await bcrypt.hash('123456', 10));
        const isMatch = await bcrypt.compare(String(child_pin), pinHash);
        if (!isMatch) {
          const err = new Error('PIN anak tidak valid');
          err.statusCode = 403;
          throw err;
        }
      }
    }

    // =========================================================================
    // 2. Hitung Item, Cek Stok, & Snapshot Harga FIFO (goods_receipt_items)
    // =========================================================================
    const isAllUnit = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let totalGross = 0;
    const resolvedItems = [];

    for (const item of items) {
      let prodQuery = db('vendor_products').where({ id: item.vendor_product_id });
      if (!isAllUnit) {
        prodQuery = prodQuery.where({ school_unit_id: schoolUnitId });
      }
      const product = await prodQuery.first();

      if (!product) {
        const err = new Error(`Produk ID ${item.vendor_product_id} tidak ditemukan`);
        err.statusCode = 404;
        throw err;
      }

      const qty = Number(item.qty);
      if (qty <= 0) {
        const err = new Error(`Qty untuk produk ${product.product_name} harus lebih dari 0`);
        err.statusCode = 422;
        throw err;
      }

      if (product.current_stock < qty) {
        const err = new Error(`Stok tidak mencukupi untuk produk ${product.product_name} (Sisa stok: ${product.current_stock})`);
        err.statusCode = 400;
        throw err;
      }

      // Ambil receiptItem spesifik atau prioritaskan FEFO
      let receiptItem = null;
      if (item.goods_receipt_item_id) {
        receiptItem = await db('goods_receipt_items')
          .join('goods_receipts', 'goods_receipt_items.goods_receipt_id', 'goods_receipts.id')
          .where({ 'goods_receipt_items.id': item.goods_receipt_item_id })
          .select('goods_receipt_items.*', 'goods_receipts.receipt_date', 'goods_receipts.invoice_number')
          .first();
      }

      if (!receiptItem) {
        receiptItem = await db('goods_receipt_items')
          .join('goods_receipts', 'goods_receipt_items.goods_receipt_id', 'goods_receipts.id')
          .where({ 'goods_receipt_items.vendor_product_id': product.id })
          .orderByRaw('goods_receipt_items.expired_at IS NULL, goods_receipt_items.expired_at ASC, goods_receipts.receipt_date ASC, goods_receipt_items.id ASC')
          .select('goods_receipt_items.*', 'goods_receipts.receipt_date', 'goods_receipts.invoice_number')
          .first();
      }

      const costPrice = (item.cost_price !== undefined && item.cost_price !== null)
        ? parseFloat(item.cost_price)
        : (receiptItem ? parseFloat(receiptItem.cost_price) : (parseFloat(product.cost_price) || 0));

      const salePrice = (item.sale_price !== undefined && item.sale_price !== null)
        ? parseFloat(item.sale_price)
        : (receiptItem ? parseFloat(receiptItem.sale_price) : (parseFloat(product.sale_price) || 0));

      const subtotalPrice = qty * salePrice;
      const subtotalCost = qty * costPrice;

      totalGross += subtotalPrice;
      resolvedItems.push({
        vendor_product_id: product.id,
        school_unit_id: product.school_unit_id,
        goods_receipt_id: item.goods_receipt_id || receiptItem?.goods_receipt_id || null,
        goods_receipt_item_id: item.goods_receipt_item_id || receiptItem?.id || null,
        batch_number: item.batch_number || receiptItem?.batch_number || null,
        expired_at: item.expired_at || receiptItem?.expired_at || null,
        qty,
        cost_price: costPrice,
        sale_price: salePrice,
        subtotal_cost: subtotalCost,
        subtotal_price: subtotalPrice
      });
    }

    const discount = parseFloat(discount_amount) || 0;
    const finalTotal = Math.max(0, totalGross - discount);

    const effectiveSchoolUnitId = !isAllUnit && schoolUnitId
      ? Number(schoolUnitId)
      : (canteenStudent?.school_unit_id || resolvedItems[0]?.school_unit_id || user?.school_unit_id || 1);

    // =========================================================================
    // 3. Validasi Limit Jajan Harian
    // =========================================================================
    if (buyer_type === 'student' && canteenStudent) {
      const activeAdminLimit = await dailySpendingLimitsService.getActiveLimit(effectiveSchoolUnitId);
      const adminLimitVal = activeAdminLimit ? parseFloat(activeAdminLimit.limit_amount) : null;
      const customLimitVal = canteenStudent.custom_daily_limit !== null && canteenStudent.custom_daily_limit !== undefined
        ? parseFloat(canteenStudent.custom_daily_limit)
        : null;

      let effectiveLimit = null;
      if (adminLimitVal !== null && customLimitVal !== null) {
        effectiveLimit = Math.min(adminLimitVal, customLimitVal);
      } else if (adminLimitVal !== null) {
        effectiveLimit = adminLimitVal;
      } else if (customLimitVal !== null) {
        effectiveLimit = customLimitVal;
      }

      if (effectiveLimit !== null) {
        const today = new Date().toISOString().slice(0, 10);
        const spentRow = await db('sales_transactions')
          .where({
            canteen_student_id: canteenStudent.id
          })
          .where(function() {
            this.whereNull('status').orWhere('status', '!=', 'void');
          })
          .whereRaw('DATE(transaction_at) = ?', [today])
          .sum('total_amount as total_spent')
          .first();

        const todaySpent = spentRow?.total_spent ? parseFloat(spentRow.total_spent) : 0;
        if (todaySpent + finalTotal > effectiveLimit) {
          const remainingLimit = Math.max(0, effectiveLimit - todaySpent);
          const err = new Error(`Transaksi melebihi limit jajan harian santri (Limit: Rp${effectiveLimit.toLocaleString('id-ID')}, Terpakai hari ini: Rp${todaySpent.toLocaleString('id-ID')}, Sisa kuota: Rp${remainingLimit.toLocaleString('id-ID')})`);
          err.statusCode = 403;
          err.errors = [{
            field: 'amount',
            message: `Sisa kuota jajan hari ini Rp${remainingLimit.toLocaleString('id-ID')}`
          }];
          throw err;
        }
      }

      // =========================================================================
      // 4. Validasi Saldo Dompet (Wallet Balance)
      // =========================================================================
      if (payment_method === 'wallet') {
        const currentBalance = parseFloat(canteenStudent.wallet_balance);
        if (currentBalance < finalTotal) {
          const err = new Error('Saldo dompet santri tidak mencukupi untuk transaksi ini');
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // =========================================================================
    // 5. Eksekusi Database Transaction Atomik
    // =========================================================================
    let salesTxId = null;
    let walletBalanceAfter = null;
    const nowIso = new Date().toISOString();

    await db.transaction(async (trx) => {
      // 5.1 Insert Header sales_transactions
      const [newSalesTxId] = await trx('sales_transactions').insert({
        school_unit_id: effectiveSchoolUnitId,
        buyer_type,
        canteen_student_id: canteenStudent ? canteenStudent.id : null,
        buyer_name: buyer_type === 'non_student' ? buyer_name : null,
        payment_method,
        discount_amount: discount,
        total_amount: finalTotal,
        cashier_id: cashierId,
        cashier_name: cashierName,
        status: 'completed',
        transaction_at: trx.fn.now()
      });
      salesTxId = newSalesTxId;

      // 5.2 Insert Detail sales_transaction_items & Kurangi current_stock
      for (const item of resolvedItems) {
        await trx('sales_transaction_items').insert({
          sales_transaction_id: salesTxId,
          vendor_product_id: item.vendor_product_id,
          goods_receipt_id: item.goods_receipt_id,
          goods_receipt_item_id: item.goods_receipt_item_id,
          batch_number: item.batch_number,
          expired_at: item.expired_at,
          qty: item.qty,
          cost_price: item.cost_price,
          sale_price: item.sale_price,
          subtotal_cost: item.subtotal_cost,
          subtotal_price: item.subtotal_price
        });

        await trx('vendor_products')
          .where({ id: item.vendor_product_id })
          .decrement('current_stock', item.qty);
      }

      // 5.3 Kurangi Saldo & Catat wallet_transactions (jika payment_method = wallet)
      if (buyer_type === 'student' && canteenStudent && payment_method === 'wallet') {
        const currentBalance = parseFloat(canteenStudent.wallet_balance);
        walletBalanceAfter = currentBalance - finalTotal;

        await trx('canteen_students')
          .where({ id: canteenStudent.id })
          .update({
            wallet_balance: walletBalanceAfter,
            updated_at: trx.fn.now()
          });

        await trx('wallet_transactions').insert({
          school_unit_id: effectiveSchoolUnitId,
          canteen_student_id: canteenStudent.id,
          transaction_type: 'purchase',
          amount: finalTotal,
          balance_after: walletBalanceAfter,
          payment_method: 'wallet',
          sales_transaction_id: salesTxId,
          processed_by: cashierId,
          occurred_at: trx.fn.now()
        });

        // 5.4 Publish Webhook kantin.spending.recorded
        await trx('canteen_webhook_events').insert({
          event_type: 'kantin.spending.recorded',
          school_unit_id: effectiveSchoolUnitId,
          payload: JSON.stringify({
            event_type: 'kantin.spending.recorded',
            timestamp: nowIso,
            satuan_pendidikan_id: effectiveSchoolUnitId,
            data: {
              sales_transaction_id: salesTxId,
              student_id: Number(student_id),
              total_amount: finalTotal,
              payment_method: 'wallet',
              wallet_balance_after: walletBalanceAfter,
              transaction_at: nowIso
            }
          })
        });
      }
    });

    return {
      sales_transaction_id: salesTxId,
      total_amount: finalTotal,
      payment_method,
      cashier_id: cashierId,
      cashier_name: cashierName,
      wallet_balance_after: walletBalanceAfter
    };
  }

  /**
   * Revisi Transaksi POS Penjualan dengan Catatan Alasan & Audit Log
   */
  async reviseTransaction(schoolUnitId, id, payload, user) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const {
      revision_reason,
      items = [],
      discount_amount = 0,
      payment_method,
      buyer_name
    } = payload;

    if (!revision_reason || typeof revision_reason !== 'string' || revision_reason.trim().length < 3) {
      const err = new Error('Catatan / alasan revisi wajib diisi (minimal 3 karakter)');
      err.statusCode = 422;
      throw err;
    }

    if (!items || items.length === 0) {
      const err = new Error('Daftar item belanja tidak boleh kosong');
      err.statusCode = 422;
      throw err;
    }

    // Ambil data transaksi lama
    let txQuery = db('sales_transactions').where({ id });
    if (!isAll) {
      txQuery = txQuery.where({ school_unit_id: schoolUnitId });
    }
    const oldTx = await txQuery.first();
    if (!oldTx) {
      const err = new Error('Transaksi penjualan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (oldTx.status === 'void') {
      const err = new Error('Transaksi yang sudah dibatalkan / void tidak dapat direvisi');
      err.statusCode = 400;
      throw err;
    }

    const txSchoolUnitId = oldTx.school_unit_id;
    const oldItems = await db('sales_transaction_items')
      .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
      .where({ sales_transaction_id: id })
      .select('sales_transaction_items.*', 'vendor_products.product_name');

    let canteenStudent = null;
    if (oldTx.buyer_type === 'student' && oldTx.canteen_student_id) {
      canteenStudent = await db('canteen_students').where({ id: oldTx.canteen_student_id }).first();
    }

    // Hitung item baru & snapshot harga
    let totalGross = 0;
    const resolvedItems = [];

    for (const item of items) {
      let prodQuery = db('vendor_products').where({ id: item.vendor_product_id });
      if (txSchoolUnitId && txSchoolUnitId !== 'all' && txSchoolUnitId !== 'foundation') {
        prodQuery = prodQuery.where({ school_unit_id: txSchoolUnitId });
      }
      const product = await prodQuery.first();

      if (!product) {
        const err = new Error(`Produk ID ${item.vendor_product_id} tidak ditemukan`);
        err.statusCode = 404;
        throw err;
      }

      const qty = Number(item.qty);
      if (qty <= 0) {
        const err = new Error(`Qty untuk produk ${product.product_name} harus lebih dari 0`);
        err.statusCode = 422;
        throw err;
      }

      // Hitung stok efektif dengan memperhitungkan kembalian dari transaksi lama
      const oldItemMatch = oldItems.find(it => it.vendor_product_id === product.id);
      const oldQty = oldItemMatch ? Number(oldItemMatch.qty) : 0;
      const availableStock = product.current_stock + oldQty;

      if (availableStock < qty) {
        const err = new Error(`Stok tidak mencukupi untuk produk ${product.product_name} (Tersedia: ${availableStock})`);
        err.statusCode = 400;
        throw err;
      }

      let receiptItem = null;
      if (item.goods_receipt_item_id) {
        receiptItem = await db('goods_receipt_items')
          .join('goods_receipts', 'goods_receipt_items.goods_receipt_id', 'goods_receipts.id')
          .where({ 'goods_receipt_items.id': item.goods_receipt_item_id })
          .select('goods_receipt_items.*', 'goods_receipts.receipt_date', 'goods_receipts.invoice_number')
          .first();
      }

      if (!receiptItem) {
        receiptItem = await db('goods_receipt_items')
          .join('goods_receipts', 'goods_receipt_items.goods_receipt_id', 'goods_receipts.id')
          .where({ 'goods_receipt_items.vendor_product_id': product.id })
          .orderByRaw('goods_receipt_items.expired_at IS NULL, goods_receipt_items.expired_at ASC, goods_receipts.receipt_date ASC, goods_receipt_items.id ASC')
          .select('goods_receipt_items.*', 'goods_receipts.receipt_date', 'goods_receipts.invoice_number')
          .first();
      }

      const costPrice = (item.cost_price !== undefined && item.cost_price !== null)
        ? parseFloat(item.cost_price)
        : (receiptItem ? parseFloat(receiptItem.cost_price) : (parseFloat(product.cost_price) || 0));

      const salePrice = (item.sale_price !== undefined && item.sale_price !== null)
        ? parseFloat(item.sale_price)
        : (receiptItem ? parseFloat(receiptItem.sale_price) : (parseFloat(product.sale_price) || 0));

      const subtotalPrice = qty * salePrice;
      const subtotalCost = qty * costPrice;

      totalGross += subtotalPrice;
      resolvedItems.push({
        vendor_product_id: product.id,
        product_name: product.product_name,
        goods_receipt_id: item.goods_receipt_id || receiptItem?.goods_receipt_id || null,
        goods_receipt_item_id: item.goods_receipt_item_id || receiptItem?.id || null,
        batch_number: item.batch_number || receiptItem?.batch_number || null,
        expired_at: item.expired_at || receiptItem?.expired_at || null,
        qty,
        cost_price: costPrice,
        sale_price: salePrice,
        subtotal_cost: subtotalCost,
        subtotal_price: subtotalPrice
      });
    }

    const discount = parseFloat(discount_amount) || 0;
    const finalTotal = Math.max(0, totalGross - discount);
    const resolvedPaymentMethod = paymentMethod || oldTx.payment_method;
    const resolvedBuyerName = buyer_name !== undefined ? buyer_name : oldTx.buyer_name;

    // Jika pembayaran via wallet untuk santri, hitung selisih saldo
    let walletDiff = 0;
    let newWalletBalance = null;
    if (oldTx.buyer_type === 'student' && canteenStudent && resolvedPaymentMethod === 'wallet') {
      const oldTotal = parseFloat(oldTx.total_amount) || 0;
      walletDiff = finalTotal - oldTotal; // positif = santri bayar lebih; negatif = kembalian ke dompet
      const currentBalance = parseFloat(canteenStudent.wallet_balance) || 0;

      if (walletDiff > 0 && currentBalance < walletDiff) {
        const err = new Error(`Saldo dompet santri tidak mencukupi untuk selisih tagihan revisi sebesar Rp${walletDiff.toLocaleString('id-ID')}`);
        err.statusCode = 400;
        throw err;
      }
      newWalletBalance = currentBalance - walletDiff;
    }

    const revisedByName = user?.full_name || user?.name || user?.username || 'Petugas Revisi';
    const revisedById = user?.id || 1;

    // Database atomic transaction
    await db.transaction(async (trx) => {
      // 1. Kembalikan stok item lama
      for (const oldIt of oldItems) {
        await trx('vendor_products')
          .where({ id: oldIt.vendor_product_id })
          .increment('current_stock', oldIt.qty);
      }

      // 2. Kurangi stok item baru
      for (const newIt of resolvedItems) {
        await trx('vendor_products')
          .where({ id: newIt.vendor_product_id })
          .decrement('current_stock', newIt.qty);
      }

      // 3. Hapus item lama dan simpan item baru
      await trx('sales_transaction_items').where({ sales_transaction_id: id }).delete();

      for (const newIt of resolvedItems) {
        await trx('sales_transaction_items').insert({
          sales_transaction_id: id,
          vendor_product_id: newIt.vendor_product_id,
          goods_receipt_id: newIt.goods_receipt_id,
          goods_receipt_item_id: newIt.goods_receipt_item_id,
          batch_number: newIt.batch_number,
          expired_at: newIt.expired_at,
          qty: newIt.qty,
          cost_price: newIt.cost_price,
          sale_price: newIt.sale_price,
          subtotal_cost: newIt.subtotal_cost,
          subtotal_price: newIt.subtotal_price
        });
      }

      // 4. Update saldo dompet jika berlaku
      if (newWalletBalance !== null && canteenStudent) {
        await trx('canteen_students')
          .where({ id: canteenStudent.id })
          .update({
            wallet_balance: newWalletBalance,
            updated_at: trx.fn.now()
          });

        if (walletDiff !== 0) {
          await trx('wallet_transactions').insert({
            school_unit_id: txSchoolUnitId,
            canteen_student_id: canteenStudent.id,
            transaction_type: 'adjustment',
            amount: Math.abs(walletDiff),
            balance_after: newWalletBalance,
            payment_method: 'wallet',
            sales_transaction_id: id,
            processed_by: revisedById,
            notes: `Penyesuaian revisi transaksi POS #${id}: ${revision_reason.trim()}`,
            occurred_at: trx.fn.now()
          });
        }
      }

      // 5. Catat audit riwayat revisi
      const previousData = {
        total_amount: parseFloat(oldTx.total_amount),
        discount_amount: parseFloat(oldTx.discount_amount),
        payment_method: oldTx.payment_method,
        buyer_name: oldTx.buyer_name,
        items: oldItems.map(it => ({
          vendor_product_id: it.vendor_product_id,
          product_name: it.product_name,
          qty: it.qty,
          sale_price: parseFloat(it.sale_price),
          subtotal_price: parseFloat(it.subtotal_price)
        }))
      };

      const newData = {
        total_amount: finalTotal,
        discount_amount: discount,
        payment_method: resolvedPaymentMethod,
        buyer_name: resolvedBuyerName,
        items: resolvedItems.map(it => ({
          vendor_product_id: it.vendor_product_id,
          product_name: it.product_name,
          qty: it.qty,
          sale_price: it.sale_price,
          subtotal_price: it.subtotal_price
        }))
      };

      await trx('sales_transaction_revisions').insert({
        school_unit_id: txSchoolUnitId,
        sales_transaction_id: id,
        revised_by: revisedById,
        revised_by_name: revisedByName,
        revision_reason: revision_reason.trim(),
        previous_data: JSON.stringify(previousData),
        new_data: JSON.stringify(newData)
      });

      // 6. Update header sales_transactions
      await trx('sales_transactions')
        .where({ id })
        .update({
          payment_method: resolvedPaymentMethod,
          buyer_name: resolvedBuyerName,
          discount_amount: discount,
          total_amount: finalTotal,
          is_revised: true,
          revision_count: (oldTx.revision_count || 0) + 1,
          last_revised_at: trx.fn.now(),
          status: 'revised',
          updated_at: trx.fn.now()
        });
    });

    return await this.getTransactionById(schoolUnitId, id);
  }

  async getRevisionHistory(schoolUnitId, id) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('sales_transaction_revisions').where({ sales_transaction_id: id });
    if (!isAll) {
      q = q.where({ school_unit_id: schoolUnitId });
    }
    const rows = await q.orderBy('created_at', 'desc').orderBy('id', 'desc');
    return rows.map(r => ({
      ...r,
      previous_data: typeof r.previous_data === 'string' ? JSON.parse(r.previous_data) : r.previous_data,
      new_data: typeof r.new_data === 'string' ? JSON.parse(r.new_data) : r.new_data
    }));
  }
}

module.exports = new SalesTransactionsService();
