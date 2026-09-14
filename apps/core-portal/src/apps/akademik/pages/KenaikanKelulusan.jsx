import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Sparkles,
  RotateCw,
  FileCheck2,
  Check
} from 'lucide-react';

export default function KenaikanKelulusan() {
  const { activeSchoolUnit } = useAuth();

  // Master Data
  const [academicYears, setAcademicYears] = useState([]);
  const [sourceYearId, setSourceYearId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');
  const [classGroups, setClassGroups] = useState([]);
  const [sourceClassId, setSourceClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');

  // Workflow Mode
  const [workflowMode, setWorkflowMode] = useState('promotion'); // 'promotion' | 'graduation'
  const [graduationDate, setGraduationDate] = useState(new Date().toISOString().split('T')[0]);
  const [decreeNumber, setDecreeNumber] = useState(`SK/KELULUSAN/${new Date().getFullYear()}/001`);

  // Student list & decision maps
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [decisionMap, setDecisionMap] = useState({}); // { studentId: { action: 'promote'|'retain'|'graduate', targetClassId: '' } }
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAcademicYearsAndClasses();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (sourceClassId) {
      fetchClassMembers(sourceClassId);
    }
  }, [sourceClassId, targetYearId]);

  const fetchAcademicYearsAndClasses = async () => {
    try {
      const [yearRes, classRes] = await Promise.all([
        api.get('/akademik/academic-years').catch(() => ({ data: { data: [] } })),
        api.get('/akademik/class-groups', { params: { satuan_pendidikan_id: activeSchoolUnit?.id } }).catch(() => ({ data: { data: [] } }))
      ]);

      const years = yearRes.data?.data || [];
      const classes = classRes.data?.data || [];

      setAcademicYears(years);
      setClassGroups(classes);

      if (years.length > 0) {
        const active = years.find((y) => y.is_active) || years[0];
        setSourceYearId(String(active.id));
        // Next academic year suggestion
        const nextYear = years.find((y) => y.id !== active.id) || years[0];
        setTargetYearId(String(nextYear.id));
      }

      if (classes.length > 0) {
        setSourceClassId(String(classes[0].id));
        setTargetClassId(classes.length > 1 ? String(classes[1].id) : String(classes[0].id));
      }
    } catch (err) {
      console.warn('Error loading years and classes:', err);
    }
  };

  const fetchClassMembers = async (classId) => {
    try {
      setLoading(true);
      const res = await api.get(`/akademik/enrollments`, {
        params: { class_group_id: classId, status: 'aktif' }
      });
      const list = res.data?.data || [];
      setStudents(list);

      // Default select all
      const allIds = list.map((s) => s.student_id);
      setSelectedIds(allIds);

      const dMap = {};
      list.forEach((s) => {
        dMap[s.student_id] = {
          action: workflowMode === 'graduation' ? 'graduate' : 'promote',
          targetClassId: targetClassId || ''
        };
      });
      setDecisionMap(dMap);
    } catch (err) {
      console.warn('Error fetching class members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.student_id));
    }
  };

  const handleToggleSelectStudent = (studentId) => {
    if (selectedIds.includes(studentId)) {
      setSelectedIds(selectedIds.filter((id) => id !== studentId));
    } else {
      setSelectedIds([...selectedIds, studentId]);
    }
  };

  const handleSetAllAction = (actionType) => {
    const nextMap = { ...decisionMap };
    students.forEach((s) => {
      nextMap[s.student_id] = {
        ...nextMap[s.student_id],
        action: actionType,
        targetClassId: actionType === 'retain' ? sourceClassId : targetClassId
      };
    });
    setDecisionMap(nextMap);
  };

  const handleExecute = async () => {
    if (selectedIds.length === 0) {
      setErrorMsg('Pilih minimal satu santri untuk diproses');
      return;
    }

    setExecuting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (workflowMode === 'graduation') {
        // Kelulusan Massal
        const res = await api.post('/akademik/students/graduate', {
          student_ids: selectedIds,
          academic_year_id: Number(sourceYearId),
          graduation_date: graduationDate,
          decree_number: decreeNumber,
          satuan_pendidikan_id: activeSchoolUnit?.id
        });

        setSuccessMsg(res.data?.message || `Berhasil memproses kelulusan ${selectedIds.length} santri`);
      } else {
        // Kenaikan & Tinggal Kelas
        const promoteList = [];
        for (const sId of selectedIds) {
          const item = decisionMap[sId];
          const isRetain = item?.action === 'retain';
          const destClassId = item?.targetClassId || (isRetain ? sourceClassId : targetClassId);
          const foundDest = classGroups.find((c) => String(c.id) === String(destClassId));

          promoteList.push({
            student_id: sId,
            target_class_group_id: Number(destClassId),
            decision: isRetain ? `Tinggal di ${foundDest?.name || 'Rombel Asal'}` : `Naik ke ${foundDest?.name || 'Rombel Baru'}`
          });
        }

        const res = await api.post('/akademik/students/promote', {
          satuan_pendidikan_id: activeSchoolUnit?.id,
          target_academic_year_id: Number(targetYearId),
          students: promoteList
        });

        setSuccessMsg(res.data?.message || `Berhasil memproses roll-over kenaikan ${promoteList.length} santri`);
      }

      fetchClassMembers(sourceClassId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memproses kenaikan / kelulusan');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span>Kenaikan Kelas & Kelulusan Santri</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Roll-over tahun ajaran: naik kelas otomatis, opsi tinggal kelas per santri, dan pengesahan kelulusan akhir jenjang.
          </p>
        </div>

        {/* Workflow Switcher */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setWorkflowMode('promotion')}
            className={`px-4 py-2 rounded-xl transition ${
              workflowMode === 'promotion'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kenaikan Kelas (Promote)
          </button>
          <button
            type="button"
            onClick={() => setWorkflowMode('graduation')}
            className={`px-4 py-2 rounded-xl transition ${
              workflowMode === 'graduation'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kelulusan Akhir (Graduate)
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Configuration Controls Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
            Tahun Ajaran Asal:
          </label>
          <select
            value={sourceYearId}
            onChange={(e) => setSourceYearId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
            Rombel Asal:
          </label>
          <select
            value={sourceClassId}
            onChange={(e) => setSourceClassId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            {classGroups.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {workflowMode === 'promotion' ? (
          <>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Tahun Ajaran Baru (Tujuan):
              </label>
              <select
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Rombel Tujuan Utama:
              </label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {classGroups.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Tanggal Kelulusan Resmi *
              </label>
              <input
                type="date"
                required
                value={graduationDate}
                onChange={(e) => setGraduationDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Nomor Surat Keputusan (SK) Kelulusan
              </label>
              <input
                type="text"
                required
                value={decreeNumber}
                onChange={(e) => setDecreeNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder="mis. SK/2026/088/LULUS"
              />
            </div>
          </>
        )}
      </div>

      {/* Roster & Decision Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        
        {/* Table Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={selectedIds.length === students.length && students.length > 0}
                onChange={handleToggleSelectAll}
                className="rounded-md text-emerald-600 focus:ring-emerald-500"
              />
              <span>Pilih Semua ({selectedIds.length}/{students.length} Terpilih)</span>
            </label>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {workflowMode === 'promotion' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSetAllAction('promote')}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-emerald-700 font-bold transition flex items-center gap-1 text-[11px]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Set Semua Naik Kelas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllAction('retain')}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-amber-700 font-bold transition text-[11px]"
                >
                  <span>Set Semua Tinggal Kelas</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleSetAllAction('graduate')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-emerald-700 font-bold transition flex items-center gap-1 text-[11px]"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Set Semua Lulus</span>
              </button>
            )}

            <button
              onClick={handleExecute}
              disabled={executing || selectedIds.length === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition shadow-md shadow-emerald-900/20 flex items-center gap-2"
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Eksekusi {workflowMode === 'promotion' ? 'Kenaikan' : 'Kelulusan'}</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">#</th>
                <th className="py-3.5 px-4">NIS</th>
                <th className="py-3.5 px-4">Nama Siswa</th>
                <th className="py-3.5 px-4">Status & Keputusan</th>
                <th className="py-3.5 px-4">Rombel Tujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Memuat daftar siswa rombel...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400">
                    Tidak ada siswa aktif di rombel terpilih.
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const isChecked = selectedIds.includes(s.student_id);
                  const decision = decisionMap[s.student_id] || { action: 'promote', targetClassId: '' };

                  return (
                    <tr key={s.student_id} className={`transition ${isChecked ? 'bg-emerald-50/20' : 'hover:bg-slate-50/60'}`}>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectStudent(s.student_id)}
                          className="rounded-md text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {s.nis}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{s.student_name}</div>
                        <div className="text-[10px] text-slate-400">ID: {s.student_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {workflowMode === 'promotion' ? (
                          <select
                            value={decision.action}
                            onChange={(e) => {
                              const act = e.target.value;
                              setDecisionMap({
                                ...decisionMap,
                                [s.student_id]: {
                                  ...decision,
                                  action: act,
                                  targetClassId: act === 'retain' ? sourceClassId : targetClassId
                                }
                              });
                            }}
                            className={`px-2.5 py-1 text-xs rounded-xl font-bold border ${
                              decision.action === 'promote'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <option value="promote">Naik Kelas (Promote)</option>
                            <option value="retain">Tinggal Kelas (Retain)</option>
                          </select>
                        ) : (
                          <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                            Lulus (Alumni)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {workflowMode === 'promotion' ? (
                          <select
                            value={decision.targetClassId || targetClassId}
                            onChange={(e) => {
                              setDecisionMap({
                                ...decisionMap,
                                [s.student_id]: { ...decision, targetClassId: e.target.value }
                              });
                            }}
                            className="w-full max-w-xs px-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                          >
                            {classGroups.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} {String(c.id) === String(sourceClassId) ? '(Rombel Asal)' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">
                            SK: {decreeNumber}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
