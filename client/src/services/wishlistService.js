import api from '../lib/axios';

export const fetchWishlist = async () => {
  const res = await api.get('/wishlist');
  return res.data?.wishlist || res.wishlist || [];
};

export const addToWishlist = async (productId) => {
  const res = await api.post('/wishlist/items', { productId });
  return res.data?.wishlist || res.wishlist || [];
};

export const removeFromWishlist = async (productId) => {
  const res = await api.delete(`/wishlist/items/${encodeURIComponent(productId)}`);
  return res.data?.wishlist || res.wishlist || [];
};
