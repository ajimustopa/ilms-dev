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
    let q = db('sales_transactions')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id')
      .where('sales_transactions.school_unit_id', schoolUnitId)
      .select(
        'sales_transactions.*',
        'canteen_students.student_id',
        'canteen_students.cached_student_name as student_name',
        'canteen_students.cached_class_group_name as class_group_name'
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
    if (query.date_from) {
      q = q.where('sales_transactions.transaction_at', '>=', query.date_from);
    }
    if (query.date_to) {
      q = q.where('sales_transactions.transaction_at', '<=', query.date_to);
    }

    const txs = await q.orderBy('sales_transactions.transaction_at', 'desc').orderBy('sales_transactions.id', 'desc');

    const txIds = txs.map(t => t.id);
    const items = txIds.length > 0
      ? await db('sales_transaction_items')
          .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
          .whereIn('sales_transaction_items.sales_transaction_id', txIds)
          .select(
            'sales_transaction_items.*',
            'vendor_products.product_name',
            'vendor_products.unit'
          )
      : [];

    return txs.map(t => ({
      ...t,
      items: items.filter(it => it.sales_transaction_id === t.id)
    }));
  }

  async getTransactionById(schoolUnitId, id) {
    const tx = await db('sales_transactions')
      .leftJoin('canteen_students', 'sales_transactions.canteen_student_id', 'canteen_students.id')
      .where({ 'sales_transactions.id': id, 'sales_transactions.school_unit_id': schoolUnitId })
      .select(
        'sales_transactions.*',
        'canteen_students.student_id',
        'canteen_students.cached_student_name as student_name',
        'canteen_students.cached_class_group_name as class_group_name'
      )
      .first();

    if (!tx) return null;

    const items = await db('sales_transaction_items')
      .join('vendor_products', 'sales_transaction_items.vendor_product_id', 'vendor_products.id')
      .where({ 'sales_transaction_items.sales_transaction_id': id })
      .select(
        'sales_transaction_items.*',
        'vendor_products.product_name',
        'vendor_products.unit'
      );

    return {
      ...tx,
      items
    };
  }

  /**
   * Implementasi POS Kasir Transaksi Penjualan
   * Langkah:
   * 1. Validasi PIN anak jika payment_method = wallet & buyer_type = student
   * 2. Hitung limit efektif = MIN(adminLimit, customLimit) & cek status blokir orangtua
   * 3. Hitung total_amount, validasi current_stock & snapshot harga FIFO dari goods_receipt_items
   * 4. Validasi sisa limit harian dan kecukupan saldo dompet
   * 5. Eksekusi database transaction atomik (Knex .transaction())
   * 6. Simpan sales_transactions, sales_transaction_items, kurangi saldo & stok, catat wallet_transactions
   * 7. Publish webhook event kantin.spending.recorded
   */
  async createTransaction(schoolUnitId, payload, cashierId) {
    const {
      buyer_type = 'student',
      student_id = null,
      child_pin = null,
      buyer_name = null,
      payment_method = 'wallet',
      discount_amount = 0,
      items = []
    } = payload;

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
    let totalGross = 0;
    const resolvedItems = [];

    for (const item of items) {
      const product = await db('vendor_products')
        .where({ id: item.vendor_product_id, school_unit_id: schoolUnitId })
        .first();

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

      // Snapshot harga beli & jual dari goods_receipt_items terbaru berdasarkan expired_at (FIFO)
      const receiptItem = await db('goods_receipt_items')
        .where({ vendor_product_id: product.id })
        .orderByRaw('expired_at ASC, id DESC')
        .first();

      const costPrice = receiptItem ? parseFloat(receiptItem.cost_price) : 0;
      const salePrice = receiptItem ? parseFloat(receiptItem.sale_price) : 5000;
      const subtotalPrice = qty * salePrice;
      const subtotalCost = qty * costPrice;

      totalGross += subtotalPrice;
      resolvedItems.push({
        vendor_product_id: product.id,
        qty,
        cost_price: costPrice,
        sale_price: salePrice,
        subtotal_cost: subtotalCost,
        subtotal_price: subtotalPrice
      });
    }

    const discount = parseFloat(discount_amount) || 0;
    const finalTotal = Math.max(0, totalGross - discount);

    // =========================================================================
    // 3. Validasi Limit Jajan Harian: MIN(limit admin, limit custom ortu)
    // =========================================================================
    if (buyer_type === 'student' && canteenStudent) {
      const activeAdminLimit = await dailySpendingLimitsService.getActiveLimit(schoolUnitId);
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
            school_unit_id: schoolUnitId,
            canteen_student_id: canteenStudent.id
          })
          .whereRaw('DATE(transaction_at) = ?', [today])
          .sum('total_amount as total_spent')
          .first();

        const todaySpent = spentRow?.total_spent ? parseFloat(spentRow.total_spent) : 0;
        if (todaySpent + finalTotal > effectiveLimit) {
          const remainingLimit = Math.max(0, effectiveLimit - todaySpent);
          const err = new Error('Transaksi melebihi limit jajan harian');
          err.statusCode = 403;
          err.errors = [{
            field: 'amount',
            message: `Sisa limit hari ini Rp${remainingLimit.toLocaleString('id-ID')}`
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
    // 5-7. Eksekusi Database Transaction Atomik (Knex Transaction)
    // =========================================================================
    let salesTxId = null;
    let walletBalanceAfter = null;
    const nowIso = new Date().toISOString();

    await db.transaction(async (trx) => {
      // 5.1 Insert Header sales_transactions
      const [newSalesTxId] = await trx('sales_transactions').insert({
        school_unit_id: schoolUnitId,
        buyer_type,
        canteen_student_id: canteenStudent ? canteenStudent.id : null,
        buyer_name: buyer_type === 'non_student' ? buyer_name : null,
        payment_method,
        discount_amount: discount,
        total_amount: finalTotal,
        cashier_id: cashierId,
        transaction_at: trx.fn.now()
      });
      salesTxId = newSalesTxId;

      // 5.2 Insert Detail sales_transaction_items & Kurangi current_stock
      for (const item of resolvedItems) {
        await trx('sales_transaction_items').insert({
          sales_transaction_id: salesTxId,
          vendor_product_id: item.vendor_product_id,
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
          school_unit_id: schoolUnitId,
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
          school_unit_id: schoolUnitId,
          payload: JSON.stringify({
            event_type: 'kantin.spending.recorded',
            timestamp: nowIso,
            satuan_pendidikan_id: schoolUnitId,
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
      wallet_balance_after: walletBalanceAfter
    };
  }
}

module.exports = new SalesTransactionsService();
