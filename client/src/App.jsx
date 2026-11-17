import React, { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AnnouncementBar from './components/layout/AnnouncementBar';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartDrawer from './components/cart/CartDrawer';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import CategoryPage from './pages/CategoryPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';

// Admin Shell & Route Guard
import AdminRoute from './components/common/AdminRoute';
import AdminLayout from './components/admin/AdminLayout';

// Lazy-Loaded Admin Routes (Code Splitting)
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminProductsPage = React.lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminProductFormPage = React.lazy(() => import('./pages/admin/AdminProductFormPage'));
const AdminCategoriesPage = React.lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminInventoryPage = React.lazy(() => import('./pages/admin/AdminInventoryPage'));
const AdminOrdersPage = React.lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = React.lazy(() => import('./pages/admin/AdminOrderDetailPage'));
const AdminCustomersPage = React.lazy(() => import('./pages/admin/AdminCustomersPage'));
const AdminCustomerDetailPage = React.lazy(() => import('./pages/admin/AdminCustomerDetailPage'));
const AdminCouponsPage = React.lazy(() => import('./pages/admin/AdminCouponsPage'));
const AdminReviewsPage = React.lazy(() => import('./pages/admin/AdminReviewsPage'));
const AdminAnalyticsPage = React.lazy(() => import('./pages/admin/AdminAnalyticsPage'));

// Lazy-Loaded Checkout & Customer Account Routes
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = React.lazy(() => import('./pages/OrderConfirmationPage'));
const OrdersPage = React.lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = React.lazy(() => import('./pages/OrderDetailPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AddressesPage = React.lazy(() => import('./pages/AddressesPage'));

function AtelierLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-12">
      <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
      <span className="text-xs uppercase tracking-widest font-semibold text-sphere-muted">
        Curating Atelier Experience...
      </span>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  if (isAdminPath) {
    return (
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="products"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminProductsPage />
              </Suspense>
            }
          />
          <Route
            path="products/new"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminProductFormPage />
              </Suspense>
            }
          />
          <Route
            path="products/:id/edit"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminProductFormPage />
              </Suspense>
            }
          />
          <Route
            path="categories"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminCategoriesPage />
              </Suspense>
            }
          />
          <Route
            path="inventory"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminInventoryPage />
              </Suspense>
            }
          />
          <Route
            path="orders"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminOrdersPage />
              </Suspense>
            }
          />
          <Route
            path="orders/:id"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminOrderDetailPage />
              </Suspense>
            }
          />
          <Route
            path="customers"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminCustomersPage />
              </Suspense>
            }
          />
          <Route
            path="customers/:id"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminCustomerDetailPage />
              </Suspense>
            }
          />
          <Route
            path="coupons"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminCouponsPage />
              </Suspense>
            }
          />
          <Route
            path="reviews"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminReviewsPage />
              </Suspense>
            }
          />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<AtelierLoadingFallback />}>
                <AdminAnalyticsPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sphere-ivory text-sphere-ink font-sans selection:bg-sphere-sand-light selection:text-sphere-ink">
      <AnnouncementBar />
      <Navbar />

      {/* Cart Drawer Slide-over */}
      <CartDrawer />

      <main className="flex-1">
        <Suspense fallback={<AtelierLoadingFallback />}>
          <Routes>
            {/* Public Catalog Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Customer Shopping Routes */}
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />

            {/* Protected Customer Checkout Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
            </Route>

            {/* Protected Customer Account Routes */}
            <Route path="/account" element={<ProtectedRoute />}>
              <Route path="profile" element={<ProfilePage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderNumber" element={<OrderDetailPage />} />
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
