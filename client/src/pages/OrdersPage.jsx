import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Clock, AlertCircle, ShoppingBag, Eye } from 'lucide-react';
import { useMyOrders } from '../hooks/useOrders';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useMyOrders({ page, limit: 10 });

  const orders = data?.orders || [];
  const meta = data?.meta || { page: 1, totalPages: 1 };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="w-10 h-10 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mx-auto mb-4" />
        <p className="font-editorial text-lg text-sphere-ink">Retrieving your order archives...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs inline-flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{error?.message || 'Failed to load order history.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
      {/* Page Title */}
      <div className="border-b border-sphere-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink font-normal">
            Order Archives
          </h1>
          <p className="text-xs text-sphere-muted mt-1">
            Review your historical commissions, tailored acquisitions, and delivery status.
          </p>
        </div>
        <div className="text-xs text-sphere-muted font-medium">
          {meta.total || orders.length} {(meta.total || orders.length) === 1 ? 'Acquisition' : 'Acquisitions'}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white border border-sphere-border shadow-sm p-8">
          <ShoppingBag className="w-12 h-12 text-sphere-sand mx-auto mb-4" />
          <h2 className="font-editorial text-2xl text-sphere-ink mb-2">No Past Orders Found</h2>
          <p className="text-xs text-sphere-muted max-w-sm mx-auto mb-6">
            You have not placed any orders yet. Discover our latest seasonal designs and elevate your wardrobe.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all shadow-luxury"
          >
            <span>Explore Boutique</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isPaid = order.paymentStatus === 'paid';
            return (
              <div
                key={order._id}
                className="bg-white border border-sphere-border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 bg-sphere-ivory/60 border-b border-sphere-border flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div>
                      <span className="text-sphere-muted block text-[10px] uppercase tracking-wider">Order Reference</span>
                      <span className="font-mono font-semibold text-sphere-ink">{order.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-sphere-muted block text-[10px] uppercase tracking-wider">Date Placed</span>
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="text-sphere-muted block text-[10px] uppercase tracking-wider">Total Amount</span>
                      <span className="font-medium text-sphere-ink">₹{order.total?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-medium border ${
                        order.orderStatus === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : order.orderStatus === 'cancelled'
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {order.orderStatus.replace('_', ' ')}
                    </span>
                    <Link
                      to={`/account/orders/${order.orderNumber}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-sphere-ink text-sphere-ink hover:bg-sphere-ink hover:text-sphere-ivory text-xs uppercase tracking-luxury font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </Link>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="p-4 sm:p-5">
                  <div className="divide-y divide-sphere-border/60">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-center gap-4 first:pt-0 last:pb-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-16 object-cover bg-sphere-sand-light shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-sphere-ink truncate">{item.name}</h4>
                          <p className="text-[11px] text-sphere-muted mt-0.5">
                            Size: {item.size} • Qty: {item.quantity} • Unit: ₹{item.unitPrice?.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-sphere-ink">
                            ₹{item.lineTotal?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Footer Details */}
                <div className="px-5 py-3 bg-sphere-sand-light/10 border-t border-sphere-border flex flex-wrap items-center justify-between text-[11px] text-sphere-muted">
                  <span>
                    Delivering to: <strong className="text-sphere-charcoal">{order.shippingAddressSnapshot?.city}, {order.shippingAddressSnapshot?.state}</strong>
                  </span>
                  <span>
                    Payment: <strong className="text-sphere-charcoal uppercase">{order.paymentMethod}</strong> ({order.paymentStatus})
                  </span>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 border border-sphere-border text-xs text-sphere-ink disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-sphere-muted">
                Page {page} of {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="px-4 py-2 border border-sphere-border text-xs text-sphere-ink disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
