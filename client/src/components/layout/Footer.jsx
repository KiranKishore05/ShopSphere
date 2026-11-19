import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

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
    <footer className="bg-[#F7F4EC] border-t border-[#EAE5DA] text-[#4B4843] mt-16">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-3">
            <Link to="/" className="flex items-center gap-2 group inline-block">
              <div className="w-8 h-8 rounded-lg bg-[#161513] text-[#FDFBF7] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-sans text-xl font-bold tracking-tight text-[#161513]">
                ShopSphere
              </span>
            </Link>
            <p className="text-xs text-[#4B4843] leading-relaxed max-w-sm">
              A Premium Fashion E-Commerce Brand for Men, Women, and Kids. Contemporary styling, quality fabrics, and seamless online shopping across India.
            </p>
            <div className="pt-1 text-xs text-[#827E77] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Premium Quality • Contemporary Indian Fashion</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#161513] mb-3">Shop Categories</h4>
            <ul className="space-y-2 text-xs text-[#4B4843]">
              <li><Link to="/shop?gender=men" className="hover:text-[#161513] transition-colors">Men's Fashion</Link></li>
              <li><Link to="/shop?gender=women" className="hover:text-[#161513] transition-colors">Women's Collection</Link></li>
              <li><Link to="/shop?gender=kids" className="hover:text-[#161513] transition-colors">Kids' Apparel</Link></li>
              <li><Link to="/shop?sort=newest" className="hover:text-[#161513] transition-colors">New Arrivals</Link></li>
              <li><Link to="/shop?sale=true" className="hover:text-rose-700 transition-colors font-medium">Sale & Offers</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#161513] mb-3">Customer Care</h4>
            <ul className="space-y-2 text-xs text-[#4B4843]">
              <li><Link to="/about" className="hover:text-[#161513] transition-colors">Our Story & Heritage</Link></li>
              <li><Link to="/account/orders" className="hover:text-[#161513] transition-colors">Track Order</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-[#161513] transition-colors">Shipping Policy</Link></li>
              <li><Link to="/returns-policy" className="hover:text-[#161513] transition-colors">Easy Returns & Exchanges</Link></li>
              <li><Link to="/contact" className="hover:text-[#161513] transition-colors">Contact Support</Link></li>
              <li><Link to="/admin" className="hover:text-[#161513] transition-colors text-[#827E77]">Admin Portal</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#161513] mb-3">Stay Updated</h4>
            <p className="text-xs text-[#827E77] mb-3 leading-relaxed">
              Subscribe for exclusive seasonal lookbooks, early sale access, and member updates.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Thank you for subscribing!</span>
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
                    className="w-full bg-white border border-[#EAE5DA] text-xs px-3 py-2 rounded text-[#161513] placeholder-[#827E77] focus:border-[#161513] focus:outline-none pr-9"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4B4843] hover:text-[#161513]"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-[#827E77]">We respect your privacy. Unsubscribe anytime.</p>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Legal Bar */}
        <div className="pt-8 mt-8 border-t border-[#EAE5DA] flex flex-col sm:flex-row items-center justify-between text-xs text-[#827E77] gap-4">
          <div>
            <span>© 2026 ShopSphere. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <Link to="/privacy" className="hover:text-[#161513] transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#161513] transition-colors">Terms of Service</Link>
            <Link to="/returns-policy" className="hover:text-[#161513] transition-colors">Return Policy</Link>
            <span className="text-[#C8B293]">•</span>
            <span className="font-medium text-[#4B4843]">Currency: INR (₹)</span>
            <span className="text-[#C8B293]">•</span>
            <span className="font-medium text-[#4B4843]">India First</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
