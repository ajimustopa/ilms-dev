import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import GuruSidebar from './GuruSidebar';
import GuruHeader from './GuruHeader';
import GuruHeaderStrip from './GuruHeaderStrip';
import GuruBottomNav from './GuruBottomNav';
import GuruMenuDrawer from './GuruMenuDrawer';
import QuickAttendanceModal from './QuickAttendanceModal';
import { ToastProvider } from './Toast';
import { TeacherProvider } from '../context/TeacherContext';

/**
 * GuruLayout Component - Fondasi Shell Kanonis Portal Guru
 * Sesuai PRD Bagian 3, 4, 6 dan DESIGN.md.
 * - Desktop: Sidebar w-64 fixed kiri, Top bar fixed h-16, konten pl-64.
 * - Mobile: Top bar fixed h-16, Bottom nav 5 slot, Drawer menu lengkap.
 * - Single sticky strip pengingat absensi / sesi KBM terdekat tepat di bawah top bar.
 */
export default function GuruLayout() {
  const [isQuickAttendanceOpen, setIsQuickAttendanceOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <ToastProvider>
      <TeacherProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex antialiased selection:bg-emerald-100 selection:text-emerald-900 relative">
          {/* 1. Sidebar Desktop (w-64, fixed left-0, border-r border-slate-200, z-50) */}
          <GuruSidebar />

          {/* 2. Container Utama Layout (Desktop: pl-64, Mobile: w-full) */}
          <div className="flex-1 min-h-screen lg:pl-64 flex flex-col w-full min-w-0">
            {/* 2.1 Top App Bar Fixed (h-16, border-b border-slate-200, z-40) */}
            <GuruHeader onOpenDrawer={() => setIsDrawerOpen(true)} />

            {/* 2.2 Top Space Offset untuk Fixed Header (h-16 = 64px) */}
            <div className="h-16 w-full shrink-0" aria-hidden="true" />

            {/* 2.3 Single Banner Strip Sticky Tepat di Bawah Topbar (Pengingat Absensi / Countdown Sesi) */}
            <div className="sticky top-16 z-30 w-full">
              <GuruHeaderStrip />
            </div>

            {/* 2.4 Area Konten Halaman Aktif */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12 relative z-10">
              <Outlet />
            </main>
          </div>

          {/* 3. Bottom Navigation Mobile (5 Slot Kanonis) */}
          <GuruBottomNav />

          {/* 4. Modal Presensi Cepat GPS */}
          <QuickAttendanceModal
            isOpen={isQuickAttendanceOpen}
            onClose={() => setIsQuickAttendanceOpen(false)}
          />

          {/* 5. Drawer Menu Lengkap Mobile */}
          <GuruMenuDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          />
        </div>
      </TeacherProvider>
    </ToastProvider>
  );
}
