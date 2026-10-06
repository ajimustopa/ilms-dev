import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Download,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Calendar,
  MapPin,
  UserCheck,
  ShieldAlert,
  Sparkles,
  School,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTeacherContext } from '../context/TeacherContext';
import { studentService } from '../services/studentService';
import PageHeader from '../components/PageHeader';
import SelectorKonteks from '../components/SelectorKonteks';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import Toast from '../components/Toast';
import { formatDate } from '../../../shared/utils/formatters';

export default function SantriPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    activeContext,
    teachingAssignments,
    homeroomClasses,
    loadingContext
  } = useTeacherContext();

  const [selectedClassId, setSelectedClassId] = useState(searchParams.get('class_id') || '');
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(null);
  const [toast, setToast] = useState(null);

  // 1. Ekstrak Daftar Rombel yang Relevan bagi Guru (Berdasarkan Satuan Pendidikan & Tahun Ajaran Aktif)
  const availableClasses = useMemo(() => {
    const map = new Map();

    // Dari penugasan wali kelas
    homeroomClasses.forEach((h) => {
      const matchUnit = !activeContext?.satuanPendidikanId || String(h.satuan_pendidikan_id) === String(activeContext.satuanPendidikanId);
      const matchYear = !activeContext?.academicYearId || String(h.academic_year_id) === String(activeContext.academicYearId);
      if (matchUnit && matchYear && h.class_group_id) {
        map.set(String(h.class_group_id), {
          id: h.class_group_id,
          name: h.class_group_name || `Kelas #${h.class_group_id}`,
          is_homeroom: true
        });
      }
    });

    // Dari penugasan mengajar mata pelajaran
    teachingAssignments.forEach((a) => {
      const matchUnit = !activeContext?.satuanPendidikanId || String(a.satuan_pendidikan_id) === String(activeContext.satuanPendidikanId);
      const matchYear = !activeContext?.academicYearId || String(a.academic_year_id) === String(activeContext.academicYearId);
      if (matchUnit && matchYear && a.class_group_id) {
        if (!map.has(String(a.class_group_id))) {
          map.set(String(a.class_group_id), {
            id: a.class_group_id,
            name: a.class_group_name || `Kelas #${a.class_group_id}`,
            is_homeroom: false
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [homeroomClasses, teachingAssignments, activeContext]);

  // Auto-select rombel pertama jika belum terpilih
  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!selectedClassId || !availableClasses.some(c => String(c.id) === String(selectedClassId))) {
        setSelectedClassId(String(availableClasses[0].id));
      }
    } else {
      setSelectedClassId('');
    }
  }, [availableClasses, selectedClassId]);

  // 2. Ambil Anggota Siswa pada Rombel Terpilih
  const fetchClassMembers = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    setIsLoadingStudents(true);
    setFetchError(null);

    try {
      const res = await studentService.getClassMembers(selectedClassId);
      const data = res?.data || res || [];
      const memberList = Array.isArray(data) ? data : (data.members || data.items || []);
      setStudents(memberList);
    } catch (err) {
      console.error('Error fetching class members:', err);
      setFetchError(err.response?.data?.message || err.message || 'Gagal memuat data santri rombel.');
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchClassMembers();
  }, [fetchClassMembers]);

  // 3. Filter Siswa Berdasarkan Pencarian
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter((st) => {
      const name = (st.full_name || st.student_name || '').toLowerCase();
      const nickname = (st.nickname || '').toLowerCase();
      const nisn = (st.nisn || '').toLowerCase();
      const nipd = (st.nipd || st.nis || '').toLowerCase();
      const parent = (st.parent_name || '').toLowerCase();
      const phone = (st.parent_phone || '').toLowerCase();
      return (
        name.includes(q) ||
        nickname.includes(q) ||
        nisn.includes(q) ||
        nipd.includes(q) ||
        parent.includes(q) ||
        phone.includes(q)
      );
    });
  }, [students, searchQuery]);

  const activeClass = availableClasses.find(c => String(c.id) === String(selectedClassId));

  // 4. Salin Nomor Kontak
  const handleCopyPhone = (phone, name) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setToast({
      type: 'info',
      title: 'Kontak Disalin',
      message: `Nomor telepon ${name} (${phone}) berhasil disalin ke clipboard.`
    });
    setTimeout(() => {
      setCopiedPhone(null);
    }, 2000);
  };

  // 5. Ekspor Lembar Kerja Excel
  const handleExportExcel = () => {
    if (students.length === 0) {
      setToast({
        type: 'warning',
        title: 'Tidak Ada Data',
        message: 'Tidak ada data santri pada rombel ini untuk diekspor.'
      });
      return;
    }

    const className = activeClass?.name ? activeClass.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Rombel';
    const yearName = activeContext?.academicYearName ? activeContext.academicYearName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Tahun_Ajaran';
    const dateStr = new Date().toISOString().slice(0, 10);

    const rows = filteredStudents.map((st, idx) => {
      const ttl = [st.birth_place, st.birth_date ? formatDate(st.birth_date) : null]
        .filter(Boolean)
        .join(', ') || '-';

      return {
        'No': idx + 1,
        'NIPD': st.nipd || st.nis || '-',
        'NISN': st.nisn || '-',
        'Nama Lengkap': st.full_name || st.student_name || '-',
        'Nama Panggilan': st.nickname || '-',
        'Tempat, Tanggal Lahir': ttl,
        'Rombel': st.class_group_name || activeClass?.name || '-',
        'Nama Orang Tua / Wali': st.parent_name || '-',
        'Hubungan': st.parent_relationship || '-',
        'Kontak Orang Tua': st.parent_phone || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
    XLSX.writeFile(workbook, `Data_Siswa_${className}_${yearName}_${dateStr}.xlsx`);

    setToast({
      type: 'success',
      title: 'Ekspor Berhasil',
      message: `File Excel Data Siswa "${activeClass?.name}" berhasil diunduh.`
    });
  };

  return (
    <div className="flex flex-col gap-5 pb-20 animate-in fade-in duration-200">
      {/* Toast Notifikasi */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Informasi Siswa"
        subtitle="Direktori data induk santri, nomor identitas (NIPD/NISN), dan kontak orang tua per rombel kelas."
        action={
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            disabled={students.length === 0}
            onClick={handleExportExcel}
            className="text-xs shrink-0"
          >
            Ekspor Excel
          </Button>
        }
      />

      {/* Bar Pemilih Konteks & Rombel Guru */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SelectorKonteks />

        {/* Pemilih Rombel */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto min-w-[200px] max-w-xs">
          <label htmlFor="rombel-select" className="text-xs font-bold text-slate-300 shrink-0">
            Rombel:
          </label>
          <select
            id="rombel-select"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            aria-label="Pilih Rombel"
            className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 truncate min-h-[44px]"
          >
            {availableClasses.length > 0 ? (
              availableClasses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} {c.is_homeroom ? '(Wali Kelas)' : ''}
                </option>
              ))
            ) : (
              <option value="">Tidak ada rombel yang diampu</option>
            )}
          </select>
        </div>
      </div>

      {/* Ribbon Informasi Rombel Aktif */}
      {activeClass && (
        <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">{activeClass.name}</h3>
                {activeClass.is_homeroom && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Wali Kelas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Total <strong>{students.length}</strong> santri terdaftar aktif
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Tahun Ajaran: <strong className="text-slate-200">{activeContext?.academicYearName || '2026/2027'}</strong></span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama santri, panggilan, NIPD, NISN, atau nama orang tua..."
          className="w-full pl-9 pr-4 py-2 min-h-[44px] text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Konten Utama: Daftar Siswa */}
      {isLoadingStudents ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : fetchError ? (
        <ErrorState
          title="Gagal Memuat Data Siswa"
          message={fetchError}
          onRetry={fetchClassMembers}
        />
      ) : !selectedClassId ? (
        <EmptyState
          title="Pilih Rombel Kelas"
          description="Pilih salah satu rombel kelas di atas untuk melihat direktori santri dan kontak wali."
          icon={Users}
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'Santri Tidak Ditemukan' : 'Belum Ada Santri'}
          description={
            searchQuery
              ? `Tidak ditemukan santri dengan kata kunci "${searchQuery}". Coba gunakan nama atau nomor NISN lainnya.`
              : 'Belum ada data santri yang terdaftar aktif di rombel kelas ini.'
          }
          icon={Users}
        />
      ) : (
        <>
          {/* TAMPILAN HP: DAFTAR KARTU */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredStudents.map((st, idx) => {
              const studentName = st.full_name || st.student_name || 'Santri';
              const nipd = st.nipd || st.nis || '-';
              const nisn = st.nisn || '-';
              const nickname = st.nickname || '-';
              const ttl = [st.birth_place, st.birth_date ? formatDate(st.birth_date) : null]
                .filter(Boolean)
                .join(', ') || '-';
              const parentName = st.parent_name || 'Orang Tua / Wali';
              const parentRelation = st.parent_relationship ? `(${st.parent_relationship})` : '';
              const parentPhone = st.parent_phone || '';
              const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
              const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}` : null;

              return (
                <Card
                  key={st.student_id || idx}
                  className="p-4 bg-slate-900/70 border-slate-800 flex flex-col gap-3 hover:border-slate-700 transition"
                >
                  {/* Header Kartu Santri */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-center text-xs font-mono font-bold text-slate-500 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                        {studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-100 leading-snug truncate">
                          {studentName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                          {st.nickname && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                              Panggilan: {st.nickname}
                            </span>
                          )}
                          <span>NIPD: <strong className="font-mono text-slate-300">{nipd}</strong></span>
                          <span>NISN: <strong className="font-mono text-slate-300">{nisn}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info TTL & Rombel */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Tempat, Tgl Lahir</span>
                      <span className="text-slate-300 font-medium">{ttl}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Rombel</span>
                      <span className="text-slate-300 font-medium">{st.class_group_name || activeClass?.name || '-'}</span>
                    </div>
                  </div>

                  {/* Kotak Kontak Orang Tua / Wali */}
                  <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/80 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Kontak Orang Tua {parentRelation}
                      </span>
                      <p className="text-xs font-bold text-slate-200 truncate mt-0.5">
                        {parentName}
                      </p>
                      <p className="text-xs font-mono text-emerald-400 mt-0.5">
                        {parentPhone || 'Belum ada nomor kontak'}
                      </p>
                    </div>

                    {/* Action Buttons Hubungi & Salin Kontak */}
                    {parentPhone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-[40px] min-h-[40px] p-2 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center transition"
                            title="Chat WhatsApp Orang Tua"
                            aria-label="WhatsApp Orang Tua"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <a
                          href={`tel:${cleanPhone}`}
                          className="min-w-[40px] min-h-[40px] p-2 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 border border-sky-500/30 flex items-center justify-center transition"
                          title="Telepon Orang Tua"
                          aria-label="Telepon Orang Tua"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(parentPhone, studentName)}
                          className="min-w-[40px] min-h-[40px] p-2 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-slate-700 border border-slate-600 flex items-center justify-center transition"
                          title="Salin Nomor Kontak"
                          aria-label="Salin Kontak"
                        >
                          {copiedPhone === parentPhone ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* TAMPILAN DESKTOP / LAYAR LEBAR: TABEL RESPONSIVE */}
          <div className="hidden md:block bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-300 font-bold border-b border-slate-700">
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3 w-28">NIPD</th>
                    <th className="py-3 px-3 w-28">NISN</th>
                    <th className="py-3 px-3">Nama Santri</th>
                    <th className="py-3 px-3 w-28">Panggilan</th>
                    <th className="py-3 px-3 w-44">Tempat, Tgl Lahir</th>
                    <th className="py-3 px-3 w-28">Rombel</th>
                    <th className="py-3 px-3 w-56">Kontak Orang Tua</th>
                    <th className="py-3 px-3 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {filteredStudents.map((st, idx) => {
                    const studentName = st.full_name || st.student_name || 'Santri';
                    const nipd = st.nipd || st.nis || '-';
                    const nisn = st.nisn || '-';
                    const nickname = st.nickname || '-';
                    const ttl = [st.birth_place, st.birth_date ? formatDate(st.birth_date) : null]
                      .filter(Boolean)
                      .join(', ') || '-';
                    const parentName = st.parent_name || 'Orang Tua';
                    const parentRelation = st.parent_relationship ? `(${st.parent_relationship})` : '';
                    const parentPhone = st.parent_phone || '';
                    const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
                    const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}` : null;

                    return (
                      <tr key={st.student_id || idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {nipd}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {nisn}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-100">
                          {studentName}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {nickname}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {ttl}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {st.class_group_name || activeClass?.name || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-200 font-semibold">
                            {parentName} <span className="text-slate-400 text-[11px]">{parentRelation}</span>
                          </div>
                          <div className="font-mono text-emerald-400 text-[11px] mt-0.5">
                            {parentPhone || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {parentPhone ? (
                            <div className="flex items-center justify-center gap-1">
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <a
                                href={`tel:${cleanPhone}`}
                                className="p-1.5 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 transition"
                                title="Telepon"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(parentPhone, studentName)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                                title="Salin"
                              >
                                {copiedPhone === parentPhone ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
