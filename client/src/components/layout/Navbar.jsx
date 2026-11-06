import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User, Menu, X, ArrowRight, LogOut, MapPin } from 'lucide-react';
import HealthStatusBadge from '../common/HealthStatusBadge';
import SearchAutocomplete from './SearchAutocomplete';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useCartDrawerStore } from '../../store/useCartDrawerStore';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems: cartCount } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const openCartDrawer = useCartDrawerStore((state) => state.openCartDrawer);
  const navigate = useNavigate();

  const navLinks = [
    { label: 'MEN', href: '/shop?gender=men' },
    { label: 'WOMEN', href: '/shop?gender=women' },
    { label: 'KIDS', href: '/shop?gender=kids' },
    { label: 'COLLECTIONS', href: '/shop' },
    { label: 'NEW ARRIVALS', href: '/shop?sort=newest' },
    { label: 'SALE', href: '/shop?sale=true' }
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

  return (
    <header className="sticky top-0 z-40 bg-sphere-ivory/95 backdrop-blur-md border-b border-sphere-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left: Mobile Menu Button & Primary Desktop Navigation */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-sphere-ink hover:text-sphere-sand transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <nav className="hidden lg:flex items-center gap-7 text-[12px] font-medium tracking-[0.12em] text-sphere-charcoal">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="hover:text-sphere-ink transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-sphere-ink hover:after:w-full after:transition-all after:duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center: Brand Identity Logo */}
          <div className="text-center">
            <Link to="/" className="inline-block group">
              <span className="font-editorial text-2xl sm:text-3xl font-normal tracking-[0.2em] text-sphere-ink block group-hover:opacity-80 transition-opacity">
                SHOPSPHERE
              </span>
              <span className="text-[9px] tracking-[0.35em] text-sphere-muted uppercase block -mt-1 font-sans">
                Haute & Prêt-à-Porter
              </span>
            </Link>
          </div>

          {/* Right: Actions, Health Badge & Cart */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live API Health Monitor Pill */}
            <div className="hidden sm:block">
              <HealthStatusBadge />
            </div>

            {/* Search Trigger & Autocomplete Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-2 transition-colors ${
                  searchOpen ? 'text-sphere-ink bg-black/5 rounded-full' : 'text-sphere-ink hover:text-sphere-sand'
                }`}
                aria-label="Search Collection"
              >
                <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              <SearchAutocomplete
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
              />
            </div>

            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              className="p-2 text-sphere-ink hover:text-sphere-sand transition-colors relative hidden sm:inline-block"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-sphere-status-error text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Admin Portal Shortcut if Admin */}
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-[#161513] text-[#FDFBF7] text-[10px] font-semibold tracking-widest uppercase rounded-xs hover:bg-[#34302C] transition-colors"
              >
                <span>Admin</span>
              </Link>
            )}

            {/* Account Link */}
            <Link
              to={isAuthenticated ? '/account/profile' : '/login'}
              className="p-2 text-sphere-ink hover:text-sphere-sand transition-colors relative"
              aria-label={isAuthenticated ? 'Account Profile' : 'Account Login'}
              title={isAuthenticated ? `Signed in as ${user?.name}` : 'Sign In'}
            >
              {isAuthenticated ? (
                <span className="w-6 h-6 rounded-full bg-sphere-sand-light text-sphere-ink text-[11px] font-editorial flex items-center justify-center font-bold border border-sphere-sand/40">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              ) : (
                <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </Link>

            {/* Shopping Cart Trigger */}
            <button
              onClick={openCartDrawer}
              className="p-2 text-sphere-ink hover:text-sphere-sand transition-colors relative group"
              aria-label="Shopping Bag"
            >
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="text-[11px] font-semibold tracking-wider text-sphere-ink group-hover:text-sphere-sand hidden md:inline">
                  BAG
                </span>
                <span className="w-4 h-4 bg-sphere-ink text-sphere-ivory text-[10px] rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-sphere-border bg-sphere-ivory px-6 py-6 space-y-4 animate-fadeIn">
          <div className="mb-4 pb-3 border-b border-sphere-border flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-sphere-muted">Gateway Status:</span>
            <HealthStatusBadge />
          </div>

          {/* Mobile Search Autocomplete */}
          <SearchAutocomplete
            isOpen={true}
            isMobile={true}
            onClose={() => setMobileMenuOpen(false)}
          />
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="flex items-center justify-between py-2 text-sm font-medium tracking-widest text-sphere-ink hover:text-sphere-sand border-b border-sphere-border/50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>{link.label}</span>
              <ArrowRight className="w-4 h-4 text-sphere-sand" />
            </Link>
          ))}

          {/* Customer Account & Shopping Links */}
          <div className="pt-2 border-t border-sphere-border space-y-2">
            <Link
              to="/wishlist"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-sphere-charcoal"
            >
              <span className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-sphere-sand" />
                <span>Wishlist</span>
              </span>
              <span className="text-sphere-muted">({wishlistCount})</span>
            </Link>

            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-sphere-charcoal"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-sphere-sand" />
                <span>Shopping Bag</span>
              </span>
              <span className="text-sphere-muted">({cartCount})</span>
            </Link>

            {isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-amber-900 font-semibold bg-amber-50 px-2 rounded-xs border border-amber-200"
                  >
                    <span>Executive Admin Portal</span>
                    <span>→</span>
                  </Link>
                )}

                <Link
                  to="/account/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-sphere-charcoal"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-sphere-sand" />
                    <span>My Profile</span>
                  </span>
                  <span className="text-sphere-muted">→</span>
                </Link>

                <Link
                  to="/account/addresses"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-xs uppercase tracking-wider text-sphere-charcoal"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sphere-sand" />
                    <span>Address Book</span>
                  </span>
                  <span className="text-sphere-muted">→</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full mt-2 py-2.5 text-center text-xs uppercase tracking-luxury text-sphere-status-error border border-sphere-status-error/40 hover:bg-sphere-status-error/10 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="pt-4 flex flex-col gap-2 text-xs tracking-wider">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center bg-sphere-ink text-sphere-ivory uppercase font-medium rounded-sm"
                >
                  Sign In to Atelier
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-center text-sphere-muted hover:text-sphere-ink uppercase"
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
