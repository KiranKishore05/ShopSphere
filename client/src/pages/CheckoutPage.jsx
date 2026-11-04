import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Tag,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  ArrowLeft,
  Lock,
  Loader2,
  PackageCheck
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAddresses } from '../hooks/useAddresses';
import { useAuth } from '../hooks/useAuth';
import { useCheckout } from '../hooks/useOrders';
import { useApplyCoupon } from '../hooks/useCoupons';
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/paymentService';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    items = [],
    subtotal = 0,
    isEligibleForFreeShipping,
    isLoading: isCartLoading,
    isError: isCartError,
    error: cartError
  } = useCart();
  const {
    addresses = [],
    defaultAddress,
    isLoading: isAddressesLoading,
    isError: isAddressesError,
    error: addressesError,
    addAddress,
    isAdding,
    addAddressMutation
  } = useAddresses();

  const checkoutMutation = useCheckout();
  const applyCouponMutation = useApplyCoupon();

  // Selection states
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    phone: '',
    streetAddress: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false
  });

  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' | 'cod'

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  // UI state
  const [checkoutError, setCheckoutError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [idempotencyKey] = useState(() => `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  // Test mode payment simulation modal state
  const [testModalData, setTestModalData] = useState(null);

  // Set default address when loaded
  useEffect(() => {
    if (defaultAddress && !selectedAddressId) {
      setSelectedAddressId(defaultAddress._id);
    } else if (addresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(addresses[0]._id);
    }
  }, [defaultAddress, addresses, selectedAddressId]);

  // Load Razorpay Checkout SDK dynamically
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const shippingFee = isEligibleForFreeShipping ? 0 : 350;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const previewTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;

    setCouponError('');
    try {
      const result = await applyCouponMutation.mutateAsync({
        code: couponCodeInput.trim().toUpperCase(),
        subtotal
      });
      setAppliedCoupon(result);
      setCouponError('');
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Unable to apply promotional code.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    try {
      const saveFn = addAddress || addAddressMutation?.mutateAsync;
      if (!saveFn) {
        throw new Error('Address service is currently unavailable.');
      }
      const saved = await saveFn(newAddress);
      const newAddrs = saved?.data?.addresses || saved?.addresses || [];
      if (newAddrs.length > 0) {
        const added = newAddrs[newAddrs.length - 1];
        setSelectedAddressId(added._id);
      }
      setIsAddingNewAddress(false);
      setNewAddress({
        fullName: '',
        phone: '',
        streetAddress: '',
        apartment: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        isDefault: false
      });
    } catch (err) {
      setCheckoutError(err.message || 'Failed to save address.');
    }
  };

  const handlePlaceOrder = async () => {
    setCheckoutError('');

    if (!selectedAddressId && !isAddingNewAddress) {
      setCheckoutError('Please select or specify a delivery address.');
      return;
    }

    if (items.length === 0) {
      setCheckoutError('Your luxury shopping bag is currently empty.');
      return;
    }

    if (paymentMethod === 'cod' && previewTotal > 20000) {
      setCheckoutError('Cash on Delivery is unavailable for orders exceeding ₹20,000. Please select Razorpay payment.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const checkoutPayload = {
        paymentMethod,
        idempotencyKey,
        couponCode: appliedCoupon ? appliedCoupon.coupon?.code : undefined
      };

      if (selectedAddressId) {
        checkoutPayload.addressId = selectedAddressId;
      } else {
        checkoutPayload.shippingAddress = newAddress;
      }

      // Step 1: Create Order on server
      const createdOrder = await checkoutMutation.mutateAsync(checkoutPayload);

      // Step 2: Handle Cash on Delivery flow
      if (paymentMethod === 'cod') {
        setIsProcessingPayment(false);
        navigate(`/order-confirmation/${createdOrder.orderNumber}`);
        return;
      }

      // Step 3: Handle Razorpay Online Payment flow
      const rzpOrderData = await createRazorpayOrder(createdOrder._id);

      // Check if real Razorpay SDK is available and we have valid non-placeholder keys
      const isPlaceholder = rzpOrderData.isTestMode || rzpOrderData.keyId?.includes('placeholder');

      if (window.Razorpay && !isPlaceholder) {
        const options = {
          key: rzpOrderData.keyId,
          amount: rzpOrderData.amount,
          currency: rzpOrderData.currency,
          name: 'ShopSphere Atelier',
          description: `Order ${createdOrder.orderNumber}`,
          order_id: rzpOrderData.razorpayOrderId,
          handler: async (response) => {
            try {
              await verifyRazorpayPayment({
                orderId: createdOrder._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });
              setIsProcessingPayment(false);
              navigate(`/order-confirmation/${createdOrder.orderNumber}`);
            } catch (vErr) {
              setIsProcessingPayment(false);
              setCheckoutError(vErr.message || 'Payment signature verification failed.');
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: ''
          },
          theme: {
            color: '#161513'
          },
          modal: {
            ondismiss: () => {
              setIsProcessingPayment(false);
            }
          }
        };

        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.on('payment.failed', (failResp) => {
          setIsProcessingPayment(false);
          setCheckoutError(failResp.error?.description || 'Payment failed or declined by issuing bank.');
        });
        razorpayInstance.open();
      } else {
        // Safe Test Mode Simulation Modal when live keys are unconfigured
        setTestModalData({
          order: createdOrder,
          rzpOrderData
        });
        setIsProcessingPayment(false);
      }
    } catch (err) {
      setIsProcessingPayment(false);
      setCheckoutError(err.message || 'Checkout could not be completed. Please review your bag and address.');
    }
  };

  const handleSimulateTestPayment = async () => {
    if (!testModalData) return;
    setIsProcessingPayment(true);
    const { order, rzpOrderData } = testModalData;

    try {
      const mockPaymentId = `pay_mock_${Date.now()}`;
      // In test mode with placeholder keys, we verify with mock credentials
      // To simulate verification cleanly against the server, we call verify with generated signature payload
      // or if secret is known, generate signature. Note: server uses timingSafeEqual with RAZORPAY_KEY_SECRET.
      // In development/test mode without live keys, verify endpoint accepts valid HMAC or test fallback.
      // Let's create the HMAC using web crypto or direct call:
      const payload = `${rzpOrderData.razorpayOrderId}|${mockPaymentId}`;
      
      // Compute HMAC in browser using SubtleCrypto
      const encoder = new TextEncoder();
      const keyData = encoder.encode('placeholder_razorpay_secret_key');
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const mockSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await verifyRazorpayPayment({
        orderId: order._id,
        razorpayOrderId: rzpOrderData.razorpayOrderId,
        razorpayPaymentId: mockPaymentId,
        razorpaySignature: mockSignature
      });

      setTestModalData(null);
      setIsProcessingPayment(false);
      navigate(`/order-confirmation/${order.orderNumber}`);
    } catch (err) {
      setIsProcessingPayment(false);
      setCheckoutError(err.message || 'Payment simulation failed.');
    }
  };

  if (isCartLoading || isAddressesLoading || isAuthLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-sphere-ink/40 mb-4" />
        <p className="font-editorial text-lg text-sphere-ink">Preparing your checkout experience...</p>
      </div>
    );
  }

  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <Lock className="w-10 h-10 text-sphere-ink/40 mx-auto mb-4" />
        <h1 className="font-editorial text-3xl text-sphere-ink mb-3">Identification Required</h1>
        <p className="text-sm text-sphere-muted mb-8 max-w-md mx-auto">
          Please sign in to your Atelier client account to access protected checkout, saved shipping addresses, and payment authorization.
        </p>
        <Link
          to="/login"
          state={{ from: { pathname: '/checkout' } }}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all shadow-luxury"
        >
          <span>Sign In to Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (isCartError || isAddressesError) {
    const errorMsg = cartError?.message || addressesError?.message || 'Unable to retrieve checkout information from our servers.';
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-4" />
        <h1 className="font-editorial text-3xl text-sphere-ink mb-2">Unable to Load Checkout</h1>
        <p className="text-sm text-sphere-muted mb-8">{errorMsg}</p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all shadow-luxury"
          >
            Retry Checkout
          </button>
          <Link
            to="/cart"
            className="px-6 py-3 border border-sphere-border text-xs uppercase tracking-luxury font-medium text-sphere-ink hover:border-sphere-ink transition-colors"
          >
            Return to Bag
          </Link>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <h1 className="font-editorial text-3xl text-sphere-ink mb-4">Your Shopping Bag is Empty</h1>
        <p className="text-sm text-sphere-muted mb-8">Please curate garments from our runway collection before checkout.</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all shadow-luxury"
        >
          <span>Explore Boutique</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-sphere-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/cart" className="inline-flex items-center gap-1.5 text-xs text-sphere-muted hover:text-sphere-ink transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Shopping Bag</span>
          </Link>
          <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink font-normal">
            Atelier Checkout
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-sphere-muted uppercase tracking-wider">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>256-Bit SSL Encrypted & Authoritative</span>
        </div>
      </div>

      {/* Global Error Banner */}
      {checkoutError && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-medium block mb-0.5">Checkout Notice</strong>
            <span>{checkoutError}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Flow Steps */}
        <div className="lg:col-span-7 space-y-10">
          {/* Step 1: Delivery Address */}
          <section className="bg-white p-6 border border-sphere-border shadow-luxury">
            <div className="flex items-center justify-between pb-4 border-b border-sphere-border mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-sphere-ink text-sphere-ivory text-xs flex items-center justify-center font-medium">1</span>
                <h2 className="font-editorial text-xl text-sphere-ink">Delivery Destination</h2>
              </div>
              {!isAddingNewAddress && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewAddress(true)}
                  className="inline-flex items-center gap-1 text-xs text-sphere-ink font-medium hover:text-sphere-sand transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New</span>
                </button>
              )}
            </div>

            {isAddingNewAddress ? (
              <form onSubmit={handleSaveNewAddress} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-sphere-muted mb-1 font-medium">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newAddress.fullName}
                      onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-sphere-border text-xs focus:border-sphere-ink focus:outline-none"
                      placeholder="e.g. Eleanor Vance"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-sphere-muted mb-1 font-medium">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-sphere-border text-xs focus:border-sphere-ink focus:outline-none"
                      placeholder="e.g. +91 9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-sphere-muted mb-1 font-medium">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.streetAddress}
                    onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-sphere-border text-xs focus:border-sphere-ink focus:outline-none"
                    placeholder="House/Flat No., Building, Street"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-sphere-muted mb-1 font-medium">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="w-full px-3 py-2 border border-sphere-border text-xs focus:border-sphere-ink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-sphere-muted mb-1 font-medium">State *</label>
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="w-full px-3 py-2 border border-sphere-border text-xs focus:border-sphere-ink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-sphere-muted mb-1 font-medium">Postal Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="PIN / Postal Code"
                      value={newAddress.postalCode}
                      onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-sphere-border text-xs focus:border-sphere-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={Boolean(isAdding || addAddressMutation?.isPending)}
                    className="px-5 py-2.5 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(isAdding || addAddressMutation?.isPending) ? 'Saving...' : 'Use This Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(false)}
                    className="px-4 py-2.5 border border-sphere-border text-xs text-sphere-muted hover:text-sphere-ink"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-sphere-border">
                    <p className="text-xs text-sphere-muted mb-3">No saved addresses found.</p>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewAddress(true)}
                      className="px-4 py-2 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium"
                    >
                      Add Delivery Address
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr._id;
                      return (
                        <div
                          key={addr._id}
                          onClick={() => setSelectedAddressId(addr._id)}
                          className={`p-4 border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-sphere-ink bg-sphere-sand-light/20 shadow-sm'
                              : 'border-sphere-border hover:border-sphere-ink/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-xs text-sphere-ink">{addr.fullName}</span>
                            {addr.isDefault && (
                              <span className="text-[10px] uppercase tracking-wider bg-sphere-sand-light text-sphere-charcoal px-1.5 py-0.5">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-sphere-muted leading-relaxed line-clamp-2">
                            {addr.streetAddress}{addr.apartment ? `, ${addr.apartment}` : ''}, {addr.city}, {addr.state} - {addr.postalCode}
                          </p>
                          <p className="text-[11px] text-sphere-charcoal mt-1">Tel: {addr.phone}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Step 2: Delivery & Shipping Method */}
          <section className="bg-white p-6 border border-sphere-border shadow-luxury">
            <div className="flex items-center gap-2.5 pb-4 border-b border-sphere-border mb-5">
              <span className="w-6 h-6 rounded-full bg-sphere-ink text-sphere-ivory text-xs flex items-center justify-center font-medium">2</span>
              <h2 className="font-editorial text-xl text-sphere-ink">Shipping & Packaging</h2>
            </div>

            <div className="p-4 border border-sphere-ink bg-sphere-sand-light/20 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-sphere-ink mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-sphere-ink">
                    {isEligibleForFreeShipping ? 'Complimentary White-Glove Atelier Shipping' : 'Standard Insured Courier Delivery'}
                  </h3>
                  <p className="text-xs text-sphere-muted mt-0.5">
                    Signature delivery with heritage garment bag and protective archival box. Estimated 3–5 business days.
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-sphere-ink">
                {isEligibleForFreeShipping ? 'COMPLIMENTARY' : '₹350'}
              </span>
            </div>
          </section>

          {/* Step 3: Payment Method */}
          <section className="bg-white p-6 border border-sphere-border shadow-luxury">
            <div className="flex items-center gap-2.5 pb-4 border-b border-sphere-border mb-5">
              <span className="w-6 h-6 rounded-full bg-sphere-ink text-sphere-ivory text-xs flex items-center justify-center font-medium">3</span>
              <h2 className="font-editorial text-xl text-sphere-ink">Payment Method</h2>
            </div>

            <div className="space-y-3">
              {/* Option 1: Razorpay Online */}
              <label
                className={`flex items-start gap-3 p-4 border cursor-pointer transition-all ${
                  paymentMethod === 'razorpay'
                    ? 'border-sphere-ink bg-sphere-sand-light/20'
                    : 'border-sphere-border hover:border-sphere-ink/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-1 text-sphere-ink focus:ring-sphere-ink"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sphere-ink" />
                    <span className="text-xs font-medium uppercase tracking-wider text-sphere-ink">
                      Razorpay Secure Payment (Cards, UPI, Netbanking)
                    </span>
                  </div>
                  <p className="text-xs text-sphere-muted mt-1">
                    Instant verification via official Razorpay gateway in INR. Supports Visa, MasterCard, RuPay, UPI, and major Indian banks.
                  </p>
                </div>
              </label>

              {/* Option 2: Cash on Delivery */}
              <label
                className={`flex items-start gap-3 p-4 border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-sphere-ink bg-sphere-sand-light/20'
                    : 'border-sphere-border hover:border-sphere-ink/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 text-sphere-ink focus:ring-sphere-ink"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-sphere-ink" />
                    <span className="text-xs font-medium uppercase tracking-wider text-sphere-ink">
                      Cash on Delivery (COD)
                    </span>
                  </div>
                  <p className="text-xs text-sphere-muted mt-1">
                    Pay in cash upon doorstep delivery. Available for orders up to ₹20,000. Payment verified at delivery.
                  </p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Right Column: Order Summary & Coupon */}
        <div className="lg:col-span-5 space-y-6">
          {/* Coupon Code Redemption Box */}
          <div className="bg-white p-6 border border-sphere-border shadow-luxury">
            <h3 className="font-editorial text-lg text-sphere-ink mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-sphere-sand" />
              <span>Promotional Code</span>
            </h3>

            {appliedCoupon ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold tracking-wider">{appliedCoupon.coupon?.code}</span> applied
                  <p className="text-[11px] text-emerald-700">
                    Saved ₹{appliedCoupon.discountAmount?.toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs text-red-600 hover:underline uppercase tracking-wider font-medium"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon (e.g. WELCOME10)"
                    className="flex-1 px-3 py-2 border border-sphere-border text-xs uppercase tracking-wider focus:border-sphere-ink focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={applyCouponMutation.isPending || !couponCodeInput.trim()}
                    className="px-4 py-2 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-colors disabled:opacity-50"
                  >
                    {applyCouponMutation.isPending ? 'Validating...' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{couponError}</span>
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Garments in Bag Review */}
          <div className="bg-white p-6 border border-sphere-border shadow-luxury">
            <h3 className="font-editorial text-lg text-sphere-ink mb-4 pb-3 border-b border-sphere-border">
              Your Selection ({items.length})
            </h3>
            <div className="divide-y divide-sphere-border max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.variantSku} className="py-3 flex gap-3">
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-14 h-18 object-cover bg-sphere-sand-light shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-sphere-ink truncate">{item.productName}</h4>
                    <p className="text-[11px] text-sphere-muted mt-0.5">
                      Size: {item.size} • Qty: {item.quantity}
                    </p>
                    <p className="text-xs font-medium text-sphere-charcoal mt-1">
                      ₹{item.itemTotal?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Authoritative Price Breakdown */}
            <div className="pt-4 border-t border-sphere-border space-y-2.5 text-xs text-sphere-charcoal mt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Promotional Discount ({appliedCoupon.coupon?.code})</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Packaging & Shipping</span>
                <span>{shippingFee === 0 ? 'Complimentary' : `₹${shippingFee}`}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Taxes (GST Included)</span>
                <span>₹0</span>
              </div>
              <div className="pt-3 border-t border-sphere-border flex justify-between items-baseline font-editorial text-xl text-sphere-ink font-normal">
                <span>Grand Total</span>
                <span>₹{previewTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isProcessingPayment || checkoutMutation.isPending}
              className="w-full mt-6 py-4 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all shadow-luxury flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isProcessingPayment || checkoutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Order...</span>
                </>
              ) : (
                <>
                  <span>
                    {paymentMethod === 'cod' ? 'Confirm Cash on Delivery Order' : 'Proceed to Razorpay Payment'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-[11px] text-sphere-muted text-center mt-3">
              By confirming, you agree to ShopSphere's Terms of Luxury Atelier Service.
            </p>
          </div>
        </div>
      </div>

      {/* Safe Test Mode Payment Simulation Modal */}
      {testModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sphere-ink/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white max-w-md w-full p-6 border border-sphere-border shadow-2xl animate-scaleUp">
            <div className="flex items-center gap-2.5 pb-3 border-b border-sphere-border mb-4">
              <ShieldCheck className="w-5 h-5 text-sphere-sand" />
              <h3 className="font-editorial text-lg text-sphere-ink">Razorpay Test Gateway Sandbox</h3>
            </div>
            <p className="text-xs text-sphere-muted mb-4 leading-relaxed">
              ShopSphere is currently running in test mode with placeholder Razorpay API keys. You can simulate an authoritative payment completion now to test the order verification flow.
            </p>

            <div className="p-3 bg-sphere-ivory border border-sphere-border text-xs space-y-1.5 mb-5 font-mono">
              <div className="flex justify-between">
                <span className="text-sphere-muted">Order Number:</span>
                <span className="font-semibold text-sphere-ink">{testModalData.order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sphere-muted">Gateway Order ID:</span>
                <span className="text-sphere-ink truncate max-w-[200px]">{testModalData.rzpOrderData.razorpayOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sphere-muted">Amount:</span>
                <span className="font-semibold text-sphere-ink">₹{testModalData.order.total?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSimulateTestPayment}
                disabled={isProcessingPayment}
                className="flex-1 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-colors flex items-center justify-center gap-1.5"
              >
                {isProcessingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                <span>Simulate Payment Success</span>
              </button>
              <button
                type="button"
                onClick={() => setTestModalData(null)}
                className="px-4 py-3 border border-sphere-border text-xs text-sphere-muted hover:text-sphere-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
