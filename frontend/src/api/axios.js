import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token for admin routes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hp_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error messages
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      (err.code === 'ECONNABORTED' ? 'Request timed out. The server may be waking up — please retry.' : null) ||
      (err.message === 'Network Error' ? 'Cannot reach the server. Check your connection.' : null) ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default api;
