import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as authService from '../services/authService';

export const useAuth = () => {
  const queryClient = useQueryClient();

  const {
    data: user = null,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await authService.getMe();
        return res ?? null;
      } catch (err) {
        if (err.code === 'UNAUTHORIZED' || err.code === 'TOKEN_EXPIRED') {
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: (credentials) => authService.login(credentials),
    onSuccess: (userData) => {
      queryClient.setQueryData(['auth', 'me'], userData);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    }
  });

  const registerMutation = useMutation({
    mutationFn: (userData) => authService.register(userData),
    onSuccess: (userData) => {
      queryClient.setQueryData(['auth', 'me'], userData);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.setQueryData(['cart'], null);
      queryClient.setQueryData(['wishlist'], []);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });

  return {
    user: user ?? null,
    isAuthenticated: Boolean(user && user._id),
    isLoading,
    isError,
    error,
    refetchUser: refetch,
    login: (credentials) => loginMutation.mutateAsync(credentials),
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: (userData) => registerMutation.mutateAsync(userData),
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: () => logoutMutation.mutateAsync(),
    isLoggingOut: logoutMutation.isPending
  };
};

export default useAuth;
