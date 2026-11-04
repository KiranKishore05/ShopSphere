import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Filter,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle
} from 'lucide-react';
import { useAdminOrders } from '../../hooks/useAdmin';

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const { data: ordersData, isLoading, isError, refetch } = useAdminOrders({
    page,
    limit: 15,
    search: search || undefined,
    orderStatus: orderStatus || undefined,
    paymentStatus: paymentStatus || undefined
  });

  const orders = ordersData?.data?.orders || [];
  const meta = ordersData?.data?.meta || { page: 1, totalPages: 1, total: 0 };

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-emerald-100 text-emerald-800">Delivered</span>;
      case 'shipped':
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-blue-100 text-blue-800">Shipped</span>;
      case 'processing':
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-amber-100 text-amber-800">Processing</span>;
      case 'confirmed':
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-purple-100 text-purple-800">Confirmed</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-red-100 text-red-800">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-zinc-100 text-zinc-800">{status}</span>;
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>;
      case 'pending':
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case 'failed':
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-red-50 text-red-700 border border-red-200">Failed</span>;
      case 'refunded':
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-stone-100 text-stone-700 border border-stone-200">Refunded</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-zinc-50 text-zinc-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-sphere-ink tracking-tight">
            Order Fulfillment Queue
          </h1>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Oversee acquisition lifecycle, logistics dispatches, and status progressions.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 border border-[#EAE5DA] rounded-sm text-[#635E56] hover:text-sphere-ink bg-white self-start sm:self-auto"
          title="Refresh Orders"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#827E77] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order number (e.g. SPH-...), client name, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
          />
        </div>

        <select
          value={orderStatus}
          onChange={(e) => {
            setOrderStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
        >
          <option value="">All Fulfillment Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
        >
          <option value="">All Payment Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#827E77] uppercase font-semibold">Pulling Order Manifests...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShoppingBag className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">No Orders Found</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto">
              There are no orders matching the specified filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-3 px-4 font-semibold">Order Reference</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Client Name & Email</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold">Payment</th>
                  <th className="py-3 px-4 font-semibold">Fulfillment</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-[#FCFAF7] transition-colors">
                    {/* Order Number */}
                    <td className="py-3 px-4 font-mono font-semibold text-xs text-sphere-ink">
                      <Link to={`/admin/orders/${order._id}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[#827E77]">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Client */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-xs text-sphere-ink">
                        {order.shippingAddress?.fullName || 'Client'}
                      </div>
                      <div className="text-[11px] text-[#827E77]">
                        {order.userId?.email || 'Guest Client'}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-medium text-xs text-sphere-ink">
                      {formatPrice(order.totalAmount)}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3 px-4">
                      {getPaymentBadge(order.paymentStatus)}
                    </td>

                    {/* Order Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(order.orderStatus)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/admin/orders/${order._id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-sphere-ink hover:text-sphere-sand"
                      >
                        <span>Fulfill</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#EAE5DA] bg-[#FAF8F5] flex items-center justify-between text-xs text-[#827E77]">
            <span>
              Showing {orders.length} of {meta.total} orders (Page {meta.page} of {meta.totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 border border-[#EAE5DA] rounded-sm disabled:opacity-40 hover:bg-white text-sphere-ink"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 border border-[#EAE5DA] rounded-sm disabled:opacity-40 hover:bg-white text-sphere-ink"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
