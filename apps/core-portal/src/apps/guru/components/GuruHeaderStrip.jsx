import React, { useState } from 'react';
import AttendanceReminderBanner from './AttendanceReminderBanner';
import NextSessionBanner from './NextSessionBanner';

/**
 * GuruHeaderStrip Component
 * Mengoordinasikan tampilan SATU strip sticky tepat di bawah top bar.
 * Prioritas 1: Pengingat absensi jika guru belum check-in / belum check-out.
 * Prioritas 2: Pengingat sesi mengajar terdekat (dalam rentang 30 menit / sedang berlangsung).
 */
export function GuruHeaderStrip() {
  const [isAttendanceActive, setIsAttendanceActive] = useState(false);

  return (
    <div className="w-full">
      {/* Attendance reminder banner akan melaporkan apakah kondisinya aktif */}
      <AttendanceReminderBanner onVisibilityChange={setIsAttendanceActive} />

      {/* Jika attendance reminder TIDAK aktif, baru tampilkan next session countdown */}
      {!isAttendanceActive && <NextSessionBanner />}
    </div>
  );
}

export default GuruHeaderStrip;
