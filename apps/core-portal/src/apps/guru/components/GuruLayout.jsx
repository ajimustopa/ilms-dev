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
        <div className="min-h-screen bg-[#F4F6FC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-[#5B61F4] selection:text-white relative overflow-x-hidden">
          {/* Ambient Soft Aura Blobs (Inspired by Modern App Design) */}
          <div className="fixed top-0 left-0 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
          <div className="fixed top-1/3 right-0 w-80 h-80 bg-pink-200/20 dark:bg-pink-900/10 rounded-full blur-3xl pointer-events-none translate-x-1/3" />
          <div className="fixed bottom-0 left-1/3 w-96 h-96 bg-sky-200/25 dark:bg-sky-900/10 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

          {/* 1. Header Atas */}
          <GuruHeader />

          {/* 2. Banner Pengingat Absensi Shift */}
          <AttendanceReminderBanner />

          {/* 3. Area Konten Utama */}
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 pb-28 relative z-10">
            <Outlet />
          </main>

          {/* 4. Bottom Navigation Mobile */}
          <GuruBottomNav
            onOpenQuickAttendance={() => setIsQuickAttendanceOpen(true)}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />

          {/* 5. Modal Presensi Cepat */}
          <QuickAttendanceModal
            isOpen={isQuickAttendanceOpen}
            onClose={() => setIsQuickAttendanceOpen(false)}
          />

          {/* 6. Drawer Menu Lengkap */}
          <GuruMenuDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          />
        </div>
      </TeacherProvider>
    </ToastProvider>
  );
}

