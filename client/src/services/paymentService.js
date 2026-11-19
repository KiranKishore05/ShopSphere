import api from '../lib/axios';

export const createRazorpayOrder = async (orderId) => {
  const res = await api.post('/payments/razorpay/create-order', { orderId });
  return res.data || res;
};

export const verifyRazorpayPayment = async (verificationPayload) => {
  const res = await api.post('/payments/razorpay/verify', verificationPayload);
  return res.data?.order || res.order || res.data;
};

export const mockCompletePayment = async (mockPayload) => {
  const res = await api.post('/payments/razorpay/mock-complete', mockPayload);
  return res.data?.order || res.order || res.data;
};

export const recordPaymentFailure = async (failurePayload) => {
  try {
    const res = await api.post('/payments/razorpay/failed', failurePayload);
    return res.data || res;
  } catch (err) {
    console.warn('Failed to record payment failure on server:', err);
  }
};
