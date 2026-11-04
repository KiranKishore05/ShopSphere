import api from '../lib/axios';

export const applyCoupon = async ({ code, subtotal }) => {
  const res = await api.post('/coupons/apply', { code, subtotal });
  return res.data || res;
};
