const API_BASE = '/api/v1';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server xatosi: ${response.status}`);
  }

  if (response.headers.get('content-type')?.includes('application/json')) {
    return response.json();
  }
  return response;
}

export const api = {
  // Autentifikatsiya va Shaxsiy Ishchi Kabinet
  getMe: () => request('/auth/me'),
  initGuestSession: (deviceId, fullName, schoolName) => request('/auth/guest-session', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId, full_name: fullName, school_name: schoolName })
  }),
  phoneLogin: (phoneNumber, fullName, schoolName) => request('/auth/phone-login', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phoneNumber, full_name: fullName, school_name: schoolName })
  }),
  updateProfile: (data) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  telegramLogin: (data) => request('/auth/telegram-login', { method: 'POST', body: JSON.stringify(data) }),

  // Litsenziya
  getLicenseStatus: () => request('/license/status'),
  activateLicense: (keyCode) => request('/license/activate', {
    method: 'POST',
    body: JSON.stringify({ key_code: keyCode })
  }),
  resetTestLicense: () => request('/license/reset-test', { method: 'POST' }),

  // O'quv dasturi
  getSubjects: () => request('/curriculum/subjects'),
  getTopics: (subjectId, grade, quarter) => 
    request(`/curriculum/topics?subject_id=${subjectId}&grade=${grade}&quarter=${quarter}`),
  addTopic: (data) => request('/curriculum/topics', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteTopic: (topicId) => request(`/curriculum/topics/${topicId}`, {
    method: 'DELETE'
  }),
  resetStandardTopics: (subjectId, grade, quarter) =>
    request(`/curriculum/topics/reset-standard?subject_id=${subjectId}&grade=${grade}&quarter=${quarter}`, {
      method: 'POST'
    }),
  scanTopics: (formData) => request('/curriculum/scan-topics', { method: 'POST', body: formData }),
  saveScannedTopics: (data) => request('/curriculum/save-scanned-topics', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // BSB
  generateBSB: (data) => request('/bsb/generate', { method: 'POST', body: JSON.stringify(data) }),
  swapQuestion: (assessmentId, data) => request(`/bsb/${assessmentId}/swap-question`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getMyAssessments: () => request('/bsb/my-list'),
  getAssessment: (id) => request(`/bsb/${id}`),
  approveAssessment: (id) => request(`/bsb/${id}/approve`, { method: 'POST' }),
  exportBSBWordUrl: (id) => `${API_BASE}/bsb/${id}/export-word`,

  // Tahlil
  processExcel: (formData) => request('/tahlil/process-excel', { method: 'POST', body: formData }),
  exportTahlilWordUrl: () => `${API_BASE}/tahlil/export-word`,

  // Dars Taqdimoti (PowerPoint)
  generatePresentation: (data) => request('/presentation/generate', { method: 'POST', body: JSON.stringify(data) }),
  exportPptx: async (payload) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_BASE}/presentation/export-pptx`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("PowerPoint faylini yuklab olishda xatolik yuz berdi");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const titleSlug = (payload.title || 'Taqdimot').replace(/\s+/g, '_').slice(0, 30);
    a.download = `Taqdimot_${titleSlug}.pptx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  // 4-Modul: KTP va Dars Ishlanmasi (Konspekt)
  generateKTP: (data) => request('/ktp/generate', { method: 'POST', body: JSON.stringify(data) }),
  uploadKTPFile: async (formData) => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/ktp/upload-file`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'KTP faylini yuklashda xatolik yuz berdi');
    }
    return res.json();
  },
  generateKonspekt: (data) => request('/ktp/generate-konspekt', { method: 'POST', body: JSON.stringify(data) }),
  getMyLessonPlans: () => request('/ktp/my-plans'),
  getLessonPlan: (id) => request(`/ktp/${id}`),
  exportLessonPlanWordUrl: (id) => `${API_BASE}/ktp/${id}/export-word`
};
