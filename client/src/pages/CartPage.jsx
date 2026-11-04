import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

export default function CartPage() {
  const { items, subtotal, totalItems, isEligibleForFreeShipping, freeShippingThreshold, updateQuantity, removeItem, isLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const shippingFee = isEligibleForFreeShipping || items.length === 0 ? 0 : 350;
  const estimatedTotal = subtotal + shippingFee;

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-10 h-10 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mx-auto mb-4" />
        <span className="font-editorial text-lg text-sphere-ink tracking-wider">
          Retrieving your luxury selection...
        </span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn">
        <div className="w-20 h-20 mx-auto rounded-full bg-sphere-sand-light text-sphere-sand flex items-center justify-center mb-6">
          <ShoppingBag className="w-9 h-9" />
        </div>
        <h1 className="font-editorial text-4xl text-sphere-ink font-normal mb-3">
          Your Shopping Bag is Empty
        </h1>
        <p className="text-sm text-sphere-muted max-w-md mx-auto mb-8">
          You haven't selected any garments yet. Explore our seasonal runway collections and tailored atelier essentials.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all shadow-luxury"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-sphere-muted hover:text-sphere-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Title */}
      <div className="border-b border-sphere-border pb-6 mb-8 flex items-baseline justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-sphere-muted font-semibold block mb-1">
            Order Review
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink">
            Shopping Bag
          </h1>
        </div>
        <span className="text-xs text-sphere-muted uppercase tracking-wider">
          {totalItems} {totalItems === 1 ? 'Garment' : 'Garments'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Items List */}
        <div className="lg:col-span-8 space-y-6">
          {/* Free Shipping Alert Banner */}
          <div className="p-4 bg-sphere-sand-light/50 border border-sphere-border text-xs flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-sphere-sage shrink-0" />
            <div>
              {isEligibleForFreeShipping ? (
                <span className="text-sphere-charcoal font-medium">
                  Your order qualifies for <strong>complimentary concierge delivery</strong> anywhere in India.
                </span>
              ) : (
                <span className="text-sphere-charcoal">
                  Add items worth <strong>₹{(freeShippingThreshold - subtotal).toLocaleString('en-IN')}</strong> more to unlock complimentary concierge delivery.
                </span>
              )}
            </div>
          </div>

          {/* Items Table / Cards */}
          <div className="bg-white border border-sphere-border divide-y divide-sphere-border shadow-sm">
            {items.map((item) => (
              <div key={item.variantSku} className="p-6 flex flex-col sm:flex-row gap-6">
                {/* Thumbnail */}
                <div className="w-24 h-32 shrink-0 bg-sphere-sand-light border border-sphere-border overflow-hidden">
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80'}
                    alt={item.productName}
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-sphere-muted block">
                          {item.brand}
                        </span>
                        <Link
                          to={`/products/${item.productSlug}`}
                          className="font-editorial text-xl text-sphere-ink hover:text-sphere-sand transition-colors"
                        >
                          {item.productName}
                        </Link>
                      </div>
                      <span className="font-editorial text-lg text-sphere-ink font-semibold shrink-0">
                        ₹{item.itemTotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Variant Specification Badges */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-sphere-charcoal">
                      <span>Size: <strong className="text-sphere-ink">{item.size}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <span>Colour:</span>
                        <span
                          className="w-3 h-3 rounded-full border border-sphere-border inline-block"
                          style={{ backgroundColor: item.color?.hexCode || '#000000' }}
                        />
                        <strong className="text-sphere-ink">{item.color?.name}</strong>
                      </span>
                    </div>

                    {item.warning && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-sphere-status-error">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{item.warning}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Stepper & Remove Action */}
                  <div className="mt-4 pt-4 border-t border-sphere-border/60 flex items-center justify-between">
                    <div className="flex items-center border border-sphere-border">
                      <button
                        onClick={() => updateQuantity(item.variantSku, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="p-1.5 px-3 text-sphere-charcoal hover:bg-sphere-ivory disabled:opacity-30 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-4 text-xs font-semibold text-sphere-ink">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variantSku, item.quantity + 1)}
                        disabled={item.quantity >= item.stockQuantity}
                        className="p-1.5 px-3 text-sphere-charcoal hover:bg-sphere-ivory disabled:opacity-30 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.variantSku)}
                      className="inline-flex items-center gap-1.5 text-xs text-sphere-muted hover:text-sphere-status-error transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-sphere-border p-6 sm:p-8 shadow-luxury sticky top-28 space-y-6">
            <h2 className="font-editorial text-2xl text-sphere-ink font-normal border-b border-sphere-border pb-4">
              Summary
            </h2>

            <div className="space-y-3 text-xs text-sphere-charcoal">
              <div className="flex justify-between">
                <span className="text-sphere-muted uppercase tracking-wider">Subtotal</span>
                <span className="font-semibold text-sphere-ink">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sphere-muted uppercase tracking-wider">Estimated Shipping</span>
                <span className="font-semibold text-sphere-ink">
                  {shippingFee === 0 ? (
                    <span className="text-sphere-sage uppercase font-bold">Complimentary</span>
                  ) : (
                    `₹${shippingFee.toLocaleString('en-IN')}`
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sphere-muted uppercase tracking-wider">Estimated Tax</span>
                <span className="text-sphere-muted italic">Included</span>
              </div>

              <div className="pt-4 border-t border-sphere-border flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-luxury font-bold text-sphere-ink">
                  Total
                </span>
                <span className="font-editorial text-2xl text-sphere-ink font-normal">
                  ₹{estimatedTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              onClick={handleProceedToCheckout}
              className="w-full py-4 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all flex items-center justify-center gap-2 group shadow-luxury"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-2 text-[11px] text-sphere-muted text-center space-y-1">
              <p>🔒 256-Bit SSL Encrypted Checkout via Razorpay</p>
              <p>Complimentary alterations and 14-day boutique returns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
