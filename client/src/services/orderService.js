import api from '../lib/axios';

export const checkout = async (payload) => {
  const res = await api.post('/orders/checkout', payload);
  return res.data?.order || res.order || res.data;
};

export const fetchMyOrders = async (params = {}) => {
  const res = await api.get('/orders/me', { params });
  return res.data || res;
};

export const fetchOrderByNumber = async (orderNumber) => {
  const res = await api.get(`/orders/me/${encodeURIComponent(orderNumber)}`);
  return res.data?.order || res.order || res.data;
};

export const cancelOrder = async (orderNumber, reason) => {
  const res = await api.patch(`/orders/me/${encodeURIComponent(orderNumber)}/cancel`, { reason });
  return res.data?.order || res.order || res.data;
};
