/**
 * Report Cards Routes
 * Modul Akademik - Fitur 4: Rapor Siswa
 */
const express = require('express');
const router = express.Router();
const reportCardsController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

router.get('/report-cards', authenticate, requirePermission('akademik.report_cards.read'), reportCardsController.list);
router.post('/report-cards/generate', authenticate, requirePermission('akademik.report_cards.generate'), reportCardsController.generate);
router.get('/report-cards/:id', authenticate, requirePermission('akademik.report_cards.read'), reportCardsController.getById);
router.put('/report-cards/:id/note', authenticate, requirePermission('akademik.report_cards.generate'), reportCardsController.updateNote);

module.exports = router;
