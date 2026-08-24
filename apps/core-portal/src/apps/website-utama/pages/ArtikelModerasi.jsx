import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { FileText, Plus, Edit2, Trash2, CheckCircle, MessageSquare, Check, X } from 'lucide-react';

export default function ArtikelModerasi() {
  const { schoolUnitId } = useOutletContext();
  const [articles, setArticles] = useState([]);
  const [comments, setComments] = useState([]);
  const [activeTab, setActiveTab] = useState('articles');
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleForm, setArticleForm] = useState({ title: '', slug: '', category: 'Pendidikan', content: '' });

  useEffect(() => {
    fetchData();
  }, [schoolUnitId]);

  const fetchData = async () => {
    try {
      const [aRes, cRes] = await Promise.all([
        api.get('/api/v1/website-utama/admin/articles', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/articles/comments', { headers: { 'X-School-Unit-Id': schoolUnitId } })
      ]);
      setArticles(aRes.data?.data || []);
      setComments(cRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching articles & comments:', err);
    }
  };

  const handleSaveArticle = async (e) => {
    e.preventDefault();
    try {
      const slug = articleForm.slug || articleForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
      const payload = { ...articleForm, slug };

      if (editingArticle) {
        await api.put(`/api/v1/website-utama/admin/articles/${editingArticle.id}`, payload, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      } else {
        await api.post('/api/v1/website-utama/admin/articles', payload, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      }
      setShowArticleModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan artikel');
    }
  };

  const handlePublishArticle = async (id) => {
    try {
      await api.patch(`/api/v1/website-utama/admin/articles/${id}/publish`, {}, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal publish artikel');
    }
  };

  const handleModerateComment = async (commentId, status) => {
    try {
      await api.patch(`/api/v1/website-utama/admin/articles/comments/${commentId}/moderate`, { status }, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal moderasi komentar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Artikel & Moderasi Komentar</h1>
          <p className="text-xs text-slate-500">Kelola artikel karya guru/siswa, review publikasi, serta moderasi komentar pembaca.</p>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'articles' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Daftar Artikel ({articles.length})
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'comments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Moderasi Komentar ({comments.length})
        </button>
      </div>

      {activeTab === 'articles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingArticle(null);
                setArticleForm({ title: '', slug: '', category: 'Pendidikan', content: '' });
                setShowArticleModal(true);
              }}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tulis Artikel</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Judul Artikel</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Dibaca</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{art.title}</td>
                    <td className="py-3 px-4 text-slate-600">{art.category}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        art.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {art.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{art.views_count}x</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {art.status !== 'published' && (
                          <button
                            onClick={() => handlePublishArticle(art.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                          >
                            Publish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-800">{c.commenter_name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{c.content}</p>
              </div>

              {c.status === 'pending' && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleModerateComment(c.id, 'approved')}
                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded"
                    title="Setujui Komentar"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleModerateComment(c.id, 'rejected')}
                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded"
                    title="Tolak Komentar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Tulis Artikel */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">{editingArticle ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h3>
            <form onSubmit={handleSaveArticle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Artikel</label>
                <input
                  type="text"
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                <input
                  type="text"
                  value={articleForm.category}
                  onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Konten Artikel</label>
                <textarea
                  rows="6"
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowArticleModal(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
