import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Mock services so JSDOM doesn't emit network error logs during headless tests
vi.mock('./services/healthService', () => ({
  checkHealth: vi.fn().mockResolvedValue({
    connected: true,
    latency: 24,
    data: {
      status: 'healthy',
      uptimeSeconds: 120,
      database: { status: 'connected' },
      environment: 'test'
    },
    error: null,
  }),
}));

vi.mock('./services/authService', () => ({
  getMe: vi.fn().mockResolvedValue(null),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('./services/cartService', () => ({
  fetchCart: vi.fn().mockResolvedValue({ items: [], subtotal: 0, totalItems: 0 }),
  addToCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
}));

vi.mock('./services/wishlistService', () => ({
  fetchWishlist: vi.fn().mockResolvedValue([]),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (ui, { route = '/' } = {}) => {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ShopSphere Client Shell & Routing', () => {
  it('renders the brand title and editorial navigation on homepage', async () => {
    renderWithProviders(<App />, { route: '/' });
    const brandHeadings = await screen.findAllByText(/SHOPSPHERE/i);
    expect(brandHeadings.length).toBeGreaterThan(0);
  });

  it('renders hero headline and seasonal collections link', async () => {
    renderWithProviders(<App />, { route: '/' });
    const modernFashionHeadings = await screen.findAllByText(/Modern Fashion/i);
    expect(modernFashionHeadings.length).toBeGreaterThan(0);
    expect(await screen.findByText(/Shop by Category/i)).toBeInTheDocument();
  });

  it('renders brand pillars and client concierge options in the footer', async () => {
    renderWithProviders(<App />, { route: '/' });
    const freeShippingElements = await screen.findAllByText(/Free Shipping/i);
    expect(freeShippingElements.length).toBeGreaterThan(0);
    expect(await screen.findByText(/Shop Categories/i)).toBeInTheDocument();
  });

  it('renders 404 Lost in the Archive view when navigating to an unknown route', async () => {
    renderWithProviders(<App />, { route: '/unknown-nonexistent-path' });
    expect(await screen.findByText(/Lost in the Archive/i)).toBeInTheDocument();
  });
});
