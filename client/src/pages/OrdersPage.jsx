import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Clock, AlertCircle, ShoppingBag, Eye } from 'lucide-react';
import { useMyOrders } from '../hooks/useOrders';
import SEO from '../components/common/SEO';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useMyOrders({ page, limit: 10 });

  const orders = data?.orders || [];
  const meta = data?.meta || { page: 1, totalPages: 1 };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="w-10 h-10 border-2 border-[#161513]/20 border-t-[#161513] rounded-full animate-spin mx-auto mb-4" />
        <p className="font-serif text-lg text-[#161513]">Retrieving your orders...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl inline-flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error?.message || 'Failed to load order history.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fadeIn">
      <SEO title="My Orders - Order Archives" description="View past orders and tracking on ShopSphere." />

      {/* Page Title */}
      <div className="border-b border-[#EAE5DA] pb-5 mb-8 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#161513]">
            Order Archives
          </h1>
          <p className="text-xs text-[#827E77] mt-1">
            Review your order history, delivery tracking, and purchase receipts.
          </p>
        </div>
        <div className="text-xs text-[#827E77] font-semibold">
          {meta.total || orders.length} {(meta.total || orders.length) === 1 ? 'Order' : 'Orders'} Placed
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 sm:py-20 bg-white border border-[#EAE5DA] rounded-2xl shadow-xs p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#F4EDE4] text-[#161513] flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-2xl text-[#161513] font-bold mb-2">No Past Orders Found</h2>
          <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-6">
            You have not placed any orders yet. Discover our latest seasonal fashion collections.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-[#34302C] transition-all shadow-xs"
          >
            <span>Explore Boutique</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            return (
              <div
                key={order._id}
                className="bg-white border border-[#EAE5DA] rounded-2xl shadow-xs hover:shadow-sm transition-shadow overflow-hidden"
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 bg-[#FBF9F5] border-b border-[#EAE5DA] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div>
                      <span className="text-[#827E77] block text-[10px] uppercase font-bold tracking-wider">Order Reference</span>
                      <span className="font-mono font-bold text-[#161513]">{order.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-[#827E77] block text-[10px] uppercase font-bold tracking-wider">Date Placed</span>
                      <span className="font-medium text-[#161513]">{new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="text-[#827E77] block text-[10px] uppercase font-bold tracking-wider">Total Amount</span>
                      <span className="font-bold text-[#161513]">₹{order.total?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 text-[11px] uppercase tracking-wider font-semibold rounded-lg border ${
                        order.orderStatus === 'confirmed' || order.orderStatus === 'delivered'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : order.orderStatus === 'cancelled'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {order.orderStatus}
                    </span>
                    <Link
                      to={`/account/orders/${order.orderNumber}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#161513] text-[#FDFBF7] text-xs font-semibold rounded-lg hover:bg-[#34302C] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </Link>
                  </div>
                </div>

                {/* Order Line Items */}
                <div className="p-4 sm:p-5 divide-y divide-[#F2ECE4]">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                      <div className="w-12 h-14 rounded-lg bg-[#FBF9F5] border border-[#EAE5DA] overflow-hidden flex items-center justify-center p-1 shrink-0">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'}
                          alt={item.name}
                          className="max-w-full max-h-full w-auto h-auto object-contain object-center"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-[#161513] truncate">{item.name}</h3>
                        <p className="text-[11px] text-[#827E77] mt-0.5">
                          Size: {item.size} • Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#161513]">
                          ₹{item.lineTotal?.toLocaleString('en-IN') || (item.unitPrice * item.quantity)?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
