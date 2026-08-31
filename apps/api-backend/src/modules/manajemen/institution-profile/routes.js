/**
 * Institution Profile Routes
 * Prefix: /api/v1/manajemen/institution-profile
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// Summary
router.get(
  '/summary',
  verifyJwt,
  requirePermission('manajemen.institution_profile.view'),
  controller.getSummary
);

// 1. Legal Document Types (Master)
router.get(
  '/document-types',
  verifyJwt,
  requirePermission('manajemen.institution_profile.view'),
  controller.listLegalDocumentTypes
);

router.post(
  '/document-types',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.createLegalDocumentType
);

router.put(
  '/document-types/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.updateLegalDocumentType
);

router.delete(
  '/document-types/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.deleteLegalDocumentType
);

// 2. Institution Legal Documents
router.get(
  '/legal-documents',
  verifyJwt,
  requirePermission('manajemen.institution_profile.view'),
  controller.listLegalDocuments
);

router.get(
  '/legal-documents/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.view'),
  controller.getLegalDocumentById
);

router.post(
  '/legal-documents',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.createLegalDocument
);

router.put(
  '/legal-documents/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.updateLegalDocument
);

router.delete(
  '/legal-documents/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.deleteLegalDocument
);

// 3. Institution Letterheads (Kop Surat)
router.get(
  '/letterheads',
  verifyJwt,
  requirePermission('manajemen.institution_profile.view'),
  controller.listLetterheads
);

router.post(
  '/letterheads',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.createLetterhead
);

router.put(
  '/letterheads/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.updateLetterhead
);

router.patch(
  '/letterheads/:id/set-default',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.setDefaultLetterhead
);

router.delete(
  '/letterheads/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.deleteLetterhead
);

// 4. Institution Stamps (Cap Stempel)
router.get(
  '/stamps',
  verifyJwt,
  requirePermission('manajemen.institution_profile.view'),
  controller.listStamps
);

router.post(
  '/stamps',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.createStamp
);

router.put(
  '/stamps/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.updateStamp
);

router.patch(
  '/stamps/:id/set-default',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.setDefaultStamp
);

router.delete(
  '/stamps/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.deleteStamp
);

// 5. Institution Signatures (Specimen Tanda Tangan)
router.get(
  '/signatures',
  verifyJwt,
  requirePermission('manajemen.institution_profile.view'),
  controller.listSignatures
);

router.post(
  '/signatures',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.createSignature
);

router.put(
  '/signatures/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.updateSignature
);

router.patch(
  '/signatures/:id/set-default',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.setDefaultSignature
);

router.delete(
  '/signatures/:id',
  verifyJwt,
  requirePermission('manajemen.institution_profile.manage'),
  controller.deleteSignature
);

module.exports = router;
