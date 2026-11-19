import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Tag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  ArrowLeft,
  Lock,
  Loader2,
  PackageCheck,
  Check,
  MapPin
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAddresses } from '../hooks/useAddresses';
import { useAuth } from '../hooks/useAuth';
import { useCheckout } from '../hooks/useOrders';
import { useApplyCoupon } from '../hooks/useCoupons';
import { createRazorpayOrder, verifyRazorpayPayment, recordPaymentFailure, mockCompletePayment } from '../services/paymentService';
import SEO from '../components/common/SEO';

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
    setCheckoutError('');

    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!pinRegex.test(newAddress.postalCode.trim())) {
      setCheckoutError('Please enter a valid 6-digit Indian PIN code (e.g. 400050).');
      return;
    }

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
          name: 'ShopSphere',
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
            contact: (addresses.find(a => a._id === selectedAddressId) || defaultAddress)?.phone || user?.phone || ''
          },
          theme: {
            color: '#161513'
          },
          modal: {
            ondismiss: () => {
              setIsProcessingPayment(false);
              setCheckoutError('Payment cancelled. You can retry with Razorpay or choose Cash on Delivery.');
              recordPaymentFailure({
                orderId: createdOrder._id,
                razorpayOrderId: rzpOrderData.razorpayOrderId,
                errorDescription: 'Payment dismissed or cancelled by customer'
              });
            }
          }
        };

        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.on('payment.failed', (failResp) => {
          setIsProcessingPayment(false);
          const failDesc = failResp.error?.description || 'Payment declined by issuing bank.';
          setCheckoutError(`${failDesc} You can retry with Razorpay or choose Cash on Delivery.`);
          recordPaymentFailure({
            orderId: createdOrder._id,
            razorpayOrderId: rzpOrderData.razorpayOrderId,
            errorDescription: failDesc
          });
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
      // Safe backend-only mock payment: no secrets or HMAC computation on the client
      await mockCompletePayment({
        orderId: order._id,
        razorpayOrderId: rzpOrderData.razorpayOrderId
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
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#161513]/40 mb-4" />
        <p className="font-serif text-lg text-[#161513]">Preparing your checkout experience...</p>
      </div>
    );
  }

  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20 text-center animate-fadeIn">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#F4EDE4] text-[#161513] flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-[#161513]" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-3xl text-[#161513] mb-3">Identification Required</h1>
        <p className="text-sm text-[#827E77] mb-8 max-w-md mx-auto">
          Please sign in to your Atelier client account to access protected checkout, saved shipping addresses, and payment authorization.
        </p>
        <Link
          to="/login"
          state={{ from: { pathname: '/checkout' } }}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#161513] text-[#FDFBF7] text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#34302C] transition-all shadow-sm"
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
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20 text-center animate-fadeIn">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-4" />
        <h1 className="font-serif text-3xl text-[#161513] mb-2">Unable to Load Checkout</h1>
        <p className="text-sm text-[#827E77] mb-8">{errorMsg}</p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-[#34302C] transition-all shadow-sm"
          >
            Retry Checkout
          </button>
          <Link
            to="/cart"
            className="px-6 py-3 border border-[#EAE5DA] rounded-lg text-xs uppercase font-semibold tracking-wider text-[#161513] hover:border-[#161513] transition-colors"
          >
            Return to Bag
          </Link>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20 text-center animate-fadeIn">
        <h1 className="font-serif text-3xl text-[#161513] mb-4">Your Shopping Bag is Empty</h1>
        <p className="text-sm text-[#827E77] mb-8">Please curate garments from our runway collection before checkout.</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#161513] text-[#FDFBF7] text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#34302C] transition-all shadow-sm"
        >
          <span>Explore Boutique</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-fadeIn">
      <SEO title="Secure Checkout" description="Complete your luxury fashion purchase with secure checkout on ShopSphere." />

      {/* Checkout Top Bar: Return Link & Brand Identifier */}
      <div className="mb-4 sm:mb-6">
        <Link to="/cart" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827E77] hover:text-[#161513] transition-colors group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Return to Shopping Bag</span>
        </Link>
      </div>

      {/* Header & 3-Step Progress Indicator (Address -> Payment -> Confirmation) */}
      <div className="border-b border-[#EAE5DA] pb-5 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#161513] tracking-tight">
            Secure Checkout
          </h1>
          <p className="text-xs text-[#827E77] mt-0.5">Atelier Checkout • 256-Bit SSL Encrypted</p>
        </div>

        {/* 3-Step Progress Indicator */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-[#161513]">
            <span className="w-5 h-5 rounded-full bg-[#161513] text-white flex items-center justify-center text-[11px] font-bold">1</span>
            <span className="font-semibold">Address</span>
          </div>
          <span className="w-6 sm:w-8 h-px bg-[#D5CEC2]" />
          <div className="flex items-center gap-1.5 text-[#161513]">
            <span className="w-5 h-5 rounded-full bg-[#161513] text-white flex items-center justify-center text-[11px] font-bold">2</span>
            <span className="font-semibold">Payment</span>
          </div>
          <span className="w-6 sm:w-8 h-px bg-[#EAE5DA]" />
          <div className="flex items-center gap-1.5 text-[#827E77]">
            <span className="w-5 h-5 rounded-full bg-[#EAE5DA] text-[#827E77] flex items-center justify-center text-[11px]">3</span>
            <span>Confirmation</span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {checkoutError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <strong className="font-semibold block mb-0.5">Checkout Notice</strong>
            <span>{checkoutError}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Checkout Details (Address, Payment, Place Order) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Section A: Delivery Address */}
          <section className="bg-white p-5 sm:p-6 border border-[#EAE5DA] rounded-2xl shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE5DA] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#F4EDE4] text-[#161513] flex items-center justify-center font-bold text-xs">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#161513]">
                  Delivery Address <span className="sr-only">Delivery Destination</span>
                </h2>
              </div>
              {!isAddingNewAddress && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewAddress(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#161513] hover:text-[#BA4343] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New</span>
                </button>
              )}
            </div>

            {/* Address Selection or Form */}
            {isAddingNewAddress ? (
              <form onSubmit={handleSaveNewAddress} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#827E77] mb-1 font-semibold">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newAddress.fullName}
                      onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] text-xs focus:border-[#161513] focus:outline-hidden"
                      placeholder="e.g. Eleanor Vance"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#827E77] mb-1 font-semibold">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] text-xs focus:border-[#161513] focus:outline-hidden"
                      placeholder="e.g. +91 9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#827E77] mb-1 font-semibold">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.streetAddress}
                    onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] text-xs focus:border-[#161513] focus:outline-hidden"
                    placeholder="House/Flat No., Building, Street"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#827E77] mb-1 font-semibold">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] text-xs focus:border-[#161513] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#827E77] mb-1 font-semibold">State *</label>
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] text-xs focus:border-[#161513] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#827E77] mb-1 font-semibold">PIN Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="PIN / Postal Code"
                      value={newAddress.postalCode}
                      onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] text-xs focus:border-[#161513] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={Boolean(isAdding || addAddressMutation?.isPending)}
                    className="px-5 py-2.5 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-[#34302C] disabled:opacity-50"
                  >
                    {(isAdding || addAddressMutation?.isPending) ? 'Saving...' : 'Use This Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(false)}
                    className="px-4 py-2.5 border border-[#EAE5DA] rounded-lg text-xs font-semibold text-[#827E77] hover:text-[#161513]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[#EAE5DA] rounded-xl">
                    <p className="text-xs text-[#827E77] mb-3">No saved addresses found.</p>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewAddress(true)}
                      className="px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg"
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
                          className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#161513] bg-[#FBF9F5] shadow-xs'
                              : 'border-[#EAE5DA] bg-white hover:border-[#161513]/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-xs sm:text-sm text-[#161513]">{addr.fullName}</span>
                              <div className="flex items-center gap-1.5">
                                {addr.isDefault && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider bg-[#F4EDE4] text-[#161513] px-1.5 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                                {isSelected ? (
                                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                ) : (
                                  <span className="w-5 h-5 rounded-full border border-[#D5CEC2] shrink-0" />
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-[#5A554E] leading-relaxed line-clamp-2">
                              {addr.streetAddress}{addr.apartment ? `, ${addr.apartment}` : ''}, {addr.city}, {addr.state} - {addr.postalCode}
                            </p>
                          </div>
                          <p className="text-[11px] text-[#827E77] font-medium mt-2">Tel: {addr.phone}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section B: Payment Method */}
          <section className="bg-white p-5 sm:p-6 border border-[#EAE5DA] rounded-2xl shadow-xs">
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#EAE5DA] mb-4">
              <div className="w-7 h-7 rounded-full bg-[#F4EDE4] text-[#161513] flex items-center justify-center font-bold text-xs">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#161513]">
                Payment Method
              </h2>
            </div>

            <div className="space-y-3">
              {/* Option 1: Razorpay (Cards, UPI, NetBanking) */}
              <label
                className={`flex items-start gap-3.5 p-4 border rounded-xl cursor-pointer transition-all ${
                  paymentMethod === 'razorpay'
                    ? 'border-[#161513] bg-[#FBF9F5] shadow-xs'
                    : 'border-[#EAE5DA] bg-white hover:border-[#161513]/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  aria-label="Razorpay Secure Payment"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-0.5 text-[#161513] focus:ring-[#161513]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#161513]">
                      Razorpay (UPI, Cards, NetBanking)
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      Instant
                    </span>
                  </div>
                  <p className="text-xs text-[#827E77] mt-0.5">
                    Supports Google Pay, PhonePe, Paytm, UPI, Credit/Debit Cards & Net Banking across all Indian banks.
                  </p>
                </div>
              </label>

              {/* Option 2: Cash on Delivery (COD) */}
              <label
                className={`flex items-start gap-3.5 p-4 border rounded-xl cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-[#161513] bg-[#FBF9F5] shadow-xs'
                    : 'border-[#EAE5DA] bg-white hover:border-[#161513]/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  aria-label="Cash on Delivery"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-0.5 text-[#161513] focus:ring-[#161513]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#161513]">
                      Cash on Delivery (COD)
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#827E77] bg-[#F4EDE4] px-2 py-0.5 rounded">
                      Pay at Doorstep
                    </span>
                  </div>
                  <p className="text-xs text-[#827E77] mt-0.5">
                    Pay securely in cash upon doorstep delivery. Available for orders up to ₹20,000.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Section C: Place Order Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isProcessingPayment || checkoutMutation.isPending}
              className="w-full py-4 bg-[#161513] text-[#FDFBF7] text-xs sm:text-sm uppercase font-semibold tracking-wider rounded-xl hover:bg-[#34302C] active:scale-98 transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group"
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
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <p className="text-[11px] text-[#827E77] text-center mt-2.5">
              By placing your order, you agree to ShopSphere's Terms & Conditions and 7-day return policy.
            </p>
          </div>
        </div>

        {/* Right Column: Order Summary & Item Review */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* Order Summary Card */}
          <div className="bg-white border border-[#EAE5DA] rounded-2xl p-5 sm:p-6 shadow-xs sticky top-24 space-y-5">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#161513] pb-3 border-b border-[#EAE5DA]">
              Order Summary ({items.length})
            </h3>

            {/* Cart Items List */}
            <div className="divide-y divide-[#F2ECE4] max-h-64 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
              {items.map((item) => (
                <div key={item.variantSku} className="pt-2.5 first:pt-0 flex gap-3 items-center">
                  <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-lg bg-[#FBF9F5] border border-[#EAE5DA] overflow-hidden flex items-center justify-center p-1 shrink-0">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'}
                      alt={item.productName}
                      className="max-w-full max-h-full w-auto h-auto object-contain object-center"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[#161513] truncate">{item.productName}</h4>
                    <p className="text-[11px] text-[#827E77] mt-0.5">
                      Size: {item.size} • Qty: {item.quantity}
                    </p>
                    <p className="text-xs font-bold text-[#161513] mt-0.5">
                      ₹{item.itemTotal?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Promotional Code Input Box */}
            <div className="pt-3 border-t border-[#EAE5DA]">
              {appliedCoupon ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold tracking-wider">{appliedCoupon.coupon?.code}</span> applied
                    <p className="text-[11px] text-emerald-700">
                      Saved ₹{appliedCoupon.discountAmount?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter Coupon (e.g. WELCOME10)"
                      className="flex-1 px-3 py-2 border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] text-xs uppercase tracking-wider focus:border-[#161513] focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={applyCouponMutation.isPending || !couponCodeInput.trim()}
                      className="px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold rounded-lg hover:bg-[#34302C] disabled:opacity-40 transition-colors shrink-0"
                    >
                      {applyCouponMutation.isPending ? 'Validating...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{couponError}</span>
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Authoritative Price Breakdown */}
            <div className="pt-3 border-t border-[#EAE5DA] space-y-2.5 text-xs text-[#5A554E]">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-semibold text-[#161513]">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between items-center text-emerald-800 font-medium">
                  <span>Promotional Discount</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Shipping</span>
                <span className="font-semibold text-[#161513]">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase text-xs">Complimentary</span>
                  ) : (
                    `₹${shippingFee}`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#827E77]">
                <span>Taxes & Duties</span>
                <span>GST Included</span>
              </div>
              <div className="pt-3 border-t border-[#EAE5DA] flex justify-between items-baseline font-bold text-[#161513]">
                <span className="uppercase text-xs tracking-wider">Total</span>
                <span className="font-sans text-xl sm:text-2xl font-bold">
                  ₹{previewTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Trust Assurances */}
            <div className="pt-2 text-[11px] text-[#827E77] text-center space-y-1">
              <p>🔒 256-Bit SSL Encrypted & Authoritative</p>
              <p>Free standard delivery & easy 7-day returns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Safe Test Mode Payment Simulation Modal */}
      {testModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white max-w-md w-full p-6 border border-[#EAE5DA] rounded-2xl shadow-xl animate-scaleUp">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAE5DA] mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h3 className="font-serif text-lg font-bold text-[#161513]">Razorpay Test Gateway Sandbox</h3>
            </div>
            <p className="text-xs text-[#827E77] mb-4 leading-relaxed">
              ShopSphere is currently running in test mode with placeholder Razorpay API keys. You can simulate an authoritative payment completion now to test the order verification flow.
            </p>

            <div className="p-3 bg-[#FBF9F5] border border-[#EAE5DA] rounded-lg text-xs space-y-1.5 mb-5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#827E77]">Order Number:</span>
                <span className="font-semibold text-[#161513]">{testModalData.order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#827E77]">Gateway Order ID:</span>
                <span className="text-[#161513] truncate max-w-[200px]">{testModalData.rzpOrderData.razorpayOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#827E77]">Amount:</span>
                <span className="font-semibold text-[#161513]">₹{testModalData.order.total?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSimulateTestPayment}
                disabled={isProcessingPayment}
                className="flex-1 py-3 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-[#34302C] transition-colors flex items-center justify-center gap-1.5"
              >
                {isProcessingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                <span>Simulate Payment Success</span>
              </button>
              <button
                type="button"
                onClick={() => setTestModalData(null)}
                className="px-4 py-3 border border-[#EAE5DA] rounded-lg text-xs font-semibold text-[#827E77] hover:text-[#161513] transition-colors"
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
