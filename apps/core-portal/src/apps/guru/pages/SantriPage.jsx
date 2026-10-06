import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { Users2 } from 'lucide-react';

export default function SantriPage() {
  return (
    <FeaturePlaceholder
      featureCode="F8"
      title="Direktori Santri & Kontak Wali"
      description="Pencarian dan daftar data santri per rombel kelas, nomor induk (NISN/NIPD), data kontak orang tua / wali santri untuk komunikasi sekolah, serta fitur ekspor format lembar kerja Excel."
      moduleName="Modul Akademik"
      nextPhase="Tahap 26: Informasi Siswa"
      icon={Users2}
      endpoints={[
        'GET /akademik/curriculum/class-groups',
        'GET /akademik/curriculum/class-groups/:id/members',
      ]}
    />
  );
}
