import api from '../lib/axios';

export const fetchAddresses = async () => {
  const res = await api.get('/users/me/addresses');
  return res.data?.addresses || res.addresses || [];
};

export const addAddress = async (addressData) => {
  const res = await api.post('/users/me/addresses', addressData);
  return res.data || res;
};

export const updateAddress = async (addressId, addressData) => {
  const res = await api.patch(`/users/me/addresses/${encodeURIComponent(addressId)}`, addressData);
  return res.data || res;
};

export const deleteAddress = async (addressId) => {
  const res = await api.delete(`/users/me/addresses/${encodeURIComponent(addressId)}`);
  return res.data || res;
};

export const updateProfile = async (profileData) => {
  const res = await api.patch('/users/me', profileData);
  return res.data?.user || res.user || res.data;
};
