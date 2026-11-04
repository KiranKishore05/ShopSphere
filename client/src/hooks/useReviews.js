import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProductReviews,
  checkReviewEligibility,
  createProductReview,
  updateProductReview,
  deleteProductReview,
  fetchSearchSuggestions,
  fetchAdminReviews,
  moderateAdminReview,
  deleteAdminReview
} from '../services/reviewService';

// Fetch product reviews
export function useProductReviews(productId, params = {}) {
  return useQuery({
    queryKey: ['product-reviews', productId, params],
    queryFn: () => fetchProductReviews(productId, params),
    enabled: Boolean(productId),
    staleTime: 30 * 1000
  });
}

// Check review eligibility for logged-in user
export function useReviewEligibility(productId, enabled = true) {
  return useQuery({
    queryKey: ['review-eligibility', productId],
    queryFn: () => checkReviewEligibility(productId),
    enabled: Boolean(productId) && enabled,
    retry: false,
    staleTime: 60 * 1000
  });
}

// Create review
export function useCreateReview(productId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createProductReview(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', productId] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    }
  });
}

// Update review
export function useUpdateReview(productId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, data }) => updateProductReview(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', productId] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    }
  });
}

// Delete review
export function useDeleteReview(productId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId) => deleteProductReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', productId] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    }
  });
}

// Search suggestions query (debounced in component)
export function useSearchSuggestions(query) {
  return useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: () => fetchSearchSuggestions(query),
    enabled: Boolean(query && query.trim().length >= 1),
    staleTime: 60 * 1000
  });
}

// ---------------- ADMIN MODERATION HOOKS ----------------

export function useAdminReviews(params = {}) {
  return useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => fetchAdminReviews(params),
    staleTime: 15 * 1000
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, data }) => moderateAdminReview(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
    }
  });
}

export function useDeleteAdminReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId) => deleteAdminReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
    }
  });
}
