const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/parent/students/:student_id/wallet', verifyJwt, requireRole('orangtua', 'admin', 'kepala_kantin', 'internal_service'), controller.getStudentWallet);
router.get('/parent/students/:student_id/wallet/history', verifyJwt, requireRole('orangtua', 'admin', 'kepala_kantin', 'internal_service'), controller.getWalletHistory);
router.get('/parent/students/:student_id/spending-history', verifyJwt, requireRole('orangtua', 'admin', 'kepala_kantin', 'internal_service'), controller.getSpendingHistory);
router.post('/parent/students/:student_id/change-pin', verifyJwt, requireRole('orangtua', 'admin', 'kepala_kantin'), controller.changeParentPin);
router.put('/parent/students/:student_id/spending-limit', verifyJwt, requireRole('orangtua', 'admin', 'kepala_kantin', 'internal_service'), controller.setSpendingLimit);
router.patch('/parent/students/:student_id/block', verifyJwt, requireRole('orangtua', 'admin', 'kepala_kantin', 'internal_service'), controller.toggleBlock);

module.exports = router;
