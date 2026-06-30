import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  signup: (data: { email: string; password: string; fullName?: string }) =>
    api.post('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
};

// Will API
export const willApi = {
  create: () => api.post('/wills'),
  getAll: () => api.get('/wills'),
  getActive: () => api.get('/wills/active'),
  getById: (id: string) => api.get(`/wills/${id}`),
  validate: (id: string) => api.get(`/wills/${id}/validate`),
};

// Chat API
export const chatApi = {
  getMessages: (willId: string) => api.get(`/chat/${willId}/messages`),
  startConversation: (willId: string) => api.post(`/chat/${willId}/start`),
  sendMessage: (willId: string, message: string) =>
    api.post(`/chat/${willId}/send`, { message }),
};

// Document API
export const documentApi = {
  getPreview: (willId: string) => api.get(`/documents/${willId}/preview`),
  downloadPdf: (willId: string) =>
    api.get(`/documents/${willId}/download`, { responseType: 'blob' }),
};

export default api;
