import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrdersPage from './OrdersPage';
import OrderDetailPage from './OrderDetailPage';
import * as orderService from '../services/orderService';
import * as authService from '../services/authService';

vi.mock('../services/orderService');
vi.mock('../services/authService');

const mockCustomer = {
  _id: 'user_orders_123',
  name: 'Sophia Laurent',
  email: 'sophia@atelier.com',
  role: 'customer'
};

const mockOrder = {
  _id: 'ord_sophia_1',
  orderNumber: 'SPH-SOPHIA-001',
  userId: 'user_orders_123',
  createdAt: '2026-10-15T12:00:00.000Z',
  orderStatus: 'confirmed',
  paymentStatus: 'paid',
  paymentMethod: 'razorpay',
  subtotal: 12000,
  discount: 1200,
  shippingFee: 0,
  tax: 0,
  total: 10800,
  couponCode: 'WELCOME10',
  items: [
    {
      productId: 'p_1',
      variantSku: 'WOL-COAT-M',
      name: 'Virgin Wool Overcoat',
      size: 'M',
      color: { name: 'Noir', hexCode: '#161513' },
      image: 'https://example.com/overcoat.jpg',
      unitPrice: 12000,
      quantity: 1,
      lineTotal: 12000
    }
  ],
  shippingAddressSnapshot: {
    fullName: 'Sophia Laurent',
    phone: '+91 9876543210',
    streetAddress: '88 Rue de Commerce',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India'
  },
  statusTimeline: [
    { status: 'confirmed', timestamp: '2026-10-15T12:05:00.000Z', note: 'Payment verified' }
  ]
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

describe('Frontend Orders & Order Detail Views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.getMe.mockResolvedValue(mockCustomer);
  });

  describe('OrdersPage (/account/orders)', () => {
    it('should render customer orders list with order details and status', async () => {
      orderService.fetchMyOrders.mockResolvedValue({
        orders: [mockOrder],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/account/orders']}>
            <OrdersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Order Archives/i)).toBeInTheDocument();
        expect(screen.getByText('SPH-SOPHIA-001')).toBeInTheDocument();
        expect(screen.getByText('Virgin Wool Overcoat')).toBeInTheDocument();
        expect(screen.getByText(/₹10,800/i)).toBeInTheDocument();
        expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
      });
    });

    it('should render empty state when customer has no placed orders', async () => {
      orderService.fetchMyOrders.mockResolvedValue({
        orders: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 1 }
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/account/orders']}>
            <OrdersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Past Orders Found/i)).toBeInTheDocument();
        expect(screen.getByText(/Explore Boutique/i)).toBeInTheDocument();
      });
    });
  });

  describe('OrderDetailPage (/account/orders/:orderNumber)', () => {
    it('should render detailed order information, items, address, and status timeline', async () => {
      orderService.fetchOrderByNumber.mockResolvedValue(mockOrder);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/account/orders/SPH-SOPHIA-001']}>
            <Routes>
              <Route path="/account/orders/:orderNumber" element={<OrderDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Order SPH-SOPHIA-001/i)).toBeInTheDocument();
        expect(screen.getByText('Virgin Wool Overcoat')).toBeInTheDocument();
        expect(screen.getByText('88 Rue de Commerce')).toBeInTheDocument();
        expect(screen.getByText(/Order Confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/Cancel Order/i)).toBeInTheDocument();
      });
    });

    it('should open cancellation modal and cancel order', async () => {
      orderService.fetchOrderByNumber.mockResolvedValue(mockOrder);
      orderService.cancelOrder.mockResolvedValue({
        ...mockOrder,
        orderStatus: 'cancelled'
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/account/orders/SPH-SOPHIA-001']}>
            <Routes>
              <Route path="/account/orders/:orderNumber" element={<OrderDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Cancel Order/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Cancel Order/i));

      expect(screen.getByText(/Are you sure you wish to cancel order/i)).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /Confirm Cancellation/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(orderService.cancelOrder).toHaveBeenCalledWith(
          'SPH-SOPHIA-001',
          'Change of delivery plans'
        );
        expect(screen.getByText(/Your order was successfully cancelled/i)).toBeInTheDocument();
      });
    });
  });
});
