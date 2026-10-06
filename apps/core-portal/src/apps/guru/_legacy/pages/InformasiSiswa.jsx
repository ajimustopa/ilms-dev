import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../shared/store/AuthContext';
import api from '../../../../shared/services/api';
import StatusPill from '../../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../../shared/components/FlatAlertBanner';
import {
  Users2,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  ChevronRight,
  X,
  UserCheck,
  Building,
  GraduationCap,
  Sparkles
} from 'lucide-react';

export default function InformasiSiswa() {
  const { activeSchoolUnit } = useAuth();

  const [classGroups, setClassGroups] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
          const mock = [
            { id: 1, name: 'Kelas 8A - Ikhwan' },
            { id: 2, name: 'Kelas 8B - Akhwat' },
            { id: 3, name: 'Kelas 7A - Ikhwan' }
          ];
          setClassGroups(mock);
          setSelectedClassId('1');
        }
      } catch (err) {
        console.error('Error fetching class groups:', err);
      }
    };
    fetchClasses();
  }, [activeSchoolUnit]);

  // Load Students in Selected Class
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/akademik/curriculum/class-groups/${selectedClassId}/members`).catch(() => null);
        const list = res?.data?.data?.members || res?.data?.data || [];

        if (Array.isArray(list) && list.length > 0) {
          setStudents(list);
        } else {
          // Dummy student directory
          setStudents([
            {
              id: 101,
              nis: '260801',
              nisn: '0089123456',
              full_name: 'Abdullah Azzam Pratama',
              gender: 'L',
              guardian_name: 'H. Bambang Pratama',
              guardian_phone: '081234567890',
              address: 'Jl. Melati No. 45, Bogor',
              attendance_rate: 98,
              avg_score: 88
            },
            {
              id: 102,
              nis: '260802',
              nisn: '0089123457',
              full_name: 'Muhammad Farhan Al-Fatih',
              gender: 'L',
              guardian_name: 'Ir. Ahmad Syukri',
              guardian_phone: '081298765432',
              address: 'Komplek Griya Indah Blok B2, Depok',
              attendance_rate: 96,
              avg_score: 92
            },
            {
              id: 103,
              nis: '260803',
              nisn: '0089123458',
              full_name: 'Zaidan Zulfiqar Rahman',
              gender: 'L',
              guardian_name: 'dr. Hendra Rahman, Sp.A',
              guardian_phone: '081345678901',
              address: 'Jl. Pajajaran No. 12, Bogor',
              attendance_rate: 100,
              avg_score: 85
            },
            {
              id: 104,
              nis: '260804',
              nisn: '0089123459',
              full_name: 'Hamzah Ibnu Abdul Aziz',
              gender: 'L',
              guardian_name: 'Abdul Aziz, S.E.',
              guardian_phone: '081567890123',
              address: 'Jl. Raya Ciawi No. 88, Bogor',
              attendance_rate: 94,
              avg_score: 89
            },
            {
              id: 105,
              nis: '260805',
              nisn: '0089123460',
              full_name: 'Fatih Al-Ayyubi',
              gender: 'L',
              guardian_name: 'Drs. Usman Effendi',
              guardian_phone: '081789012345',
              address: 'Perum Cibubur Indah No. 5, Jakarta Timur',
              attendance_rate: 98,
              avg_score: 94
            }
          ]);
        }
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClassId]);

  const filteredStudents = students.filter((s) => {
    const name = (s.full_name || s.student_name || '').toLowerCase();
    const nis = (s.nis || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || nis.includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Halaman */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Informasi & Direktori Siswa</h1>
            <p className="text-xs text-slate-400">
              Data induk, profil, kontak wali murid, dan performa santri diampu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {classGroups.map((cg) => (
              <option key={cg.id} value={cg.id}>{cg.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama santri, NIS, atau NISN..."
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {/* Grid Kartu Siswa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((st) => (
          <div
            key={st.id}
            onClick={() => setSelectedStudent(st)}
            className="rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 p-5 shadow-lg flex flex-col justify-between transition cursor-pointer group"
          >
            <div>
              {/* Header Santri */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md group-hover:scale-105 transition">
                  {(st.full_name || st.student_name || 'S').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white group-hover:text-sky-400 transition truncate">
                    {st.full_name || st.student_name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    NIS: {st.nis || '-'} • NISN: {st.nisn || '-'}
                  </p>
                </div>
              </div>

              {/* Info Wali & Kontak */}
              <div className="space-y-1.5 py-3 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Wali Murid:</span>
                  <span className="font-semibold text-slate-200">{st.guardian_name || 'Orang Tua'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">No. WhatsApp:</span>
                  <span className="font-mono text-emerald-400">{st.guardian_phone || '0812-xxxx-xxxx'}</span>
                </div>
              </div>
            </div>

            {/* Footer Stats & Aksi */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {st.attendance_rate || 98}% Hadir
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                  Rata-rata: {st.avg_score || 88}
                </span>
              </div>

              <span className="text-sky-400 text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>Detail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* Modal Detail Santri */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                  {(selectedStudent.full_name || 'S').charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedStudent.full_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">NIS: {selectedStudent.nis}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Alamat Tempat Tinggal</span>
                <p className="text-slate-200 mt-0.5">{selectedStudent.address || 'Komplek Asrama Santri Aldepos IBS'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Nama Orang Tua / Wali</span>
                  <p className="text-slate-200 font-bold mt-0.5">{selectedStudent.guardian_name || '-'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Kontak Darurat / WA</span>
                  <p className="text-emerald-400 font-mono font-bold mt-0.5">{selectedStudent.guardian_phone || '-'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedStudent(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              Tutup Profil Santri
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
