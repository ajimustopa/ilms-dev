import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Calendar,
  Users,
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
  Save,
  CheckCircle2,
  Search,
  Building2,
  Clock,
  School,
  RotateCw
} from 'lucide-react';

export default function MasterAkademik() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit } = useAuth();
  
  // Satuan Pendidikan Lokal Terpilih
  const [currentUnitId, setCurrentUnitId] = useState('');

  const [activeTab, setActiveTab] = useState('tahun_ajaran');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Data Tahun Ajaran
  const [academicYears, setAcademicYears] = useState([]);
  const [showYearModal, setShowYearModal] = useState(false);
  const [yearForm, setYearForm] = useState({ id: null, name: '', start_date: '', end_date: '', is_active: false });

  // 2. Data Semester
  const [semesters, setSemesters] = useState([]);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [semesterForm, setSemesterForm] = useState({
    id: null,
    academic_year_id: '',
    name: 'Semester Ganjil',
    start_date: '',
    end_date: '',
    is_active: false
  });
  const [filterYearForSemester, setFilterYearForSemester] = useState('');

  // 3. Data Angkatan (Cohorts)
  const [cohorts, setCohorts] = useState([]);
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [cohortForm, setCohortForm] = useState({ id: null, year: '', name: '', description: '', is_active: true });

  // 4. Data Tingkat Kelas (Grade Levels)
  const [gradeLevels, setGradeLevels] = useState([]);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeForm, setGradeForm] = useState({ id: null, name: '', order: 1, is_active: true });

  // Inisialisasi unit yang aktif
  useEffect(() => {
    if (activeSchoolUnit?.id) {
      setCurrentUnitId(activeSchoolUnit.id);
    } else if (schoolUnits && schoolUnits.length > 0) {
      setCurrentUnitId(schoolUnits[0].id);
    }
  }, [activeSchoolUnit, schoolUnits]);

  useEffect(() => {
    if (currentUnitId) {
      fetchAllMaster(currentUnitId);
    }
  }, [currentUnitId]);

  const fetchAllMaster = async (unitId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = { satuan_pendidikan_id: unitId };
      const [yRes, sRes, cRes, gRes] = await Promise.all([
        api.get('/akademik/academic-years', { params }),
        api.get('/akademik/semesters', { params }),
        api.get('/akademik/cohorts', { params }),
        api.get('/akademik/grade-levels', { params: { ...params, include_inactive: true } })
      ]);

      const years = yRes.data?.data || [];
      setAcademicYears(years);
      setSemesters(sRes.data?.data || []);
      setCohorts(cRes.data?.data || []);
      setGradeLevels(gRes.data?.data || []);

      const activeY = years.find((y) => y.is_active) || years[0];
      if (activeY) {
        setFilterYearForSemester(activeY.id);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data master akademik');
    } finally {
      setLoading(false);
    }
  };

  const handleUnitChange = (unitId) => {
    setCurrentUnitId(unitId);
    const selected = schoolUnits?.find(u => u.id === Number(unitId));
    if (selected && changeActiveSchoolUnit) {
      changeActiveSchoolUnit(selected);
    }
  };

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // --- CRUD TAHUN AJARAN ---
  const handleSaveYear = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...yearForm,
        satuan_pendidikan_id: Number(currentUnitId)
      };
      if (yearForm.id) {
        await api.put(`/akademik/academic-years/${yearForm.id}`, payload);
        showNotification('Tahun ajaran berhasil diperbarui');
      } else {
        await api.post('/akademik/academic-years', payload);
        showNotification('Tahun ajaran baru berhasil ditambahkan');
      }
      setShowYearModal(false);
      fetchAllMaster(currentUnitId);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tahun ajaran');
    }
  };

  const handleActivateYear = async (yearId) => {
    try {
      await api.put(`/akademik/academic-years/${yearId}/activate`);
      showNotification('Tahun ajaran aktif berhasil disetel');
      fetchAllMaster(currentUnitId);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengaktifkan tahun ajaran');
    }
  };

  const handleDeleteYear = async (yearId) => {
    if (confirm('Hapus tahun ajaran ini?')) {
      try {
        await api.delete(`/akademik/academic-years/${yearId}`);
        showNotification('Tahun ajaran berhasil dihapus');
        fetchAllMaster(currentUnitId);
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus');
      }
    }
  };

  // --- CRUD SEMESTER ---
  const handleSaveSemester = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...semesterForm,
        satuan_pendidikan_id: Number(currentUnitId)
      };
      if (semesterForm.id) {
        await api.put(`/akademik/semesters/${semesterForm.id}`, payload);
        showNotification('Data semester berhasil diperbarui');
      } else {
        await api.post('/akademik/semesters', payload);
        showNotification('Semester baru berhasil ditambahkan');
      }
      setShowSemesterModal(false);
      fetchAllMaster(currentUnitId);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan semester');
    }
  };

  const handleActivateSemester = async (semesterId) => {
    try {
      await api.put(`/akademik/semesters/${semesterId}/activate`);
      showNotification('Semester aktif berhasil disetel');
      fetchAllMaster(currentUnitId);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengaktifkan semester');
    }
  };

  const handleDeleteSemester = async (semesterId) => {
    if (confirm('Hapus semester ini?')) {
      try {
        await api.delete(`/akademik/semesters/${semesterId}`);
        showNotification('Semester berhasil dihapus');
        fetchAllMaster(currentUnitId);
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus');
      }
    }
  };

  // --- CRUD ANGKATAN ---
  const handleSaveCohort = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...cohortForm,
        satuan_pendidikan_id: Number(currentUnitId)
      };
      if (cohortForm.id) {
        await api.put(`/akademik/cohorts/${cohortForm.id}`, payload);
        showNotification('Data angkatan berhasil diperbarui');
      } else {
        await api.post('/akademik/cohorts', payload);
        showNotification('Angkatan baru berhasil ditambahkan');
      }
      setShowCohortModal(false);
      fetchAllMaster(currentUnitId);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan angkatan');
    }
  };

  const handleDeleteCohort = async (cohortId) => {
    if (confirm('Hapus data angkatan ini?')) {
      try {
        await api.delete(`/akademik/cohorts/${cohortId}`);
        showNotification('Angkatan berhasil dihapus');
        fetchAllMaster(currentUnitId);
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus angkatan');
      }
    }
  };

  // --- CRUD TINGKAT KELAS ---
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...gradeForm,
        satuan_pendidikan_id: Number(currentUnitId)
      };
      if (gradeForm.id) {
        await api.put(`/akademik/grade-levels/${gradeForm.id}`, payload);
        showNotification('Tingkat kelas berhasil diperbarui');
      } else {
        await api.post('/akademik/grade-levels', payload);
        showNotification('Tingkat kelas baru berhasil ditambahkan');
      }
      setShowGradeModal(false);
      fetchAllMaster(currentUnitId);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tingkat kelas');
    }
  };

  const handleDeleteGrade = async (gradeId) => {
    if (confirm('Hapus tingkat kelas ini?')) {
      try {
        await api.delete(`/akademik/grade-levels/${gradeId}`);
        showNotification('Tingkat kelas berhasil dihapus');
        fetchAllMaster(currentUnitId);
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus tingkat kelas');
      }
    }
  };

  const handleToggleGradeActive = async (grade) => {
    const newStatus = !grade.is_active;
    try {
      await api.put(`/akademik/grade-levels/${grade.id}`, {
        is_active: newStatus
      });
      showNotification(`Tingkat kelas ${grade.name} berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchAllMaster(currentUnitId);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui status tingkat kelas');
    }
  };

  const selectedUnitObj = schoolUnits?.find(u => u.id === Number(currentUnitId)) || activeSchoolUnit;

  const tabs = [
    { id: 'tahun_ajaran', label: 'Tahun Ajaran', icon: Calendar, count: academicYears.length },
    { id: 'semester', label: 'Semester Belajar', icon: Clock, count: semesters.length },
    { id: 'angkatan', label: 'Angkatan Siswa (Cohorts)', icon: Users, count: cohorts.length },
    { id: 'tingkat_kelas', label: 'Tingkat / Jenjang Kelas', icon: Layers, count: gradeLevels.length }
  ];

  const filteredSemesters = semesters.filter(s => {
    return !filterYearForSemester || s.academic_year_id === Number(filterYearForSemester);
  });

  return (
    <div className="space-y-6">
      {/* Selector Satuan Pendidikan & Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span>Master Data Akademik</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan Tahun Ajaran, Semester, Angkatan, dan Tingkat Kelas per Satuan Pendidikan.
          </p>
        </div>

        {/* Pemilih Satuan Pendidikan & Reload */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchAllMaster(currentUnitId)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan Data Master dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>

          <div className="flex items-center gap-2 bg-teal-50/80 p-2 rounded-2xl border border-teal-200">
            <School className="w-4 h-4 text-teal-700 ml-1 shrink-0" />
            <span className="text-xs font-bold text-teal-900 whitespace-nowrap">Pilih Sekolah:</span>
            <select
              value={currentUnitId || ''}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-teal-300 rounded-xl text-xs font-extrabold text-teal-950 shadow-2xs focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {schoolUnits && schoolUnits.length > 0 ? (
                schoolUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))
              ) : (
                <option value="1">Satuan Pendidikan Utama</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Banner Info Satuan Pendidikan Aktif */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Data Master Khusus Satuan Pendidikan:
            </div>
            <div className="text-sm font-extrabold text-white">
              {selectedUnitObj?.name || 'Unit Belum Dipilih'}
            </div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded-lg border border-teal-800/80 font-mono">
            Data Terisolasi Per Unit
          </span>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-3" />
          <p className="text-xs">Memuat data master untuk {selectedUnitObj?.name}...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: TAHUN AJARAN */}
          {activeTab === 'tahun_ajaran' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Daftar Tahun Ajaran ({selectedUnitObj?.name})</h3>
                  <p className="text-xs text-slate-500">Tentukan periode kalender belajar dan tahun ajaran aktif pada sekolah ini.</p>
                </div>
                <button
                  onClick={() => {
                    setYearForm({ id: null, name: '', start_date: '', end_date: '', is_active: false });
                    setShowYearModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Tahun Ajaran</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 border-y border-slate-100 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="py-3 px-4 font-bold">Nama Tahun Ajaran</th>
                      <th className="py-3 px-4 font-bold">Tanggal Mulai</th>
                      <th className="py-3 px-4 font-bold">Tanggal Selesai</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {academicYears.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Belum ada data tahun ajaran pada satuan pendidikan ini.
                        </td>
                      </tr>
                    ) : (
                      academicYears.map((y) => (
                        <tr key={y.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-bold text-slate-800">{y.name}</td>
                          <td className="py-3 px-4">{y.start_date ? y.start_date.split('T')[0] : '-'}</td>
                          <td className="py-3 px-4">{y.end_date ? y.end_date.split('T')[0] : '-'}</td>
                          <td className="py-3 px-4">
                            {y.is_active ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✓ Sedang Aktif
                              </span>
                            ) : (
                              <button
                                onClick={() => handleActivateYear(y.id)}
                                className="text-[10px] font-semibold text-teal-600 hover:underline"
                              >
                                Set Sebagai Aktif
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setYearForm({
                                  id: y.id,
                                  name: y.name,
                                  start_date: y.start_date ? y.start_date.split('T')[0] : '',
                                  end_date: y.end_date ? y.end_date.split('T')[0] : '',
                                  is_active: !!y.is_active
                                });
                                setShowYearModal(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteYear(y.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SEMESTER */}
          {activeTab === 'semester' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Daftar Semester Belajar ({selectedUnitObj?.name})</h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi semester belajar pada satuan pendidikan ini dan tetapkan semester yang sedang aktif berjalan.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSemesterForm({
                      id: null,
                      name: 'Semester Ganjil',
                      start_date: '',
                      end_date: '',
                      is_active: false
                    });
                    setShowSemesterModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Semester</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 border-y border-slate-100 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="py-3 px-4 font-bold">Nama Semester</th>
                      <th className="py-3 px-4 font-bold">Tanggal Mulai</th>
                      <th className="py-3 px-4 font-bold">Tanggal Selesai</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {semesters.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Belum ada data semester pada satuan pendidikan ini.
                        </td>
                      </tr>
                    ) : (
                      semesters.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-bold text-slate-800">{s.name}</td>
                          <td className="py-3 px-4">{s.start_date ? s.start_date.split('T')[0] : '-'}</td>
                          <td className="py-3 px-4">{s.end_date ? s.end_date.split('T')[0] : '-'}</td>
                          <td className="py-3 px-4">
                            {s.is_active ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✓ Semester Aktif
                              </span>
                            ) : (
                              <button
                                onClick={() => handleActivateSemester(s.id)}
                                className="text-[10px] font-semibold text-teal-600 hover:underline"
                              >
                                Set Sebagai Aktif
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setSemesterForm({
                                  id: s.id,
                                  name: s.name,
                                  start_date: s.start_date ? s.start_date.split('T')[0] : '',
                                  end_date: s.end_date ? s.end_date.split('T')[0] : '',
                                  is_active: !!s.is_active
                                });
                                setShowSemesterModal(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSemester(s.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ANGKATAN (COHORTS) */}
          {activeTab === 'angkatan' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Daftar Angkatan Siswa ({selectedUnitObj?.name})</h3>
                  <p className="text-xs text-slate-500">
                    Grup angkatan masuk siswa pada sekolah ini yang terintegrasi dengan data peserta didik.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCohortForm({ id: null, year: new Date().getFullYear().toString(), name: `Angkatan ${new Date().getFullYear()}`, description: '', is_active: true });
                    setShowCohortModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Angkatan</span>
                </button>
              </div>

              {cohorts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada data angkatan untuk satuan pendidikan ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {cohorts.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-800">{c.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                          Tahun {c.year}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{c.description || 'Tidak ada keterangan tambahan.'}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className={`text-[10px] font-bold ${c.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {c.is_active ? 'Status: Aktif' : 'Status: Non-aktif'}
                        </span>
                        <div className="space-x-1">
                          <button
                            onClick={() => {
                              setCohortForm({
                                id: c.id,
                                year: c.year,
                                name: c.name,
                                description: c.description || '',
                                is_active: !!c.is_active
                              });
                              setShowCohortModal(true);
                            }}
                            className="p-1 text-slate-600 hover:text-blue-600"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCohort(c.id)}
                            className="p-1 text-slate-600 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TINGKAT KELAS */}
          {activeTab === 'tingkat_kelas' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Daftar Tingkat / Jenjang Kelas ({selectedUnitObj?.name})</h3>
                  <p className="text-xs text-slate-500">Jenjang kelas pada satuan pendidikan ini. Tingkat kelas yang nonaktif tidak akan muncul di pemilihan rombel, kurikulum, dan rapor.</p>
                </div>
                <button
                  onClick={() => {
                    setGradeForm({ id: null, name: '', order: gradeLevels.length + 1, is_active: true });
                    setShowGradeModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Tingkat</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 border-y border-slate-100 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="py-3 px-4 font-bold w-16">Urutan</th>
                      <th className="py-3 px-4 font-bold">Nama Tingkat Kelas</th>
                      <th className="py-3 px-4 font-bold text-center w-36">Status</th>
                      <th className="py-3 px-4 font-bold text-right w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {gradeLevels.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Belum ada tingkat kelas pada satuan pendidikan ini.
                        </td>
                      </tr>
                    ) : (
                      gradeLevels.map((g) => {
                        const isActive = g.is_active !== false && g.is_active !== 0 && g.is_active !== '0';
                        return (
                          <tr key={g.id} className={`hover:bg-slate-50/60 transition ${!isActive ? 'bg-slate-50/50 opacity-70' : ''}`}>
                            <td className="py-3 px-4 font-bold text-slate-800">{g.order}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              <span className={isActive ? 'text-teal-700 font-extrabold' : 'text-slate-500 line-through'}>
                                {g.name}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleGradeActive(g)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition shadow-2xs inline-flex items-center gap-1.5 ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                }`}
                                title={isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                <span>{isActive ? 'Aktif' : 'Nonaktif'}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5">
                              <button
                                onClick={() => {
                                  setGradeForm({ id: g.id, name: g.name, order: g.order, is_active: isActive });
                                  setShowGradeModal(true);
                                }}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Edit Tingkat Kelas"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteGrade(g.id)}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Hapus Tingkat Kelas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL TAHUN AJARAN */}
      {showYearModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {yearForm.id ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
            </h3>
            <p className="text-xs text-teal-700 font-semibold mb-4 pb-2 border-b border-slate-100">
              Satuan Pendidikan: {selectedUnitObj?.name}
            </p>
            <form onSubmit={handleSaveYear} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Tahun Ajaran *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. 2026/2027"
                  value={yearForm.name}
                  onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai *</label>
                <input
                  type="date"
                  required
                  value={yearForm.start_date}
                  onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Selesai *</label>
                <input
                  type="date"
                  required
                  value={yearForm.end_date}
                  onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={yearForm.is_active}
                    onChange={(e) => setYearForm({ ...yearForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-0"
                  />
                  <span>Set Sebagai Tahun Ajaran Aktif di Unit Ini</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  Simpan Tahun Ajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SEMESTER */}
      {showSemesterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {semesterForm.id ? 'Edit Semester' : 'Tambah Semester Baru'}
            </h3>
            <p className="text-xs text-teal-700 font-semibold mb-4 pb-2 border-b border-slate-100">
              Satuan Pendidikan: {selectedUnitObj?.name}
            </p>
            <form onSubmit={handleSaveSemester} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Semester *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Semester Ganjil / Semester Genap"
                  value={semesterForm.name}
                  onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai *</label>
                <input
                  type="date"
                  required
                  value={semesterForm.start_date}
                  onChange={(e) => setSemesterForm({ ...semesterForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Selesai *</label>
                <input
                  type="date"
                  required
                  value={semesterForm.end_date}
                  onChange={(e) => setSemesterForm({ ...semesterForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={semesterForm.is_active}
                    onChange={(e) => setSemesterForm({ ...semesterForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-0"
                  />
                  <span>Set Sebagai Semester Belajar Aktif di Unit Ini</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSemesterModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  Simpan Semester
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANGKATAN */}
      {showCohortModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {cohortForm.id ? 'Edit Data Angkatan' : 'Tambah Angkatan Siswa Baru'}
            </h3>
            <p className="text-xs text-teal-700 font-semibold mb-4 pb-2 border-b border-slate-100">
              Satuan Pendidikan: {selectedUnitObj?.name}
            </p>
            <form onSubmit={handleSaveCohort} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Angkatan Masuk *</label>
                <input
                  type="number"
                  required
                  placeholder="mis. 2026"
                  value={cohortForm.year}
                  onChange={(e) => setCohortForm({
                    ...cohortForm,
                    year: e.target.value,
                    name: `Angkatan ${e.target.value}`
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama / Label Angkatan *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Angkatan 2026 (Generasi Emas)"
                  value={cohortForm.name}
                  onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan opsional"
                  value={cohortForm.description}
                  onChange={(e) => setCohortForm({ ...cohortForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={cohortForm.is_active}
                    onChange={(e) => setCohortForm({ ...cohortForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-0"
                  />
                  <span>Angkatan Aktif Menerima Siswa</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCohortModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  Simpan Angkatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TINGKAT KELAS */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {gradeForm.id ? 'Edit Tingkat Kelas' : 'Tambah Tingkat Kelas Baru'}
            </h3>
            <p className="text-xs text-teal-700 font-semibold mb-4 pb-2 border-b border-slate-100">
              Satuan Pendidikan: {selectedUnitObj?.name}
            </p>
            <form onSubmit={handleSaveGrade} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Tingkat Kelas *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Kelas 7 / Kelas X"
                  value={gradeForm.name}
                  onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Urutan Jenjang *</label>
                <input
                  type="number"
                  required
                  value={gradeForm.order}
                  onChange={(e) => setGradeForm({ ...gradeForm, order: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  id="grade_is_active"
                  checked={gradeForm.is_active}
                  onChange={(e) => setGradeForm({ ...gradeForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <label htmlFor="grade_is_active" className="font-bold text-slate-800 text-xs block cursor-pointer">
                    Status Tingkat Kelas Aktif
                  </label>
                  <span className="text-[10px] text-slate-500 block">
                    Tingkat kelas nonaktif tidak akan muncul pada form pembuatan rombel, kurikulum, dan rapor.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  Simpan Tingkat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
