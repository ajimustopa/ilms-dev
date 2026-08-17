import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManajemenUser from './pages/ManajemenUser';
import RoleManagement from './pages/RoleManagement';
import ProfilYayasan from './pages/ProfilYayasan';
import SatuanPendidikan from './pages/SatuanPendidikan';
import PengaturanSistem from './pages/PengaturanSistem';
import WebhookSubscribers from './pages/WebhookSubscribers';
import ApiClients from './pages/ApiClients';
import AuditLog from './pages/AuditLog';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: '/',
            element: <Dashboard />,
          },
          {
            path: '/users',
            element: <ManajemenUser />,
          },
          {
            path: '/roles',
            element: <RoleManagement />,
          },
          {
            path: '/foundation',
            element: <ProfilYayasan />,
          },
          {
            path: '/school-units',
            element: <SatuanPendidikan />,
          },
          {
            path: '/settings',
            element: <PengaturanSistem />,
          },
          {
            path: '/webhooks',
            element: <WebhookSubscribers />,
          },
          {
            path: '/api-clients',
            element: <ApiClients />,
          },
          {
            path: '/audit-logs',
            element: <AuditLog />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
