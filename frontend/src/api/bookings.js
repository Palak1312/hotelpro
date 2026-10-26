import api from './axios';

export const createBooking = (data) =>
  api.post('/api/bookings', data).then((r) => r.data);

export const lookupBooking = (reference) =>
  api.get(`/api/bookings/reference/${reference}`).then((r) => r.data);
