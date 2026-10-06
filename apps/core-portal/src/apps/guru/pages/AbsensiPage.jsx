import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { MapPin } from 'lucide-react';

export default function AbsensiPage() {
  return (
    <FeaturePlaceholder
      featureCode="F1"
      title="Presensi Kehadiran Guru"
      description="Pencatatan check-in dan check-out mandiri guru berbasis Geolocation GPS dengan validasi radius lokasi sekolah, deteksi jam shift kerja, dan rekapitulasi kehadiran bulanan."
      moduleName="Modul Kepegawaian"
      nextPhase="Tahap 17: Absensi Guru"
      icon={MapPin}
      endpoints={[
        'GET /kepegawaian/attendance/today-status',
        'POST /kepegawaian/attendance/check-in',
        'POST /kepegawaian/attendance/:id/check-out',
        'GET /kepegawaian/attendance',
      ]}
    />
  );
}
