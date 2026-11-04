import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import * as authService from '../services/authService';

vi.mock('../services/authService');
vi.mock('../services/healthService', () => ({
  checkHealth: vi.fn().mockResolvedValue({
    connected: true,
    data: { status: 'healthy' }
  })
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (ui, { route = '/' } = {}) => {
  const queryClient = createTestQueryClient();
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

describe('Frontend Authentication Suite (LoginPage & RegisterPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginPage', () => {
    it('renders the login form elements', async () => {
      renderWithProviders(<LoginPage />, { route: '/login' });

      expect(await screen.findByRole('heading', { name: /Sign In to Atelier/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('shows validation errors when submitting blank login form', async () => {
      renderWithProviders(<LoginPage />, { route: '/login' });

      const submitBtn = screen.getByRole('button', { name: /Sign In/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/Email address is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('submits credentials and handles server error gracefully', async () => {
      authService.login.mockRejectedValueOnce({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password credentials.'
      });

      renderWithProviders(<LoginPage />, { route: '/login' });

      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'invalid@domain.com' } });
      fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'WrongPassword123' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      expect(await screen.findByText(/Invalid email or password credentials/i)).toBeInTheDocument();
    });

    it('successfully calls login API on valid credentials', async () => {
      authService.login.mockResolvedValueOnce({
        _id: 'user123',
        name: 'Julian Vance',
        email: 'julian@domain.com',
        role: 'customer'
      });

      renderWithProviders(<LoginPage />, { route: '/login' });

      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'julian@domain.com' } });
      fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'ValidPass123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'julian@domain.com',
          password: 'ValidPass123!'
        });
      });
    });
  });

  describe('RegisterPage', () => {
    it('renders the registration form elements', async () => {
      renderWithProviders(<RegisterPage />, { route: '/register' });

      expect(await screen.findByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    });

    it('validates password mismatch and terms requirement', async () => {
      renderWithProviders(<RegisterPage />, { route: '/register' });

      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Elena Rostova' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'elena@domain.com' } });
      fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password123' } });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'MismatchPassword456' } });

      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
      expect(await screen.findByText(/You must agree to the Terms of Service/i)).toBeInTheDocument();
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('submits registration form with matched passwords and accepted terms', async () => {
      authService.register.mockResolvedValueOnce({
        _id: 'user456',
        name: 'Elena Rostova',
        email: 'elena@domain.com',
        role: 'customer'
      });

      renderWithProviders(<RegisterPage />, { route: '/register' });

      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Elena Rostova' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'elena@domain.com' } });
      fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Password123!' } });
      fireEvent.click(screen.getByRole('checkbox'));

      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          name: 'Elena Rostova',
          email: 'elena@domain.com',
          password: 'Password123!',
          phone: ''
        });
      });
    });
  });
});
