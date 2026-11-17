import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminAnalytics,
  fetchAdminProducts,
  fetchAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  uploadAdminProductImage,
  fetchAdminCategories,
  fetchAdminCategoryById,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  fetchAdminInventory,
  adjustAdminInventoryStock,
  fetchAdminInventoryMovements,
  fetchAdminOrders,
  fetchAdminOrderById,
  updateAdminOrderStatus,
  fetchAdminCoupons,
  fetchAdminCouponById,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  fetchAdminCustomers,
  fetchAdminCustomerById,
  updateAdminCustomerStatus
} from '../services/adminService';

// ---------------- ANALYTICS ----------------
export function useAdminAnalytics(params = {}) {
  return useQuery({
    queryKey: ['admin-analytics', params],
    queryFn: () => fetchAdminAnalytics(params),
    staleTime: 60 * 1000
  });
}

// ---------------- PRODUCTS ----------------
export function useAdminProducts(params = {}) {
  return useQuery({
    queryKey: ['admin-products', params],
    queryFn: () => fetchAdminProducts(params),
    staleTime: 30 * 1000
  });
}

export function useAdminProduct(id) {
  return useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => fetchAdminProductById(id),
    enabled: Boolean(id)
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createAdminProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAdminProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    }
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteAdminProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    }
  });
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: (data) => uploadAdminProductImage(data)
  });
}

// ---------------- CATEGORIES ----------------
export function useAdminCategories(params = {}) {
  return useQuery({
    queryKey: ['admin-categories', params],
    queryFn: () => fetchAdminCategories(params),
    staleTime: 60 * 1000
  });
}

export function useAdminCategory(id) {
  return useQuery({
    queryKey: ['admin-category', id],
    queryFn: () => fetchAdminCategoryById(id),
    enabled: Boolean(id)
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createAdminCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAdminCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteAdminCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
}

// ---------------- INVENTORY ----------------
export function useAdminInventory(params = {}) {
  return useQuery({
    queryKey: ['admin-inventory', params],
    queryFn: () => fetchAdminInventory(params),
    staleTime: 15 * 1000
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adjustAdminInventoryStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    }
  });
}

export function useAdminInventoryMovements(params = {}) {
  return useQuery({
    queryKey: ['admin-inventory-movements', params],
    queryFn: () => fetchAdminInventoryMovements(params),
    staleTime: 30 * 1000
  });
}

// ---------------- ORDERS ----------------
export function useAdminOrders(params = {}) {
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => fetchAdminOrders(params),
    staleTime: 15 * 1000
  });
}

export function useAdminOrder(id) {
  return useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => fetchAdminOrderById(id),
    enabled: Boolean(id)
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAdminOrderStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    }
  });
}

// ---------------- COUPONS ----------------
export function useAdminCoupons(params = {}) {
  return useQuery({
    queryKey: ['admin-coupons', params],
    queryFn: () => fetchAdminCoupons(params),
    staleTime: 60 * 1000
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createAdminCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    }
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAdminCoupon(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    }
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteAdminCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    }
  });
}

// ---------------- CUSTOMERS ----------------
export function useAdminCustomers(params = {}) {
  return useQuery({
    queryKey: ['admin-customers', params],
    queryFn: () => fetchAdminCustomers(params),
    staleTime: 30 * 1000
  });
}

export function useAdminCustomer(id) {
  return useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => fetchAdminCustomerById(id),
    enabled: Boolean(id)
  });
}

export function useUpdateCustomerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAdminCustomerStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customer', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    }
  });
}
