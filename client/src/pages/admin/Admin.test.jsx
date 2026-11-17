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
import AdminOrderDetailPage from './AdminOrderDetailPage';
import AdminCouponsPage from './AdminCouponsPage';
import AdminAnalyticsPage from './AdminAnalyticsPage';
import AdminCustomersPage from './AdminCustomersPage';
import AdminCustomerDetailPage from './AdminCustomerDetailPage';

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
    totalRevenue: 125000,
    orders: 42,
    totalOrders: 42,
    paidOrders: 35,
    averageOrderValue: 2976,
    customers: 38,
    totalCustomers: 38,
    newCustomers: 12,
    repeatCustomers: 8,
    repeatCustomerRate: 21,
    products: 16,
    totalProducts: 16
  },
  summary: {
    totalRevenue: 125000,
    totalOrders: 42,
    paidOrdersCount: 35,
    averageOrderValue: 2976,
    totalCustomers: 38,
    newCustomers: 12,
    repeatCustomers: 8,
    repeatCustomerRate: 21,
    totalProducts: 16
  },
  customerMetrics: {
    totalCustomers: 38,
    newCustomers: 12,
    repeatCustomers: 8,
    repeatCustomerRate: 21,
    customersWithOrders: 30
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
  lowPerformingProducts: [
    {
      _id: 'prod_low_1',
      name: 'Linen Summer Tunic',
      productName: 'Linen Summer Tunic',
      totalSalesCount: 0,
      totalSold: 0,
      variants: [{ stockQuantity: 20 }]
    }
  ],
  categorySales: [
    {
      _id: 'cat_outerwear',
      categoryName: 'Outerwear',
      categorySlug: 'outerwear',
      unitsSold: 12,
      revenue: 54000,
      orderCount: 10
    }
  ],
  paymentMethodStats: [
    { _id: 'razorpay', count: 35, totalAmount: 110000 },
    { _id: 'cod', count: 7, totalAmount: 15000 }
  ],
  paymentStatusStats: [
    { _id: 'paid', count: 35, totalAmount: 110000 },
    { _id: 'pending', count: 7, totalAmount: 15000 }
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
        shippingAddressSnapshot: { fullName: 'Camille Claudel' },
        userId: { email: 'camille@sculpture.fr' },
        total: 18500,
        paymentStatus: 'paid',
        paymentMethod: 'razorpay',
        orderStatus: 'confirmed'
      }
    ],
    meta: { page: 1, limit: 15, total: 1, totalPages: 1 }
  }
};

const mockOrderDetail = {
  _id: 'ord_admin_1',
  orderNumber: 'SPH-ADM-999',
  createdAt: '2026-11-01T12:00:00.000Z',
  orderStatus: 'confirmed',
  paymentStatus: 'paid',
  paymentMethod: 'razorpay',
  total: 18500,
  subtotal: 18500,
  shippingFee: 0,
  tax: 0,
  discount: 0,
  carrierName: 'BlueDart Express',
  trackingNumber: 'BD-99887766',
  items: [
    {
      productId: 'prod_test_1',
      name: 'Structured Silk Trench',
      variantSku: 'SPH-TRN-BLK-S',
      size: 'S',
      colorName: 'Noir',
      quantity: 1,
      unitPrice: 18500,
      lineTotal: 18500,
      imageUrl: 'https://example.com/trench.jpg'
    }
  ],
  shippingAddressSnapshot: {
    fullName: 'Camille Claudel',
    phone: '+91 98765 43210',
    streetAddress: '15 Boulevard Montparnasse',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India'
  },
  userId: {
    _id: 'usr_test_1',
    name: 'Camille Claudel',
    email: 'camille@sculpture.fr',
    phone: '+91 98765 43210'
  },
  paymentRecord: {
    _id: 'pay_rec_1',
    razorpayPaymentId: 'pay_999999999',
    razorpayOrderId: 'order_999999999',
    status: 'captured',
    amount: 18500
  },
  statusTimeline: [
    {
      status: 'confirmed',
      timestamp: '2026-11-01T12:00:00.000Z',
      note: 'Payment captured successfully via Razorpay gateway.',
      updatedBy: { name: 'Payment Webhook' }
    }
  ]
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

const mockCustomersResponse = {
  success: true,
  data: {
    customers: [
      {
        _id: 'cust_001',
        name: 'Praveen Sharma',
        email: 'praveen@gmail.com',
        phone: '9876543210',
        isActive: true,
        createdAt: '2026-10-15T10:00:00.000Z',
        totalOrders: 4,
        lifetimeSpend: 4247
      },
      {
        _id: 'cust_002',
        name: 'Aditi Rao',
        email: 'aditi@fashion.in',
        phone: '9811223344',
        isActive: false,
        createdAt: '2026-10-20T12:00:00.000Z',
        totalOrders: 0,
        lifetimeSpend: 0
      }
    ],
    meta: {
      page: 1,
      limit: 15,
      total: 2,
      totalPages: 1,
      activeCount: 1,
      inactiveCount: 1,
      totalLifetimeSpend: 4247
    }
  }
};

const mockCustomerDetail = {
  success: true,
  data: {
    customer: {
      _id: 'cust_001',
      name: 'Praveen Sharma',
      email: 'praveen@gmail.com',
      phone: '9876543210',
      isActive: true,
      role: 'customer',
      createdAt: '2026-10-15T10:00:00.000Z',
      savedAddresses: [
        {
          _id: 'addr_001',
          fullName: 'Praveen Sharma',
          phone: '9876543210',
          streetAddress: '42 Marine Drive, Nariman Point',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400021',
          country: 'India',
          isDefault: true
        }
      ]
    },
    summary: {
      totalOrders: 4,
      lifetimeSpend: 4247,
      averageOrderValue: 1062,
      completedOrders: 4,
      firstOrderDate: '2026-10-16T11:00:00.000Z',
      lastOrderDate: '2026-11-01T15:30:00.000Z'
    },
    metrics: {
      totalOrders: 4,
      lifetimeSpend: 4247,
      averageOrderValue: 1062,
      completedOrders: 4,
      firstOrderDate: '2026-10-16T11:00:00.000Z',
      lastOrderDate: '2026-11-01T15:30:00.000Z'
    },
    orders: [
      {
        _id: 'ord_001',
        orderNumber: 'SPH-ORD-88910',
        createdAt: '2026-11-01T15:30:00.000Z',
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        paymentMethod: 'razorpay',
        totalAmount: 1499,
        items: [
          {
            productId: 'prod_test_1',
            name: 'Structured Silk Trench',
            sku: 'SPH-TRN-BLK-S',
            size: 'S',
            color: 'Black',
            quantity: 1,
            price: 1499
          }
        ],
        paymentRecord: {
          razorpayPaymentId: 'pay_Nsd98234jdfh',
          amount: 1499,
          paymentStatus: 'paid'
        },
        payment: {
          razorpayPaymentId: 'pay_Nsd98234jdfh',
          amount: 1499,
          paymentStatus: 'paid'
        }
      }
    ]
  }
};

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

    it('renders empty state when product list is empty without crashing (Bug Fix Verification)', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminProducts.mockResolvedValue({
        products: [],
        meta: { page: 1, limit: 15, total: 0, totalPages: 1 }
      });
      adminService.fetchAdminCategories.mockResolvedValue(mockCategories);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminProductsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No Garments Found')).toBeInTheDocument();
      });

      expect(screen.getByText('Create Garment')).toBeInTheDocument();
    });

    it('renders error state with retry button when API returns an error', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminProducts.mockRejectedValue(new Error('Network connectivity lost'));
      adminService.fetchAdminCategories.mockResolvedValue([]);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminProductsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Garment Catalogue')).toBeInTheDocument();
      });

      expect(screen.getByText(/Network connectivity lost/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Request/i })).toBeInTheDocument();
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
      expect(screen.getAllByText('14').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/pieces/i).length).toBeGreaterThanOrEqual(1);
    });

    it('opens create category modal with form controls', async () => {
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

      const newBtn = screen.getByRole('button', { name: /New Category/i });
      fireEvent.click(newBtn);

      expect(screen.getByText('New Collection Department')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. Tailored Outerwear/i)).toBeInTheDocument();
    });

    it('shows deletion blocked warning when category contains linked garments', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminCategories.mockResolvedValue([
        {
          _id: 'cat_outerwear',
          name: 'Outerwear',
          slug: 'outerwear',
          productCount: 14,
          isActive: true
        }
      ]);

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

      const deleteBtn = screen.getByTitle('Delete Category');
      fireEvent.click(deleteBtn);

      expect(screen.getByText('Deletion Blocked — Associated Garments Protected')).toBeInTheDocument();
      expect(screen.getByText('Deactivate Category Instead')).toBeInTheDocument();
    });

    it('renders error state with retry button when categories API fails', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminCategories.mockRejectedValue(new Error('Taxonomy service unavailable'));

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminCategoriesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Categories')).toBeInTheDocument();
      });

      expect(screen.getByText(/Taxonomy service unavailable/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Request/i })).toBeInTheDocument();
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

    it('renders unwrapped inventory response structure with accurate 4-card KPI counts', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      // Mock unwrapped format as returned by axios interceptor and adminService
      adminService.fetchAdminInventory.mockResolvedValue({
        items: [
          {
            sku: 'MSH-LIN-OLV-S',
            productName: 'Linen Vacation Shirt',
            productId: 'prod_40_1',
            size: 'S',
            colorName: 'Olive Green',
            price: 1299,
            stockQuantity: 25,
            status: 'healthy'
          }
        ],
        summary: {
          totalProducts: 40,
          totalVariants: 129,
          totalUnits: 2962,
          inStockCount: 129,
          lowStockCount: 0,
          outOfStockCount: 0
        },
        meta: {
          page: 1,
          limit: 15,
          total: 129,
          totalPages: 9,
          lowStockCount: 0
        }
      });
      adminService.fetchAdminInventoryMovements.mockResolvedValue({
        movements: [
          {
            _id: 'mov_live_1',
            variantSku: 'W-PCS-BLU-S',
            productId: { name: 'Pleated Chiffon Sun Dress' },
            reason: 'order_placed',
            quantityChange: -2,
            previousStock: 20,
            newStock: 18,
            createdAt: '2026-11-07T16:40:30.200Z',
            note: 'Deducted for Order SPH-MW6ML8PE-FNCG'
          }
        ],
        meta: { page: 1, limit: 25, total: 1, totalPages: 1 }
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminInventoryPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify KPI counts match actual database statistics
      await waitFor(() => {
        expect(screen.getByText('40')).toBeInTheDocument(); // Total Products
      });
      expect(screen.getByText('129')).toBeInTheDocument(); // In Stock Products
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2); // Low Stock & Out of Stock

      // Verify item displayed
      expect(screen.getByText('MSH-LIN-OLV-S')).toBeInTheDocument();
      expect(screen.getByText('Linen Vacation Shirt')).toBeInTheDocument();

      // Switch to Movements tab
      const movementsTabBtn = screen.getByRole('button', { name: /audit ledger/i });
      fireEvent.click(movementsTabBtn);

      await waitFor(() => {
        expect(screen.getByText('W-PCS-BLU-S')).toBeInTheDocument();
      });
      expect(screen.getByText(/Pleated Chiffon Sun Dress/i)).toBeInTheDocument();
      expect(screen.getByText('order placed')).toBeInTheDocument();
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

    it('filters orders by search query and payment status', async () => {
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

      const searchInput = screen.getByPlaceholderText(/Search by order number/i);
      fireEvent.change(searchInput, { target: { value: 'SPH-ADM' } });
      expect(searchInput.value).toBe('SPH-ADM');
    });

    it('renders empty state when no orders match criteria', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminOrders.mockResolvedValue({
        success: true,
        data: { orders: [], meta: { page: 1, limit: 15, total: 0, totalPages: 0 } }
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminOrdersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No Orders Found')).toBeInTheDocument();
      });
      expect(screen.getByText('Reset Filters')).toBeInTheDocument();
    });

    it('renders error state with retry button on API failure', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminOrders.mockRejectedValue(new Error('Database gateway timeout'));

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminOrdersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Orders')).toBeInTheDocument();
      });
      expect(screen.getByText(/Database gateway timeout/i)).toBeInTheDocument();
    });
  });

  // 6b. Admin Order Detail Page (/admin/orders/:id)
  describe('AdminOrderDetailPage (/admin/orders/:id)', () => {
    it('renders order dossier with client address, items, payment record, and timeline', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminOrderById.mockResolvedValue(mockOrderDetail);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/admin/orders/ord_admin_1']}>
            <Routes>
              <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/SPH-ADM-999/)).toBeInTheDocument();
      });

      // Verify items and client
      expect(screen.getByText('Structured Silk Trench')).toBeInTheDocument();
      expect(screen.getByText('Camille Claudel')).toBeInTheDocument();
      expect(screen.getByText(/15 Boulevard Montparnasse/i)).toBeInTheDocument();

      // Verify payment gateway record
      expect(screen.getByText('pay_999999999')).toBeInTheDocument();
      expect(screen.getByText('Razorpay Online')).toBeInTheDocument();

      // Verify carrier dispatch details
      expect(screen.getByText('BlueDart Express')).toBeInTheDocument();
      expect(screen.getByText('BD-99887766')).toBeInTheDocument();
    });

    it('opens courier dispatch modal when Shipped transition button is triggered', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminOrderById.mockResolvedValue({
        ...mockOrderDetail,
        orderStatus: 'processing',
        carrierName: undefined,
        trackingNumber: undefined
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/admin/orders/ord_admin_1']}>
            <Routes>
              <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Dispatch via Courier/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Dispatch via Courier/i }));

      // Courier dispatch modal should be open
      expect(screen.getByText('Dispatch Order via Courier')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. BlueDart Express/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. BD-99482710IN/i)).toBeInTheDocument();
    });

    it('opens cancellation modal with refund safety alert for paid orders', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminOrderById.mockResolvedValue(mockOrderDetail);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/admin/orders/ord_admin_1']}>
            <Routes>
              <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel Order/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Cancel Order/i }));

      // Cancellation modal should open with warning
      expect(screen.getByText('Authorize Order Cancellation')).toBeInTheDocument();
      expect(screen.getByText(/Automated Gateway Refund Policy Notice:/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. Patron requested cancellation/i)).toBeInTheDocument();
    });

    it('displays historical prior attempt notice and never displays an active gateway error banner for a paid order (Regression)', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      const paidOrderWithHistoricalFailure = {
        ...mockOrderDetail,
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
        paymentRecord: {
          _id: 'pay_rec_test_hist',
          razorpayPaymentId: 'pay_TxM2oHzUhtgvZO',
          razorpayOrderId: 'order_TxLyortvwAhzZj',
          paymentStatus: 'paid',
          amount: 4247,
          verifiedAt: '2026-11-07T16:40:30.592Z',
          failureReason: 'International cards are not supported. Please contact our support team for help'
        }
      };

      adminService.fetchAdminOrderById.mockResolvedValue(paidOrderWithHistoricalFailure);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/admin/orders/ord_admin_1']}>
            <Routes>
              <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('pay_TxM2oHzUhtgvZO')).toBeInTheDocument();
      });

      // Verify that "Gateway Error:" does NOT appear as an active failure banner
      expect(screen.queryByText('Gateway Error:')).not.toBeInTheDocument();

      // Verify that it is clearly identified as a separate historical attempt notice
      expect(screen.getByText('Prior Attempt Notice (Historical):')).toBeInTheDocument();
      expect(screen.getByText(/International cards are not supported\. Please contact our support team for help/i)).toBeInTheDocument();
      expect(screen.getByText(/The customer subsequently completed payment successfully/i)).toBeInTheDocument();

      // Verify that no signature or secret string is rendered in the DOM
      expect(screen.queryByText(/razorpaySignature/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/secret/i)).not.toBeInTheDocument();
    });
  });

  // 7. Coupon Management
  describe('AdminCouponsPage (/admin/coupons)', () => {
    it('renders promotional voucher table with redemption statistics and KPI summary cards', async () => {
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
      expect(screen.getAllByText('14').length).toBeGreaterThanOrEqual(1);

      // KPI cards verification
      expect(screen.getByText('Total Concessions')).toBeInTheDocument();
      expect(screen.getByText('Active Promotions')).toBeInTheDocument();
      expect(screen.getByText('Expired Vouchers')).toBeInTheDocument();
      expect(screen.getByText('Total Redemptions')).toBeInTheDocument();

      // Filter and action controls
      expect(screen.getByPlaceholderText(/search by privilege code/i)).toBeInTheDocument();
      expect(screen.getByText(/new privilege voucher/i)).toBeInTheDocument();
    });
  });

  // 7b. Analytics Intelligence Page
  describe('AdminAnalyticsPage (/admin/analytics)', () => {
    it('renders executive financial intelligence, settled revenue, retention matrix, and category performance', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminAnalytics.mockResolvedValue(mockAnalytics);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminAnalyticsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Executive Analytics & Fiscal Audit')).toBeInTheDocument();
      });

      // KPI cards
      expect(screen.getByText('Settled Net Revenue')).toBeInTheDocument();
      expect(screen.getAllByText('Repeat Patrons').length).toBeGreaterThanOrEqual(1);

      // Retention matrix
      expect(screen.getByText('Patron Acquisition & Retention Matrix')).toBeInTheDocument();
      expect(screen.getByText('Repeat Order Ratio')).toBeInTheDocument();
      expect(screen.getAllByText(/21%/).length).toBeGreaterThanOrEqual(1);

      // Category performance table
      expect(screen.getByText('Category Sales & Revenue Contribution')).toBeInTheDocument();
      expect(screen.getByText('Outerwear')).toBeInTheDocument();

      // Stagnant / Low-Performing garments table
      expect(screen.getByText('Stagnant / Low-Performing Garments')).toBeInTheDocument();
      expect(screen.getByText('Linen Summer Tunic')).toBeInTheDocument();

      // Payment channels breakdown
      expect(screen.getByText('Payment Channels')).toBeInTheDocument();
      expect(screen.getByText(/razorpay/i)).toBeInTheDocument();
    });
  });

  // 8. Customer Management Directory
  describe('AdminCustomersPage (/admin/customers)', () => {
    it('renders customer directory with KPI cards and patron records', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminCustomers.mockResolvedValue(mockCustomersResponse);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminCustomersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Praveen Sharma').length).toBeGreaterThanOrEqual(1);
      });

      expect(screen.getByText('praveen@gmail.com')).toBeInTheDocument();
      expect(screen.getByText('Aditi Rao')).toBeInTheDocument();
      expect(screen.getByText('aditi@fashion.in')).toBeInTheDocument();
      expect(screen.getByText('Registered Patrons')).toBeInTheDocument();
      expect(screen.getByText('Active Accounts')).toBeInTheDocument();
      expect(screen.getByText('Restricted / Deactivated')).toBeInTheDocument();
      expect(screen.getByText('Cumulative Revenue')).toBeInTheDocument();
    });

    it('opens deactivation confirmation modal when action button clicked', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminCustomers.mockResolvedValue(mockCustomersResponse);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <AdminCustomersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Praveen Sharma').length).toBeGreaterThanOrEqual(1);
      });

      const deactivateButtons = screen.getAllByRole('button', { name: /Deactivate/i });
      fireEvent.click(deactivateButtons[0]);

      expect(screen.getByText('Deactivate Patron Account')).toBeInTheDocument();
      expect(screen.getByText(/Deactivation Notice:/i)).toBeInTheDocument();
    });
  });

  // 9. Customer Dossier Details
  describe('AdminCustomerDetailPage (/admin/customers/:id)', () => {
    it('renders comprehensive customer dossier with metrics, addresses and order ledger', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminCustomerById.mockResolvedValue(mockCustomerDetail);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/admin/customers/cust_001']}>
            <Routes>
              <Route path="/admin/customers/:id" element={<AdminCustomerDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Praveen Sharma').length).toBeGreaterThanOrEqual(1);
      });

      expect(screen.getByText('praveen@gmail.com')).toBeInTheDocument();
      expect(screen.getByText(/42 Marine Drive, Nariman Point/)).toBeInTheDocument();
      expect(screen.getByText('SPH-ORD-88910')).toBeInTheDocument();
      expect(screen.getByText('pay_Nsd98234jdfh')).toBeInTheDocument();
      expect(screen.getByText('Lifetime Spend')).toBeInTheDocument();
    });

    it('opens status modification modal on dossier action click', async () => {
      authService.getMe.mockResolvedValue({ user: mockAdminUser });
      adminService.fetchAdminCustomerById.mockResolvedValue(mockCustomerDetail);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/admin/customers/cust_001']}>
            <Routes>
              <Route path="/admin/customers/:id" element={<AdminCustomerDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Deactivate Account/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Deactivate Account/i }));
      expect(screen.getByText('Deactivate Patron Account')).toBeInTheDocument();
    });
  });
});
