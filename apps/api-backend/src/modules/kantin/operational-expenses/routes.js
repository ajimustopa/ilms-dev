const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/operational-expenses', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.listExpenses);
router.post('/operational-expenses', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.createExpense);

module.exports = router;
