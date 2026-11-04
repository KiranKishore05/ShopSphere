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
  return res.data || res;
};

export const fetchProductBySlug = async (slug) => {
  const res = await api.get(`/products/${encodeURIComponent(slug)}`);
  return res.data?.product || res.product || res.data;
};

export const fetchCategories = async () => {
  const res = await api.get('/categories');
  return res.data?.categories || res.categories || [];
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
