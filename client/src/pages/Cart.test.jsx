import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CartPage from './CartPage';
import CartDrawer from '../components/cart/CartDrawer';
import * as cartService from '../services/cartService';
import * as authService from '../services/authService';
import { useCartDrawerStore } from '../store/useCartDrawerStore';

vi.mock('../services/cartService');
vi.mock('../services/authService');
vi.mock('../services/healthService', () => ({
  checkHealth: vi.fn().mockResolvedValue({ connected: true, data: { status: 'healthy' } })
}));

const mockCustomer = {
  _id: 'user123',
  name: 'Cart Tester',
  email: 'cart@atelier.com',
  role: 'customer'
};

const mockCartWithItems = {
  _id: 'cart1',
  userId: 'user123',
  items: [
    {
      productId: 'p1',
      variantSku: 'CSH-TRENCH-S',
      productName: 'Double Cashmere Trench',
      productSlug: 'double-cashmere-trench',
      brand: 'Atelier Sphere',
      image: 'https://example.com/trench.jpg',
      size: 'S',
      color: { name: 'Camel', hexCode: '#C8B293' },
      price: 15000,
      quantity: 1,
      stockQuantity: 5,
      isAvailable: true,
      itemTotal: 15000
    }
  ],
  subtotal: 15000,
  totalItems: 1,
  currency: 'INR',
  freeShippingThreshold: 5000,
  isEligibleForFreeShipping: true
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (ui, { route = '/cart', user = mockCustomer } = {}) => {
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

describe('Cart & Shopping Bag Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartDrawerStore.setState({ isOpen: false });
  });

  describe('CartPage', () => {
    it('renders empty cart state when no items are present', async () => {
      authService.getMe.mockResolvedValue(mockCustomer);
      cartService.fetchCart.mockResolvedValue({
        items: [],
        subtotal: 0,
        totalItems: 0,
        isEligibleForFreeShipping: false
      });

      renderWithProviders(<CartPage />, { route: '/cart' });

      expect(await screen.findByRole('heading', { name: /Your Shopping Bag is Empty/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Continue Shopping/i })).toBeInTheDocument();
    });

    it('renders cart line items with server-authoritative prices and subtotal', async () => {
      authService.getMe.mockResolvedValue(mockCustomer);
      cartService.fetchCart.mockResolvedValue(mockCartWithItems);

      renderWithProviders(<CartPage />, { route: '/cart' });

      expect(await screen.findByRole('heading', { name: /Shopping Bag/i })).toBeInTheDocument();
      expect(await screen.findByText('Double Cashmere Trench')).toBeInTheDocument();
      expect(screen.getAllByText('₹15,000').length).toBeGreaterThan(0);
      expect(screen.getByText(/Your order qualifies for/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Complimentary/i).length).toBeGreaterThan(0);
    });

    it('handles quantity increment and calls cartService.updateCartItem', async () => {
      authService.getMe.mockResolvedValue(mockCustomer);
      cartService.fetchCart.mockResolvedValue(mockCartWithItems);
      cartService.updateCartItem.mockResolvedValue({
        ...mockCartWithItems,
        items: [{ ...mockCartWithItems.items[0], quantity: 2, itemTotal: 30000 }],
        subtotal: 30000,
        totalItems: 2
      });

      renderWithProviders(<CartPage />, { route: '/cart' });

      const plusBtn = await screen.findByLabelText(/Increase quantity/i);
      fireEvent.click(plusBtn);

      await waitFor(() => {
        expect(cartService.updateCartItem).toHaveBeenCalledWith('CSH-TRENCH-S', 2);
      });
    });

    it('handles item removal when remove button is clicked', async () => {
      authService.getMe.mockResolvedValue(mockCustomer);
      cartService.fetchCart.mockResolvedValue(mockCartWithItems);
      cartService.removeCartItem.mockResolvedValue({
        items: [],
        subtotal: 0,
        totalItems: 0,
        isEligibleForFreeShipping: false
      });

      renderWithProviders(<CartPage />, { route: '/cart' });

      const removeBtn = await screen.findByRole('button', { name: /Remove/i });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(cartService.removeCartItem).toHaveBeenCalledWith('CSH-TRENCH-S');
      });
    });
  });

  describe('CartDrawer Component', () => {
    it('renders and closes the slide-over drawer', async () => {
      authService.getMe.mockResolvedValue(mockCustomer);
      cartService.fetchCart.mockResolvedValue(mockCartWithItems);

      useCartDrawerStore.setState({ isOpen: true });

      renderWithProviders(<CartDrawer />);

      expect(await screen.findByRole('heading', { name: /Shopping Bag/i })).toBeInTheDocument();
      expect(await screen.findByText('Double Cashmere Trench')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText(/Close Shopping Bag/i);
      fireEvent.click(closeBtn);

      expect(useCartDrawerStore.getState().isOpen).toBe(false);
    });
  });
});
