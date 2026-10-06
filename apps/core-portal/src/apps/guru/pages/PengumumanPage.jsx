import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { BellRing } from 'lucide-react';

export default function PengumumanPage() {
  return (
    <FeaturePlaceholder
      featureCode="F9"
      title="Papan Pengumuman & Berita Guru"
      description="Daftar pengumuman internal terisolasi khusus dewan guru, informasi kedinasan, surat edaran yayasan, dan agenda kegiatan sekolah yang terjamin keamanannya dari konsumsi publik."
      moduleName="Modul Website Utama"
      nextPhase="Tahap 27: Pengumuman"
      icon={BellRing}
      endpoints={[
        'GET /website-utama/admin/news/teacher-announcements',
      ]}
    />
  );
}
