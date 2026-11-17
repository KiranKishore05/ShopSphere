import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  TrendingUp,
  Users,
  Boxes,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  ArrowRight,
  RefreshCw,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { useAdminAnalytics } from '../../hooks/useAdmin';

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState('30d');
  const [chartView, setChartView] = useState('daily'); // 'daily' | 'monthly'
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  const { data: analytics, isLoading, isError, refetch } = useAdminAnalytics({ period });

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(d);
    } catch {
      return String(dateStr);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-4" />
        <p className="font-editorial text-lg text-sphere-ink">Compiling Atelier Performance Metrics...</p>
        <span className="text-xs text-sphere-muted mt-1">Aggregating live MongoDB orders, catalogue, and revenue</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-white border border-sphere-status-error/30 rounded-sm text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-sphere-status-error mx-auto mb-3" />
        <h2 className="font-editorial text-xl text-sphere-ink mb-2">Metrics Compilation Failed</h2>
        <p className="text-sm text-sphere-charcoal mb-4">
          Unable to aggregate executive financial analytics. Ensure database connections are active.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-wider rounded-sm hover:bg-sphere-charcoal transition-colors"
        >
          Retry Calculation
        </button>
      </div>
    );
  }

  const kpis = analytics?.kpis || analytics?.summary || {};
  const recentOrders = analytics?.recentOrders || [];
  const lowStockAlerts = analytics?.lowStockAlerts || [];
  const topProducts = analytics?.topProducts || [];
  const dailySales = analytics?.dailySales || analytics?.revenueByDay || [];
  const monthlySales = analytics?.monthlySales || analytics?.revenueByMonth || [];
  const statusBreakdown = analytics?.statusBreakdown || analytics?.orderStatusBreakdown || [];
  const paymentMethodStats = analytics?.paymentMethodStats || [];

  // Key metrics values with safe fallbacks
  const totalRevenue = kpis.totalRevenue ?? kpis.revenue ?? 0;
  const totalOrders = kpis.totalOrders ?? kpis.orders ?? 0;
  const totalCustomers = kpis.totalCustomers ?? kpis.customers ?? 0;
  const totalProducts = kpis.totalProducts ?? kpis.products ?? 0;
  const pendingOrders = kpis.pendingOrders ?? 0;
  const confirmedOrders = kpis.confirmedOrders ?? 0;
  const cancelledOrders = kpis.cancelledOrders ?? 0;
  const lowStockProducts = kpis.lowStockProducts ?? kpis.lowStockCount ?? lowStockAlerts.length ?? 0;
  const averageOrderValue = kpis.averageOrderValue ?? 0;

  // 8 Dashboard Overview Cards
  const overviewCards = [
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: formatPrice(totalRevenue),
      sublabel: 'Settled net intake',
      icon: TrendingUp,
      accent: 'emerald',
      badge: 'Settled'
    },
    {
      id: 'orders',
      label: 'Total Orders',
      value: totalOrders.toLocaleString(),
      sublabel: 'Gross orders registered',
      icon: ShoppingBag,
      accent: 'ink',
      badge: `${totalOrders} orders`
    },
    {
      id: 'customers',
      label: 'Total Customers',
      value: totalCustomers.toLocaleString(),
      sublabel: 'Registered client accounts',
      icon: Users,
      accent: 'ink',
      badge: 'Verified'
    },
    {
      id: 'products',
      label: 'Total Products',
      value: totalProducts.toLocaleString(),
      sublabel: 'Active catalogue styles',
      icon: Boxes,
      accent: 'ink',
      badge: 'Catalogue'
    },
    {
      id: 'pending',
      label: 'Pending Orders',
      value: pendingOrders.toLocaleString(),
      sublabel: 'Awaiting payment / confirmation',
      icon: Clock,
      accent: 'amber',
      badge: 'Action Required'
    },
    {
      id: 'confirmed',
      label: 'Confirmed Orders',
      value: confirmedOrders.toLocaleString(),
      sublabel: 'Confirmed & in fulfillment',
      icon: CheckCircle2,
      accent: 'emerald',
      badge: 'Active'
    },
    {
      id: 'cancelled',
      label: 'Cancelled Orders',
      value: cancelledOrders.toLocaleString(),
      sublabel: 'Cancelled / aborted orders',
      icon: XCircle,
      accent: 'rose',
      badge: 'Void'
    },
    {
      id: 'lowStock',
      label: 'Low Stock Products',
      value: lowStockProducts.toLocaleString(),
      sublabel: 'Variants ≤ 5 units remaining',
      icon: AlertTriangle,
      accent: 'orange',
      badge: lowStockProducts > 0 ? 'Restock Soon' : 'Healthy'
    }
  ];

  // Prepare chart series from real MongoDB aggregation data
  const rawChartSeries = chartView === 'daily' ? dailySales : monthlySales;
  const maxRevenue = Math.max(...rawChartSeries.map((d) => d.revenue || 0), 1000);

  const chartBars = rawChartSeries.map((item, idx) => {
    const rawVal = item.revenue || 0;
    const heightPercent = Math.min(100, Math.max(8, Math.round((rawVal / maxRevenue) * 90)));
    const dateLabel = item.date || item.month || item._id;

    return {
      index: idx,
      id: item._id,
      label: dateLabel,
      revenue: rawVal,
      orders: item.orders || 0,
      heightPercent,
      isPeak: rawVal === maxRevenue && rawVal > 0
    };
  });

  const activeTooltip =
    hoveredBarIndex !== null && chartBars[hoveredBarIndex]
      ? chartBars[hoveredBarIndex]
      : chartBars.find((b) => b.isPeak) || chartBars[chartBars.length - 1];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Header Row with Period Selector & Real-Time Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#161513] text-[#FDFBF7] flex items-center justify-center font-bold shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#161513] tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-[#827E77] font-sans">
              Business Overview • Live aggregations for revenue, orders, inventory, and customers
            </p>
          </div>
        </div>

        {/* Period Filter Toggle Pills */}
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-[#F2EFE9] p-1 rounded-full border border-[#E4DEC3]">
            {[
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
              { id: '12m', label: '12M' },
              { id: 'all', label: 'All' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full transition-colors ${period === p.id
                    ? 'bg-[#161513] text-[#FDFBF7]'
                    : 'text-[#635E56] hover:text-sphere-ink'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 border border-[#EAE5DA] bg-white rounded-full text-[#635E56] hover:text-sphere-ink transition-colors shadow-xs"
            title="Refresh Real-Time Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 8 Dashboard Overview KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;

          const accentStyles = {
            emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            amber: 'text-amber-700 bg-amber-50 border-amber-200',
            rose: 'text-rose-700 bg-rose-50 border-rose-200',
            orange: 'text-orange-700 bg-orange-50 border-orange-200',
            ink: 'text-[#161513] bg-[#F5F2EB] border-[#E8E2D5]'
          }[card.accent] || 'text-[#161513] bg-[#F5F2EB] border-[#E8E2D5]';

          return (
            <div
              key={card.id}
              className="bg-white p-5 rounded-2xl border border-[#EAE5DA] shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${accentStyles}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${accentStyles}`}>
                  {card.badge}
                </span>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#827E77] block">
                  {card.label}
                </span>
                <p className="font-serif text-2xl font-bold text-[#161513] mt-0.5 tracking-tight">
                  {card.value}
                </p>
                <span className="text-[10px] text-[#A8A29A] font-sans block mt-1">
                  {card.sublabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Analytics Chart & Order Statistics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Revenue Chart Canvas */}
        <div className="lg:col-span-2 bg-white p-6 rounded-md border border-[#EAE5DA] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-[#F2EFE9]">
            <div>
              <h2 className="font-editorial text-xl font-normal text-sphere-ink">Sales Analytics & Revenue</h2>
              <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                Actual settled intake over time ({chartView === 'daily' ? 'Daily' : 'Monthly'} breakdown)
              </p>
            </div>

            {/* Toggle Daily vs Monthly View */}
            <div className="flex items-center gap-1 bg-[#F5F2EB] p-1 rounded-full border border-[#EAE5DA]">
              <button
                type="button"
                onClick={() => setChartView('daily')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${chartView === 'daily'
                    ? 'bg-[#161513] text-[#FDFBF7]'
                    : 'text-[#736E67] hover:text-sphere-ink'
                  }`}
              >
                Daily Sales
              </button>
              <button
                type="button"
                onClick={() => setChartView('monthly')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${chartView === 'monthly'
                    ? 'bg-[#161513] text-[#FDFBF7]'
                    : 'text-[#736E67] hover:text-sphere-ink'
                  }`}
              >
                Monthly Sales
              </button>
            </div>
          </div>

          {/* Chart Content Area */}
          {chartBars.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#827E77]">
              <Calendar className="w-8 h-8 text-[#C8B293] mx-auto mb-2 opacity-50" />
              <p className="font-medium text-sphere-ink">No settled sales in this selected time range</p>
              <p className="text-[11px] mt-1">Orders with confirmed payments will generate time-series telemetry.</p>
            </div>
          ) : (
            <div className="relative pt-10 pb-2">
              {/* Tooltip on hover / active */}
              {activeTooltip && (
                <div
                  className="absolute top-0 transition-all duration-150 pointer-events-none transform -translate-x-1/2 z-10"
                  style={{
                    left: `${((activeTooltip.index + 0.5) / Math.max(chartBars.length, 1)) * 100}%`
                  }}
                >
                  <div className="bg-[#161513] text-[#FDFBF7] px-3 py-1.5 rounded-sm shadow-md text-center text-xs font-sans whitespace-nowrap">
                    <div className="text-[9px] text-sphere-sand uppercase tracking-wider">
                      {activeTooltip.label}
                    </div>
                    <div className="font-bold text-xs font-mono">
                      {formatPrice(activeTooltip.revenue)}
                    </div>
                    <div className="text-[9px] text-[#A8A29A]">
                      {activeTooltip.orders} order{activeTooltip.orders !== 1 ? 's' : ''}
                    </div>
                    <div className="w-2 h-2 bg-[#161513] rotate-45 mx-auto -mb-1 mt-0.5" />
                  </div>
                </div>
              )}

              {/* Bars Canvas */}
              <div className="flex items-end gap-2 sm:gap-3 h-52 border-b border-[#EAE5DA] px-2">
                {chartBars.map((bar) => {
                  const isHovered = hoveredBarIndex === bar.index;
                  const isPeak = bar.isPeak;

                  return (
                    <div
                      key={bar.id}
                      className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                      onMouseEnter={() => setHoveredBarIndex(bar.index)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      <div
                        className={`w-full max-w-[36px] rounded-t-xs transition-all duration-200 ${isHovered || isPeak
                            ? 'bg-gradient-to-t from-[#B89B72] to-[#8C7658] shadow-sm'
                            : 'bg-gradient-to-t from-[#EAE4D8] to-[#D6CEBF] hover:from-[#C8B293] hover:to-[#A8947A]'
                          }`}
                        style={{ height: `${bar.heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-Axis Labels */}
              <div className="flex items-center justify-between text-[10px] font-medium text-[#827E77] pt-3 px-2">
                {chartBars.map((bar) => (
                  <span
                    key={bar.id}
                    className={`flex-1 text-center truncate px-0.5 transition-colors ${hoveredBarIndex === bar.index ? 'text-sphere-ink font-bold' : ''
                      }`}
                  >
                    {bar.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Order Statistics & Insights */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-md border border-[#EAE5DA] shadow-xs">
            <h2 className="font-editorial text-xl font-normal text-sphere-ink mb-1">
              Order Statistics
            </h2>
            <p className="text-[10px] text-[#827E77] uppercase tracking-wider mb-4">
              Real Settlement & Fulfillment Mix
            </p>

            {/* Average Order Value Pill */}
            <div className="p-3 bg-[#FAF8F5] border border-[#EAE5DA] rounded-sm mb-4">
              <span className="text-[10px] uppercase tracking-wider text-[#827E77] block">
                Average Order Value (AOV)
              </span>
              <p className="font-editorial text-2xl font-semibold text-sphere-ink mt-0.5">
                {formatPrice(averageOrderValue)}
              </p>
            </div>

            {/* Order Status Breakdown */}
            <div className="space-y-2 mb-6">
              <span className="text-[10px] uppercase tracking-wider text-[#827E77] font-semibold block">
                Status Breakdown
              </span>
              {statusBreakdown.length === 0 ? (
                <p className="text-xs text-[#827E77]">No status records available</p>
              ) : (
                statusBreakdown.map((item) => (
                  <div key={item._id} className="flex items-center justify-between text-xs py-1 border-b border-[#F7F4EC]">
                    <span className="capitalize text-sphere-charcoal font-medium">
                      {String(item._id).replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono font-semibold text-sphere-ink bg-[#F5F2EB] px-2 py-0.5 rounded-full text-[11px]">
                      {item.count} ({formatPrice(item.totalAmount)})
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Distribution */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#827E77] font-semibold block">
                Payment Gateways
              </span>
              {paymentMethodStats.length === 0 ? (
                <p className="text-xs text-[#827E77]">No payment records registered</p>
              ) : (
                paymentMethodStats.map((item) => {
                  const isRzp = item._id === 'razorpay';
                  return (
                    <div key={item._id} className="flex items-center justify-between text-xs p-2 rounded-sm bg-[#FAF8F5] border border-[#EAE5DA]">
                      <div className="flex items-center gap-2">
                        {isRzp ? (
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span className="font-semibold uppercase text-[11px]">
                          {isRzp ? 'Razorpay Test' : 'Cash on Delivery'}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-sphere-ink">
                        {item.count} orders
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Selling Products Card */}
          <div className="bg-white p-6 rounded-md border border-[#EAE5DA] shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F2EFE9]">
              <div>
                <h2 className="font-editorial text-xl font-normal text-sphere-ink">Top Selling Products</h2>
                <p className="text-[10px] text-[#827E77] uppercase tracking-wider">
                  Volume Leaders
                </p>
              </div>
              <Sparkles className="w-4 h-4 text-sphere-sand" />
            </div>

            {topProducts.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#827E77]">No sales registered yet.</div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((item, idx) => {
                  const prodImg =
                    item.images?.[0]?.url ||
                    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=120&q=80';

                  return (
                    <div
                      key={item.productId || idx}
                      className="flex items-center gap-3 p-2 rounded-sm hover:bg-[#FAF8F5] transition-colors border border-transparent hover:border-[#EAE5DA]"
                    >
                      <img
                        src={prodImg}
                        alt={item.productName}
                        className="w-10 h-12 object-cover rounded-xs border border-[#EAE5DA] bg-[#F7F4EC]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-sphere-ink truncate">
                          {item.productName || 'Garment Creation'}
                        </p>
                        <p className="text-[11px] font-mono text-[#827E77] mt-0.5">
                          {formatPrice(item.totalRevenue || 0)}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#827E77] bg-[#F5F2EB] px-2 py-0.5 rounded-full font-mono">
                        {item.totalSold} sold
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white p-6 rounded-md border border-[#EAE5DA] shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F2EFE9]">
          <div>
            <h2 className="font-editorial text-xl font-normal text-sphere-ink">Recent Orders</h2>
            <p className="text-[11px] text-[#827E77] uppercase tracking-wider font-sans">
              Latest client transactions recorded in MongoDB Atlas
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-semibold uppercase tracking-wider text-sphere-ink hover:text-sphere-sand transition-colors flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#827E77]">No client orders placed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-2.5 font-semibold">Order ID</th>
                  <th className="py-2.5 font-semibold">Customer</th>
                  <th className="py-2.5 font-semibold">Order Date</th>
                  <th className="py-2.5 font-semibold">Total Amount</th>
                  <th className="py-2.5 font-semibold">Payment Method</th>
                  <th className="py-2.5 font-semibold">Payment Status</th>
                  <th className="py-2.5 font-semibold text-right">Order Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {recentOrders.map((order) => {
                  const customerName =
                    order.customer ||
                    order.customerName ||
                    order.shippingAddress?.fullName ||
                    order.shippingAddressSnapshot?.fullName ||
                    order.userId?.name ||
                    'Customer';

                  const customerEmail =
                    order.customerEmail ||
                    order.userId?.email ||
                    order.shippingAddressSnapshot?.phone ||
                    '';

                  const orderId = order.orderNumber || order._id;
                  const totalAmt = order.totalAmount ?? order.total ?? 0;
                  const isCod = order.paymentMethod === 'cod';

                  const paymentStatusColors = {
                    paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    pending: 'bg-amber-50 text-amber-800 border-amber-200',
                    failed: 'bg-rose-50 text-rose-800 border-rose-200'
                  }[order.paymentStatus] || 'bg-gray-50 text-gray-700 border-gray-200';

                  const orderStatusColors = {
                    confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    processing: 'bg-blue-50 text-blue-800 border-blue-200',
                    shipped: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                    pending_payment: 'bg-amber-50 text-amber-800 border-amber-200',
                    cancelled: 'bg-rose-50 text-rose-800 border-rose-200'
                  }[order.orderStatus] || 'bg-[#FAF2E6] text-[#7A4B1D] border-[#ECD9C0]';

                  return (
                    <tr key={order._id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Order ID */}
                      <td className="py-3 font-mono font-medium text-xs text-[#161513]">
                        <Link to={`/admin/orders/${order._id}`} className="hover:underline text-sphere-ink font-semibold">
                          {orderId}
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="py-3">
                        <span className="font-semibold text-xs text-sphere-ink block">
                          {customerName}
                        </span>
                        {customerEmail && (
                          <span className="text-[10px] text-[#827E77] block font-mono">
                            {customerEmail}
                          </span>
                        )}
                      </td>

                      {/* Order Date */}
                      <td className="py-3 text-[#736E67] font-mono text-[11px]">
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 font-semibold text-xs text-sphere-ink font-mono">
                        {formatPrice(totalAmt)}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F2EB] border border-[#EAE5DA] text-[#635E56] uppercase tracking-wider">
                          {isCod ? (
                            <>
                              <Banknote className="w-3 h-3 text-emerald-600" />
                              <span>COD</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3 h-3 text-blue-600" />
                              <span>Razorpay</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full border ${paymentStatusColors}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>

                      {/* Order Status */}
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full border ${orderStatusColors}`}
                        >
                          {order.orderStatus?.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low Stock Alerts Section */}
      <div className="bg-white p-6 rounded-md border border-[#EAE5DA] shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F2EFE9]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#FAF4ED] text-[#8C5424] flex items-center justify-center border border-[#ECD9C5]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-editorial text-xl font-normal text-sphere-ink">Low Stock Alerts</h2>
              <p className="text-[11px] text-[#827E77] uppercase tracking-wider font-sans">
                Variants at or below replenishment threshold (≤ 5 units remaining)
              </p>
            </div>
          </div>
          <Link
            to="/admin/inventory"
            className="text-xs font-semibold uppercase tracking-wider text-sphere-ink hover:text-sphere-sand transition-colors flex items-center gap-1"
          >
            <span>Manage Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {lowStockAlerts.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#827E77]">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-60" />
            <p className="font-medium text-sphere-ink">Inventory levels are healthy across all variants.</p>
            <p className="text-[11px] mt-0.5">No products currently fall at or below the 5-unit threshold.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-2 font-semibold">Garment Style</th>
                  <th className="py-2 font-semibold">SKU</th>
                  <th className="py-2 font-semibold">Variant Attributes</th>
                  <th className="py-2 font-semibold">Available Stock</th>
                  <th className="py-2 font-semibold text-right">Replenishment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {lowStockAlerts.map((alert, idx) => {
                  const isOut = alert.stockQuantity === 0;

                  return (
                    <tr key={`${alert.sku}-${idx}`} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Product Thumbnail & Name */}
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {alert.image ? (
                            <img
                              src={alert.image}
                              alt={alert.productName}
                              className="w-8 h-10 object-cover rounded-xs border border-[#EAE5DA] bg-[#F7F4EC]"
                            />
                          ) : (
                            <div className="w-8 h-10 rounded-xs border border-[#EAE5DA] bg-[#F7F4EC] flex items-center justify-center text-[#827E77]">
                              <Boxes className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-xs text-sphere-ink block">
                              {alert.productName}
                            </span>
                            <span className="text-[10px] text-[#827E77]">
                              {alert.brand || alert.categoryName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 font-mono font-semibold text-xs text-[#736E67]">
                        {alert.sku}
                      </td>

                      {/* Variant Size / Color */}
                      <td className="py-3 text-xs text-[#635E56]">
                        <span className="px-1.5 py-0.5 bg-[#F5F2EB] border border-[#EAE5DA] rounded-xs font-mono mr-1.5">
                          Size: {alert.size}
                        </span>
                        {alert.color && (
                          <span className="text-[11px] text-[#827E77]">
                            Color: {alert.color}
                          </span>
                        )}
                      </td>

                      {/* Available Stock Quantity */}
                      <td className="py-3">
                        <span className={`font-mono font-bold text-sm ${isOut ? 'text-red-700' : 'text-amber-800'}`}>
                          {alert.stockQuantity} unit{alert.stockQuantity !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full border ${isOut
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                        >
                          {isOut ? 'Out of Stock' : 'Low Stock (≤ 5)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
