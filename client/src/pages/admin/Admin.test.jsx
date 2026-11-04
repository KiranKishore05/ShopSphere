import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AdminRoute from '../../components/common/AdminRoute';
import AdminDashboardPage from './AdminDashboardPage';
import AdminProductsPage from './AdminProductsPage';
import AdminCategoriesPage from './AdminCategoriesPage';
import AdminInventoryPage from './AdminInventoryPage';
import AdminOrdersPage from './AdminOrdersPage';
import AdminCouponsPage from './AdminCouponsPage';

import * as authService from '../../services/authService';
import * as adminService from '../../services/adminService';

vi.mock('../../services/authService');
vi.mock('../../services/adminService');

const mockAdminUser = {
  _id: 'admin_user_001',
  name: 'Executive Director',
  email: 'admin@shopsphere.com',
  role: 'admin'
};

const mockCustomerUser = {
  _id: 'customer_user_002',
  name: 'Standard Shopper',
  email: 'shopper@client.com',
  role: 'customer'
};

const mockAnalytics = {
  kpis: {
    revenue: 125000,
    orders: 42,
    averageOrderValue: 2976,
    customers: 38,
    products: 16
  },
  lowStock: { count: 3 },
  recentOrders: [
    {
      _id: 'ord_recent_1',
      orderNumber: 'SPH-REC-001',
      totalAmount: 9500,
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      shippingAddress: { fullName: 'Jean-Luc Godard' },
      userId: { email: 'jean@cinema.fr' },
      items: [{ name: 'Cashmere Blazer', quantity: 1 }]
    }
  ],
  topProducts: [
    {
      productId: 'prod_top_1',
      productName: 'Double-Breasted Wool Overcoat',
      totalSold: 12,
      totalRevenue: 54000
    }
  ],
  revenueByDay: [
    { _id: '2026-11-01', revenue: 9500, orders: 1 }
  ],
  statusBreakdown: [
    { _id: 'confirmed', count: 12 }
  ]
};

const mockProductsResponse = {
  success: true,
  data: {
    products: [
      {
        _id: 'prod_test_1',
        name: 'Structured Silk Trench',
        brand: 'ShopSphere Atelier',
        gender: 'women',
        categoryId: { _id: 'cat_outerwear', name: 'Outerwear' },
        totalStock: 8,
        stockStatus: 'healthy',
        isActive: true,
        images: [{ url: 'https://example.com/trench.jpg', isPrimary: true }],
        variants: [
          { sku: 'SPH-TRN-BLK-S', size: 'S', price: 12000, stockQuantity: 8 }
        ]
      }
    ],
    meta: { page: 1, limit: 15, total: 1, totalPages: 1 }
  }
};

const mockCategories = [
  {
    _id: 'cat_outerwear',
    name: 'Outerwear',
    slug: 'outerwear',
    description: 'Sculptural trench coats and jackets.',
    productCount: 14,
    isActive: true,
    image: { url: 'https://example.com/cat.jpg' }
  }
];

const mockInventoryResponse = {
  success: true,
  data: {
    items: [
      {
        sku: 'SPH-TRN-BLK-S',
        productName: 'Structured Silk Trench',
        productId: 'prod_test_1',
        size: 'S',
        colorName: 'Noir',
        colorHex: '#161513',
        price: 12000,
        stockQuantity: 4,
        isLowStock: true
      }
    ],
    meta: { total: 1, totalPages: 1, lowStockCount: 1 }
  }
};

const mockMovementsResponse = {
  success: true,
  data: {
    movements: [
      {
        _id: 'mov_1',
        variantSku: 'SPH-TRN-BLK-S',
        productId: { name: 'Structured Silk Trench' },
        movementType: 'restock',
        quantityChange: 10,
        previousStock: 0,
        newStock: 10,
        createdAt: '2026-11-01T10:00:00.000Z',
        note: 'Initial production batch intake'
      }
    ]
  }
};

const mockOrdersResponse = {
  success: true,
  data: {
    orders: [
      {
        _id: 'ord_admin_1',
        orderNumber: 'SPH-ADM-999',
        createdAt: '2026-11-01T12:00:00.000Z',
        shippingAddress: { fullName: 'Camille Claudel' },
        userId: { email: 'camille@sculpture.fr' },
        totalAmount: 18500,
        paymentStatus: 'paid',
        orderStatus: 'confirmed'
      }
    ],
    meta: { page: 1, limit: 15, total: 1, totalPages: 1 }
  }
};

const mockCoupons = [
  {
    _id: 'coup_1',
    code: 'ATELIER20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 5000,
    maxDiscountAmount: 3000,
    usageLimit: 100,
    usedCount: 14,
    expiryDate: '2026-12-31T23:59:59.000Z',
    isActive: true
  }
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

describe('Frontend Admin Suite (/admin/*)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Authorization Guard
  describe('AdminRoute Guard', () => {
    it('redirects unauthenticated visitors to login', async () => {
      authService.getMe.mockRejectedValue(new Error('Unauthorized'));

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/login" element={<div>Atelier Login Form</div>} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <div>Secret Admin Vault</div>
                  </AdminRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Atelier Login Form')).toBeInTheDocument();
      });
      expect(screen.queryByText('Secret Admin Vault')).not.toBeInTheDocument();
    });

    it('blocks regular customers and presents Restricted Atelier Area message', async () => {
      authService.getMe.mockResolvedValue(mockCustomerUser);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/login" element={<div>Atelier Login Form</div>} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <div>Secret Admin Vault</div>
                  </AdminRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Restricted Atelier Area')).toBeInTheDocument();
      });
      expect(screen.getByText(/executive management privileges/i)).toBeInTheDocument();
      expect(screen.queryByText('Secret Admin Vault')).not.toBeInTheDocument();
    });

    it('grants access when user has verified admin role', async () => {
      authService.getMe.mockResolvedValue(mockAdminUser);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/login" element={<div>Atelier Login Form</div>} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <div>Executive Admin Console</div>
                  </AdminRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Executive Admin Console')).toBeInTheDocument();
      });
    });
  });

  // 2. Admin Dashboard
  describe('AdminDashboardPage (/admin)', () => {
    it('renders aggregated financial KPIs and recent client orders', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminAnalytics.mockResolvedValue(mockAnalytics);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminDashboardPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('SPH-REC-001')).toBeInTheDocument();
      });

      // KPI checks
      expect(screen.getByText(/1,25,000/i)).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();

      // Recent order check
      expect(screen.getByText('Jean-Luc Godard')).toBeInTheDocument();

      // Top product check
      expect(screen.getByText('Double-Breasted Wool Overcoat')).toBeInTheDocument();
    });
  });

  // 3. Products Management
  describe('AdminProductsPage (/admin/products)', () => {
    it('renders list of garments with SKU, stock status, and actions', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminProducts.mockResolvedValue(mockProductsResponse);
      adminService.fetchAdminCategories.mockResolvedValue(mockCategories);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminProductsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Structured Silk Trench')).toBeInTheDocument();
      });

      expect(screen.getByText(/SPH-TRN-BLK-S/i)).toBeInTheDocument();
      expect(screen.getByText(/8 in stock/i)).toBeInTheDocument();
      expect(screen.getByText('Add New Garment')).toBeInTheDocument();
    });
  });

  // 4. Categories Management
  describe('AdminCategoriesPage (/admin/categories)', () => {
    it('renders taxonomy list with garment counts', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminCategories.mockResolvedValue(mockCategories);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminCategoriesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Outerwear')).toBeInTheDocument();
      });

      expect(screen.getByText('/outerwear')).toBeInTheDocument();
      expect(screen.getByText('14 pieces')).toBeInTheDocument();
    });
  });

  // 5. Inventory Management
  describe('AdminInventoryPage (/admin/inventory)', () => {
    it('renders variant-level stock overview and opens adjust modal', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminInventory.mockResolvedValue(mockInventoryResponse);
      adminService.fetchAdminInventoryMovements.mockResolvedValue(mockMovementsResponse);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminInventoryPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('SPH-TRN-BLK-S')).toBeInTheDocument();
      });

      expect(screen.getByText('Low Balance (≤5)')).toBeInTheDocument();

      // Click Adjust button
      const adjustBtn = screen.getByRole('button', { name: /adjust/i });
      fireEvent.click(adjustBtn);

      // Verify modal opens
      expect(screen.getByText('Adjust Variant Stock')).toBeInTheDocument();
      expect(screen.getByText(/Current Active Stock:/i)).toBeInTheDocument();
    });
  });

  // 6. Order Fulfillment Management
  describe('AdminOrdersPage (/admin/orders)', () => {
    it('renders fulfillment queue with orders and statuses', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminOrders.mockResolvedValue(mockOrdersResponse);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminOrdersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('SPH-ADM-999')).toBeInTheDocument();
      });

      expect(screen.getByText('Camille Claudel')).toBeInTheDocument();
      expect(screen.getAllByText('Confirmed').length).toBeGreaterThanOrEqual(1);
    });
  });

  // 7. Coupon Management
  describe('AdminCouponsPage (/admin/coupons)', () => {
    it('renders promotional voucher table with redemption statistics', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminCoupons.mockResolvedValue(mockCoupons);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminCouponsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('ATELIER20')).toBeInTheDocument();
      });

      expect(screen.getByText('20% Off')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
    });
  });
});
