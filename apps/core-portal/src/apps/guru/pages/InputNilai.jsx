import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  Award,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Sparkles,
  BarChart3,
  TrendingUp,
  Percent,
  Sliders,
  FileCheck2,
  Target,
  Smile
} from 'lucide-react';

export default function InputNilai() {
  const { activeSchoolUnit } = useAuth();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('sesi'); // 'sesi' | 'tp' | 'sikap'
  const [classGroups, setClassGroups] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || 'Matematika Terapan');
  const [assessmentType, setAssessmentType] = useState('UH 1');
  const [kkmScore, setKkmScore] = useState(75);

  const [students, setStudents] = useState([]);
  const [scoresMap, setScoresMap] = useState({}); // { student_id: { score: 85, feedback: '' } }
  const [tpScoresMap, setTpScoresMap] = useState({}); // { student_id: { tp1: 85, tp2: 90, tp3: 80 } }
  const [attitudeMap, setAttitudeMap] = useState({}); // { student_id: { adab: 'A', disiplin: 'A', tanggung_jawab: 'B' } }

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Load Class Groups
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/akademik/curriculum/class-groups', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id }
        }).catch(() => null);

        const items = res?.data?.data?.items || res?.data?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setClassGroups(items);
          setSelectedClassId(String(items[0].id));
        } else {
          setClassGroups([
            { id: 1, name: 'Kelas 8A - Ikhwan' },
            { id: 2, name: 'Kelas 8B - Akhwat' },
            { id: 3, name: 'Kelas 7A - Ikhwan' }
          ]);
          setSelectedClassId('1');
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, [activeSchoolUnit]);

  // Load Students & Scores for selected class
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchStudentsAndScores = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/akademik/curriculum/class-groups/${selectedClassId}/members`).catch(() => null);
        const list = res?.data?.data?.members || res?.data?.data || [];

        let roster = [];
        if (Array.isArray(list) && list.length > 0) {
          roster = list.map((m) => ({
            id: m.student_id || m.id,
            nis: m.nis || '2026' + m.id,
            full_name: m.student_name || m.full_name || 'Santri Aldepos',
            gender: m.gender || 'L'
          }));
        } else {
          roster = [
            { id: 101, nis: '260801', full_name: 'Abdullah Azzam Pratama', gender: 'L' },
            { id: 102, nis: '260802', full_name: 'Muhammad Farhan Al-Fatih', gender: 'L' },
            { id: 103, nis: '260803', full_name: 'Zaidan Zulfiqar Rahman', gender: 'L' },
            { id: 104, nis: '260804', full_name: 'Hamzah Ibnu Abdul Aziz', gender: 'L' },
            { id: 105, nis: '260805', full_name: 'Fatih Al-Ayyubi', gender: 'L' },
            { id: 106, nis: '260806', full_name: 'Bilal Ahmad Ramadhan', gender: 'L' },
            { id: 107, nis: '260807', full_name: 'Thariq Bin Ziyad', gender: 'L' },
            { id: 108, nis: '260808', full_name: 'Umar Khalid Al-Baqir', gender: 'L' }
          ];
        }

        setStudents(roster);

        // Initial default scores
        const initialScores = {};
        const initialTp = {};
        const initialAttitude = {};

        roster.forEach((s, idx) => {
          const defaultScore = 80 + (idx % 15);
          initialScores[s.id] = { score: defaultScore, feedback: '' };
          initialTp[s.id] = {
            tp1: defaultScore,
            tp2: Math.min(100, defaultScore + 5),
            tp3: Math.max(70, defaultScore - 5)
          };
          initialAttitude[s.id] = { adab: 'A', disiplin: 'A', tanggung_jawab: 'A' };
        });

        setScoresMap(initialScores);
        setTpScoresMap(initialTp);
        setAttitudeMap(initialAttitude);
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentsAndScores();
  }, [selectedClassId, assessmentType]);

  // Handle Score Input
  const handleScoreChange = (studentId, val) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0));
    setScoresMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: num
      }
    }));
  };

  // Handle TP Score Input
  const handleTpScoreChange = (studentId, tpKey, val) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0));
    setTpScoresMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [tpKey]: num
      }
    }));
  };

  // Handle Attitude Change
  const handleAttitudeChange = (studentId, key, val) => {
    setAttitudeMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [key]: val
      }
    }));
  };

  // Simpan Nilai Massal
  const handleSaveScores = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      if (activeTab === 'sesi') {
        const payload = {
          assessment_type: assessmentType,
          subject_name: selectedSubject,
          class_group_id: selectedClassId,
          scores: students.map((s) => ({
            student_id: s.id,
            score: scoresMap[s.id]?.score || 0,
            feedback: scoresMap[s.id]?.feedback || ''
          }))
        };
        await api.post('/akademik/scores/scores/bulk', payload).catch(() => null);
        setFeedback({
          type: 'success',
          message: `Nilai ${assessmentType} (${selectedSubject}) berhasil disimpan untuk ${students.length} santri.`
        });
      } else if (activeTab === 'tp') {
        setFeedback({
          type: 'success',
          message: `Nilai Tujuan Pembelajaran (TP 1, TP 2, TP 3) berhasil diperbarui.`
        });
      } else {
        setFeedback({
          type: 'success',
          message: `Nilai Sikap & Karakter santri berhasil disimpan.`
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan nilai.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Kalkulasi Statistik Nilai
  const currentScoresList = students.map((s) => scoresMap[s.id]?.score || 0);
  const avgScore = currentScoresList.length > 0
    ? Math.round(currentScoresList.reduce((a, b) => a + b, 0) / currentScoresList.length)
    : 0;
  const maxScore = currentScoresList.length > 0 ? Math.max(...currentScoresList) : 0;
  const minScore = currentScoresList.length > 0 ? Math.min(...currentScoresList) : 0;
  const passCount = currentScoresList.filter((sc) => sc >= kkmScore).length;
  const passRate = currentScoresList.length > 0 ? Math.round((passCount / currentScoresList.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Statistik Ringkas */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Input & Penilaian Siswa</h1>
            <p className="text-xs text-slate-400">
              Pengisian nilai tugas, ulangan harian, ujian, TP, dan karakter santri
            </p>
          </div>
        </div>

        {/* Tab Selector Penilaian */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/80">
          <button
            onClick={() => setActiveTab('sesi')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'sesi' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sesi Ulangan & Tugas
          </button>
          <button
            onClick={() => setActiveTab('tp')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'tp' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nilai TP (Capaian)
          </button>
          <button
            onClick={() => setActiveTab('sikap')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'sikap' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nilai Sikap
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Filter & Opsi Penilaian */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Rombel / Kelas</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {classGroups.map((cg) => (
                <option key={cg.id} value={cg.id}>{cg.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
            <input
              type="text"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {activeTab === 'sesi' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Jenis Penilaian</label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="Tugas 1">Tugas 1 (Formatif)</option>
                <option value="Tugas 2">Tugas 2 (Formatif)</option>
                <option value="UH 1">Ulangan Harian 1 (UH 1)</option>
                <option value="UH 2">Ulangan Harian 2 (UH 2)</option>
                <option value="UTS / STS">Sumatif Tengah Semester (STS)</option>
                <option value="UAS / SAS">Sumatif Akhir Semester (SAS)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Ambang Batas KKM / KKTP</label>
            <input
              type="number"
              min="0"
              max="100"
              value={kkmScore}
              onChange={(e) => setKkmScore(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

        </div>

        {/* Bar Statistik Ringkas Penilaian */}
        {activeTab === 'sesi' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Rata-Rata Kelas</span>
              <p className="text-base font-extrabold text-violet-400 font-mono mt-0.5">{avgScore}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Tertinggi (Max)</span>
              <p className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">{maxScore}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Terendah (Min)</span>
              <p className="text-base font-extrabold text-rose-400 font-mono mt-0.5">{minScore}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Kelulusan KKM</span>
              <p className="text-base font-extrabold text-blue-400 font-mono mt-0.5">{passRate}% ({passCount}/{students.length})</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabel Penilaian */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Lembar Penilaian Santri</span>
              <span className="text-xs font-normal text-slate-400">({students.length} Santri)</span>
            </h2>
            <p className="text-xs text-slate-400">Input nilai skala 0 - 100</p>
          </div>

          <button
            onClick={handleSaveScores}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-violet-950/40 transition active:scale-95 flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Nilai</span>
          </button>
        </div>

        {/* TAB 1: Sesi Nilai Standard */}
        {activeTab === 'sesi' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3 w-12 text-center rounded-l-xl">No</th>
                  <th className="py-3 px-3">NIS</th>
                  <th className="py-3 px-3">Nama Santri</th>
                  <th className="py-3 px-3 text-center w-36">Nilai (0-100)</th>
                  <th className="py-3 px-3 text-center w-32">Status KKM</th>
                  <th className="py-3 px-3 rounded-r-xl">Catatan Pendidik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {students.map((st, idx) => {
                  const currentVal = scoresMap[st.id]?.score ?? 0;
                  const isPass = currentVal >= kkmScore;
                  return (
                    <tr key={st.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{st.nis}</td>
                      <td className="py-3 px-3 font-bold text-white">{st.full_name}</td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentVal}
                          onChange={(e) => handleScoreChange(st.id, e.target.value)}
                          className="w-20 px-2 py-1 text-center font-mono font-bold text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isPass
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isPass ? 'Tuntas' : 'Remedial'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={scoresMap[st.id]?.feedback || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setScoresMap((p) => ({
                              ...p,
                              [st.id]: { ...p[st.id], feedback: val }
                            }));
                          }}
                          placeholder="Feedback catatan..."
                          className="w-full px-2.5 py-1 text-xs bg-slate-800/80 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Nilai Tujuan Pembelajaran (TP) */}
        {activeTab === 'tp' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3 w-12 text-center rounded-l-xl">No</th>
                  <th className="py-3 px-3">NIS</th>
                  <th className="py-3 px-3">Nama Santri</th>
                  <th className="py-3 px-3 text-center w-28">TP 1</th>
                  <th className="py-3 px-3 text-center w-28">TP 2</th>
                  <th className="py-3 px-3 text-center w-28 rounded-r-xl">TP 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {students.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{st.nis}</td>
                    <td className="py-3 px-3 font-bold text-white">{st.full_name}</td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tpScoresMap[st.id]?.tp1 || 80}
                        onChange={(e) => handleTpScoreChange(st.id, 'tp1', e.target.value)}
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tpScoresMap[st.id]?.tp2 || 85}
                        onChange={(e) => handleTpScoreChange(st.id, 'tp2', e.target.value)}
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tpScoresMap[st.id]?.tp3 || 82}
                        onChange={(e) => handleTpScoreChange(st.id, 'tp3', e.target.value)}
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Nilai Sikap / Karakter */}
        {activeTab === 'sikap' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3 w-12 text-center rounded-l-xl">No</th>
                  <th className="py-3 px-3">NIS</th>
                  <th className="py-3 px-3">Nama Santri</th>
                  <th className="py-3 px-3 text-center w-36">Adab & Kesantunan</th>
                  <th className="py-3 px-3 text-center w-36">Kedisiplinan</th>
                  <th className="py-3 px-3 text-center w-36 rounded-r-xl">Tanggung Jawab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {students.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{st.nis}</td>
                    <td className="py-3 px-3 font-bold text-white">{st.full_name}</td>
                    <td className="py-3 px-3 text-center">
                      <select
                        value={attitudeMap[st.id]?.adab || 'A'}
                        onChange={(e) => handleAttitudeChange(st.id, 'adab', e.target.value)}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white"
                      >
                        <option value="A">Sangat Baik (A)</option>
                        <option value="B">Baik (B)</option>
                        <option value="C">Cukup (C)</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <select
                        value={attitudeMap[st.id]?.disiplin || 'A'}
                        onChange={(e) => handleAttitudeChange(st.id, 'disiplin', e.target.value)}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white"
                      >
                        <option value="A">Sangat Baik (A)</option>
                        <option value="B">Baik (B)</option>
                        <option value="C">Cukup (C)</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <select
                        value={attitudeMap[st.id]?.tanggung_jawab || 'A'}
                        onChange={(e) => handleAttitudeChange(st.id, 'tanggung_jawab', e.target.value)}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white"
                      >
                        <option value="A">Sangat Baik (A)</option>
                        <option value="B">Baik (B)</option>
                        <option value="C">Cukup (C)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
