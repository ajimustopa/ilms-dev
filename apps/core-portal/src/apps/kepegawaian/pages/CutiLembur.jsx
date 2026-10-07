import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  CalendarRange,
  Clock,
  BookOpen,
  Calendar as CalendarIcon,
  Sliders,
  BarChart3,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import api from '../../../shared/services/api';

import LeaveRequestsTab from './cuti-lembur/LeaveRequestsTab';
import LeaveBalancesTab from './cuti-lembur/LeaveBalancesTab';
import OvertimeTab from './cuti-lembur/OvertimeTab';
import HolidaysTab from './cuti-lembur/HolidaysTab';
import LeaveSettingsTab from './cuti-lembur/LeaveSettingsTab';
import LeaveReportsTab from './cuti-lembur/LeaveReportsTab';
import CreateLeaveModal from './cuti-lembur/CreateLeaveModal';
import CreateOvertimeModal from './cuti-lembur/CreateOvertimeModal';

export default function CutiLembur() {
  const { user, activeSchoolUnit } = useAuth();
  const [activeTab, setActiveTab] = useState('leaves');

  // Global state for leave requests and overtimes
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const [overtimes, setOvertimes] = useState([]);
  const [loadingOvertimes, setLoadingOvertimes] = useState(true);

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Modals
  const [isCreateLeaveModalOpen, setIsCreateLeaveModalOpen] = useState(false);
  const [isCreateOvertimeModalOpen, setIsCreateOvertimeModalOpen] = useState(false);

  const [notification, setNotification] = useState(null);

  const isHr = user?.permissions?.includes('kepegawaian.leave_requests.manage') ||
               user?.permissions?.includes('kepegawaian.leave_types.manage') ||
               user?.role === 'super_admin' ||
               user?.role === 'hrd' ||
               user?.role === 'admin_satuan_pendidikan';

  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      let q = '';
      if (activeSchoolUnit?.id) q = `?school_unit_id=${activeSchoolUnit.id}`;
      const res = await api.get(`/kepegawaian/leave-requests${q}`);
      if (res.data?.success) {
        setLeaves(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const fetchOvertimes = async () => {
    setLoadingOvertimes(true);
    try {
      let q = '';
      if (activeSchoolUnit?.id) q = `?school_unit_id=${activeSchoolUnit.id}`;
      const res = await api.get(`/kepegawaian/overtimes${q}`);
      if (res.data?.success) {
        setOvertimes(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch overtimes:', err);
    } finally {
      setLoadingOvertimes(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [typesRes, empsRes] = await Promise.all([
        api.get('/kepegawaian/leave-types'),
        api.get('/kepegawaian/employees?per_page=100')
      ]);
      if (typesRes.data?.success) setLeaveTypes(typesRes.data.data || []);
      if (empsRes.data?.success) setEmployees(empsRes.data.data.items || empsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch master data:', err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchOvertimes();
    fetchMasterData();
  }, [activeSchoolUnit]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const tabs = [
    { id: 'leaves', label: 'Permohonan Cuti & Izin', icon: CalendarRange },
    { id: 'balances', label: 'Saldo & Jatah Cuti', icon: BookOpen },
    { id: 'overtimes', label: 'Lembur Pegawai', icon: Clock },
    { id: 'holidays', label: 'Kalender Libur & Cuti Bersama', icon: CalendarIcon },
    { id: 'settings', label: 'Master & Kebijakan', icon: Sliders },
    { id: 'reports', label: 'Laporan & Analitik', icon: BarChart3 }
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between shadow-md transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span>{notification.msg}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Cuti, Izin & Lembur</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pusat persetujuan berjenjang, perhitungan saldo pro-rata otomatis, dan integrasi kalender kerja
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchLeaves();
              fetchOvertimes();
              showNotification('Data berhasil disegarkan!');
            }}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl shadow-xs transition-colors"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsCreateLeaveModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Ajukan Cuti / Izin
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-3 px-1 inline-flex items-center gap-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'leaves' && (
        <LeaveRequestsTab
          leaves={leaves}
          loading={loadingLeaves}
          leaveTypes={leaveTypes}
          employees={employees}
          onRefresh={fetchLeaves}
          onOpenCreateModal={() => setIsCreateLeaveModalOpen(true)}
        />
      )}

      {activeTab === 'balances' && (
        <LeaveBalancesTab activeSchoolUnit={activeSchoolUnit} />
      )}

      {activeTab === 'overtimes' && (
        <OvertimeTab
          overtimes={overtimes}
          loading={loadingOvertimes}
          employees={employees}
          onRefresh={fetchOvertimes}
          onOpenCreateModal={() => setIsCreateOvertimeModalOpen(true)}
        />
      )}

      {activeTab === 'holidays' && (
        <HolidaysTab activeSchoolUnit={activeSchoolUnit} />
      )}

      {activeTab === 'settings' && (
        <LeaveSettingsTab activeSchoolUnit={activeSchoolUnit} />
      )}

      {activeTab === 'reports' && (
        <LeaveReportsTab activeSchoolUnit={activeSchoolUnit} />
      )}

      {/* Create Leave Modal */}
      <CreateLeaveModal
        isOpen={isCreateLeaveModalOpen}
        onClose={() => setIsCreateLeaveModalOpen(false)}
        leaveTypes={leaveTypes}
        employees={employees}
        onSuccess={() => {
          fetchLeaves();
          showNotification('Permohonan cuti/izin berhasil diajukan!');
        }}
        isHr={isHr}
      />

      {/* Create Overtime Modal */}
      <CreateOvertimeModal
        isOpen={isCreateOvertimeModalOpen}
        onClose={() => setIsCreateOvertimeModalOpen(false)}
        employees={employees}
        onSuccess={() => {
          fetchOvertimes();
          showNotification('Pengajuan lembur berhasil diajukan!');
        }}
        isHr={isHr}
      />
    </div>
  );
}
