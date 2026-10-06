import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { Award } from 'lucide-react';

export default function NilaiPage() {
  return (
    <FeaturePlaceholder
      featureCode="F7"
      title="Penilaian Siswa Terpadu"
      description="Pengisian nilai sesi asesmen (Tugas, Formatif, STS, SAS), capaian ketercapaian Tujuan Pembelajaran (TP), dan penilaian sikap karakter yang sinkron dengan modul Akademik dan e-Rapor."
      moduleName="Modul Akademik"
      nextPhase="Tahap 24 & 25: Nilai Sesi, TP & Sikap"
      icon={Award}
      endpoints={[
        'GET /akademik/scores/assessment-sessions',
        'GET /akademik/scores/scores/session/:id',
        'POST /akademik/scores/scores/bulk',
        'POST /akademik/scores/tp-scores/bulk',
        'POST /akademik/scores/attitude-scores/bulk',
      ]}
    />
  );
}
