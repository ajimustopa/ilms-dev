import React from 'react';
import FeaturePlaceholder from './FeaturePlaceholder';
import { User } from 'lucide-react';

export default function ProfilPage() {
  return (
    <FeaturePlaceholder
      featureCode="USER"
      title="Profil Guru & Pengaturan Akun"
      description="Pembaruan mandiri biodata kepegawaian (nomor telepon, alamat tempat tinggal, kontak darurat), riwayat penugasan sekolah, serta pembaruan kata sandi akun SSO Core Aldepos."
      moduleName="Modul Kepegawaian & Core"
      nextPhase="Tahap 30: Profil dan Bersih-bersih"
      icon={User}
      endpoints={[
        'GET /kepegawaian/employees/me/profile',
        'PUT /kepegawaian/employees/me/profile',
        'PUT /core/users/change-password',
      ]}
    />
  );
}
