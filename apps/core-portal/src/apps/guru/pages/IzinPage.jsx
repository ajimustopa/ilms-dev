import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { ClipboardList } from 'lucide-react';

export default function IzinPage() {
  return (
    <FeaturePlaceholder
      featureCode="F2"
      title="Pengajuan Cuti & Izin Guru"
      description="Formulir pengajuan izin sakit, keperluan keluarga, atau tugas kedinasan disertai unggah surat keterangan dokter atau surat tugas resmi, serta pelacakan status persetujuan HRD/Kepsek."
      moduleName="Modul Kepegawaian"
      nextPhase="Tahap 19: Izin Guru"
      icon={ClipboardList}
      endpoints={[
        'GET /kepegawaian/attendance/leave-requests',
        'POST /kepegawaian/attendance/leave-requests',
        'POST /kepegawaian/attendance/leave-requests/attachment',
      ]}
    />
  );
}
