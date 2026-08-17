/**
 * Express Application Setup for Aldepos API Backend (Modular Monolith)
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { authenticate, verifyJwt, requirePermission } = require('./middlewares/auth');

// Module Routes & Controllers for Core Service
const authRoutes = require('./modules/core/auth/routes');
const authController = require('./modules/core/auth/controller');
const usersRoutes = require('./modules/core/users/routes');
const rolesRoutes = require('./modules/core/roles/routes');
const rolesController = require('./modules/core/roles/controller');
const foundationRoutes = require('./modules/core/foundation/routes');
const schoolUnitsRoutes = require('./modules/core/school-units/routes');
const systemSettingsRoutes = require('./modules/core/system-settings/routes');
const webhooksRoutes = require('./modules/core/webhooks/routes');
const apiClientsRoutes = require('./modules/core/api-clients/routes');
const activityLogsRoutes = require('./modules/core/activity-logs/routes');

const app = express();

// Security & Parsing Middlewares
app.use(helmet());
const corsOrigin = process.env.CORE_CORS_ORIGIN || process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map(s => s.trim()),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Health Check
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Aldepos API Backend (Modular Monolith)',
      version: '1.0.0',
      status: 'healthy'
    },
    message: 'API Backend is running',
    errors: null
  });
});

// ==========================================
// 1. Core Service Router (/api/v1/core)
// ==========================================
const coreV1Router = express.Router();

// 1.1 Autentikasi (Fitur #1 & #2)
coreV1Router.use('/auth', authRoutes);

// 1.2 Password Resets (Nempel langsung di router Core sesuai api-contract-coreservice.md)
coreV1Router.get(
  '/password-resets',
  verifyJwt,
  requirePermission('core.auth.password_resets.view'),
  authController.listPasswordResets
);
coreV1Router.patch(
  '/password-resets/:id/process',
  verifyJwt,
  requirePermission('core.auth.password_resets.process'),
  authController.processPasswordReset
);

// 1.3 Users (Fitur #3)
coreV1Router.use('/users', usersRoutes);
coreV1Router.use('/internal/users', usersRoutes);

// 1.4 Role & Permission (Fitur #4)
coreV1Router.use('/roles', rolesRoutes);
coreV1Router.get('/permissions', authenticate, rolesController.listPermissions);
coreV1Router.post('/users/:id/school-roles', authenticate, rolesController.assignUserSchoolRoles);
coreV1Router.delete('/users/:id/school-roles/:role_id', authenticate, rolesController.removeUserSchoolRole);

// 1.5 Data Master: Profil Yayasan (Fitur #6)
coreV1Router.use('/foundation', foundationRoutes);

// 1.6 Data Master: Satuan Pendidikan (Fitur #7)
coreV1Router.use('/school-units', schoolUnitsRoutes);

// 1.7 Data Master: Pengaturan Sistem (Fitur #8)
coreV1Router.use('/system-settings', systemSettingsRoutes);

// 1.8 Integrasi: Webhooks Publisher & Subscriber (Fitur #9 & #10)
coreV1Router.use('/webhooks', webhooksRoutes);

// 1.9 Integrasi: OpenAPI Docs (Fitur #11)
coreV1Router.get('/docs/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'Aldepos Core Service API',
      version: '1.0.0'
    },
    paths: {}
  });
});

// 1.10 Integrasi: API Clients & Rate Limiting (Fitur #12)
coreV1Router.use('/', apiClientsRoutes);

// 1.11 Keamanan: Audit Logs (Fitur #5 & #13)
coreV1Router.use('/activity-logs', activityLogsRoutes);
coreV1Router.use('/internal/activity-logs', activityLogsRoutes);

// Mount Core Service Router ke /api/v1/core
app.use('/api/v1/core', coreV1Router);

// 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
