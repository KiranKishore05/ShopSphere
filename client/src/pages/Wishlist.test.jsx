import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WishlistPage from './WishlistPage';
import * as wishlistService from '../services/wishlistService';
import * as authService from '../services/authService';

vi.mock('../services/wishlistService');
vi.mock('../services/authService');
vi.mock('../services/healthService', () => ({
  checkHealth: vi.fn().mockResolvedValue({ connected: true, data: { status: 'healthy' } })
}));

const mockCustomer = {
  _id: 'user123',
  name: 'Wishlist Patron',
  email: 'wishlist@atelier.com',
  role: 'customer'
};

const mockWishlistItems = [
  {
    _id: 'prod1',
    name: 'Silk Georgette Scarf',
    slug: 'silk-georgette-scarf',
    brand: 'Atelier Sphere',
    images: [{ url: 'https://example.com/scarf.jpg', isPrimary: true }],
    basePrice: 4800,
    variants: [
      { sku: 'SGS-NAV-ONE', price: 4800, size: 'One Size', stockQuantity: 5 }
    ]
  }
];

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (ui, { route = '/wishlist' } = {}) => {
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

describe('Wishlist Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prompts unauthenticated visitor to sign in to access wishlist', async () => {
    authService.getMe.mockResolvedValue(null);

    renderWithProviders(<WishlistPage />, { route: '/wishlist' });

    expect(await screen.findByRole('heading', { name: /Sign In to Access Your Wishlist/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign In to Atelier/i })).toBeInTheDocument();
  });

  it('renders empty state when authenticated user has no saved pieces', async () => {
    authService.getMe.mockResolvedValue(mockCustomer);
    wishlistService.fetchWishlist.mockResolvedValue([]);

    renderWithProviders(<WishlistPage />, { route: '/wishlist' });

    expect(await screen.findByRole('heading', { name: /Your Wishlist is Empty/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Discover Collection/i })).toBeInTheDocument();
  });

  it('renders bookmarked garments with brand, name, and price', async () => {
    authService.getMe.mockResolvedValue(mockCustomer);
    wishlistService.fetchWishlist.mockResolvedValue(mockWishlistItems);

    renderWithProviders(<WishlistPage />, { route: '/wishlist' });

    expect(await screen.findByRole('heading', { name: /Saved Pieces/i })).toBeInTheDocument();
    expect(screen.getByText('Silk Georgette Scarf')).toBeInTheDocument();
    expect(screen.getByText('₹4,800')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Select Options/i })).toBeInTheDocument();
  });

  it('calls wishlistService.removeFromWishlist when remove button is clicked', async () => {
    authService.getMe.mockResolvedValue(mockCustomer);
    wishlistService.fetchWishlist.mockResolvedValue(mockWishlistItems);
    wishlistService.removeFromWishlist.mockResolvedValue([]);

    renderWithProviders(<WishlistPage />, { route: '/wishlist' });

    const removeBtn = await screen.findByLabelText(/Remove Silk Georgette Scarf from wishlist/i);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(wishlistService.removeFromWishlist).toHaveBeenCalledWith('prod1');
    });
  });
});
