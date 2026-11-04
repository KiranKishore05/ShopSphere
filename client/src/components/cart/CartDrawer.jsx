import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useCartDrawerStore } from '../../store/useCartDrawerStore';

export default function CartDrawer() {
  const { isOpen, closeCartDrawer } = useCartDrawerStore();
  const { items, subtotal, totalItems, isEligibleForFreeShipping, freeShippingThreshold, updateQuantity, removeItem, isLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeCartDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCartDrawer]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const handleCheckout = () => {
    closeCartDrawer();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={closeCartDrawer}
        className="fixed inset-0 bg-sphere-ink/40 backdrop-blur-sm transition-opacity animate-fadeIn"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-sphere-border shadow-2xl flex flex-col animate-slideLeft">
          {/* Header */}
          <div className="p-6 border-b border-sphere-border flex items-center justify-between bg-sphere-ivory/60">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-sphere-ink" />
              <h2 className="font-editorial text-xl text-sphere-ink font-normal tracking-wide">
                Shopping Bag
              </h2>
              <span className="text-xs text-sphere-muted font-medium">({totalItems})</span>
            </div>
            <button
              onClick={closeCartDrawer}
              className="p-1.5 text-sphere-muted hover:text-sphere-ink transition-colors"
              aria-label="Close Shopping Bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Complimentary Shipping Progress Pill */}
          {items.length > 0 && (
            <div className="px-6 py-3 bg-sphere-sand-light/40 border-b border-sphere-border text-xs">
              {isEligibleForFreeShipping ? (
                <div className="flex items-center gap-2 text-sphere-sage font-medium">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Complimentary concierge delivery unlocked!</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-sphere-charcoal">
                    <span>
                      Add <strong className="text-sphere-ink">₹{amountNeededForFreeShipping.toLocaleString('en-IN')}</strong> for complimentary delivery
                    </span>
                    <span className="font-semibold">{freeShippingProgress}%</span>
                  </div>
                  <div className="w-full h-1 bg-sphere-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sphere-sand transition-all duration-300"
                      style={{ width: `${freeShippingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Items Content */}
          <div className="flex-1 overflow-y-auto p-6 divide-y divide-sphere-border">
            {isLoading ? (
              <div className="py-20 text-center text-xs uppercase tracking-widest text-sphere-muted">
                Refreshing Bag...
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-sphere-sand-light text-sphere-sand flex items-center justify-center mb-4">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="font-editorial text-2xl text-sphere-ink font-normal">
                  Your Bag is Empty
                </h3>
                <p className="mt-2 text-xs text-sphere-muted max-w-xs mx-auto">
                  Browse our high luxury garments and discover tailored pieces crafted for perfection.
                </p>
                <button
                  onClick={() => {
                    closeCartDrawer();
                    navigate('/shop');
                  }}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all"
                >
                  <span>Explore Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.variantSku} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                  {/* Item Image */}
                  <div className="w-20 h-26 shrink-0 bg-sphere-sand-light overflow-hidden border border-sphere-border">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80'}
                      alt={item.productName}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <Link
                          to={`/products/${item.productSlug}`}
                          onClick={closeCartDrawer}
                          className="font-editorial text-sm text-sphere-ink hover:text-sphere-sand transition-colors line-clamp-1"
                        >
                          {item.productName}
                        </Link>
                        <button
                          onClick={() => removeItem(item.variantSku)}
                          className="text-sphere-muted hover:text-sphere-status-error transition-colors p-0.5"
                          aria-label={`Remove ${item.productName} from bag`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-sphere-muted mt-0.5">
                        {item.brand}
                      </p>

                      {/* Variant Specs */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-sphere-charcoal">
                        <span>Size: <strong className="text-sphere-ink">{item.size}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <span>Colour:</span>
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-sphere-border inline-block"
                            style={{ backgroundColor: item.color?.hexCode || '#000000' }}
                          />
                          <strong className="text-sphere-ink">{item.color?.name}</strong>
                        </span>
                      </div>

                      {/* Warnings */}
                      {item.warning && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-sphere-status-error">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{item.warning}</span>
                        </div>
                      )}
                    </div>

                    {/* Stepper & Price */}
                    <div className="mt-3 flex items-center justify-between">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-sphere-border">
                        <button
                          onClick={() => updateQuantity(item.variantSku, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="p-1 px-2 text-sphere-charcoal hover:bg-sphere-ivory disabled:opacity-30 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-semibold text-sphere-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.variantSku, item.quantity + 1)}
                          disabled={item.quantity >= item.stockQuantity}
                          className="p-1 px-2 text-sphere-charcoal hover:bg-sphere-ivory disabled:opacity-30 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price Display */}
                      <div className="text-right">
                        <span className="text-xs font-editorial text-sphere-ink font-semibold">
                          ₹{item.itemTotal.toLocaleString('en-IN')}
                        </span>
                        {item.quantity > 1 && (
                          <span className="block text-[10px] text-sphere-muted">
                            ₹{item.price.toLocaleString('en-IN')} each
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Subtotal & Action */}
          {items.length > 0 && (
            <div className="p-6 border-t border-sphere-border bg-sphere-ivory/60 space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-widest text-sphere-muted font-medium">
                  Subtotal
                </span>
                <span className="font-editorial text-2xl text-sphere-ink font-normal">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-sphere-muted">
                Taxes, gift packaging, and concierge shipping calculated during checkout.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    closeCartDrawer();
                    navigate('/cart');
                  }}
                  className="w-full py-3 border border-sphere-ink text-sphere-ink text-xs uppercase tracking-luxury font-medium hover:bg-white transition-colors text-center"
                >
                  View Full Bag
                </button>
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
