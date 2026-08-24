/**
 * OPAC Service Implementation
 * Modul Perpustakaan: Online Public Access Catalog (OPAC) - Fitur #169
 * Akses Publik tanpa autentikasi JWT
 */
const db = require('../../../config/db/perpustakaan');

class OpacService {
  async searchPublicCatalog(query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 12));
    const offset = (page - 1) * perPage;

    // Subquery hitung eksemplar tersedia per buku
    const availableCopiesSubquery = db('book_copies')
      .select('book_id')
      .count({ available_copies: '*' })
      .where('circulation_status', 'available')
      .where('condition_status', 'good')
      .groupBy('book_id')
      .as('ac');

    let baseQuery = db('books as b')
      .leftJoin('book_categories as c', 'b.category_id', 'c.id')
      .leftJoin(availableCopiesSubquery, 'b.id', 'ac.book_id')
      .where('b.status', 'active');

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('b.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.category_id) {
      baseQuery = baseQuery.where('b.category_id', query.category_id);
    }
    if (query.material_type) {
      baseQuery = baseQuery.where('b.material_type', query.material_type);
    }
    if (query.q) {
      const s = `%${query.q.trim()}%`;
      baseQuery = baseQuery.where(function () {
        this.where('b.title', 'like', s)
          .orWhere('b.author', 'like', s)
          .orWhere('b.publisher', 'like', s)
          .orWhere('b.isbn', 'like', s);
      });
    }
    if (query.available_only === 'true' || query.available_only === '1') {
      baseQuery = baseQuery.where(db.raw('COALESCE(ac.available_copies, 0) > 0'));
    }

    const [{ total }] = await baseQuery.clone().count({ total: '*' });

    const items = await baseQuery
      .select(
        'b.id',
        'b.satuan_pendidikan_id',
        'b.material_type',
        'b.title',
        'b.author',
        'b.publisher',
        'b.publish_year',
        'b.isbn',
        'b.shelf_location',
        'b.cover_image_url',
        'b.total_copies',
        'c.category_name as category',
        'c.category_code',
        db.raw('COALESCE(ac.available_copies, 0) as available_copies')
      )
      .orderBy('b.id', 'desc')
      .limit(perPage)
      .offset(offset);

    return {
      items: items.map((item) => ({
        ...item,
        available_copies: parseInt(item.available_copies) || 0,
      })),
      pagination: {
        page,
        per_page: perPage,
        total: parseInt(total) || 0,
        total_pages: Math.ceil((total || 0) / perPage),
      },
    };
  }

  async getPublicBookDetail(id) {
    const book = await db('books as b')
      .leftJoin('book_categories as c', 'b.category_id', 'c.id')
      .where('b.id', id)
      .where('b.status', 'active')
      .select(
        'b.id',
        'b.satuan_pendidikan_id',
        'b.material_type',
        'b.title',
        'b.author',
        'b.publisher',
        'b.publish_year',
        'b.isbn',
        'b.shelf_location',
        'b.cover_image_url',
        'b.total_copies',
        'c.category_name as category',
        'c.category_code'
      )
      .first();

    if (!book) {
      const err = new Error('Koleksi buku tidak ditemukan atau sedang tidak aktif');
      err.statusCode = 404;
      throw err;
    }

    const copies = await db('book_copies')
      .where({ book_id: id })
      .select('id', 'copy_code', 'condition_status', 'circulation_status', 'shelf_location')
      .orderBy('id', 'asc');

    const availableCopies = copies.filter(
      (c) => c.circulation_status === 'available' && c.condition_status === 'good'
    ).length;

    return {
      ...book,
      available_copies: availableCopies,
      copies,
    };
  }
}

module.exports = new OpacService();
