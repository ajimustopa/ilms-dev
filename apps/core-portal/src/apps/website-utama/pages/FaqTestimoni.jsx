import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { HelpCircle, MessageSquare, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

export default function FaqTestimoni() {
  const { schoolUnitId } = useOutletContext();
  const [faqs, setFaqs] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [activeTab, setActiveTab] = useState('faq');
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showTestiModal, setShowTestiModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [editingTesti, setEditingTesti] = useState(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'Umum', display_order: 1 });
  const [testiForm, setTestiForm] = useState({ name: '', role_type: 'parent', content: '', photo_url: '', is_visible: true });

  useEffect(() => {
    fetchData();
  }, [schoolUnitId]);

  const fetchData = async () => {
    try {
      const [fRes, tRes] = await Promise.all([
        api.get('/api/v1/website-utama/admin/faqs', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/testimonials', { headers: { 'X-School-Unit-Id': schoolUnitId } })
      ]);
      setFaqs(fRes.data?.data || []);
      setTestimonials(tRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching FAQ & Testimonials:', err);
    }
  };

  const handleSaveFaq = async (e) => {
    e.preventDefault();
    try {
      if (editingFaq) {
        await api.put(`/api/v1/website-utama/admin/faqs/${editingFaq.id}`, faqForm, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      } else {
        await api.post('/api/v1/website-utama/admin/faqs', faqForm, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      }
      setShowFaqModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan FAQ');
    }
  };

  const handleSaveTesti = async (e) => {
    e.preventDefault();
    try {
      if (editingTesti) {
        await api.put(`/api/v1/website-utama/admin/testimonials/${editingTesti.id}`, testiForm, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      } else {
        await api.post('/api/v1/website-utama/admin/testimonials', testiForm, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      }
      setShowTestiModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan testimoni');
    }
  };

  const handleToggleTesti = async (id) => {
    try {
      await api.patch(`/api/v1/website-utama/admin/testimonials/${id}/toggle-visibility`, {}, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal memperbarui status visibilitas');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">FAQ & Testimoni</h1>
          <p className="text-xs text-slate-500">Kelola daftar tanya jawab umum dan ulasan/testimoni orang tua serta alumni.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('faq')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'faq' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Daftar FAQ ({faqs.length})
        </button>
        <button
          onClick={() => setActiveTab('testimonial')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'testimonial' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Testimoni ({testimonials.length})
        </button>
      </div>

      {/* Content FAQ */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingFaq(null);
                setFaqForm({ question: '', answer: '', category: 'Umum', display_order: faqs.length + 1 });
                setShowFaqModal(true);
              }}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah FAQ</span>
            </button>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {f.category} • Urutan: {f.display_order}
                    </span>
                    <h3 className="font-bold text-xs text-slate-800 mt-2">{f.question}</h3>
                    <p className="text-xs text-slate-600 mt-1">{f.answer}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingFaq(f);
                        setFaqForm(f);
                        setShowFaqModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Testimoni */}
      {activeTab === 'testimonial' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingTesti(null);
                setTestiForm({ name: '', role_type: 'parent', content: '', photo_url: '', is_visible: true });
                setShowTestiModal(true);
              }}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Testimoni</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                      {t.role_type}
                    </span>
                    <button
                      onClick={() => handleToggleTesti(t.id)}
                      className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                        t.is_visible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {t.is_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{t.is_visible ? 'Tampil' : 'Tersembunyi'}</span>
                    </button>
                  </div>
                  <p className="text-xs italic text-slate-600">"{t.content}"</p>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">{t.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal FAQ */}
      {showFaqModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">{editingFaq ? 'Edit FAQ' : 'Tambah FAQ'}</h3>
            <form onSubmit={handleSaveFaq} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pertanyaan</label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jawaban</label>
                <textarea
                  rows="4"
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowFaqModal(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
