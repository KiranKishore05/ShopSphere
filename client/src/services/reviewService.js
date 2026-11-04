import api from '../lib/axios';

// ---------------- PUBLIC & CUSTOMER REVIEW APIS ----------------

export const fetchProductReviews = async (productId, params = {}) => {
  const res = await api.get(`/products/${productId}/reviews`, { params });
  return res.data || res;
};

export const checkReviewEligibility = async (productId) => {
  const res = await api.get(`/reviews/eligibility/${productId}`);
  return res.data?.data || res.data || res;
};

export const createProductReview = async (productId, data) => {
  const res = await api.post(`/products/${productId}/reviews`, data);
  return res.data || res;
};

export const updateProductReview = async (reviewId, data) => {
  const res = await api.patch(`/reviews/${reviewId}`, data);
  return res.data || res;
};

export const deleteProductReview = async (reviewId) => {
  const res = await api.delete(`/reviews/${reviewId}`);
  return res.data || res;
};

// ---------------- SEARCH AUTOCOMPLETE APIS ----------------

export const fetchSearchSuggestions = async (query) => {
  if (!query || !query.trim()) {
    return { products: [], categories: [], totalCount: 0 };
  }
  const res = await api.get('/products/search/suggestions', { params: { q: query.trim() } });
  return res.data?.data || res.data || { products: [], categories: [], totalCount: 0 };
};

// ---------------- ADMIN REVIEW MODERATION APIS ----------------

export const fetchAdminReviews = async (params = {}) => {
  const res = await api.get('/admin/reviews', { params });
  return res.data || res;
};

export const moderateAdminReview = async (reviewId, data) => {
  const res = await api.patch(`/admin/reviews/${reviewId}/moderation`, data);
  return res.data || res;
};

export const deleteAdminReview = async (reviewId) => {
  const res = await api.delete(`/admin/reviews/${reviewId}`);
  return res.data || res;
};
