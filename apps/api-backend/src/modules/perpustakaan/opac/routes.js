/**
 * OPAC Routes Implementation
 * Modul Perpustakaan: Online Public Access Catalog (OPAC)
 * Publik - Tanpa Middleware verifyJwt
 */
const express = require('express');
const router = express.Router();
const opacController = require('./controller');

// GET /api/v1/perpustakaan/opac/search (Publik)
router.get('/opac/search', opacController.searchPublicCatalog);

// GET /api/v1/perpustakaan/opac/books/:id (Publik)
router.get('/opac/books/:id', opacController.getPublicBookDetail);

module.exports = router;
