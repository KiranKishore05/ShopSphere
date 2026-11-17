import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft, 
  AlertCircle, 
  Heart, 
  Tag, 
  Check, 
  X,
  Truck,
  RotateCcw
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';
import { useApplyCoupon } from '../hooks/useCoupons';
import SEO from '../components/common/SEO';

export default function CartPage() {
  const { 
    items, 
    subtotal, 
    totalItems, 
    isEligibleForFreeShipping, 
    freeShippingThreshold, 
    updateQuantity, 
    removeItem, 
    isLoading 
  } = useCart();
  const { isAuthenticated } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const applyCouponMutation = useApplyCoupon();

  // Shipping calculation
  const shippingFee = isEligibleForFreeShipping || items.length === 0 ? 0 : 350;
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - couponDiscount + shippingFee);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponError('');
    try {
      const res = await applyCouponMutation.mutateAsync({
        code: couponCode.trim(),
        subtotal
      });
      const data = res?.data || res;
      setAppliedCoupon({
        code: couponCode.trim().toUpperCase(),
        discountAmount: data.discountAmount || 0,
        description: data.description || 'Coupon applied successfully'
      });
      setCouponCode('');
    } catch (err) {
      setCouponError(err.response?.data?.message || err.message || 'Invalid promotional coupon code.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout');
    }
  };

  const handleMoveToWishlist = async (item) => {
    if (item.productId) {
      await toggleWishlist(item.productId);
    }
    await removeItem(item.variantSku);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn">
        <div className="w-10 h-10 border-2 border-[#161513]/20 border-t-[#161513] rounded-full animate-spin mx-auto mb-4" />
        <span className="font-serif text-lg text-[#161513] tracking-wider">
          Retrieving your luxury selection...
        </span>
      </div>
    );
  }

  // Empty Cart State
  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center animate-fadeIn">
        <SEO title="Shopping Bag - Empty" description="Your ShopSphere shopping bag is currently empty." />
        <div className="w-20 h-20 mx-auto rounded-full bg-[#F4EDE4] text-[#161513] flex items-center justify-center mb-6 shadow-xs">
          <ShoppingBag className="w-9 h-9" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#161513] font-normal mb-3">
          Your Shopping Bag is Empty
        </h1>
        <p className="text-sm text-[#827E77] max-w-md mx-auto mb-8">
          You haven't selected any fashion pieces yet. Explore our latest Men's, Women's, and Kids' collections.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#161513] text-[#FDFBF7] text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#34302C] active:scale-98 transition-all shadow-sm"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-fadeIn">
      <SEO title={`Shopping Bag (${totalItems} ${totalItems === 1 ? 'item' : 'items'})`} description="Review your selected fashion items and proceed to checkout on ShopSphere." />

      {/* Header Breadcrumbs / Back Link */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827E77] hover:text-[#161513] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Page Title & Count */}
      <div className="border-b border-[#EAE5DA] pb-4 mb-6 sm:mb-8 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#161513] tracking-tight">
            Shopping Bag
          </h1>
          <span className="text-xs sm:text-sm font-semibold text-[#827E77]">
            ({totalItems} {totalItems === 1 ? 'Item' : 'Items'})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Free Shipping Notification Alert Banner */}
          <div className="p-4 bg-[#FBF9F5] border border-[#EAE5DA] rounded-xl text-xs flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              {isEligibleForFreeShipping ? (
                <span className="text-[#161513]">
                  Your order qualifies for <strong className="text-emerald-800 font-semibold">Complimentary Standard Delivery</strong> anywhere in India.
                </span>
              ) : (
                <span className="text-[#5A554E]">
                  Add items worth <strong className="text-[#161513]">₹{(freeShippingThreshold - subtotal).toLocaleString('en-IN')}</strong> more to unlock <span className="font-semibold text-emerald-800">Complimentary Delivery</span>.
                </span>
              )}
            </div>
          </div>

          {/* Cart Items Cards */}
          <div className="space-y-3.5">
            {items.map((item) => (
              <div 
                key={item.variantSku} 
                className="bg-white border border-[#EAE5DA] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row gap-4 sm:gap-5 transition-shadow hover:shadow-sm"
              >
                {/* 1. Product Thumbnail (~110-130px square, object-contain, warm neutral background) */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 shrink-0 bg-[#FBF9F5] border border-[#EAE5DA] rounded-lg overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'}
                    alt={item.productName}
                    className="max-w-full max-h-full w-auto h-auto object-contain object-center transition-transform duration-300 hover:scale-105"
                  />
                </div>

                {/* 2. Product Information & Controls */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        {item.brand && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#827E77] block mb-0.5">
                            {item.brand}
                          </span>
                        )}
                        <Link
                          to={`/products/${item.productSlug}`}
                          className="font-serif text-base sm:text-lg font-bold text-[#161513] hover:text-[#BA4343] transition-colors leading-snug line-clamp-1"
                        >
                          {item.productName}
                        </Link>
                      </div>

                      {/* Item Total Price */}
                      <span className="font-sans text-base sm:text-lg font-bold text-[#161513] shrink-0">
                        ₹{item.itemTotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Variant Specification Badges: Size & Color */}
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#5A554E]">
                      <span>Size: <strong className="text-[#161513] font-semibold">{item.size}</strong></span>
                      <span className="text-[#D5CEC2]">•</span>
                      <span className="flex items-center gap-1.5">
                        <span>Color:</span>
                        {item.color?.hexCode && (
                          <span
                            className="w-3 h-3 rounded-full border border-[#D5CEC2] inline-block"
                            style={{ backgroundColor: item.color.hexCode }}
                          />
                        )}
                        <strong className="text-[#161513] font-semibold">{item.color?.name || 'Standard'}</strong>
                      </span>
                      {item.price && item.quantity > 1 && (
                        <>
                          <span className="text-[#D5CEC2]">•</span>
                          <span className="text-[#827E77]">₹{item.price.toLocaleString('en-IN')} each</span>
                        </>
                      )}
                    </div>

                    {/* Stock Alert Warning */}
                    {item.warning && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.warning}</span>
                      </div>
                    )}
                  </div>

                  {/* 3. Bottom Row: Quantity Stepper, Wishlist & Remove */}
                  <div className="mt-4 pt-3.5 border-t border-[#F2ECE4] flex items-center justify-between gap-3">
                    {/* Compact Quantity Stepper */}
                    <div className="flex items-center border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] h-8 sm:h-9">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variantSku, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-full flex items-center justify-center text-[#161513] hover:text-black font-semibold disabled:opacity-30 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-mono text-xs font-semibold text-[#161513]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variantSku, item.quantity + 1)}
                        disabled={item.quantity >= (item.stockQuantity || 10)}
                        className="w-8 h-full flex items-center justify-center text-[#161513] hover:text-black font-semibold disabled:opacity-30 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Actions: Save to Wishlist & Remove Item */}
                    <div className="flex items-center gap-3 text-xs">
                      {item.productId && (
                        <button
                          type="button"
                          onClick={() => handleMoveToWishlist(item)}
                          className="inline-flex items-center gap-1 text-[#827E77] hover:text-[#161513] transition-colors"
                          title="Save to Wishlist"
                        >
                          <Heart 
                            className={`w-3.5 h-3.5 ${isInWishlist(item.productId) ? 'text-rose-600 fill-rose-600' : ''}`} 
                          />
                          <span className="hidden sm:inline">Save for later</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removeItem(item.variantSku)}
                        className="inline-flex items-center gap-1 text-[#827E77] hover:text-rose-600 transition-colors p-1"
                        aria-label={`Remove ${item.productName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reassurance Features */}
          <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-xs text-[#5A554E]">
            <div className="flex items-center justify-center gap-2 p-2.5 bg-[#FBF9F5] border border-[#EAE5DA] rounded-lg">
              <Truck className="w-4 h-4 text-[#161513]" />
              <span>Fast India Delivery</span>
            </div>
            <div className="flex items-center justify-center gap-2 p-2.5 bg-[#FBF9F5] border border-[#EAE5DA] rounded-lg">
              <RotateCcw className="w-4 h-4 text-[#161513]" />
              <span>7-Day Easy Returns</span>
            </div>
            <div className="hidden sm:flex items-center justify-center gap-2 p-2.5 bg-[#FBF9F5] border border-[#EAE5DA] rounded-lg">
              <ShieldCheck className="w-4 h-4 text-[#161513]" />
              <span>100% Genuine Apparel</span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white border border-[#EAE5DA] rounded-2xl p-6 sm:p-7 shadow-xs sticky top-24 space-y-5">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#161513] border-b border-[#EAE5DA] pb-3.5">
              Order Summary
            </h2>

            {/* Line Items Breakdown */}
            <div className="space-y-3 text-xs sm:text-sm text-[#5A554E]">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-semibold text-[#161513]">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Shipping</span>
                <span className="font-semibold text-[#161513]">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase text-xs">Complimentary</span>
                  ) : (
                    `₹${shippingFee.toLocaleString('en-IN')}`
                  )}
                </span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between items-center text-emerald-800">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Coupon ({appliedCoupon.code})</span>
                  </span>
                  <span className="font-semibold">
                    -₹{appliedCoupon.discountAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-[#827E77]">
                <span>Taxes & Duties</span>
                <span>Included</span>
              </div>

              {/* Total Row */}
              <div className="pt-3.5 border-t border-[#EAE5DA] flex justify-between items-baseline">
                <span className="font-bold text-sm sm:text-base text-[#161513] uppercase tracking-wider">
                  Total
                </span>
                <span className="font-sans text-xl sm:text-2xl font-bold text-[#161513]">
                  ₹{finalTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="pt-3 border-t border-[#EAE5DA]">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold">{appliedCoupon.code} applied</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium p-1"
                    aria-label="Remove coupon"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Promo Code"
                      className="flex-1 px-3 py-2 text-xs border border-[#EAE5DA] rounded-lg bg-[#FDFBF7] uppercase tracking-wider focus:outline-hidden focus:border-[#161513]"
                    />
                    <button
                      type="submit"
                      disabled={!couponCode.trim() || applyCouponMutation.isPending}
                      className="px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold rounded-lg hover:bg-[#34302C] disabled:opacity-40 transition-colors shrink-0"
                    >
                      {applyCouponMutation.isPending ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-rose-600">{couponError}</p>
                  )}
                </form>
              )}
            </div>

            {/* Proceed to Checkout Primary Action Button */}
            <button
              type="button"
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 sm:py-4 bg-[#161513] text-[#FDFBF7] text-xs sm:text-sm uppercase font-semibold tracking-wider rounded-xl hover:bg-[#34302C] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs group"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Continue Shopping secondary action */}
            <div className="text-center">
              <Link
                to="/shop"
                className="text-xs font-semibold text-[#827E77] hover:text-[#161513] transition-colors"
              >
                Or Continue Shopping
              </Link>
            </div>

            {/* Trust Assurance Notes */}
            <div className="pt-2 text-[11px] text-[#827E77] text-center space-y-1">
              <p>🔒 256-Bit SSL Encrypted Checkout via Razorpay & COD</p>
              <p>Inclusive of all taxes & standard brand warranties</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
