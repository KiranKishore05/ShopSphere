import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShopPage from './ShopPage';
import ProductDetailPage from './ProductDetailPage';
import ProductGrid from '../components/products/ProductGrid';
import * as catalogService from '../services/catalogService';

// Mock catalog service
vi.mock('../services/catalogService', () => ({
  fetchProducts: vi.fn(),
  fetchCategories: vi.fn(),
  fetchCategoryProducts: vi.fn(),
  fetchProductBySlug: vi.fn()
}));

vi.mock('../services/authService', () => ({
  getMe: vi.fn().mockResolvedValue(null),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../services/cartService', () => ({
  fetchCart: vi.fn().mockResolvedValue({ items: [], subtotal: 0, totalItems: 0 }),
  addToCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
}));

vi.mock('../services/wishlistService', () => ({
  fetchWishlist: vi.fn().mockResolvedValue([]),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}));

vi.mock('../services/reviewService', () => ({
  fetchProductReviews: vi.fn().mockResolvedValue({ reviews: [], summary: { averageRating: 0, totalReviews: 0 } }),
  checkReviewEligibility: vi.fn().mockResolvedValue({ isEligible: false, hasReviewed: false }),
  fetchSearchSuggestions: vi.fn().mockResolvedValue({ products: [], categories: [], totalCount: 0 })
}));

const mockProducts = [
  {
    _id: 'mock-1',
    name: 'Double-Faced Cashmere Trench Coat',
    slug: 'double-faced-cashmere-trench-coat',
    brand: 'Atelier Sphere',
    gender: 'unisex',
    category: { _id: 'cat-1', name: 'Outerwear', slug: 'outerwear' },
    images: [{ url: 'https://example.com/coat.jpg', isPrimary: true }],
    priceRange: { min: 18999, max: 18999 },
    compareAtPrice: 24999,
    availableSizes: ['S', 'M', 'L'],
    availableColors: [{ name: 'Camel', hexCode: '#C8B293' }, { name: 'Black', hexCode: '#161513' }],
    inStock: true,
    totalStock: 35,
    isFeatured: true
  }
];

const mockProductDetail = {
  _id: 'mock-1',
  name: 'Double-Faced Cashmere Trench Coat',
  slug: 'double-faced-cashmere-trench-coat',
  description: 'Pure Mongolian cashmere overcoat.',
  brand: 'Atelier Sphere',
  gender: 'unisex',
  category: { _id: 'cat-1', name: 'Outerwear', slug: 'outerwear' },
  images: [{ url: 'https://example.com/coat.jpg', isPrimary: true }],
  priceRange: { min: 18999, max: 18999 },
  compareAtPrice: 24999,
  availableSizes: ['S', 'M', 'L'],
  availableColors: [{ name: 'Camel', hexCode: '#C8B293' }],
  inStock: true,
  totalStock: 25,
  variants: [
    {
      _id: 'var-1',
      sku: 'COAT-CAM-S',
      size: 'S',
      color: { name: 'Camel', hexCode: '#C8B293' },
      price: 18999,
      compareAtPrice: 24999,
      stockQuantity: 12,
      inStock: true
    },
    {
      _id: 'var-2',
      sku: 'COAT-CAM-M',
      size: 'M',
      color: { name: 'Camel', hexCode: '#C8B293' },
      price: 18999,
      compareAtPrice: 24999,
      stockQuantity: 4, // low stock for alert test
      inStock: true
    }
  ]
};

const createTestClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 }
  }
});

const renderWithRouter = (ui, { route = '/shop' } = {}) => {
  return render(
    <QueryClientProvider client={createTestClient()}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Catalog & Product Discovery Frontend Suite', () => {
  describe('ProductGrid Component States', () => {
    it('renders shimmer skeleton cards when loading', () => {
      const { container } = render(<ProductGrid isLoading={true} />);
      const pulseContainers = container.querySelectorAll('.animate-pulse');
      expect(pulseContainers.length).toBe(8);
    });

    it('renders error state with retry callback', () => {
      const retryFn = vi.fn();
      render(
        <ProductGrid
          error={{ message: 'Atelier archive timeout' }}
          onRetry={retryFn}
        />
      );
      expect(screen.getByText(/Catalogue Disruption/i)).toBeInTheDocument();
      expect(screen.getByText(/Atelier archive timeout/i)).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Reconnect to Atelier/i });
      fireEvent.click(retryBtn);
      expect(retryFn).toHaveBeenCalledTimes(1);
    });

    it('renders empty search results state with reset button', () => {
      const resetFn = vi.fn();
      render(
        <ProductGrid
          products={[]}
          onResetFilters={resetFn}
        />
      );
      expect(screen.getByText(/No Matching Pieces Found/i)).toBeInTheDocument();
      const resetBtn = screen.getByRole('button', { name: /Clear All Active Filters/i });
      fireEvent.click(resetBtn);
      expect(resetFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('ShopPage Catalog Interaction', () => {
    it('renders products and filter controls from query data', async () => {
      catalogService.fetchProducts.mockResolvedValueOnce({
        products: mockProducts,
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 }
      });
      catalogService.fetchCategories.mockResolvedValueOnce([
        { _id: 'cat-1', name: 'Outerwear', slug: 'outerwear', productCount: 1 }
      ]);

      renderWithRouter(<ShopPage />, { route: '/shop' });

      expect(await screen.findByRole('heading', { name: /All Collections/i })).toBeInTheDocument();
      expect(await screen.findByRole('heading', { name: /Double-Faced Cashmere Trench Coat/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search garments/i)).toBeInTheDocument();
    });
  });

  describe('ProductDetailPage & Variant Matrix Selection', () => {
    it('renders product details, gallery, and variant options', async () => {
      catalogService.fetchProductBySlug.mockResolvedValueOnce(mockProductDetail);

      render(
        <QueryClientProvider client={createTestClient()}>
          <MemoryRouter initialEntries={['/products/double-faced-cashmere-trench-coat']}>
            <Routes>
              <Route path="/products/:slug" element={<ProductDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(await screen.findByRole('heading', { name: /Double-Faced Cashmere Trench Coat/i })).toBeInTheDocument();
      expect(screen.getByText(/Pure Mongolian cashmere overcoat/i)).toBeInTheDocument();
      expect(screen.getByText(/Colour Palette/i)).toBeInTheDocument();
      expect(screen.getByText(/Size Selection/i)).toBeInTheDocument();
    });

    it('shows validation error when attempting to add to bag without selecting a size', async () => {
      catalogService.fetchProductBySlug.mockResolvedValueOnce(mockProductDetail);

      render(
        <QueryClientProvider client={createTestClient()}>
          <MemoryRouter initialEntries={['/products/double-faced-cashmere-trench-coat']}>
            <Routes>
              <Route path="/products/:slug" element={<ProductDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      const addBtn = await screen.findByRole('button', { name: /Add to Shopping Bag/i });
      fireEvent.click(addBtn);

      expect(await screen.findByText(/Please select a garment size before adding to your bag/i)).toBeInTheDocument();
    });

    it('selects size variant and displays real-time stock feedback', async () => {
      catalogService.fetchProductBySlug.mockResolvedValueOnce(mockProductDetail);

      render(
        <QueryClientProvider client={createTestClient()}>
          <MemoryRouter initialEntries={['/products/double-faced-cashmere-trench-coat']}>
            <Routes>
              <Route path="/products/:slug" element={<ProductDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Wait for product details to load
      expect(await screen.findByRole('heading', { name: /Double-Faced Cashmere Trench Coat/i })).toBeInTheDocument();

      // Click size button 'S'
      const sizeSBtn = screen.getByRole('button', { name: 'S' });
      fireEvent.click(sizeSBtn);

      // Feedback should now show In Stock notification
      expect(await screen.findByText(/In Stock — Dispatched within 24 hours/i)).toBeInTheDocument();

      // Now click size button 'M' which has 4 in stock -> should show Low Stock Alert
      const sizeMBtn = screen.getByRole('button', { name: 'M' });
      fireEvent.click(sizeMBtn);
      expect(await screen.findByText(/Low Stock Alert — Only 4 pieces remaining/i)).toBeInTheDocument();
    });
  });
});
