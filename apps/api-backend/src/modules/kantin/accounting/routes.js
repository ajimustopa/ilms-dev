const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

const allowedRoles = requireRole('admin', 'kepala_kantin', 'bendahara', 'pengelola_kantin', 'akuntan');

router.get('/accounting/journals', verifyJwt, allowedRoles, controller.listJournalEntries);
router.post('/accounting/journals', verifyJwt, allowedRoles, controller.createJournalEntry);
router.delete('/accounting/journals/:id', verifyJwt, allowedRoles, controller.deleteJournalEntry);
router.get('/accounting/general-ledger', verifyJwt, allowedRoles, controller.getGeneralLedger);
router.get('/accounting/worksheet', verifyJwt, allowedRoles, controller.getWorksheet);
router.get('/accounting/financial-statements', verifyJwt, allowedRoles, controller.getFinancialStatements);
router.get('/accounting/financial-ratios', verifyJwt, allowedRoles, controller.getFinancialRatios);

module.exports = router;
