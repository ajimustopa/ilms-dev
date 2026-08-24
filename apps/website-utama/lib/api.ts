/**
 * Fetch Wrapper for Public Website Endpoints
 * Sesuai api-contract-website-utama.md Bagian 2
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1/website-utama';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  errors?: any;
}

export async function fetchPublicApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}/public${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
    // Default caching untuk kebutuhan SEO & SSR
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API error with status ${res.status}`);
  }

  return res.json();
}

// Helper methods per fitur publik
export const publicApi = {
  // #14 Beranda
  getHome: (schoolUnitId: number = 1) =>
    fetchPublicApi<any>(`/home?school_unit_id=${schoolUnitId}`),

  // #15 Profil Sekolah
  getSchoolProfile: (schoolUnitId: number = 1) =>
    fetchPublicApi<any>(`/school-profile?school_unit_id=${schoolUnitId}`),

  // #16 Profil Pengajar
  getStaffProfiles: (schoolUnitId?: number) =>
    fetchPublicApi<any[]>(`/staff-profiles${schoolUnitId ? `?school_unit_id=${schoolUnitId}` : ''}`),

  // #17 Kehidupan Sekolah
  getSchoolLife: (category?: string, schoolUnitId?: number) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (schoolUnitId) params.append('school_unit_id', String(schoolUnitId));
    return fetchPublicApi<any[]>(`/school-life?${params.toString()}`);
  },

  // #18 Berita
  getNews: (params: { page?: number; limit?: number; category?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    return fetchPublicApi<any[]>(`/news?${query.toString()}`);
  },

  getNewsBySlug: (slug: string) =>
    fetchPublicApi<any>(`/news/${slug}`),

  // #19 Galeri
  getGalleries: (schoolUnitId?: number) =>
    fetchPublicApi<any[]>(`/galleries${schoolUnitId ? `?school_unit_id=${schoolUnitId}` : ''}`),

  getGalleryById: (id: number | string) =>
    fetchPublicApi<any>(`/galleries/${id}`),

  // #20 FAQ
  getFaqs: (category?: string, schoolUnitId?: number) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (schoolUnitId) params.append('school_unit_id', String(schoolUnitId));
    return fetchPublicApi<any[]>(`/faqs?${params.toString()}`);
  },

  // #21 Testimoni
  getTestimonials: (schoolUnitId?: number) =>
    fetchPublicApi<any[]>(`/testimonials${schoolUnitId ? `?school_unit_id=${schoolUnitId}` : ''}`),

  // #22 Events
  getEvents: (year?: number, month?: number, schoolUnitId?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));
    if (schoolUnitId) params.append('school_unit_id', String(schoolUnitId));
    return fetchPublicApi<any[]>(`/events?${params.toString()}`);
  },

  // #23 Kontak
  getContact: (schoolUnitId: number = 1) =>
    fetchPublicApi<any>(`/contact?school_unit_id=${schoolUnitId}`),

  // #24 Akreditasi
  getAccreditations: (schoolUnitId?: number) =>
    fetchPublicApi<any[]>(`/accreditations${schoolUnitId ? `?school_unit_id=${schoolUnitId}` : ''}`),

  // #25 PPDB
  createRegistrant: (payload: any) =>
    fetchPublicApi<any>('/ppdb/registrants', { method: 'POST', body: JSON.stringify(payload) }),

  submitRegistrant: (id: number | string) =>
    fetchPublicApi<any>(`/ppdb/registrants/${id}/submit`, { method: 'POST' }),

  getPpdbSchedules: (schoolUnitId?: number) =>
    fetchPublicApi<any[]>(`/ppdb/schedules${schoolUnitId ? `?school_unit_id=${schoolUnitId}` : ''}`),

  getRegistrantStatus: (id: number | string) =>
    fetchPublicApi<any>(`/ppdb/registrants/${id}/status`),

  // #29 Konsultasi
  createTicket: (payload: any) =>
    fetchPublicApi<any>('/consultation/tickets', { method: 'POST', body: JSON.stringify(payload) }),

  getTicketDetail: (id: number | string) =>
    fetchPublicApi<any>(`/consultation/tickets/${id}`),

  createBooking: (payload: any) =>
    fetchPublicApi<any>('/consultation/bookings', { method: 'POST', body: JSON.stringify(payload) }),

  // #31 Artikel
  getArticles: (params: { page?: number; limit?: number; category?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.category) query.append('category', params.category);
    return fetchPublicApi<any[]>(`/articles?${query.toString()}`);
  },

  getArticleBySlug: (slug: string) =>
    fetchPublicApi<any>(`/articles/${slug}`),

  addComment: (articleId: number | string, payload: { commenter_name: string; content: string }) =>
    fetchPublicApi<any>(`/articles/${articleId}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
};
