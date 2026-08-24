/**
 * Catalog Routes Implementation
 * Modul Perpustakaan: Katalog Buku & Bahan Pustaka, Eksemplar, dan Kategori
 */
const express = require('express');
const router = express.Router();
const catalogController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// ==========================================
// KATEGORI BUKU (/categories)
// ==========================================
router.get(
  '/categories',
  verifyJwt,
  requirePermission('perpustakaan.categories.view'),
  catalogController.listCategories
);

router.post(
  '/categories',
  verifyJwt,
  requirePermission('perpustakaan.categories.manage'),
  catalogController.createCategory
);

router.get(
  '/categories/:id',
  verifyJwt,
  requirePermission('perpustakaan.categories.view'),
  catalogController.getCategoryById
);

router.put(
  '/categories/:id',
  verifyJwt,
  requirePermission('perpustakaan.categories.manage'),
  catalogController.updateCategory
);

router.delete(
  '/categories/:id',
  verifyJwt,
  requirePermission('perpustakaan.categories.manage'),
  catalogController.deleteCategory
);

// ==========================================
// KOLEKSI BUKU (/books)
// ==========================================
router.get(
  '/books',
  verifyJwt,
  requirePermission('perpustakaan.books.view'),
  catalogController.listBooks
);

router.post(
  '/books',
  verifyJwt,
  requirePermission('perpustakaan.books.manage'),
  catalogController.createBook
);

router.get(
  '/books/:id',
  verifyJwt,
  requirePermission('perpustakaan.books.view'),
  catalogController.getBookById
);

router.put(
  '/books/:id',
  verifyJwt,
  requirePermission('perpustakaan.books.manage'),
  catalogController.updateBook
);

router.delete(
  '/books/:id',
  verifyJwt,
  requirePermission('perpustakaan.books.manage'),
  catalogController.deleteBook
);

// ==========================================
// EKSEMPLAR BUKU (/books/:id/copies)
// ==========================================
router.get(
  '/books/:id/copies',
  verifyJwt,
  requirePermission('perpustakaan.books.view'),
  catalogController.listBookCopies
);

router.post(
  '/books/:id/copies',
  verifyJwt,
  requirePermission('perpustakaan.books.manage'),
  catalogController.createBookCopy
);

module.exports = router;
