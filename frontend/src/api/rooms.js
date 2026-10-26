import api from './axios';

export const fetchRooms = (type = '') => {
  const params = type ? { type } : {};
  return api.get('/api/rooms', { params }).then((r) => r.data);
};

export const fetchRoomById = (id) =>
  api.get(`/api/rooms/${id}`).then((r) => r.data);
