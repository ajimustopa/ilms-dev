/**
 * Books Routes for Alquran Module
 * Sesuai api-contract-alquran.md §2.4 & roles-alquran.md §4 & §5
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/books',
  verifyJwt,
  requirePermission('alquran.books.view'),
  controller.listBooks
);

router.post(
  '/books',
  verifyJwt,
  requirePermission('alquran.books.manage'),
  controller.createBook
);

router.put(
  '/books/:id',
  verifyJwt,
  requirePermission('alquran.books.manage'),
  controller.updateBook
);

router.delete(
  '/books/:id',
  verifyJwt,
  requirePermission('alquran.books.manage'),
  controller.deleteBook
);

module.exports = router;
