/**
 * Roles & Permissions Routes
 */
const express = require('express');
const router = express.Router();
const rolesController = require('./controller');
const { authenticate } = require('../../middlewares/auth');

// Role CRUD Endpoints
router.get('/', authenticate, rolesController.list);
router.post('/', authenticate, rolesController.create);
router.get('/:id', authenticate, rolesController.getById);
router.put('/:id', authenticate, rolesController.update);
router.delete('/:id', authenticate, rolesController.delete);

module.exports = router;
