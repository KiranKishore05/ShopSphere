import api from '../lib/axios';

export const fetchProducts = async (params = {}) => {
  const queryParams = { ...params };
  // Remove empty keys
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key] === '' || queryParams[key] === undefined || queryParams[key] === null) {
      delete queryParams[key];
    }
  });
  const res = await api.get('/products', { params: queryParams });
  const products = res.data?.products || res.products || (Array.isArray(res) ? res : []);
  const meta = res.meta || res.data?.meta || {
    page: params.page || 1,
    limit: params.limit || 12,
    total: products.length,
    totalPages: Math.ceil(products.length / (params.limit || 12)) || 1
  };
  return {
    products,
    meta,
    data: { products }
  };
};

export const fetchProductBySlug = async (slug) => {
  const res = await api.get(`/products/${encodeURIComponent(slug)}`);
  return res.data?.product || res.product || res.data;
};

export const fetchCategories = async (params = {}) => {
  const res = await api.get('/categories', { params });
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data?.categories)) return res.data.categories;
  if (Array.isArray(res?.categories)) return res.categories;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export const fetchCategoryProducts = async (slug, params = {}) => {
  const queryParams = { ...params };
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key] === '' || queryParams[key] === undefined || queryParams[key] === null) {
      delete queryParams[key];
    }
  });
  const res = await api.get(`/categories/${encodeURIComponent(slug)}/products`, { params: queryParams });
  return res.data || res;
};
