import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as userService from '../services/userService';
import { useAuth } from './useAuth';

export const useAddresses = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const {
    data: addresses = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      try {
        return await userService.fetchAddresses();
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

  const addAddressMutation = useMutation({
    mutationFn: userService.addAddress,
    onSuccess: (data) => {
      queryClient.setQueryData(['addresses'], data?.data?.addresses || data?.addresses || []);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ addressId, addressData }) => userService.updateAddress(addressId, addressData),
    onSuccess: (data) => {
      queryClient.setQueryData(['addresses'], data?.data?.addresses || data?.addresses || []);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (addressId) => userService.deleteAddress(addressId),
    onSuccess: (data) => {
      queryClient.setQueryData(['addresses'], data?.data?.addresses || data?.addresses || []);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;

  return {
    addresses,
    defaultAddress,
    isLoading,
    isError,
    error,
    refetchAddresses: refetch,
    addAddressMutation,
    updateAddressMutation,
    deleteAddressMutation,
    addAddress: addAddressMutation.mutateAsync,
    isAdding: addAddressMutation.isPending,
    addError: addAddressMutation.error,
    updateAddress: (addressId, addressData) => updateAddressMutation.mutateAsync({ addressId, addressData }),
    isUpdating: updateAddressMutation.isPending,
    updateError: updateAddressMutation.error,
    deleteAddress: (addressId) => deleteAddressMutation.mutateAsync(addressId),
    isDeleting: deleteAddressMutation.isPending,
    deleteError: deleteAddressMutation.error
  };
};

export default useAddresses;
