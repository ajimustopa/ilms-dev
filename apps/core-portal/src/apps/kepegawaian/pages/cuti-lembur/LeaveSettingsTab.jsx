import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Shield,
  Layers,
  Edit2,
  Users,
  Settings,
  Plus,
  X
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function LeaveSettingsTab({ activeSchoolUnit }) {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, profRes] = await Promise.all([
        api.get('/kepegawaian/leave-types'),
        api.get('/kepegawaian/approval-profiles')
      ]);

      if (typesRes.data?.success) setLeaveTypes(typesRes.data.data || []);
      if (profRes.data?.success) setProfiles(profRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch leave settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSchoolUnit]);

  const handleToggleActive = async (typeId, currentStatus) => {
    try {
      await api.patch(`/kepegawaian/leave-types/${typeId}/active`, {
        is_active: !currentStatus
      });
      fetchData();
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal mengubah status jenis cuti');
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Master Jenis Cuti */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Master Jenis Cuti & Izin</h3>
            <p className="text-xs text-slate-500">Konfigurasi batas hari, syarat lampiran, pemotongan saldo, dan profil approval</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama Jenis Cuti</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-center">Hitung Hari</th>
                <th className="py-3.5 px-4 text-center">Potong Saldo</th>
                <th className="py-3.5 px-4">Batas Maksimal</th>
                <th className="py-3.5 px-4">Lampiran</th>
                <th className="py-3.5 px-4">Profil Approval</th>
                <th className="py-3.5 px-4 text-center">Status Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat jenis cuti...
                  </td>
                </tr>
              ) : (
                leaveTypes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{item.code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-medium">
                      {item.count_mode === 'calendar_days' ? 'Hari Kalender' : 'Hari Kerja (HK)'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.deducts_balance ? (
                        <span className="text-xs font-bold text-indigo-600">Ya</span>
                      ) : (
                        <span className="text-xs text-slate-400">Tidak</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {item.max_days_per_request ? `${item.max_days_per_request} hari/pengajuan` : 'Sesuai Kebutuhan'}
                    </td>
                    <td className="py-3.5 px-4 text-xs capitalize text-slate-600">
                      {item.attachment_rule?.replace('_', ' ') || 'none'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {item.approval_profile_name || 'Standar HRD'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(item.id, item.is_active)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          item.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Profil Approval */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Alur Persetujuan (Approval Profiles)</h3>
          <p className="text-xs text-slate-500">Daftar tahapan berjenjang (Atasan Langsung, Kepala Sekolah, Pool HRD)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profiles.map((prof) => (
            <div key={prof.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900">{prof.name}</h4>
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{prof.code}</span>
              </div>

              <div className="space-y-2 pt-2">
                {prof.steps && prof.steps.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                      {st.step_no}
                    </span>
                    <span className="font-medium">{st.step_name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
