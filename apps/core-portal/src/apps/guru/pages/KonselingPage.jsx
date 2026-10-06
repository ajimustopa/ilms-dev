import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { HeartHandshake } from 'lucide-react';

export default function KonselingPage() {
  return (
    <FeaturePlaceholder
      featureCode="BK"
      title="Layanan Konseling & Bimbingan Santri"
      description="Pencatatan sesi bimbingan konseling privat antara santri dan Guru BK / Wali Kelas, observasi kepribadian, asesmen psikologis, dan pemantauan tindak lanjut kasus santri."
      moduleName="Modul Akademik (BK & Kesiswaan)"
      nextPhase="Tahap 29: Penanganan Kejadian & Konseling"
      icon={HeartHandshake}
      endpoints={[
        'GET /akademik/student-affairs/counseling',
        'POST /akademik/student-affairs/counseling',
      ]}
    />
  );
}
