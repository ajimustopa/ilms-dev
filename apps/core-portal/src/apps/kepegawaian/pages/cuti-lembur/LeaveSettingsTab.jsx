import React, { useState, useEffect } from 'react';
import {
  ListFilter,
  Layers,
  UserCheck,
  Users,
  Settings,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../../../shared/services/api';

import LeaveTypesSection from './settings/LeaveTypesSection';
import LeaveTypeFormModal from './settings/LeaveTypeFormModal';
import LeavePoliciesSection from './settings/LeavePoliciesSection';
import ApprovalProfilesSection from './settings/ApprovalProfilesSection';
import UnitApproversAndDelegationsSection from './settings/UnitApproversAndDelegationsSection';
import EmployeeCompletenessSection from './settings/EmployeeCompletenessSection';
import GeneralSettingsSection from './settings/GeneralSettingsSection';
import OvertimeSettingsSection from './settings/OvertimeSettingsSection';
import { Clock } from 'lucide-react';

export default function LeaveSettingsTab({ activeSchoolUnit }) {
  const [subTab, setSubTab] = useState('types'); // 'types' | 'policies' | 'profiles' | 'approvers' | 'completeness' | 'overtime' | 'general'
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [approvalProfiles, setApprovalProfiles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal for Leave Type Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const [typesRes, profRes, empsRes] = await Promise.all([
        api.get('/kepegawaian/leave-types'),
        api.get('/kepegawaian/approval-profiles'),
        api.get('/kepegawaian/employees?per_page=100').catch(() => ({ data: { data: [] } }))
      ]);

      if (typesRes.data?.success) setLeaveTypes(typesRes.data.data || []);
      if (profRes.data?.success) setApprovalProfiles(profRes.data.data || []);
      if (empsRes.data?.success) {
        setEmployees(empsRes.data.data?.items || empsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch leave settings master data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, [activeSchoolUnit]);

  const handleOpenCreate = () => {
    setEditingType(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (type) => {
    setEditingType(type);
    setIsModalOpen(true);
  };

  const handleSuccess = (data, message) => {
    setToastMessage(message || 'Konfigurasi berhasil disimpan');
    fetchAllSettings();
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            &times;
          </button>
        </div>
      )}

      {/* Sub Navigation Bar */}
      <div className="p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('types')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              subTab === 'types'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Jenis Cuti & Izin</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/30 text-[10px]">
              {leaveTypes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('policies')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              subTab === 'policies'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Jatah & Kebijakan</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('profiles')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              subTab === 'profiles'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Alur Persetujuan</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/30 text-[10px]">
              {approvalProfiles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('approvers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              subTab === 'approvers'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Kepala Sekolah & Delegasi</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('completeness')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              subTab === 'completeness'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kelengkapan Data Pegawai</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('overtime')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              subTab === 'overtime'
                ? 'bg-secondary text-on-secondary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Aturan Lembur</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('general')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              subTab === 'general'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan Umum</span>
          </button>
        </div>

        <button
          type="button"
          onClick={fetchAllSettings}
          disabled={loading}
          className="p-2 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors"
          title="Segarkan Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}
      {subTab === 'types' && (
        <LeaveTypesSection
          leaveTypes={leaveTypes}
          loading={loading}
          onRefresh={fetchAllSettings}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          approvalProfiles={approvalProfiles}
        />
      )}

      {subTab === 'policies' && (
        <LeavePoliciesSection
          activeSchoolUnit={activeSchoolUnit}
        />
      )}

      {subTab === 'profiles' && (
        <ApprovalProfilesSection
          approvalProfiles={approvalProfiles}
          leaveTypes={leaveTypes}
          loading={loading}
          onRefresh={fetchAllSettings}
        />
      )}

      {subTab === 'approvers' && (
        <UnitApproversAndDelegationsSection
          activeSchoolUnit={activeSchoolUnit}
          employees={employees}
        />
      )}

      {subTab === 'completeness' && (
        <EmployeeCompletenessSection
          activeSchoolUnit={activeSchoolUnit}
          employees={employees}
        />
      )}

      {subTab === 'overtime' && (
        <OvertimeSettingsSection
          activeSchoolUnit={activeSchoolUnit}
        />
      )}

      {subTab === 'general' && (
        <GeneralSettingsSection
          activeSchoolUnit={activeSchoolUnit}
        />
      )}

      {/* Modal Form Tambah / Ubah Jenis Cuti */}
      <LeaveTypeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        editingType={editingType}
        approvalProfiles={approvalProfiles}
      />
    </div>
  );
}
