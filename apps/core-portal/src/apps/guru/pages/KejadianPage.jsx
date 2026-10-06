import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { ShieldAlert } from 'lucide-react';

export default function KejadianPage() {
  return (
    <FeaturePlaceholder
      featureCode="F9"
      title="Pencatatan Kejadian & Prestasi Santri"
      description="Pencatatan kejadian positif (prestasi/kebaikan) dan kejadian negatif (pelanggaran tata tertib), pembobotan poin kedisiplinan, penetapan status penanganan, dan penegakan level visibilitas catatan santri."
      moduleName="Modul Akademik (Kesiswaan)"
      nextPhase="Tahap 28 & 29: Kejadian & Penanganan Siswa"
      icon={ShieldAlert}
      endpoints={[
        'GET /akademik/student-affairs/incidents',
        'GET /akademik/student-affairs/incidents/categories',
        'POST /akademik/student-affairs/incidents',
        'PUT /akademik/student-affairs/incidents/:id/handling',
        'PUT /akademik/student-affairs/incidents/:id/verify',
      ]}
    />
  );
}
