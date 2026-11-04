import api from '../lib/axios';

export const login = async (credentials) => {
  const res = await api.post('/auth/login', credentials);
  return res.data?.user || res.user || res.data;
};

export const register = async (userData) => {
  const res = await api.post('/auth/register', userData);
  return res.data?.user || res.user || res.data;
};

export const logout = async () => {
  const res = await api.post('/auth/logout');
  return res.data || res;
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data?.user || res.user || res.data;
};
