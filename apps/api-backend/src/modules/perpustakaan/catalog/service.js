/**
 * Catalog Service Implementation
 * Modul Perpustakaan: Katalog Buku & Bahan Pustaka, Eksemplar, dan Kategori
 */
const db = require('../../../config/db/perpustakaan');

class CatalogService {
  // ==========================================
  // KATEGORI BUKU (book_categories)
  // ==========================================

  async listCategories(query = {}) {
    let q = db('book_categories');
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('category_name', 'like', s)
          .orWhere('category_code', 'like', s);
      });
    }
    return q.orderBy('id', 'asc');
  }

  async getCategoryById(id) {
    const category = await db('book_categories').where({ id }).first();
    if (!category) {
      const err = new Error('Kategori buku tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return category;
  }

  async createCategory(data) {
    const existing = await db('book_categories')
      .where({ category_name: data.category_name })
      .first();

    if (existing) {
      const err = new Error('Nama kategori sudah digunakan');
      err.statusCode = 409;
      throw err;
    }

    const [id] = await db('book_categories').insert({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return this.getCategoryById(id);
  }

  async updateCategory(id, data) {
    await this.getCategoryById(id);

    if (data.category_name) {
      const conflict = await db('book_categories')
        .where({ category_name: data.category_name })
        .whereNot({ id })
        .first();

      if (conflict) {
        const err = new Error('Nama kategori sudah digunakan');
        err.statusCode = 409;
        throw err;
      }
    }

    await db('book_categories').where({ id }).update({
      ...data,
      updated_at: new Date(),
    });

    return this.getCategoryById(id);
  }

  async deleteCategory(id) {
    await this.getCategoryById(id);

    // Cek apakah masih dipakai oleh buku
    const bookUsing = await db('books').where({ category_id: id }).first();
    if (bookUsing) {
      const err = new Error('Kategori tidak dapat dihapus karena masih digunakan oleh koleksi buku');
      err.statusCode = 409;
      throw err;
    }

    await db('book_categories').where({ id }).del();
    return { message: 'Kategori buku berhasil dihapus' };
  }

  // ==========================================
  // KOLEKSI BUKU & PUSTAKA (books)
  // ==========================================

  async listBooks(schoolUnitId, query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 10));
    const offset = (page - 1) * perPage;

    let baseQuery = db('books as b')
      .leftJoin('book_categories as c', 'b.category_id', 'c.id')
      .where(function () {
        if (schoolUnitId) {
          this.where('b.satuan_pendidikan_id', schoolUnitId);
        }
      });

    if (query.category_id) {
      baseQuery = baseQuery.where('b.category_id', query.category_id);
    }
    if (query.material_type) {
      baseQuery = baseQuery.where('b.material_type', query.material_type);
    }
    if (query.status) {
      baseQuery = baseQuery.where('b.status', query.status);
    }
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where(function () {
        this.where('b.title', 'like', s)
          .orWhere('b.author', 'like', s)
          .orWhere('b.publisher', 'like', s)
          .orWhere('b.isbn', 'like', s);
      });
    }

    const [{ total }] = await baseQuery.clone().count({ total: '*' });

    const items = await baseQuery
      .select(
        'b.*',
        'c.category_name',
        'c.category_code'
      )
      .orderBy('b.id', 'desc')
      .limit(perPage)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        per_page: perPage,
        total: parseInt(total) || 0,
        total_pages: Math.ceil((total || 0) / perPage),
      },
    };
  }

  async getBookById(schoolUnitId, id) {
    let q = db('books as b')
      .leftJoin('book_categories as c', 'b.category_id', 'c.id')
      .where('b.id', id);

    if (schoolUnitId) {
      q = q.where('b.satuan_pendidikan_id', schoolUnitId);
    }

    const book = await q
      .select(
        'b.*',
        'c.category_name',
        'c.category_code'
      )
      .first();

    if (!book) {
      const err = new Error('Koleksi buku tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Ambil rekap ketersediaan eksemplar
    const copies = await db('book_copies').where({ book_id: id });
    const availableCopies = copies.filter(c => c.circulation_status === 'available' && c.condition_status === 'good').length;

    return {
      ...book,
      available_copies: availableCopies,
      copies,
    };
  }

  async createBook(schoolUnitId, data) {
    const payload = {
      ...data,
      satuan_pendidikan_id: data.satuan_pendidikan_id || schoolUnitId || 1,
      total_copies: data.total_copies || 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (payload.category_id) {
      await this.getCategoryById(payload.category_id);
    }

    const [id] = await db('books').insert(payload);

    return this.getBookById(payload.satuan_pendidikan_id, id);
  }

  async updateBook(schoolUnitId, id, data) {
    await this.getBookById(schoolUnitId, id);

    if (data.category_id) {
      await this.getCategoryById(data.category_id);
    }

    let q = db('books').where({ id });
    if (schoolUnitId) {
      q = q.where({ satuan_pendidikan_id: schoolUnitId });
    }

    await q.update({
      ...data,
      updated_at: new Date(),
    });

    return this.getBookById(schoolUnitId, id);
  }

  async deleteBook(schoolUnitId, id) {
    const book = await this.getBookById(schoolUnitId, id);

    // Cek apakah ada eksemplar yang sedang dipinjam
    const borrowedCopy = await db('book_copies as bc')
      .join('book_loans as bl', 'bc.id', 'bl.book_copy_id')
      .where('bc.book_id', id)
      .whereIn('bl.loan_status', ['borrowed', 'overdue'])
      .first();

    if (borrowedCopy) {
      const err = new Error('Koleksi tidak dapat dihapus karena ada eksemplar yang sedang dalam masa peminjaman');
      err.statusCode = 409;
      throw err;
    }

    // Soft delete lewat status = 'inactive'
    let q = db('books').where({ id });
    if (schoolUnitId) {
      q = q.where({ satuan_pendidikan_id: schoolUnitId });
    }

    await q.update({
      status: 'inactive',
      updated_at: new Date(),
    });

    return { message: 'Koleksi buku berhasil dinonaktifkan' };
  }

  // ==========================================
  // EKSEMPLAR BUKU (book_copies)
  // ==========================================

  async listBookCopies(schoolUnitId, bookId) {
    await this.getBookById(schoolUnitId, bookId);

    const copies = await db('book_copies')
      .where({ book_id: bookId })
      .orderBy('id', 'asc');

    return copies;
  }

  async createBookCopy(schoolUnitId, bookId, data) {
    const book = await this.getBookById(schoolUnitId, bookId);

    // Generate copy code jika tidak diberikan
    let copyCode = data.copy_code;
    if (!copyCode) {
      const count = await db('book_copies').where({ book_id: bookId }).count({ total: '*' });
      const nextNum = (count[0]?.total || 0) + 1;
      const prefix = (book.title || 'B').slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
      copyCode = `${prefix}-${bookId.toString().padStart(3, '0')}-${nextNum.toString().padStart(3, '0')}`;
    } else {
      const existing = await db('book_copies').where({ copy_code: copyCode }).first();
      if (existing) {
        const err = new Error(`Kode eksemplar '${copyCode}' sudah digunakan`);
        err.statusCode = 409;
        throw err;
      }
    }

    const [id] = await db('book_copies').insert({
      book_id: bookId,
      copy_code: copyCode,
      condition_status: data.condition_status || 'good',
      circulation_status: data.circulation_status || 'available',
      shelf_location: data.shelf_location || book.shelf_location || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Update total_copies pada tabel books
    const [{ totalCopies }] = await db('book_copies')
      .where({ book_id: bookId })
      .count({ totalCopies: '*' });

    await db('books').where({ id: bookId }).update({
      total_copies: parseInt(totalCopies) || 0,
      updated_at: new Date(),
    });

    return db('book_copies').where({ id }).first();
  }
}

module.exports = new CatalogService();
