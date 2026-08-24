/**
 * Assets Routes
 * Modul Sarpras: Inventaris (Assets, Mutations, QR Code)
 */
const express = require('express');
const router = express.Router();
const assetsController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get('/assets', verifyJwt, requirePermission('sarpras.assets.manage'), assetsController.listAssets);
router.post('/assets', verifyJwt, requirePermission('sarpras.assets.manage'), assetsController.createAsset);
router.post('/assets/scan', verifyJwt, requirePermission('sarpras.assets.manage'), assetsController.scanLookupAsset);
router.get('/assets/:id', verifyJwt, requirePermission('sarpras.assets.manage'), assetsController.getAssetById);
router.put('/assets/:id', verifyJwt, requirePermission('sarpras.assets.manage'), assetsController.updateAsset);
router.delete('/assets/:id', verifyJwt, requirePermission('sarpras.assets.manage'), assetsController.deleteAsset);

// Mutations
router.post('/assets/:id/mutate', verifyJwt, requirePermission('sarpras.assets.mutate'), assetsController.mutateAssetLocation);
router.get('/assets/:id/mutations', verifyJwt, requirePermission('sarpras.assets.manage'), assetsController.listAssetMutations);

// QR Code
router.post('/assets/:id/qr-code', verifyJwt, requirePermission('sarpras.assets.manage'), assetsController.generateQrCode);
router.get('/assets/:id/qr-code', verifyJwt, requirePermission('sarpras.assets.manage'), assetsController.getQrCode);

module.exports = router;
