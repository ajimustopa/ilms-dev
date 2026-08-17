/**
 * Express Application Setup for Core Service
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Module Routes
const authRoutes = require('./modules/auth/routes');
const usersRoutes = require('./modules/users/routes');
const rolesRoutes = require('./modules/roles/routes');
const rolesController = require('./modules/roles/controller');
const foundationRoutes = require('./modules/foundation/routes');
const schoolUnitsRoutes = require('./modules/school-units/routes');
const systemSettingsRoutes = require('./modules/system-settings/routes');
const webhooksRoutes = require('./modules/webhooks/routes');
const apiClientsRoutes = require('./modules/api-clients/routes');
const activityLogsRoutes = require('./modules/activity-logs/routes');
const { authenticate } = require('./middlewares/auth');

const app = express();

// Security & Parsing Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Health Check
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Aldepos Core Service',
      version: '1.0.0',
      status: 'healthy'
    },
    message: 'Core Service API is running',
    errors: null
  });
});

// API v1 Router
const v1Router = express.Router();

// 1. Modul Autentikasi (Fitur #1 & #2)
v1Router.use('/auth', authRoutes);
v1Router.use('/password-resets', authRoutes); // Alias untuk /api/v1/password-resets

// 2. Modul Users (Fitur #3)
v1Router.use('/users', usersRoutes);
v1Router.use('/internal/users', usersRoutes); // Internal endpoints

// 3. Modul Role & Permission (Fitur #4)
v1Router.use('/roles', rolesRoutes);
v1Router.get('/permissions', authenticate, rolesController.listPermissions);
v1Router.post('/users/:id/school-roles', authenticate, rolesController.assignUserSchoolRoles);
v1Router.delete('/users/:id/school-roles/:role_id', authenticate, rolesController.removeUserSchoolRole);

// 4. Modul Data Master: Profil Yayasan (Fitur #6)
v1Router.use('/foundation', foundationRoutes);

// 5. Modul Data Master: Satuan Pendidikan (Fitur #7)
v1Router.use('/school-units', schoolUnitsRoutes);

// 6. Modul Data Master: Pengaturan Sistem (Fitur #8)
v1Router.use('/system-settings', systemSettingsRoutes);

// 7. Modul Integrasi: Webhooks Publisher & Subscriber (Fitur #9 & #10)
v1Router.use('/webhooks', webhooksRoutes);

// 8. Modul Integrasi: OpenAPI Docs (Fitur #11)
v1Router.get('/docs/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'Aldepos Core Service API',
      version: '1.0.0'
    },
    paths: {}
  });
});

// 9. Modul Integrasi: API Clients & Rate Limiting (Fitur #12)
v1Router.use('/', apiClientsRoutes);

// 10. Modul Keamanan: Audit Logs (Fitur #5 & #13)
v1Router.use('/activity-logs', activityLogsRoutes);
v1Router.use('/internal/activity-logs', activityLogsRoutes);

// Mount API v1 Router
app.use('/api/v1', v1Router);

// 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
