import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckoutPage from './CheckoutPage';
import * as cartService from '../services/cartService';
import * as userService from '../services/userService';
import * as authService from '../services/authService';
import * as orderService from '../services/orderService';
import * as couponService from '../services/couponService';
import * as paymentService from '../services/paymentService';

vi.mock('../services/cartService');
vi.mock('../services/userService');
vi.mock('../services/authService');
vi.mock('../services/orderService');
vi.mock('../services/couponService');
vi.mock('../services/paymentService');

const mockCustomer = {
  _id: 'user_checkout_123',
  name: 'Eleanor Vance',
  email: 'eleanor@atelier.com',
  role: 'customer'
};

const mockAddresses = [
  {
    _id: 'addr_1',
    fullName: 'Eleanor Vance',
    phone: '+91 9876543210',
    streetAddress: '10 Heritage Boulevard',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    isDefault: true
  }
];

const mockCart = {
  _id: 'cart_1',
  userId: 'user_checkout_123',
  items: [
    {
      productId: 'prod_1',
      variantSku: 'SLK-DRS-S',
      productName: 'Silk Slip Dress',
      productSlug: 'silk-slip-dress',
      image: 'https://example.com/slip.jpg',
      size: 'S',
      color: { name: 'Champagne', hexCode: '#F7E7CE' },
      price: 8000,
      quantity: 1,
      stockQuantity: 5,
      isAvailable: true,
      itemTotal: 8000
    }
  ],
  subtotal: 8000,
  totalItems: 1,
  isEligibleForFreeShipping: true,
  freeShippingThreshold: 5000
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderCheckout = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:orderNumber" element={<div>Order Confirmation Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Frontend Checkout Experience (/checkout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.getMe.mockResolvedValue(mockCustomer);
    cartService.fetchCart.mockResolvedValue(mockCart);
    userService.fetchAddresses.mockResolvedValue(mockAddresses);
  });

  it('should render checkout destination, order summary, and items', async () => {
    renderCheckout();

    await waitFor(() => {
      expect(screen.getByText(/Atelier Checkout/i)).toBeInTheDocument();
      expect(screen.getByText(/Delivery Destination/i)).toBeInTheDocument();
      expect(screen.getByText('Silk Slip Dress')).toBeInTheDocument();
      expect(screen.getAllByText('Eleanor Vance').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/₹8,000/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should switch between Razorpay and Cash on Delivery payment methods', async () => {
    renderCheckout();

    await waitFor(() => {
      expect(screen.getByLabelText(/Razorpay Secure Payment/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cash on Delivery/i)).toBeInTheDocument();
    });

    const codRadio = screen.getByLabelText(/Cash on Delivery/i);
    fireEvent.click(codRadio);
    expect(codRadio).toBeChecked();
    expect(screen.getByText(/Confirm Cash on Delivery Order/i)).toBeInTheDocument();

    const rzpRadio = screen.getByLabelText(/Razorpay Secure Payment/i);
    fireEvent.click(rzpRadio);
    expect(rzpRadio).toBeChecked();
    expect(screen.getByText(/Proceed to Razorpay Payment/i)).toBeInTheDocument();
  });

  it('should apply coupon and display server-calculated discount preview', async () => {
    couponService.applyCoupon.mockResolvedValue({
      coupon: { code: 'LUXURY10', discountType: 'percentage', discountValue: 10 },
      discountAmount: 800,
      subtotal: 8000,
      discountedSubtotal: 7200
    });

    renderCheckout();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter Coupon/i)).toBeInTheDocument();
    });

    const couponInput = screen.getByPlaceholderText(/Enter Coupon/i);
    fireEvent.change(couponInput, { target: { value: 'LUXURY10' } });

    const applyButton = screen.getByRole('button', { name: /Apply/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(couponService.applyCoupon).toHaveBeenCalledWith({
        code: 'LUXURY10',
        subtotal: 8000
      });
      expect(screen.getByText(/Saved ₹800/i)).toBeInTheDocument();
      expect(screen.getByText(/₹7,200/i)).toBeInTheDocument();
    });
  });

  it('should place Cash on Delivery order and navigate to confirmation', async () => {
    orderService.checkout.mockResolvedValue({
      _id: 'ord_123',
      orderNumber: 'SPH-CONFIRM-99',
      paymentMethod: 'cod',
      orderStatus: 'confirmed',
      total: 8000
    });

    renderCheckout();

    await waitFor(() => {
      expect(screen.getByLabelText(/Cash on Delivery/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Cash on Delivery/i));

    const submitBtn = screen.getByRole('button', { name: /Confirm Cash on Delivery Order/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(orderService.checkout).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'cod',
          addressId: 'addr_1'
        })
      );
      expect(screen.getByText(/Order Confirmation Page/i)).toBeInTheDocument();
    });
  });

  it('should show empty shopping bag message when cart has no items', async () => {
    cartService.fetchCart.mockResolvedValue({ items: [], subtotal: 0 });

    renderCheckout();

    await waitFor(() => {
      expect(screen.getByText(/Your Shopping Bag is Empty/i)).toBeInTheDocument();
      expect(screen.getByText(/Explore Boutique/i)).toBeInTheDocument();
    });
  });

  it('should render new address form and submit button without isPending crash when Add New is clicked (Regression Fix)', async () => {
    userService.addAddress.mockResolvedValue({
      data: {
        addresses: [
          ...mockAddresses,
          {
            _id: 'addr_new_99',
            fullName: 'Alexander Wright',
            phone: '+91 9998887770',
            streetAddress: '42 Marine Drive',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400020',
            country: 'India',
            isDefault: false
          }
        ]
      }
    });

    renderCheckout();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add New/i })).toBeInTheDocument();
    });

    // Clicking "Add New" toggles isAddingNewAddress to true
    // This previously crashed with: TypeError: Cannot read properties of undefined (reading 'isPending')
    fireEvent.click(screen.getByRole('button', { name: /Add New/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. Eleanor Vance/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Use This Address/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Use This Address/i });
    expect(submitBtn).toBeEnabled();
    expect(submitBtn).toHaveTextContent('Use This Address');

    // Fill form and submit
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Eleanor Vance/i), { target: { value: 'Alexander Wright' } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. \+91 9876543210/i), { target: { value: '+91 9998887770' } });
    fireEvent.change(screen.getByPlaceholderText(/House\/Flat No\./i), { target: { value: '42 Marine Drive' } });
    fireEvent.change(screen.getByPlaceholderText(/^City$/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByPlaceholderText(/^State$/i), { target: { value: 'Maharashtra' } });
    fireEvent.change(screen.getByPlaceholderText(/PIN \/ Postal Code/i), { target: { value: '400020' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(userService.addAddress).toHaveBeenCalled();
    });
  });

  it('should display identification required screen when user is unauthenticated', async () => {
    authService.getMe.mockResolvedValue(null);

    renderCheckout();

    await waitFor(() => {
      expect(screen.getByText(/Identification Required/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign In to Continue/i)).toBeInTheDocument();
    });
  });

  it('should display unable to load checkout error state when cart API fails', async () => {
    cartService.fetchCart.mockRejectedValue(new Error('Failed to synchronize luxury shopping bag'));

    renderCheckout();

    await waitFor(() => {
      expect(screen.getByText(/Unable to Load Checkout/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to synchronize luxury shopping bag/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Checkout/i })).toBeInTheDocument();
    });
  });

  it('should allow selecting between multiple saved delivery addresses', async () => {
    const multiAddresses = [
      ...mockAddresses,
      {
        _id: 'addr_secondary_2',
        fullName: 'Eleanor Vance (Atelier Studio)',
        phone: '+91 9876543210',
        streetAddress: '55 Fashion Boulevard',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        country: 'India',
        isDefault: false
      }
    ];
    userService.fetchAddresses.mockResolvedValue(multiAddresses);

    renderCheckout();

    await waitFor(() => {
      expect(screen.getByText(/55 Fashion Boulevard/i)).toBeInTheDocument();
    });

    const secondAddrCard = screen.getByText(/55 Fashion Boulevard/i).closest('div');
    fireEvent.click(secondAddrCard);

    // Verify it can be selected without errors
    expect(secondAddrCard).toBeInTheDocument();
  });

  it('should initiate Razorpay order creation when proceeding with online payment', async () => {
    orderService.checkout.mockResolvedValue({
      _id: 'ord_rzp_99',
      orderNumber: 'SPH-RZP-99',
      paymentMethod: 'razorpay',
      orderStatus: 'pending_payment',
      total: 8000
    });

    paymentService.createRazorpayOrder.mockResolvedValue({
      keyId: 'rzp_test_mock_key',
      amount: 800000,
      currency: 'INR',
      razorpayOrderId: 'order_mock_rzp_gateway_id',
      isTestMode: true
    });

    renderCheckout();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Proceed to Razorpay Payment/i })).toBeInTheDocument();
    });

    const proceedBtn = screen.getByRole('button', { name: /Proceed to Razorpay Payment/i });
    fireEvent.click(proceedBtn);

    await waitFor(() => {
      expect(orderService.checkout).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'razorpay'
        })
      );
      expect(paymentService.createRazorpayOrder).toHaveBeenCalledWith('ord_rzp_99');
    });
  });
});
