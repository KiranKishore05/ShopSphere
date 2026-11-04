import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from '../components/common/ProtectedRoute';
import ProfilePage from './ProfilePage';
import AddressesPage from './AddressesPage';
import * as authService from '../services/authService';
import * as userService from '../services/userService';

vi.mock('../services/authService');
vi.mock('../services/userService');
vi.mock('../services/healthService', () => ({
  checkHealth: vi.fn().mockResolvedValue({ connected: true, data: { status: 'healthy' } })
}));

const mockUser = {
  _id: 'user789',
  name: 'Julian Vance',
  email: 'julian@test-atelier.com',
  role: 'customer',
  phone: '+919876543210',
  createdAt: '2025-01-15T00:00:00.000Z',
  savedAddresses: [
    {
      _id: 'addr1',
      fullName: 'Julian Vance',
      phone: '+919876543210',
      streetAddress: '10 Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400021',
      country: 'India',
      isDefault: true
    }
  ],
  wishlist: []
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (ui, { route = '/account/profile', user = mockUser } = {}) => {
  const queryClient = createTestQueryClient();
  if (user) {
    queryClient.setQueryData(['auth', 'me'], user);
  }
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    ),
    queryClient
  };
};

describe('Customer Account & Address Book Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ProtectedRoute Guard', () => {
    it('redirects unauthenticated visitor away from protected account route', async () => {
      authService.getMe.mockResolvedValueOnce(null);

      renderWithProviders(
        <Routes>
          <Route path="/login" element={<div>Login Page Target</div>} />
          <Route path="/account" element={<ProtectedRoute />}>
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>,
        { route: '/account/profile', user: null }
      );

      expect(await screen.findByText(/Login Page Target/i)).toBeInTheDocument();
    });

    it('allows access to protected route when customer session is active', async () => {
      authService.getMe.mockResolvedValue(mockUser);

      renderWithProviders(
        <Routes>
          <Route path="/account" element={<ProtectedRoute />}>
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>,
        { route: '/account/profile', user: mockUser }
      );

      expect(await screen.findByRole('heading', { name: /My Account/i })).toBeInTheDocument();
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });
  });

  describe('ProfilePage', () => {
    it('submits updated profile name and phone', async () => {
      authService.getMe.mockResolvedValue(mockUser);
      userService.updateProfile.mockResolvedValueOnce({
        ...mockUser,
        name: 'Julian Vance-Montague'
      });

      renderWithProviders(<ProfilePage />, { route: '/account/profile', user: mockUser });

      const nameInput = await screen.findByDisplayValue('Julian Vance');
      fireEvent.change(nameInput, { target: { value: 'Julian Vance-Montague' } });

      const saveBtn = screen.getByRole('button', { name: /Save Profile Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(userService.updateProfile).toHaveBeenCalledWith({
          name: 'Julian Vance-Montague',
          phone: '+919876543210'
        });
      });
      expect(await screen.findByText(/Profile details updated successfully/i)).toBeInTheDocument();
    });
  });

  describe('AddressesPage', () => {
    it('displays saved customer addresses and default badge', async () => {
      authService.getMe.mockResolvedValue(mockUser);
      userService.fetchAddresses.mockResolvedValueOnce(mockUser.savedAddresses);

      renderWithProviders(<AddressesPage />, { route: '/account/addresses', user: mockUser });

      expect(await screen.findByRole('heading', { name: /Saved Addresses/i })).toBeInTheDocument();
      expect(await screen.findByText(/10 Marine Drive/i)).toBeInTheDocument();
      expect(screen.getByText(/Default Delivery/i)).toBeInTheDocument();
    });

    it('opens add address form and performs Zod validation', async () => {
      authService.getMe.mockResolvedValue(mockUser);
      userService.fetchAddresses.mockResolvedValueOnce(mockUser.savedAddresses);

      renderWithProviders(<AddressesPage />, { route: '/account/addresses', user: mockUser });

      const addBtn = await screen.findByRole('button', { name: /Add New Address/i });
      fireEvent.click(addBtn);

      expect(screen.getByRole('heading', { name: /Add New Shipping Address/i })).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /^Add Address$/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/Full name must be at least 2 characters/i)).toBeInTheDocument();
      expect(await screen.findByText(/Street address is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/City is required/i)).toBeInTheDocument();
    });

    it('submits valid address data and updates the list', async () => {
      authService.getMe.mockResolvedValue(mockUser);
      userService.fetchAddresses.mockResolvedValueOnce(mockUser.savedAddresses);
      userService.addAddress.mockResolvedValueOnce({
        addresses: [
          ...mockUser.savedAddresses,
          {
            _id: 'addr2',
            fullName: 'Oliver Vance',
            phone: '+919876543211',
            streetAddress: '24 BKC Tower',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400051',
            country: 'India',
            isDefault: false
          }
        ]
      });

      renderWithProviders(<AddressesPage />, { route: '/account/addresses', user: mockUser });

      fireEvent.click(await screen.findByRole('button', { name: /Add New Address/i }));

      fireEvent.change(screen.getByPlaceholderText(/Julian Vance/i), { target: { value: 'Oliver Vance' } });
      fireEvent.change(screen.getByPlaceholderText(/\+91 98765 43210/i), { target: { value: '+919876543211' } });
      fireEvent.change(screen.getByPlaceholderText(/Flat 402/i), { target: { value: '24 BKC Tower' } });
      fireEvent.change(screen.getByPlaceholderText(/Mumbai/i), { target: { value: 'Mumbai' } });
      fireEvent.change(screen.getByPlaceholderText(/Maharashtra/i), { target: { value: 'Maharashtra' } });
      fireEvent.change(screen.getByPlaceholderText(/400021/i), { target: { value: '400051' } });

      fireEvent.click(screen.getByRole('button', { name: /^Add Address$/i }));

      await waitFor(() => {
        expect(userService.addAddress).toHaveBeenCalled();
      });
      expect(await screen.findByText(/New address added to your address book/i)).toBeInTheDocument();
    });
  });
});
