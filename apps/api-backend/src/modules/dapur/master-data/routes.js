/**
 * Master Data Routes for Dapur Module
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// 1. Ingredients
router.get('/ingredients', verifyJwt, requirePermission('dapur.master.view'), controller.listIngredients);
router.post('/ingredients', verifyJwt, requirePermission('dapur.master.manage'), controller.createIngredient);
router.get('/ingredients/:id', verifyJwt, requirePermission('dapur.master.view'), controller.getIngredientById);
router.put('/ingredients/:id', verifyJwt, requirePermission('dapur.master.manage'), controller.updateIngredient);
router.post('/ingredients/:id/deactivate', verifyJwt, requirePermission('dapur.master.manage'), controller.deactivateIngredient);

// 2. Units & Conversions
router.get('/units', verifyJwt, requirePermission('dapur.master.view'), controller.listUnits);
router.post('/units', verifyJwt, requirePermission('dapur.master.manage'), controller.createUnit);
router.get('/units/conversions', verifyJwt, requirePermission('dapur.master.view'), controller.listUnitConversions);
router.post('/units/conversions', verifyJwt, requirePermission('dapur.master.manage'), controller.createUnitConversion);

// 3. Suppliers
router.get('/suppliers', verifyJwt, requirePermission('dapur.master.view'), controller.listSuppliers);
router.post('/suppliers', verifyJwt, requirePermission('dapur.master.manage'), controller.createSupplier);
router.get('/suppliers/:id', verifyJwt, requirePermission('dapur.master.view'), controller.getSupplierById);
router.put('/suppliers/:id', verifyJwt, requirePermission('dapur.master.manage'), controller.updateSupplier);

// 4. Student Groups
router.get('/student-groups', verifyJwt, requirePermission('dapur.master.view'), controller.listStudentGroups);
router.post('/student-groups', verifyJwt, requirePermission('dapur.master.manage'), controller.createStudentGroup);

// 5. Operational Calendar
router.get('/operational-calendar', verifyJwt, requirePermission('dapur.master.view'), controller.listOperationalCalendar);
router.post('/operational-calendar', verifyJwt, requirePermission('dapur.master.manage'), controller.setOperationalCalendar);

// 6. System Parameters
router.get('/system-parameters', verifyJwt, requirePermission('dapur.master.view'), controller.getSystemParameters);
router.put('/system-parameters', verifyJwt, requirePermission('dapur.master.manage'), controller.updateSystemParameter);

// 7. Generic Master Data (master_type)
router.get('/master-data', verifyJwt, requirePermission('dapur.master.view'), controller.listMasterData);
router.post('/master-data', verifyJwt, requirePermission('dapur.master.manage'), controller.createMasterData);
router.get('/master-data/:id', verifyJwt, requirePermission('dapur.master.view'), controller.getMasterDataById);
router.put('/master-data/:id', verifyJwt, requirePermission('dapur.master.manage'), controller.updateMasterData);

module.exports = router;
