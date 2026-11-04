import api from '../lib/axios';

/**
 * Admin Service — ShopSphere
 * Encapsulates all administrative backend calls to /api/v1/admin/*
 */

// ---------------- ANALYTICS ----------------
export const fetchAdminAnalytics = async (params = {}) => {
  const res = await api.get('/admin/analytics/summary', { params });
  return res.data?.analytics || res.data || res;
};

// ---------------- PRODUCTS ----------------
export const fetchAdminProducts = async (params = {}) => {
  const res = await api.get('/admin/products', { params });
  return res.data || res;
};

export const fetchAdminProductById = async (id) => {
  const res = await api.get(`/admin/products/${id}`);
  return res.data?.product || res.data || res;
};

export const createAdminProduct = async (data) => {
  const res = await api.post('/admin/products', data);
  return res.data?.product || res.data || res;
};

export const updateAdminProduct = async (id, data) => {
  const res = await api.patch(`/admin/products/${id}`, data);
  return res.data?.product || res.data || res;
};

export const deleteAdminProduct = async (id) => {
  const res = await api.delete(`/admin/products/${id}`);
  return res.data || res;
};

export const uploadAdminProductImage = async (data) => {
  const res = await api.post('/admin/products/upload-image', data);
  return res.data || res;
};

// ---------------- CATEGORIES ----------------
export const fetchAdminCategories = async () => {
  const res = await api.get('/admin/categories');
  return res.data?.categories || res.data || res;
};

export const createAdminCategory = async (data) => {
  const res = await api.post('/admin/categories', data);
  return res.data?.category || res.data || res;
};

export const updateAdminCategory = async (id, data) => {
  const res = await api.patch(`/admin/categories/${id}`, data);
  return res.data?.category || res.data || res;
};

export const deleteAdminCategory = async (id) => {
  const res = await api.delete(`/admin/categories/${id}`);
  return res.data || res;
};

// ---------------- INVENTORY ----------------
export const fetchAdminInventory = async (params = {}) => {
  const res = await api.get('/admin/inventory', { params });
  return res.data || res;
};

export const adjustAdminInventoryStock = async (payload) => {
  const res = await api.patch('/admin/inventory/adjust', payload);
  return res.data || res;
};

export const fetchAdminInventoryMovements = async (params = {}) => {
  const res = await api.get('/admin/inventory/movements', { params });
  return res.data || res;
};

// ---------------- ORDERS ----------------
export const fetchAdminOrders = async (params = {}) => {
  const res = await api.get('/admin/orders', { params });
  return res.data || res;
};

export const fetchAdminOrderById = async (id) => {
  const res = await api.get(`/admin/orders/${id}`);
  return res.data?.order || res.data || res;
};

export const updateAdminOrderStatus = async (id, payload) => {
  const res = await api.patch(`/admin/orders/${id}/status`, payload);
  return res.data?.order || res.data || res;
};

// ---------------- COUPONS ----------------
export const fetchAdminCoupons = async () => {
  const res = await api.get('/admin/coupons');
  return res.data?.coupons || res.data || res;
};

export const fetchAdminCouponById = async (id) => {
  const res = await api.get(`/admin/coupons/${id}`);
  return res.data?.coupon || res.data || res;
};

export const createAdminCoupon = async (data) => {
  const res = await api.post('/admin/coupons', data);
  return res.data?.coupon || res.data || res;
};

export const updateAdminCoupon = async (id, data) => {
  const res = await api.patch(`/admin/coupons/${id}`, data);
  return res.data?.coupon || res.data || res;
};

export const deleteAdminCoupon = async (id) => {
  const res = await api.delete(`/admin/coupons/${id}`);
  return res.data || res;
};
