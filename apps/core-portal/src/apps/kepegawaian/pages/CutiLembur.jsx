import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  CalendarRange,
  Clock,
  PieChart,
  Calendar as CalendarIcon,
  FileText,
  Sliders,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Settings
} from 'lucide-react';
import api from '../../../shared/services/api';

import LeaveRequestsTab from './cuti-lembur/LeaveRequestsTab';
import LeaveBalancesTab from './cuti-lembur/LeaveBalancesTab';
import OvertimeTab from './cuti-lembur/OvertimeTab';
import HolidaysTab from './cuti-lembur/HolidaysTab';
import LeaveSettingsTab from './cuti-lembur/LeaveSettingsTab';
import LeaveReportsTab from './cuti-lembur/LeaveReportsTab';
import KalenderKetidakhadiranTab from './cuti-lembur/KalenderKetidakhadiranTab';
import CreateLeaveModal from './cuti-lembur/CreateLeaveModal';
import CreateOvertimeModal from './cuti-lembur/CreateOvertimeModal';

export default function CutiLembur() {
  const { user, activeSchoolUnit } = useAuth();
  const [activeTab, setActiveTab] = useState('leaves');

  // Master Data State
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingOvertimeCount, setPendingOvertimeCount] = useState(0);

  // Modals State
  const [isCreateLeaveModalOpen, setIsCreateLeaveModalOpen] = useState(false);
  const [isCreateOvertimeModalOpen, setIsCreateOvertimeModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const permissions = user?.permissions || [];
  const isHr = permissions.includes('kepegawaian.leave_requests.manage') ||
               permissions.includes('kepegawaian.leave_requests.override') ||
               permissions.includes('kepegawaian.leave_types.manage') ||
               user?.role === 'super_admin' ||
               user?.role === 'hrd' ||
               user?.role === 'admin_satuan_pendidikan';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Master Data & Badges
  const fetchMasterData = async () => {
    try {
      let q = '';
      if (activeSchoolUnit?.id) q = `?school_unit_id=${activeSchoolUnit.id}`;

      const [typesRes, empsRes, leavesRes, overtimesRes] = await Promise.all([
        api.get('/kepegawaian/leave-types'),
        api.get(`/kepegawaian/employees${q ? q + '&per_page=200' : '?per_page=200'}`),
        api.get(`/kepegawaian/leave-requests${q ? q + '&status=pending' : '?status=pending'}`),
        api.get(`/kepegawaian/overtimes${q ? q + '&status=pending' : '?status=pending'}`)
      ]);

      if (typesRes.data?.success) setLeaveTypes(typesRes.data.data || []);
      if (empsRes.data?.success) setEmployees(empsRes.data.data.items || empsRes.data.data || []);
      if (leavesRes.data?.success) setPendingLeaveCount((leavesRes.data.data || []).length);
      if (overtimesRes.data?.success) setPendingOvertimeCount((overtimesRes.data.data || []).length);
    } catch (err) {
      console.error('Failed to fetch master data:', err);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [activeSchoolUnit]);

  // Tab Definitions matching precision design
  const tabs = [
    { id: 'leaves', label: 'Pengajuan Cuti & Izin', icon: CalendarRange, badge: pendingLeaveCount },
    { id: 'overtimes', label: 'Penugasan Lembur', icon: Clock, badge: pendingOvertimeCount },
    { id: 'balances', label: 'Saldo Cuti', icon: PieChart },
    { id: 'calendar', label: 'Kalender Ketidakhadiran', icon: CalendarIcon },
    { id: 'reports', label: 'Laporan & Analitik', icon: FileText },
    { id: 'holidays', label: 'Hari Libur', icon: CalendarRange },
    ...(isHr ? [{ id: 'settings', label: 'Pengaturan', icon: Sliders }] : [])
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto min-h-screen">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Cuti, Izin & Lembur</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola permohonan ketidakhadiran kerja dan penugasan lembur pegawai terintegrasi
          </p>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchMasterData}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center shadow-2xs active:scale-95"
            title="Muat Ulang Data"
            type="button"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isHr && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs ${
                activeTab === 'settings' ? 'bg-slate-100 text-slate-900 font-bold' : ''
              }`}
              type="button"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Pengaturan</span>
            </button>
          )}

          {activeTab === 'overtimes' ? (
            <button
              onClick={() => setIsCreateOvertimeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors active:scale-95"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tugaskan Lembur</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCreateLeaveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors active:scale-95"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Cuti / Izin</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Tabs Navigation Bar */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-1 shadow-2xs">
        <div className="flex items-center gap-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-3 pt-3 flex items-center gap-2 text-xs transition-colors focus:outline-none whitespace-nowrap ${
                  isActive
                    ? 'text-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
                type="button"
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {Boolean(tab.badge) && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full font-bold text-[10px] leading-none ${
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-indigo-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Content View */}
      <div className="animate-in fade-in duration-150">
        {activeTab === 'leaves' && (
          <LeaveRequestsTab
            currentUser={user}
            activeSchoolUnit={activeSchoolUnit}
            leaveTypes={leaveTypes}
            employees={employees}
            onOpenCreateModal={() => setIsCreateLeaveModalOpen(true)}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'overtimes' && (
          <OvertimeTab
            currentUser={user}
            activeSchoolUnit={activeSchoolUnit}
            employees={employees}
            onRefresh={fetchMasterData}
            onOpenCreateModal={() => setIsCreateOvertimeModalOpen(true)}
          />
        )}

        {activeTab === 'balances' && (
          <LeaveBalancesTab />
        )}

        {activeTab === 'calendar' && (
          <KalenderKetidakhadiranTab activeSchoolUnit={activeSchoolUnit} currentUser={user} />
        )}

        {activeTab === 'reports' && (
          <LeaveReportsTab activeSchoolUnit={activeSchoolUnit} />
        )}

        {activeTab === 'holidays' && (
          <HolidaysTab />
        )}

        {activeTab === 'settings' && isHr && (
          <LeaveSettingsTab activeSchoolUnit={activeSchoolUnit} />
        )}
      </div>

      {/* Modal Ajukan Cuti */}
      <CreateLeaveModal
        isOpen={isCreateLeaveModalOpen}
        onClose={() => setIsCreateLeaveModalOpen(false)}
        currentUser={user}
        employees={employees}
        leaveTypes={leaveTypes}
        onSuccess={(msg) => {
          showToast(msg);
          fetchMasterData();
        }}
      />

      {/* Modal Penugasan Lembur */}
      <CreateOvertimeModal
        isOpen={isCreateOvertimeModalOpen}
        onClose={() => setIsCreateOvertimeModalOpen(false)}
        employees={employees}
        onSuccess={(msg) => {
          showToast(msg);
          fetchMasterData();
        }}
      />
    </div>
  );
}
