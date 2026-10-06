import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { UserCheck } from 'lucide-react';

export default function PresensiSiswaPage() {
  return (
    <FeaturePlaceholder
      featureCode="F5"
      title="Presensi Kehadiran Santri"
      description="Pencatatan presensi siswa massal per jam sesi mengajar (oleh Guru Mata Pelajaran) dan presensi harian rombel (oleh Wali Kelas) dengan status Hadir, Izin, Sakit, atau Alpa (H/I/S/A)."
      moduleName="Modul Akademik"
      nextPhase="Tahap 22: Absensi Siswa"
      icon={UserCheck}
      endpoints={[
        'GET /akademik/curriculum/class-groups',
        'GET /akademik/curriculum/class-groups/:id/members',
        'POST /akademik/lesson-attendances/bulk',
        'POST /akademik/attendances/bulk',
      ]}
    />
  );
}
