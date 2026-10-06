import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { BookOpen } from 'lucide-react';

export default function PerencanaanPage() {
  return (
    <FeaturePlaceholder
      featureCode="F4"
      title="Perencanaan Pembelajaran & TP"
      description="Pengelolaan master Tujuan Pembelajaran (TP), Capaian Pembelajaran (CP), pemetaan lingkup materi, serta penyusunan alur silabus modul ajar Kurikulum Merdeka yang terhubung ke e-Rapor."
      moduleName="Modul Akademik"
      nextPhase="Tahap 21: Perencanaan Pembelajaran"
      icon={BookOpen}
      endpoints={[
        'GET /akademik/curriculum/learning-objectives',
        'POST /akademik/curriculum/learning-objectives',
        'PUT /akademik/curriculum/learning-objectives/:id',
        'DELETE /akademik/curriculum/learning-objectives/:id',
      ]}
    />
  );
}
