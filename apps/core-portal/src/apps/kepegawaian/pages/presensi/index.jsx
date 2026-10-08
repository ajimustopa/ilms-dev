import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  CalendarCheck
} from 'lucide-react';
import usePresensi from './usePresensi';
import presensiService from './presensiService';
import PresensiHeader from './components/PresensiHeader';
import PresensiStatCards from './components/PresensiStatCards';
import PresensiTabNav from './components/PresensiTabNav';
import PresensiFilterBar from './components/PresensiFilterBar';
import TabPresensiHariIni from './tabs/TabPresensiHariIni';
import TabBelumPresensi from './tabs/TabBelumPresensi';
import TabPerluDitindaklanjuti from './tabs/TabPerluDitindaklanjuti';
import TabAntreanKoreksi from './tabs/TabAntreanKoreksi';
import TabRekapBulanan from './tabs/TabRekapBulanan';
import ModalKoreksiPresensi from './components/ModalKoreksiPresensi';
import ModalInputPresensiManual from './components/ModalInputPresensiManual';
import ModalReviewKlarifikasi from './components/ModalReviewKlarifikasi';
import DrawerDetailPresensi from './components/DrawerDetailPresensi';
import ModalTutupPeriode from './components/ModalTutupPeriode';

export default function PresensiPage() {
  const p = usePresensi();

  // Handler: Self Check-In
  const handleSelfCheckIn = async () => {
    try {
      const res = await presensiService.selfCheckIn({
        school_unit_id: p.effectiveSchoolUnitId || 1
      });
      if (res?.success) {
        p.notifySuccess('Check-In mandiri berhasil dicatat!');
        p.fetchData();
        p.fetchSummary();
      }
    } catch (err) {
      p.notifyError(err.response?.data?.message || 'Gagal melakukan check-in');
    }
  };

  // Handler: Check-Out
  const handleCheckOut = async (id) => {
    try {
      const res = await presensiService.checkOut(id, {});
      if (res?.success) {
        p.notifySuccess('Check-Out berhasil dicatat!');
        p.fetchData();
        p.fetchSummary();
      }
    } catch (err) {
      p.notifyError(err.response?.data?.message || 'Gagal check-out');
    }
  };

  // Handler: Quick Mark Attendance (Tab Belum Presensi)
  const handleQuickMark = async (data) => {
    try {
      const res = await presensiService.quickMarkAttendance({
        ...data,
        school_unit_id: p.effectiveSchoolUnitId || 1
      });
      if (res?.success) {
        p.notifySuccess('Status presensi berhasil diperbarui!');
        p.fetchData();
        p.fetchSummary();
      }
    } catch (err) {
      p.notifyError(err.response?.data?.message || 'Gagal menandai presensi');
    }
  };

  // Handler: Resolve Anomaly (Tab Perlu Ditindaklanjuti)
  const handleResolveAnomaly = async (id, data) => {
    try {
      const res = await presensiService.resolveAnomaly(id, data);
      if (res?.success) {
        p.notifySuccess('Anomali presensi berhasil diselesaikan!');
        p.fetchData();
        p.fetchSummary();
      }
    } catch (err) {
      p.notifyError(err.response?.data?.message || 'Gagal menyelesaikan anomali');
    }
  };

  // Handler: Save Manual Entry (Single)
  const handleSaveSingleManual = async (formData) => {
    const res = await presensiService.createManualEntry(formData);
    if (res?.success) {
      p.notifySuccess('Presensi pegawai berhasil disimpan!');
      p.fetchData();
      p.fetchSummary();
    }
  };

  // Handler: Save Manual Entry (Bulk)
  const handleSaveBulkManual = async (formData) => {
    const res = await presensiService.createBulkManualEntry(formData);
    if (res?.success) {
      p.notifySuccess(`Presensi masal (${res.data?.count || 'beberapa'}) pegawai berhasil disimpan!`);
      p.fetchData();
      p.fetchSummary();
    }
  };

  // Handler: Save Correction
  const handleSaveCorrection = async (id, formData) => {
    const res = await presensiService.updateAttendance(id, formData);
    if (res?.success) {
      p.notifySuccess('Koreksi presensi berhasil disimpan!');
      p.fetchData();
      p.fetchSummary();
    }
  };

  // Handler: Review Clarification
  const handleReviewClarification = async (id, data) => {
    const res = await presensiService.reviewClarification(id, data);
    if (res?.success) {
      p.notifySuccess(`Klarifikasi lupa absen berhasil di-${data.status === 'approved' ? 'setujui' : 'tolak'}!`);
      p.fetchData();
      p.fetchSummary();
    }
  };

  // Handler: Export to Excel
  const handleExportExcel = async () => {
    try {
      const params = {
        month: p.rekapMonth,
        year: p.rekapYear,
        date_from: p.dateFrom,
        date_to: p.dateTo
      };
      if (p.effectiveSchoolUnitId) params.school_unit_id = p.effectiveSchoolUnitId;

      const response = await presensiService.exportExcel(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Rekap_Presensi_Aldepos_${p.rekapYear}_${String(p.rekapMonth).padStart(2, '0')}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      p.notifySuccess('File rekapitulasi presensi Excel berhasil diunduh.');
    } catch (err) {
      p.notifyError('Gagal mengunduh file Excel presensi');
    }
  };

  const handleExportPdf = async () => {
    try {
      const params = {
        month: p.rekapMonth,
        year: p.rekapYear
      };
      if (p.effectiveSchoolUnitId) params.school_unit_id = p.effectiveSchoolUnitId;

      const response = await presensiService.exportPdf(params);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Laporan_Rekap_Presensi_Aldepos_${p.rekapYear}_${String(p.rekapMonth).padStart(2, '0')}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      p.notifySuccess('File laporan presensi PDF resmi berhasil diunduh.');
    } catch (err) {
      p.notifyError('Gagal mengunduh file PDF presensi');
    }
  };

  // Handler: Card Click to Filter
  const handleCardClick = (cardId) => {
    if (cardId === 'all') {
      p.setStatusFilter('');
      p.setIsAnomalyOnly(false);
      p.setActiveTab('today');
    } else if (cardId === 'not_checked_in') {
      p.setActiveTab('absent');
    } else if (cardId === 'late' || cardId === 'absent') {
      p.setStatusFilter(cardId);
      p.setActiveTab('today');
    } else {
      p.setStatusFilter(cardId);
      p.setActiveTab('today');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Breadcrumb & Actions */}
      <PresensiHeader
        loading={p.loading}
        periodStatus={p.periodReadiness?.status || 'review'}
        onRefresh={() => {
          p.fetchData();
          p.fetchSummary();
          p.fetchPeriodReadiness();
        }}
        onSelfCheckIn={handleSelfCheckIn}
        onOpenManualModal={() => p.setIsManualModalOpen(true)}
        onOpenLockModal={() => p.setIsLockModalOpen(true)}
      />

      {/* Alerts */}
      {p.errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{p.errorMsg}</span>
        </div>
      )}

      {p.successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{p.successMsg}</span>
        </div>
      )}

      {/* 2. 7 Horizontal KPI Summary Cards */}
      <PresensiStatCards
        summary={p.summary}
        loading={p.summaryLoading}
        onCardClick={handleCardClick}
        activeStatusFilter={p.statusFilter}
      />

      {/* 3. Tab Navigation */}
      <PresensiTabNav
        activeTab={p.activeTab}
        onTabChange={p.setActiveTab}
        counts={{
          today: p.summary.present_count + p.summary.late_count,
          not_checked_in_count: p.summary.not_checked_in_count,
          anomalies_count: p.anomalies.length > 0 ? p.anomalies.length : null,
          clarifications_count: p.clarificationCounts?.pending || null
        }}
      />

      {/* 4. Filter Bar (hanya jika bukan tab rekap bulanan atau antrean koreksi yang punya toolbar terdedikasi) */}
      {p.activeTab !== 'monthly' && p.activeTab !== 'clarifications' && (
        <PresensiFilterBar
          dateFrom={p.dateFrom}
          setDateFrom={p.setDateFrom}
          dateTo={p.dateTo}
          setDateTo={p.setDateTo}
          onApplyPreset={p.applyDatePreset}
          searchQuery={p.searchQuery}
          setSearchQuery={p.setSearchQuery}
          statusFilter={p.statusFilter}
          setStatusFilter={p.setStatusFilter}
          sourceFilter={p.sourceFilter}
          setSourceFilter={p.setSourceFilter}
          unitFilter={p.unitFilter}
          setUnitFilter={p.setUnitFilter}
          isAnomalyOnly={p.isAnomalyOnly}
          setIsAnomalyOnly={p.setIsAnomalyOnly}
          onReset={p.resetFilters}
          onExportExcel={handleExportExcel}
          schoolUnits={p.schoolUnits}
          activeTab={p.activeTab}
        />
      )}

      {/* 5. Tab Content Area */}
      {p.activeTab === 'today' && (
        <TabPresensiHariIni
          attendances={p.attendances}
          loading={p.loading}
          pagination={p.pagination}
          onPageChange={p.setPage}
          onPerPageChange={p.setPerPage}
          onCheckOut={handleCheckOut}
          onOpenCorrectModal={(att) => {
            p.setSelectedAttendance(att);
            p.setIsCorrectModalOpen(true);
          }}
          onOpenReviewModal={(att) => {
            p.setSelectedClarification(att);
            p.setIsReviewModalOpen(true);
          }}
          onOpenDetailDrawer={p.openDetailDrawer}
        />
      )}

      {p.activeTab === 'absent' && (
        <TabBelumPresensi
          candidates={p.absentCandidates}
          loading={p.loading}
          onQuickMark={handleQuickMark}
          date={p.dateFrom}
        />
      )}

      {p.activeTab === 'anomalies' && (
        <TabPerluDitindaklanjuti
          anomalies={p.anomalies}
          anomalySummary={p.anomalySummary}
          loading={p.loading}
          onResolveAnomaly={handleResolveAnomaly}
          onOpenDetailDrawer={p.openDetailDrawer}
          onRefresh={() => {
            p.fetchData();
            p.fetchSummary();
          }}
        />
      )}

      {p.activeTab === 'clarifications' && (
        <TabAntreanKoreksi
          clarifications={p.clarifications}
          counts={p.clarificationCounts}
          loading={p.loading}
          onRefresh={() => {
            p.fetchData();
            p.fetchSummary();
          }}
          onOpenReviewModal={(item) => {
            p.setSelectedClarification(item);
            p.setIsReviewModalOpen(true);
          }}
        />
      )}

      {p.activeTab === 'monthly' && (
        <TabRekapBulanan
          monthlySummary={p.monthlySummary}
          monthlyMatrix={p.monthlyMatrix}
          monthlyTrends={p.monthlyTrends}
          loading={p.loading}
          month={p.rekapMonth}
          setMonth={p.setRekapMonth}
          year={p.rekapYear}
          setYear={p.setRekapYear}
          searchQuery={p.searchQuery}
          setSearchQuery={p.setSearchQuery}
          unitFilter={p.unitFilter}
          setUnitFilter={p.setUnitFilter}
          positionFilter={p.positionFilter}
          setPositionFilter={p.setPositionFilter}
          schoolUnits={p.schoolUnits}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
          onOpenDetailDrawer={p.openDetailDrawer}
        />
      )}

      {/* 6. Modals & Drawer */}
      <ModalInputPresensiManual
        isOpen={p.isManualModalOpen}
        onClose={() => p.setIsManualModalOpen(false)}
        employees={p.employeesMaster}
        onSaveSingle={handleSaveSingleManual}
        onSaveBulk={handleSaveBulkManual}
        activeSchoolUnitId={p.effectiveSchoolUnitId}
      />

      <ModalKoreksiPresensi
        isOpen={p.isCorrectModalOpen}
        onClose={() => {
          p.setIsCorrectModalOpen(false);
          p.setSelectedAttendance(null);
        }}
        attendance={p.selectedAttendance}
        onSave={handleSaveCorrection}
      />

      <ModalReviewKlarifikasi
        isOpen={p.isReviewModalOpen}
        onClose={() => {
          p.setIsReviewModalOpen(false);
          p.setSelectedClarification(null);
        }}
        clarification={p.selectedClarification}
        onReview={handleReviewClarification}
      />

      <ModalTutupPeriode
        isOpen={p.isLockModalOpen}
        onClose={() => p.setIsLockModalOpen(false)}
        schoolUnitId={p.effectiveSchoolUnitId}
        user={p.user}
        onNavigateTab={(tabName, filterType) => {
          if (tabName) p.setActiveTab(tabName);
          if (filterType) p.setStatusFilter(filterType);
        }}
        onExportDraft={handleExportExcel}
        onSuccess={() => {
          p.notifySuccess('Status periode presensi berhasil diperbarui!');
          p.fetchData();
          p.fetchSummary();
          p.fetchPeriodReadiness();
        }}
      />

      <DrawerDetailPresensi
        isOpen={p.isDrawerOpen}
        onClose={() => {
          p.setIsDrawerOpen(false);
          p.setSelectedAttendance(null);
        }}
        data={p.drawerData}
        loading={p.drawerLoading}
        onOpenCorrectModal={(att) => {
          p.setSelectedAttendance(att);
          p.setIsCorrectModalOpen(true);
        }}
      />
    </div>
  );
}
