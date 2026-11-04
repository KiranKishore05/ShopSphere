import api from '../lib/axios';

export const fetchCart = async () => {
  const res = await api.get('/cart');
  return res.data?.cart || res.cart || res.data;
};

export const addToCart = async ({ productId, variantSku, quantity = 1 }) => {
  const res = await api.post('/cart/items', { productId, variantSku, quantity });
  return res.data?.cart || res.cart || res.data;
};

export const updateCartItem = async (variantSku, quantity) => {
  const res = await api.patch(`/cart/items/${encodeURIComponent(variantSku)}`, { quantity });
  return res.data?.cart || res.cart || res.data;
};

export const removeCartItem = async (variantSku) => {
  const res = await api.delete(`/cart/items/${encodeURIComponent(variantSku)}`);
  return res.data?.cart || res.cart || res.data;
};
