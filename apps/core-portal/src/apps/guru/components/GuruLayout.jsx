import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import GuruHeader from './GuruHeader';
import GuruBottomNav from './GuruBottomNav';
import GuruMenuDrawer from './GuruMenuDrawer';
import QuickAttendanceModal from './QuickAttendanceModal';
import AttendanceReminderBanner from './AttendanceReminderBanner';
import { ToastProvider } from './Toast';
import { TeacherProvider } from '../context/TeacherContext';

export default function GuruLayout() {
  const [isQuickAttendanceOpen, setIsQuickAttendanceOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <ToastProvider>
      <TeacherProvider>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
          {/* 1. Header Atas */}
          <GuruHeader />

          {/* 2. Banner Pengingat Absensi Shift */}
          <AttendanceReminderBanner />

          {/* 3. Area Konten Utama */}
          <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 pb-24">
            <Outlet />
          </main>

          {/* 3. Bottom Navigation Mobile */}
          <GuruBottomNav
            onOpenQuickAttendance={() => setIsQuickAttendanceOpen(true)}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />

          {/* 4. Modal Presensi Cepat */}
          <QuickAttendanceModal
            isOpen={isQuickAttendanceOpen}
            onClose={() => setIsQuickAttendanceOpen(false)}
          />

          {/* 5. Drawer Menu Lengkap */}
          <GuruMenuDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          />
        </div>
      </TeacherProvider>
    </ToastProvider>
  );
}

