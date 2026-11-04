import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  checkout as checkoutApi,
  fetchMyOrders,
  fetchOrderByNumber,
  cancelOrder as cancelOrderApi
} from '../services/orderService';

export const useMyOrders = (params = {}) => {
  return useQuery({
    queryKey: ['orders', 'me', params],
    queryFn: () => fetchMyOrders(params),
    staleTime: 30 * 1000
  });
};

export const useOrderDetail = (orderNumber) => {
  return useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => fetchOrderByNumber(orderNumber),
    enabled: Boolean(orderNumber),
    staleTime: 30 * 1000
  });
};

export const useCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => checkoutApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderNumber, reason }) => cancelOrderApi(orderNumber, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderNumber] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
};
