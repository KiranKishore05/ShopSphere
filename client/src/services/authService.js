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

export const forgotPassword = async (email) => {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data || res;
};

export const resetPassword = async ({ token, password }) => {
  const res = await api.post('/auth/reset-password', { token, password });
  return res.data || res;
};
