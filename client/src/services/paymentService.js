import api from '../lib/axios';

export const createRazorpayOrder = async (orderId) => {
  const res = await api.post('/payments/razorpay/create-order', { orderId });
  return res.data || res;
};

export const verifyRazorpayPayment = async (verificationPayload) => {
  const res = await api.post('/payments/razorpay/verify', verificationPayload);
  return res.data?.order || res.order || res.data;
};
