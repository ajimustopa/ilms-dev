/**
 * Consumables Routes
 * Modul Sarpras: Bahan Habis Pakai (Items, Mutations, Stock Opname)
 */
const express = require('express');
const router = express.Router();
const consumablesController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// Master Items
router.get('/consumables/low-stock', verifyJwt, requirePermission('sarpras.consumables.manage'), consumablesController.listLowStock);
router.get('/consumables', verifyJwt, requirePermission('sarpras.consumables.manage'), consumablesController.listItems);
router.post('/consumables', verifyJwt, requirePermission('sarpras.consumables.manage'), consumablesController.createItem);
router.get('/consumables/:id', verifyJwt, requirePermission('sarpras.consumables.manage'), consumablesController.getItemById);
router.put('/consumables/:id', verifyJwt, requirePermission('sarpras.consumables.manage'), consumablesController.updateItem);
router.delete('/consumables/:id', verifyJwt, requirePermission('sarpras.consumables.manage'), consumablesController.deleteItem);

// Stock In / Out / History
router.post('/consumables/:id/stock-in', verifyJwt, requirePermission('sarpras.consumables.manage'), consumablesController.stockIn);
router.post('/consumables/:id/stock-out', verifyJwt, requirePermission('sarpras.consumables.manage'), consumablesController.stockOut);
router.get('/consumables/:id/mutations', verifyJwt, requirePermission('sarpras.consumables.manage'), consumablesController.listMutations);

// Stock Opname
router.get('/stock-opnames', verifyJwt, requirePermission('sarpras.consumables.opname'), consumablesController.listOpnames);
router.post('/stock-opnames', verifyJwt, requirePermission('sarpras.consumables.opname'), consumablesController.createOpname);
router.get('/stock-opnames/:id', verifyJwt, requirePermission('sarpras.consumables.opname'), consumablesController.getOpnameById);
router.put('/stock-opnames/:id/items', verifyJwt, requirePermission('sarpras.consumables.opname'), consumablesController.updateOpnameItems);
router.post('/stock-opnames/:id/finalize', verifyJwt, requirePermission('sarpras.consumables.opname'), consumablesController.finalizeOpname);

module.exports = router;
