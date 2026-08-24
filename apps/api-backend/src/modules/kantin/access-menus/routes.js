const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/access-menus', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.listMenus);
router.get('/access-menus/roles/:role_name', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.getRoleMenuAccess);
router.post('/access-menus/:id/toggle', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.toggleMenuAccess);

module.exports = router;
