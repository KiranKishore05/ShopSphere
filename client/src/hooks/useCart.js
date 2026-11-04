import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as cartService from '../services/cartService';
import { useAuth } from './useAuth';
import { useCartDrawerStore } from '../store/useCartDrawerStore';

export const useCart = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const openCartDrawer = useCartDrawerStore((state) => state.openCartDrawer);

  const {
    data: cart = null,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      try {
        const res = await cartService.fetchCart();
        return res ?? null;
      } catch (err) {
        if (err.code === 'UNAUTHORIZED' || err.code === 'TOKEN_EXPIRED') {
          return null;
        }
        throw err;
      }
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000
  });

  const addToCartMutation = useMutation({
    mutationFn: (variables) => cartService.addToCart(variables),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
      openCartDrawer();
    }
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ variantSku, quantity }) => cartService.updateCartItem(variantSku, quantity),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: (variantSku) => cartService.removeCartItem(variantSku),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    }
  });

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const totalItems = cart?.totalItems || 0;
  const isEligibleForFreeShipping = Boolean(cart?.isEligibleForFreeShipping);

  return {
    cart,
    items,
    subtotal,
    totalItems,
    isEligibleForFreeShipping,
    freeShippingThreshold: cart?.freeShippingThreshold || 5000,
    isLoading,
    isError,
    error,
    refetchCart: refetch,
    addToCart: (variables) => addToCartMutation.mutateAsync(variables),
    isAddingToCart: addToCartMutation.isPending,
    addToCartError: addToCartMutation.error,
    updateQuantity: (variantSku, quantity) => updateQuantityMutation.mutateAsync({ variantSku, quantity }),
    isUpdatingQuantity: updateQuantityMutation.isPending,
    removeItem: (variantSku) => removeItemMutation.mutateAsync(variantSku),
    isRemovingItem: removeItemMutation.isPending
  };
};

export default useCart;
