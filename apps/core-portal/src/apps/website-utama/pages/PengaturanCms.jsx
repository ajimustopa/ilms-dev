import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { Settings, Shield, Palette, Globe, Plus, Trash2, Save } from 'lucide-react';

export default function PengaturanCms() {
  const { schoolUnitId } = useOutletContext();
  const [theme, setTheme] = useState({ color_preset: 'emerald', typography_preset: 'outfit' });
  const [accessGrants, setAccessGrants] = useState([]);
  const [siteSettings, setSiteSettings] = useState([]);
  const [activeTab, setActiveTab] = useState('theme');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState({ user_id: '', role_code: 'admin_konten' });

  useEffect(() => {
    fetchData();
  }, [schoolUnitId]);

  const fetchData = async () => {
    try {
      const [tRes, gRes, sRes] = await Promise.all([
        api.get('/api/v1/website-utama/admin/theme', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/cms-access', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/site-settings', { headers: { 'X-School-Unit-Id': schoolUnitId } })
      ]);
      setTheme(tRes.data?.data || {});
      setAccessGrants(gRes.data?.data || []);
      setSiteSettings(sRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching CMS settings:', err);
    }
  };

  const handleSaveTheme = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/v1/website-utama/admin/theme', theme, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      alert('Tema website berhasil disimpan!');
    } catch (err) {
      alert('Gagal menyimpan tema');
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/v1/website-utama/admin/cms-access', {
        user_id: Number(grantForm.user_id),
        role_code: grantForm.role_code
      }, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setShowGrantModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal memberikan hak akses CMS');
    }
  };

  const handleRevokeAccess = async (id) => {
    if (!window.confirm('Cabut hak akses CMS user ini?')) return;
    try {
      await api.delete(`/api/v1/website-utama/admin/cms-access/${id}`, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal mencabut hak akses');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Pengaturan CMS & Hak Akses</h1>
        <p className="text-xs text-slate-500">Konfigurasi tema website, hak akses pengguna CMS, dan optimasi SEO situs.</p>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('theme')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'theme' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Theme Builder
        </button>
        <button
          onClick={() => setActiveTab('access')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'access' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Manajemen Akses CMS ({accessGrants.length})
        </button>
        <button
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'seo' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Pengaturan SEO & Sitemap
        </button>
      </div>

      {activeTab === 'theme' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl">
          <form onSubmit={handleSaveTheme} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Preset Warna Utama</label>
              <select
                value={theme.color_preset || 'emerald'}
                onChange={(e) => setTheme({ ...theme, color_preset: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="emerald">Emerald Green (Islami & Modern)</option>
                <option value="teal">Teal Cyan (Segar & Dinamis)</option>
                <option value="indigo">Indigo Blue (Formal & Akademik)</option>
                <option value="amber">Amber Gold (Klasik & Hangat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipografi Font</label>
              <select
                value={theme.typography_preset || 'outfit'}
                onChange={(e) => setTheme({ ...theme, typography_preset: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="outfit">Outfit (Modern Sans)</option>
                <option value="inter">Inter (Clean UI)</option>
                <option value="poppins">Poppins (Friendly Geometric)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Tema</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'access' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowGrantModal(true)}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Beri Akses User</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">User ID (Core)</th>
                  <th className="py-3 px-4">Role CMS</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accessGrants.map((ag) => (
                  <tr key={ag.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">User #{ag.user_id}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-emerald-600 capitalize">{ag.role_code.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {ag.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevokeAccess(ag.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Cabut Akses"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'seo' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-slate-800">File Generator Publik</h3>
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200">
              <div>
                <p className="font-bold text-xs text-slate-800">Sitemap XML Generator</p>
                <p className="text-[11px] text-slate-500">Membantu indeks mesin pencari Google terhadap seluruh tautan website.</p>
              </div>
              <a
                href="http://localhost:3000/api/v1/website-utama/admin/site-settings/sitemap"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold"
              >
                Lihat XML
              </a>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200">
              <div>
                <p className="font-bold text-xs text-slate-800">Robots.txt Generator</p>
                <p className="text-[11px] text-slate-500">Mengatur perayapan bot terhadap halaman direktori publik dan admin.</p>
              </div>
              <a
                href="http://localhost:3000/api/v1/website-utama/admin/site-settings/robots"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold"
              >
                Lihat TXT
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Grant Access */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Beri Hak Akses CMS User</h3>
            <form onSubmit={handleGrantAccess} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">User ID di Core Service</label>
                <input
                  type="number"
                  value={grantForm.user_id}
                  onChange={(e) => setGrantForm({ ...grantForm, user_id: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: 2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Peran CMS (Role Code)</label>
                <select
                  value={grantForm.role_code}
                  onChange={(e) => setGrantForm({ ...grantForm, role_code: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="superadmin_cms">Superadmin CMS (Akses Penuh)</option>
                  <option value="admin_konten">Admin Konten (Beranda, Profil, Berita, Galeri)</option>
                  <option value="admin_ppdb">Admin PPDB (Pendaftar, Verifikasi, Jadwal)</option>
                  <option value="admin_konsultasi">Admin Konsultasi (Tiket, Booking Virtual)</option>
                  <option value="editor_artikel">Editor Artikel (Guru / Siswa Penulis)</option>
                  <option value="moderator_artikel">Moderator Artikel (Review, Publish, Komentar)</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowGrantModal(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
