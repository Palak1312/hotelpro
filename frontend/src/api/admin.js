import api from './axios';

export const adminLogin = (email, password) =>
  api.post('/api/admin/login', { email, password }).then((r) => r.data);

export const seedRooms = () =>
  api.post('/api/admin/seed').then((r) => r.data);

export const fetchDashboardStats = () =>
  api.get('/api/admin/dashboard').then((r) => r.data);

export const fetchAllBookings = (params = {}) =>
  api.get('/api/admin/bookings', { params }).then((r) => r.data);

export const updateBookingStatus = (id, status) =>
  api.patch(`/api/admin/bookings/${id}/status`, { status }).then((r) => r.data);
