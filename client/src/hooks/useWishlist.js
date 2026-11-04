import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as wishlistService from '../services/wishlistService';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';

export const useWishlist = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const {
    data: wishlist = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      try {
        const res = await wishlistService.fetchWishlist();
        return res ?? [];
      } catch (err) {
        if (err.code === 'UNAUTHORIZED' || err.code === 'TOKEN_EXPIRED') {
          return [];
        }
        throw err;
      }
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000
  });

  const addToWishlistMutation = useMutation({
    mutationFn: (productId) => wishlistService.addToWishlist(productId),
    onSuccess: (updatedWishlist) => {
      queryClient.setQueryData(['wishlist'], updatedWishlist);
    }
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: (productId) => wishlistService.removeFromWishlist(productId),
    onSuccess: (updatedWishlist) => {
      queryClient.setQueryData(['wishlist'], updatedWishlist);
    }
  });

  const isInWishlist = (productId) => {
    if (!productId || !wishlist) return false;
    return wishlist.some(item => (item._id || item) === productId);
  };

  const toggleWishlist = async (productId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (isInWishlist(productId)) {
      return removeFromWishlistMutation.mutateAsync(productId);
    } else {
      return addToWishlistMutation.mutateAsync(productId);
    }
  };

  return {
    wishlist: wishlist ?? [],
    totalItems: (wishlist ?? []).length,
    isInWishlist,
    addToWishlist: (productId) => addToWishlistMutation.mutateAsync(productId),
    removeFromWishlist: (productId) => removeFromWishlistMutation.mutateAsync(productId),
    toggleWishlist,
    isLoading,
    isError,
    error,
    refetchWishlist: refetch
  };
};

export default useWishlist;
