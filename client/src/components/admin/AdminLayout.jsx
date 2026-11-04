import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Shirt,
  FolderTree,
  Boxes,
  ShoppingBag,
  TicketPercent,
  BarChart3,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Plus,
  ShieldCheck,
  MessageSquare,
  Search,
  Bell,
  Mail,
  User
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topSearch, setTopSearch] = useState('');
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleTopSearchSubmit = (e) => {
    e.preventDefault();
    if (!topSearch.trim()) return;
    navigate(`/admin/products?search=${encodeURIComponent(topSearch.trim())}`);
  };

  const navItems = [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Garments', to: '/admin/products', icon: Shirt },
    { label: 'Categories', to: '/admin/categories', icon: FolderTree },
    { label: 'Inventory', to: '/admin/inventory', icon: Boxes },
    { label: 'Fulfillment', to: '/admin/orders', icon: ShoppingBag },
    { label: 'Coupons', to: '/admin/coupons', icon: TicketPercent },
    { label: 'Reviews', to: '/admin/reviews', icon: MessageSquare },
    { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 }
  ];

  const currentSection =
    navItems.find((item) =>
      item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )?.label || 'Overview';

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col md:flex-row text-sphere-ink font-sans antialiased selection:bg-[#EAE5DA]">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#161513] text-[#FDFBF7] border-b border-[#2C2925]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-[#2C2925] rounded transition-colors"
            aria-label="Toggle Navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-editorial text-lg tracking-widest uppercase">ShopSphere</span>
        </div>
        <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded bg-sphere-sand/20 text-sphere-sand font-mono border border-sphere-sand/30">
          Executive Admin
        </span>
      </div>

      {/* Sidebar Overlay on Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-50 md:z-20 h-screen w-64 bg-[#161513] text-[#FDFBF7] flex flex-col justify-between border-r border-[#2A2723] transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="p-6 border-b border-[#2A2723]">
            <Link to="/admin" className="block group">
              <span className="font-editorial text-2xl tracking-[0.2em] uppercase text-[#FDFBF7] group-hover:text-sphere-sand transition-colors block">
                SHOPSPHERE
              </span>
              <span className="text-[9px] tracking-[0.35em] uppercase text-[#8E877F] font-sans block mt-0.5">
                Atelier Administration
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-[#736E67] font-semibold">
              Management Modules
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs tracking-wider transition-colors font-medium ${
                    isActive
                      ? 'bg-sphere-sand text-[#161513] font-semibold shadow-sm'
                      : 'text-[#B8B2A9] hover:text-[#FDFBF7] hover:bg-[#23201C]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#161513]' : 'text-[#8E877F]'}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: User Badge & Actions */}
        <div className="p-4 border-t border-[#2A2723] space-y-3 bg-[#11100F]">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-sphere-sand/20 text-sphere-sand border border-sphere-sand/40 flex items-center justify-center font-editorial font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#FDFBF7] truncate">{user?.name || 'Administrator'}</p>
              <div className="flex items-center gap-1 text-[10px] text-sphere-sand font-mono">
                <ShieldCheck className="w-3 h-3" />
                <span>Executive Role</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#23201C] flex flex-col gap-1.5 text-xs">
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 text-[#9A938A] hover:text-[#FDFBF7] hover:bg-[#1E1B18] rounded-sm transition-colors"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Storefront</span>
              </span>
              <span className="text-[10px] text-[#736E67]">↗</span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-[#C95B5B] hover:text-[#E87575] hover:bg-[#251818] rounded-sm transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Operational Bar (Matching Image 1 & 2 design) */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-[#FFFFFF] border-b border-[#EAE5DA] sticky top-0 z-30 shadow-xs">
          {/* Left: Section Indicator Badge */}
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1 rounded-full bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider">
              {currentSection}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#827E77]">
              <Link to="/admin" className="hover:text-sphere-ink transition-colors font-medium">
                Atelier
              </Link>
              <span>/</span>
              <span className="text-sphere-ink font-semibold">
                {currentSection}
              </span>
            </div>
          </div>

          {/* Center: Search pill bar (Matching Image 1 & 2) */}
          <form onSubmit={handleTopSearchSubmit} className="relative w-80 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#827E77] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search catalogue, SKU, orders..."
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FAF8F5] border border-[#EAE5DA] rounded-full focus:bg-white focus:border-sphere-ink focus:outline-none transition-all placeholder:text-[#A8A29A]"
            />
          </form>

          {/* Right: Quick Action & Profile Badge */}
          <div className="flex items-center gap-4">
            <Link
              to="/admin/products/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Garment</span>
            </Link>

            <div className="h-4 w-[1px] bg-[#EAE5DA]" />

            {/* Notification & Message Icons (Image 1 & 2) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1.5 text-[#635E56] hover:text-sphere-ink rounded-full hover:bg-[#FAF8F5] transition-colors relative"
                title="Atelier Inquiries"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 text-[#635E56] hover:text-sphere-ink rounded-full hover:bg-[#FAF8F5] transition-colors relative"
                title="System Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="w-1.5 h-1.5 rounded-full bg-sphere-sand absolute top-1 right-1" />
              </button>
            </div>

            {/* Profile Avatar Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#EAE5DA]">
              <div className="w-7 h-7 rounded-full bg-[#161513] text-[#FDFBF7] flex items-center justify-center font-bold text-xs font-editorial">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-sphere-ink leading-tight">{user?.name || 'Admin'}</p>
                <span className="text-[10px] text-[#827E77] leading-none">Executive</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
