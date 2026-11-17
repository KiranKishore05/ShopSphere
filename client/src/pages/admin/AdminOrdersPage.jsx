import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  RotateCcw
} from 'lucide-react';
import { useAdminOrders } from '../../hooks/useAdmin';

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [dateRange, setDateRange] = useState('all');

  // Compute startDate based on dateRange selection
  const { startDate, endDate } = useMemo(() => {
    if (dateRange === 'all') return { startDate: undefined, endDate: undefined };
    const now = new Date();
    const end = now.toISOString();
    let start;

    if (dateRange === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      start = d.toISOString();
    } else if (dateRange === '7days') {
      const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      start = d.toISOString();
    } else if (dateRange === '30days') {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      start = d.toISOString();
    }
    return { startDate: start, endDate: end };
  }, [dateRange]);

  const {
    data: ordersData,
    isLoading,
    isError,
    error,
    refetch
  } = useAdminOrders({
    page,
    limit: 15,
    search: search ? search.trim() : undefined,
    orderStatus: orderStatus || undefined,
    paymentStatus: paymentStatus || undefined,
    paymentMethod: paymentMethod || undefined,
    startDate,
    endDate
  });

  // Resilient data unwrapping
  const orders = useMemo(() => {
    return Array.isArray(ordersData)
      ? ordersData
      : Array.isArray(ordersData?.orders)
      ? ordersData.orders
      : Array.isArray(ordersData?.data?.orders)
      ? ordersData.data.orders
      : [];
  }, [ordersData]);

  const meta = useMemo(() => {
    return (
      ordersData?.meta ||
      ordersData?.data?.meta || {
        page: 1,
        limit: 15,
        total: orders.length,
        totalPages: 1
      }
    );
  }, [ordersData, orders.length]);

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

  // Quick summary statistics
  const stats = useMemo(() => {
    const totalCount = meta.total || orders.length;
    const processingCount = orders.filter((o) => ['confirmed', 'processing'].includes(o.orderStatus)).length;
    const inTransitCount = orders.filter((o) => o.orderStatus === 'shipped').length;
    const deliveredVolume = orders
      .filter((o) => o.orderStatus === 'delivered')
      .reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    return { totalCount, processingCount, inTransitCount, deliveredVolume };
  }, [orders, meta.total]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3" />
            <span>Delivered</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-blue-100 text-blue-800">
            <Truck className="w-3 h-3" />
            <span>Shipped</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-amber-100 text-amber-800">
            <Package className="w-3 h-3" />
            <span>Processing</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-purple-100 text-purple-800">
            <Clock className="w-3 h-3" />
            <span>Confirmed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      case 'return_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-orange-100 text-orange-800">
            <RotateCcw className="w-3 h-3" />
            <span>Return Requested</span>
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-stone-200 text-stone-800">
            <RotateCcw className="w-3 h-3" />
            <span>Returned</span>
          </span>
        );
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-zinc-100 text-zinc-700">
            <Clock className="w-3 h-3" />
            <span>Pending Payment</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-zinc-100 text-zinc-800">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-red-50 text-red-700 border border-red-200">
            Failed
          </span>
        );
      case 'refunded':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-stone-100 text-stone-700 border border-stone-200">
            Refunded
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-xs bg-zinc-50 text-zinc-700">
            {status}
          </span>
        );
    }
  };

  const resetFilters = () => {
    setSearch('');
    setOrderStatus('');
    setPaymentStatus('');
    setPaymentMethod('');
    setDateRange('all');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-sphere-ink tracking-tight">
            Order Fulfillment Queue
          </h1>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Oversee acquisition lifecycle, courier tracking, client destinations, and settlement states.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#EAE5DA] rounded-sm text-xs text-[#635E56] hover:text-sphere-ink hover:bg-white bg-[#FAF8F5] transition-colors"
          title="Refresh Orders"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#827E77] block">Total Orders</span>
          <p className="font-editorial text-2xl text-sphere-ink mt-1">{stats.totalCount}</p>
        </div>
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-purple-700 block">Awaiting Dispatch</span>
          <p className="font-editorial text-2xl text-purple-800 mt-1">{stats.processingCount}</p>
        </div>
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-blue-700 block">Out for Delivery</span>
          <p className="font-editorial text-2xl text-blue-800 mt-1">{stats.inTransitCount}</p>
        </div>
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-700 block">Delivered Volume</span>
          <p className="font-editorial text-2xl text-emerald-800 mt-1">{formatPrice(stats.deliveredVolume)}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#827E77] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order number (SPH-...), client name, email, or telephone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
            />
          </div>

          {/* Fulfillment Status Filter */}
          <select
            value={orderStatus}
            onChange={(e) => {
              setOrderStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
          >
            <option value="">All Fulfillment States</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped / Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="return_requested">Return Requested</option>
            <option value="returned">Returned</option>
            <option value="pending_payment">Pending Payment</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
          >
            <option value="">All Payment States</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#F2EFE9]">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Payment Method Filter */}
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
            >
              <option value="">All Payment Channels</option>
              <option value="razorpay">Razorpay Online</option>
              <option value="cod">Cash on Delivery (COD)</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {(search || orderStatus || paymentStatus || paymentMethod || dateRange !== 'all') && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#827E77] hover:text-sphere-ink underline self-start sm:self-auto font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#827E77] uppercase font-semibold">Pulling Order Manifests...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto mb-3 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">Unable to Load Orders</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-4">
              {error?.message || 'A network error or database readiness issue prevented loading orders.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShoppingBag className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">No Orders Found</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-4">
              There are no orders matching the specified filter criteria.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-white rounded-sm"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-3 px-4 font-semibold">Order Reference</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Client Name & Email</th>
                  <th className="py-3 px-4 font-semibold">Channel</th>
                  <th className="py-3 px-4 font-semibold">Gross Total</th>
                  <th className="py-3 px-4 font-semibold">Payment</th>
                  <th className="py-3 px-4 font-semibold">Fulfillment</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {orders.map((order) => {
                  const clientName =
                    order.shippingAddressSnapshot?.fullName ||
                    order.shippingAddress?.fullName ||
                    order.userId?.name ||
                    'Valued Patron';
                  const clientEmail = order.userId?.email || 'Guest Client';
                  const itemsCount = order.items?.length || 0;
                  const totalFormatted = formatPrice(order.total ?? order.totalAmount ?? 0);

                  return (
                    <tr key={order._id} className="hover:bg-[#FCFAF7] transition-colors">
                      {/* Order Number */}
                      <td className="py-3 px-4 font-mono font-semibold text-xs text-sphere-ink">
                        <Link to={`/admin/orders/${order._id}`} className="hover:underline">
                          {order.orderNumber}
                        </Link>
                        <span className="block text-[10px] text-[#827E77] font-sans font-normal">
                          {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                        </span>
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
                        <div className="font-semibold text-xs text-sphere-ink">{clientName}</div>
                        <div className="text-[11px] text-[#827E77] font-mono">{clientEmail}</div>
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#635E56]">
                          {order.paymentMethod === 'cod' ? (
                            <>
                              <Banknote className="w-3.5 h-3.5 text-amber-700" />
                              <span>COD</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                              <span>Razorpay</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 font-semibold text-xs text-sphere-ink">
                        {totalFormatted}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4">{getPaymentBadge(order.paymentStatus)}</td>

                      {/* Order Status */}
                      <td className="py-3 px-4">{getStatusBadge(order.orderStatus)}</td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-sphere-ink hover:text-sphere-sand"
                        >
                          <span>Dossier</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
