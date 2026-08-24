import React from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../../shared/components/ProtectedRoute';
import WebsiteUtamaLayout from './components/WebsiteUtamaLayout';

// Halaman-Halaman CMS Website Utama
import Dashboard from './pages/Dashboard';
import KontenBeranda from './pages/KontenBeranda';
import ProfilPengajar from './pages/ProfilPengajar';
import KehidupanSekolah from './pages/KehidupanSekolah';
import BeritaPengumuman from './pages/BeritaPengumuman';
import GaleriKegiatan from './pages/GaleriKegiatan';
import FaqTestimoni from './pages/FaqTestimoni';
import AgendaAkreditasi from './pages/AgendaAkreditasi';
import PpdbAdmin from './pages/PpdbAdmin';
import KonsultasiAdmin from './pages/KonsultasiAdmin';
import ArtikelModerasi from './pages/ArtikelModerasi';
import PengaturanCms from './pages/PengaturanCms';

export const websiteUtamaRoutes = {
  path: '/website-utama',
  element: <ProtectedRoute redirectTo="/core/login" />,
  children: [
    {
      element: <WebsiteUtamaLayout />,
      children: [
        {
          index: true,
          element: <Navigate to="/website-utama/dashboard" replace />,
        },
        {
          path: 'dashboard',
          element: <Dashboard />,
        },
        {
          path: 'home',
          element: <KontenBeranda />,
        },
        {
          path: 'staff-profiles',
          element: <ProfilPengajar />,
        },
        {
          path: 'school-life',
          element: <KehidupanSekolah />,
        },
        {
          path: 'news',
          element: <BeritaPengumuman />,
        },
        {
          path: 'galleries',
          element: <GaleriKegiatan />,
        },
        {
          path: 'faqs-testimonials',
          element: <FaqTestimoni />,
        },
        {
          path: 'events-accreditations',
          element: <AgendaAkreditasi />,
        },
        {
          path: 'ppdb',
          element: <PpdbAdmin />,
        },
        {
          path: 'consultation',
          element: <KonsultasiAdmin />,
        },
        {
          path: 'articles',
          element: <ArtikelModerasi />,
        },
        {
          path: 'settings',
          element: <PengaturanCms />,
        },
      ],
    },
  ],
};

export default websiteUtamaRoutes;
