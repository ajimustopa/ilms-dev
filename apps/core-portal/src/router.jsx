import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import Layout from './shared/components/Layout';
import ProtectedRoute from './shared/components/ProtectedRoute';

import Launcher from './pages/Launcher';

// Core Service Pages
import CoreLogin from './apps/core/pages/Login';
import Dashboard from './apps/core/pages/Dashboard';
import ManajemenUser from './apps/core/pages/ManajemenUser';
import RoleManagement from './apps/core/pages/RoleManagement';
import ProfilYayasan from './apps/core/pages/ProfilYayasan';
import SatuanPendidikan from './apps/core/pages/SatuanPendidikan';
import PengaturanSistem from './apps/core/pages/PengaturanSistem';
import WebhookSubscribers from './apps/core/pages/WebhookSubscribers';
import ApiClients from './apps/core/pages/ApiClients';
import AuditLog from './apps/core/pages/AuditLog';

export const router = createBrowserRouter([
  // 1. Landing Page Publik (Daftar Kartu 14 Modul Aplikasi) - Tanpa Login
  {
    path: '/',
    element: <Launcher />,
  },

  // 2. Halaman Login Milik Core Service
  {
    path: '/core/login',
    element: <CoreLogin />,
  },
  {
    path: '/login',
    element: <Navigate to="/core/login" replace />,
  },

  // 3. Modul Core Service (Dilindungi Sesi / JWT)
  {
    path: '/core',
    element: <ProtectedRoute redirectTo="/core/login" />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            index: true,
            element: <Navigate to="/core/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'users',
            element: <ManajemenUser />,
          },
          {
            path: 'roles',
            element: <RoleManagement />,
          },
          {
            path: 'foundation',
            element: <ProfilYayasan />,
          },
          {
            path: 'school-units',
            element: <SatuanPendidikan />,
          },
          {
            path: 'settings',
            element: <PengaturanSistem />,
          },
          {
            path: 'webhooks',
            element: <WebhookSubscribers />,
          },
          {
            path: 'api-clients',
            element: <ApiClients />,
          },
          {
            path: 'audit-logs',
            element: <AuditLog />,
          },
        ],
      },
    ],
  },

  // 4. Fallback Not Found -> Kembali ke Launcher
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
