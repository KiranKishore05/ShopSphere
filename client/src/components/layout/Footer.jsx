import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Truck, RotateCcw, Clock } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-sphere-cream border-t border-sphere-border text-sphere-charcoal mt-24">
      {/* Brand Value Pillars */}
      <div className="border-b border-sphere-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-sphere-ivory border border-sphere-border flex items-center justify-center shrink-0 text-sphere-sand-dark">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-widest text-sphere-ink">Insured Global Transit</h4>
                <p className="text-xs text-sphere-muted mt-1 leading-relaxed">Complimentary courier on orders over ₹1,999. Climate-conscious packing.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-sphere-ivory border border-sphere-border flex items-center justify-center shrink-0 text-sphere-sand-dark">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-widest text-sphere-ink">14-Day Concierge Returns</h4>
                <p className="text-xs text-sphere-muted mt-1 leading-relaxed">Effortless domestic returns and complimentary size exchanges.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-sphere-ivory border border-sphere-border flex items-center justify-center shrink-0 text-sphere-sand-dark">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-widest text-sphere-ink">Cryptographic Razorpay</h4>
                <p className="text-xs text-sphere-muted mt-1 leading-relaxed">256-bit encrypted card, UPI, Netbanking, and Cash on Delivery.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-sphere-ivory border border-sphere-border flex items-center justify-center shrink-0 text-sphere-sand-dark">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-widest text-sphere-ink">Atelier Craftsmanship</h4>
                <p className="text-xs text-sphere-muted mt-1 leading-relaxed">Precision cut garments tailored in limited, non-mass produced editions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          
          {/* Brand Manifesto */}
          <div className="lg:col-span-2 space-y-4">
            <span className="font-editorial text-2xl font-normal tracking-[0.2em] text-sphere-ink block">
              SHOPSPHERE
            </span>
            <p className="text-xs text-sphere-charcoal leading-relaxed max-w-sm">
              An architectural exploration of contemporary silhouette and tactile luxury. Each garment is engineered from responsibly sourced fibers, uniting heritage tailoring with modern ease.
            </p>
            <div className="pt-2 text-[11px] text-sphere-muted">
              <span>Atelier Flagship: Mumbai • New Delhi • London</span>
            </div>
          </div>

          {/* Collections */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sphere-ink mb-4">Collections</h4>
            <ul className="space-y-2.5 text-xs text-sphere-charcoal">
              <li><Link to="/shop?gender=women" className="hover:text-sphere-ink transition-colors">Women's Collection</Link></li>
              <li><Link to="/shop?gender=men" className="hover:text-sphere-ink transition-colors">Men's Wardrobe</Link></li>
              <li><Link to="/category/outerwear" className="hover:text-sphere-ink transition-colors">Tailored Overcoats</Link></li>
              <li><Link to="/category/knitwear" className="hover:text-sphere-ink transition-colors">Pure Cashmere & Knitwear</Link></li>
              <li><Link to="/category/accessories" className="hover:text-sphere-ink transition-colors">Minimal Leather Goods</Link></li>
            </ul>
          </div>

          {/* Client Concierge */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sphere-ink mb-4">Client Concierge</h4>
            <ul className="space-y-2.5 text-xs text-sphere-charcoal">
              <li><Link to="/account/orders" className="hover:text-sphere-ink transition-colors">Track Order Status</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-sphere-ink transition-colors">Shipping & Delivery</Link></li>
              <li><Link to="/returns-policy" className="hover:text-sphere-ink transition-colors">Returns & Exchanges</Link></li>
              <li><Link to="/contact" className="hover:text-sphere-ink transition-colors">Customer Care Atelier</Link></li>
              <li><Link to="/admin" className="hover:text-sphere-ink transition-colors font-medium text-sphere-sand-dark">Staff Operations Portal</Link></li>
            </ul>
          </div>

          {/* Private Gazette / Newsletter */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sphere-ink mb-4">The Private Gazette</h4>
            <p className="text-xs text-sphere-muted mb-4 leading-relaxed">
              Receive private invitations to seasonal archives and editorial lookbooks.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>You are on the Atelier guestlist.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-sphere-ivory border border-sphere-border text-xs px-3 py-2.5 rounded-sm text-sphere-ink placeholder-sphere-muted focus:border-sphere-ink focus:outline-none pr-9"
                  />
                  <button
                    type="submit"
                    aria-label="Submit email"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sphere-charcoal hover:text-sphere-ink"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-sphere-muted">We respect your privacy. Unsubscribe anytime.</p>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Legal Bar */}
        <div className="pt-12 mt-12 border-t border-sphere-border flex flex-col sm:flex-row items-center justify-between text-[11px] text-sphere-muted gap-4">
          <div>
            <span>© 2026 ShopSphere Fashion Retail Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-sphere-ink transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-sphere-ink transition-colors">Terms of Service</Link>
            <span className="text-sphere-sand">•</span>
            <span>Currency: INR (₹)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
