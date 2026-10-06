import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { CalendarDays } from 'lucide-react';

export default function JadwalPage() {
  return (
    <FeaturePlaceholder
      featureCode="F3"
      title="Jadwal Mengajar & Roster KBM"
      description="Roster jadwal mengajar mingguan guru, rincian alokasi jam pelajaran, ruangan kelas, dan agenda tatap muka yang terhubung langsung dengan kalender akademik sekolah."
      moduleName="Modul Akademik"
      nextPhase="Tahap 20: Jadwal & Pengingat Mengajar"
      icon={CalendarDays}
      endpoints={[
        'GET /akademik/curriculum/my-schedules',
        'GET /akademik/curriculum/my-teaching-assignments',
      ]}
    />
  );
}
