import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User, Menu, X, ArrowRight, LogOut, MapPin, Package } from 'lucide-react';
import SearchAutocomplete from './SearchAutocomplete';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useCartDrawerStore } from '../../store/useCartDrawerStore';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems: cartCount } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const openCartDrawer = useCartDrawerStore((state) => state.openCartDrawer);
  const navigate = useNavigate();

  const navLinks = [
    { label: 'Men', href: '/shop?gender=men' },
    { label: 'Women', href: '/shop?gender=women' },
    { label: 'Kids', href: '/shop?gender=kids' },
    { label: 'Collections', href: '/shop' },
    { label: 'New Arrivals', href: '/shop?sort=newest' },
    { label: 'Sale', href: '/shop?sale=true' }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setMobileMenuOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleInlineSearchSubmit = (e) => {
    e.preventDefault();
    if (navSearchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(navSearchQuery.trim())}`);
      setNavSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#EAE5DA] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-4">
          
          {/* Left: Mobile Toggle & Brand Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#161513] hover:text-[#827E77] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-[#161513] text-[#FDFBF7] flex items-center justify-center shrink-0 shadow-xs group-hover:bg-[#34302C] transition-colors">
                <ShoppingBag className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-[#161513] leading-none">
                  ShopSphere
                </span>
                <span className="text-[9px] tracking-wider text-[#827E77] font-medium hidden sm:block mt-0.5">
                  A Premium Fashion E-Commerce Brand
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-[#4B4843]">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`transition-colors relative py-1 ${
                  link.label === 'Sale' 
                    ? 'text-rose-700 font-semibold hover:text-rose-900' 
                    : 'hover:text-[#161513]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: Embedded Search, User, Wishlist, Cart */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Inline Desktop Search Pill */}
            <div className="relative hidden md:block">
              <form
                onSubmit={handleInlineSearchSubmit}
                className="flex items-center bg-[#F7F4EC] border border-[#EAE5DA] rounded-full px-3.5 py-1.5 w-56 lg:w-68 focus-within:bg-white focus-within:border-[#161513] transition-all text-xs"
              >
                <Search className="w-3.5 h-3.5 text-[#827E77] mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search for products, categories..."
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  className="bg-transparent border-none outline-none w-full text-xs text-[#161513] placeholder-[#827E77] focus:ring-0"
                />
              </form>

              {/* Search Suggestions Dropdown Overlay */}
              <SearchAutocomplete
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
              />
            </div>

            {/* Mobile Search Icon Button */}
            <div className="md:hidden relative">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-[#161513] hover:text-[#827E77] transition-colors"
                aria-label="Search Products"
              >
                <Search className="w-5 h-5" />
              </button>
              {searchOpen && (
                <SearchAutocomplete
                  isOpen={searchOpen}
                  onClose={() => setSearchOpen(false)}
                />
              )}
            </div>

            {/* User Account Link */}
            <Link
              to={isAuthenticated ? '/account/profile' : '/login'}
              className="p-2 text-[#161513] hover:text-[#827E77] transition-colors relative"
              aria-label={isAuthenticated ? 'Account Profile' : 'Account Login'}
              title={isAuthenticated ? `Signed in as ${user?.name}` : 'Sign In'}
            >
              {isAuthenticated ? (
                <span className="w-7 h-7 rounded-full bg-[#E6D7C3] text-[#161513] text-xs font-semibold flex items-center justify-center border border-[#C8B293]">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              ) : (
                <User className="w-5 h-5" />
              )}
            </Link>

            {/* Wishlist Link with Heart Badge */}
            <Link
              to="/wishlist"
              className="p-2 text-[#161513] hover:text-[#827E77] transition-colors relative"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-[#BA4343] text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Shopping Cart Button with Red Count Badge */}
            <button
              onClick={openCartDrawer}
              className="p-2 text-[#161513] hover:text-[#827E77] transition-colors relative"
              aria-label="Shopping Cart"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-[#BA4343] text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-xs">
                  {cartCount}
                </span>
              ) : (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-[#161513] text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-xs">
                  0
                </span>
              )}
            </button>

            {/* Admin Portal Shortcut if user is Admin */}
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 bg-[#161513] text-[#FDFBF7] text-[10px] font-semibold tracking-wider uppercase rounded hover:bg-[#34302C] transition-colors ml-1"
              >
                Admin
              </Link>
            )}

          </div>

        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#EAE5DA] bg-[#FDFBF7] px-6 py-5 space-y-4 shadow-lg animate-fadeIn">
          {/* Mobile Search */}
          <SearchAutocomplete
            isOpen={true}
            isMobile={true}
            onClose={() => setMobileMenuOpen(false)}
          />

          {/* Navigation Links */}
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="flex items-center justify-between py-2.5 text-sm font-medium text-[#161513] hover:text-[#BA4343] border-b border-[#EAE5DA]/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{link.label}</span>
                <ArrowRight className="w-4 h-4 text-[#827E77]" />
              </Link>
            ))}
          </div>

          {/* Customer Account & Shopping Links */}
          <div className="pt-2 border-t border-[#EAE5DA] space-y-2">
            <Link
              to="/wishlist"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-[#4B4843]"
            >
              <span className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#BA4343]" />
                <span>Wishlist</span>
              </span>
              <span className="text-[#827E77]">({wishlistCount})</span>
            </Link>

            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-[#4B4843]"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#161513]" />
                <span>Shopping Cart</span>
              </span>
              <span className="text-[#827E77]">({cartCount})</span>
            </Link>

            {isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-amber-900 font-semibold bg-amber-50 px-2 rounded border border-amber-200"
                  >
                    <span>Admin Dashboard</span>
                    <span>→</span>
                  </Link>
                )}

                <Link
                  to="/account/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-[#4B4843]"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#827E77]" />
                    <span>My Profile</span>
                  </span>
                  <span className="text-[#827E77]">→</span>
                </Link>

                <Link
                  to="/account/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-[#4B4843]"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#827E77]" />
                    <span>My Orders</span>
                  </span>
                  <span className="text-[#827E77]">→</span>
                </Link>

                <Link
                  to="/account/addresses"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-[#4B4843]"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#827E77]" />
                    <span>Address Book</span>
                  </span>
                  <span className="text-[#827E77]">→</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full mt-2 py-2.5 text-center text-xs uppercase tracking-wider text-[#BA4343] border border-[#BA4343]/30 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 rounded"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="pt-3 flex flex-col gap-2 text-xs tracking-wider">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Sign In to Atelier"
                  className="py-2.5 text-center bg-[#161513] text-[#FDFBF7] uppercase font-medium rounded hover:bg-[#34302C] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-center text-[#827E77] hover:text-[#161513] uppercase font-medium"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
