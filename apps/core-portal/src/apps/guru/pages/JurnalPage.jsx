import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { Layers } from 'lucide-react';

export default function JurnalPage() {
  return (
    <FeaturePlaceholder
      featureCode="F6"
      title="Jurnal Mengajar Harian"
      description="Pencatatan materi pembahasan KBM, ketercapaian Tujuan Pembelajaran (TP), catatan khusus santri, dan status pelaksanaan sesi tatap muka untuk pemantauan supervisi pimpinan."
      moduleName="Modul Akademik"
      nextPhase="Tahap 23: Jurnal Mengajar UI"
      icon={Layers}
      endpoints={[
        'GET /akademik/curriculum/teaching-journals',
        'GET /akademik/curriculum/teaching-journals/today-status',
        'POST /akademik/curriculum/teaching-journals',
        'PUT /akademik/curriculum/teaching-journals/:id',
      ]}
    />
  );
}
