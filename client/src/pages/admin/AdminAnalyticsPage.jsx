import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  ShoppingBag,
  Users,
  Shirt,
  AlertTriangle,
  RefreshCw,
  PieChart,
  ArrowUpRight,
  FolderTree,
  CreditCard,
  UserCheck,
  PackageX
} from 'lucide-react';
import { useAdminAnalytics } from '../../hooks/useAdmin';

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRangeActive, setCustomRangeActive] = useState(false);

  const queryParams = customRangeActive && (startDate || endDate)
    ? { startDate: startDate || undefined, endDate: endDate || undefined }
    : { period };

  const { data: analytics, isLoading, isError, refetch } = useAdminAnalytics(queryParams);

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    if (!startDate && !endDate) return;
    setCustomRangeActive(true);
  };

  const handleClearCustomRange = () => {
    setStartDate('');
    setEndDate('');
    setCustomRangeActive(false);
    setPeriod('30d');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
        <p className="text-xs text-[#827E77] uppercase font-semibold">Aggregating Fiscal Analytics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-white border border-red-200 rounded-sm text-center max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h2 className="font-editorial text-xl text-sphere-ink mb-2">Analytics Computation Error</h2>
        <p className="text-xs text-[#827E77] mb-4">
          Failed to retrieve aggregated performance metrics from the database.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-wider rounded-sm hover:bg-sphere-charcoal"
        >
          Retry Query
        </button>
      </div>
    );
  }

  const kpis = analytics?.kpis || analytics?.summary || {};
  const revenueByDay = analytics?.revenueByDay || analytics?.dailySales || [];
  const statusBreakdown = analytics?.statusBreakdown || analytics?.orderStatusBreakdown || [];
  const paymentMethodStats = analytics?.paymentMethodStats || [];
  const paymentStatusStats = analytics?.paymentStatusStats || [];
  const topProducts = analytics?.topProducts || [];
  const lowPerformingProducts = analytics?.lowPerformingProducts || [];
  const categorySales = analytics?.categorySales || analytics?.categoryBreakdown || [];
  const customerMetrics = analytics?.customerMetrics || {};

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Header and Date Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-sphere-ink tracking-tight">
            Executive Analytics & Fiscal Audit
          </h1>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Verified database aggregation pipelines for settled net revenue, category-wise performance, and customer retention.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Period Pills */}
          <div className="inline-flex bg-[#F2EFE9] p-1 rounded-sm border border-[#E4DEC3]">
            {['7d', '30d', '90d', '12m', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => {
                  setCustomRangeActive(false);
                  setPeriod(p);
                }}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors ${
                  !customRangeActive && period === p
                    ? 'bg-[#161513] text-[#FDFBF7]'
                    : 'text-[#635E56] hover:text-sphere-ink'
                }`}
              >
                {p === 'all' ? 'All Time' : p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          <form onSubmit={handleApplyCustomRange} className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-[11px] border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink"
              title="Start Date"
            />
            <span className="text-[#827E77] text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-[11px] border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink"
              title="End Date"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-[#161513] text-[#FDFBF7] text-[11px] font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C]"
            >
              Filter
            </button>
            {customRangeActive && (
              <button
                type="button"
                onClick={handleClearCustomRange}
                className="px-2 py-1 border border-[#EAE5DA] text-[11px] text-[#635E56] hover:text-sphere-ink rounded-sm"
              >
                Clear
              </button>
            )}
          </form>

          <button
            onClick={() => refetch()}
            className="p-2 border border-[#EAE5DA] bg-white rounded-sm text-[#635E56] hover:text-sphere-ink"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#827E77] font-semibold block mb-1">
            Settled Net Revenue
          </span>
          <p className="font-editorial text-3xl text-sphere-ink">{formatPrice(kpis.revenue ?? kpis.totalRevenue)}</p>
          <span className="text-[11px] text-emerald-700 font-medium mt-2 inline-block">
            Verified Paid & Handover COD
          </span>
        </div>

        <div className="bg-white p-5 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#827E77] font-semibold block mb-1">
            Gross Order Volume
          </span>
          <p className="font-editorial text-3xl text-sphere-ink">{kpis.orders ?? kpis.totalOrders ?? 0}</p>
          <span className="text-[11px] text-[#635E56] mt-2 inline-block">
            {kpis.paidOrders ?? kpis.paidOrdersCount ?? 0} settled purchases
          </span>
        </div>

        <div className="bg-white p-5 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#827E77] font-semibold block mb-1">
            Average Order Value (AOV)
          </span>
          <p className="font-editorial text-3xl text-sphere-ink">
            {formatPrice(kpis.averageOrderValue)}
          </p>
          <span className="text-[11px] text-[#635E56] mt-2 inline-block">Per settled acquisition</span>
        </div>

        <div className="bg-white p-5 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#827E77] font-semibold block mb-1">
            Atelier Customer Base
          </span>
          <p className="font-editorial text-3xl text-sphere-ink">{kpis.customers ?? kpis.totalCustomers ?? 0}</p>
          <span className="text-[11px] text-purple-700 font-medium mt-2 inline-block">
            {customerMetrics.repeatCustomers || 0} repeat patrons ({customerMetrics.repeatCustomerRate || 0}%)
          </span>
        </div>
      </div>

      {/* Customer Acquisition & Retention Insights */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sphere-sand" />
            <div>
              <h2 className="font-editorial text-xl text-sphere-ink">Patron Acquisition & Retention Matrix</h2>
              <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                Cohort acquisition, lifetime patronage, and repeat checkout frequency
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            {customerMetrics.repeatCustomerRate || 0}% Loyalty Rate
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-[#FAF8F5] border border-[#EAE5DA] rounded-sm">
            <span className="text-[10px] uppercase text-[#827E77] font-semibold block">Total Registered</span>
            <p className="font-editorial text-2xl text-sphere-ink mt-0.5">{customerMetrics.totalCustomers || kpis.customers || 0}</p>
            <span className="text-[10px] text-[#827E77]">Storefront patrons</span>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#EAE5DA] rounded-sm">
            <span className="text-[10px] uppercase text-emerald-700 font-semibold block">New Registrations</span>
            <p className="font-editorial text-2xl text-emerald-800 mt-0.5">{customerMetrics.newCustomers || 0}</p>
            <span className="text-[10px] text-emerald-700/80">In selected window</span>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#EAE5DA] rounded-sm">
            <span className="text-[10px] uppercase text-purple-700 font-semibold block">Repeat Patrons</span>
            <p className="font-editorial text-2xl text-purple-900 mt-0.5">{customerMetrics.repeatCustomers || 0}</p>
            <span className="text-[10px] text-purple-700/80">&ge; 2 settled orders</span>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#EAE5DA] rounded-sm">
            <span className="text-[10px] uppercase text-blue-700 font-semibold block">Repeat Order Ratio</span>
            <p className="font-editorial text-2xl text-blue-900 mt-0.5">{customerMetrics.repeatCustomerRate || 0}%</p>
            <span className="text-[10px] text-blue-700/80">Of active checkout patrons</span>
          </div>
        </div>
      </div>

      {/* Category-Wise Sales Performance */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-sphere-sand" />
            <div>
              <h2 className="font-editorial text-xl text-sphere-ink">Category Sales & Revenue Contribution</h2>
              <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                Departmental breakdown of settled garment sales
              </p>
            </div>
          </div>
        </div>

        {categorySales.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#827E77]">
            No departmental sales registered within this date window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-2.5 font-semibold">Atelier Category</th>
                  <th className="py-2.5 font-semibold">Orders Involving</th>
                  <th className="py-2.5 font-semibold">Garment Units Sold</th>
                  <th className="py-2.5 font-semibold text-right">Settled Revenue Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {categorySales.map((cat, idx) => (
                  <tr key={cat._id || idx} className="hover:bg-[#FAF8F5]">
                    <td className="py-3 font-semibold text-xs text-sphere-ink">
                      {cat.categoryName}
                    </td>
                    <td className="py-3 font-mono text-xs text-[#635E56]">
                      {cat.orderCount} orders
                    </td>
                    <td className="py-3 font-mono text-xs font-semibold text-sphere-ink">
                      {cat.unitsSold} units
                    </td>
                    <td className="py-3 text-right font-bold text-xs font-mono text-sphere-ink">
                      {formatPrice(cat.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dual Section: Daily Revenue Progression & Payment / Order Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Revenue over Time Daily Table */}
        <div className="lg:col-span-2 bg-white border border-[#EAE5DA] rounded-sm p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
            <div>
              <h2 className="font-editorial text-xl text-sphere-ink">Daily Revenue Progression (IST)</h2>
              <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                Day-by-day settled intake and fulfillment volume
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-sphere-sand" />
          </div>

          {revenueByDay.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#827E77]">
              No day-level revenue transactions within this date window.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-sphere-ink">
                <thead>
                  <tr className="border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                    <th className="py-2.5 font-semibold">Date (IST)</th>
                    <th className="py-2.5 font-semibold">Settled Orders</th>
                    <th className="py-2.5 font-semibold text-right">Daily Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EFE9]">
                  {revenueByDay.map((row) => (
                    <tr key={row._id} className="hover:bg-[#FAF8F5]">
                      <td className="py-2.5 font-mono text-xs text-sphere-ink">{row._id}</td>
                      <td className="py-2.5 text-[#635E56]">{row.orders} orders</td>
                      <td className="py-2.5 text-right font-medium text-xs font-mono">
                        {formatPrice(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Col: Fulfillment States & Payment Gateway Breakdown */}
        <div className="space-y-6">
          {/* Fulfillment Status */}
          <div className="bg-white border border-[#EAE5DA] rounded-sm p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
              <div>
                <h2 className="font-editorial text-xl text-sphere-ink">Fulfillment States</h2>
                <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                  Order status distribution
                </p>
              </div>
              <PieChart className="w-5 h-5 text-sphere-sand" />
            </div>

            <div className="space-y-2.5">
              {statusBreakdown.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-2.5 rounded-sm bg-[#FAF8F5] border border-[#EAE5DA]"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-sphere-ink">
                    {item._id}
                  </span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#EAE5DA]">
                    {item.count} orders
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method & Status Breakdown */}
          <div className="bg-white border border-[#EAE5DA] rounded-sm p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
              <div>
                <h2 className="font-editorial text-xl text-sphere-ink">Payment Channels</h2>
                <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                  Gateway method distribution
                </p>
              </div>
              <CreditCard className="w-5 h-5 text-sphere-sand" />
            </div>

            <div className="space-y-2">
              {paymentMethodStats.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between text-xs p-2 bg-[#FAF8F5] border border-[#EAE5DA] rounded-sm"
                >
                  <span className="font-semibold uppercase tracking-wider text-sphere-ink">
                    {item._id === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay Gateway'}
                  </span>
                  <span className="font-mono font-bold text-sphere-ink">
                    {item.count} orders ({formatPrice(item.totalAmount)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dual Section: Bestselling Garments & Low-Performing Catalogue Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Selling Garments */}
        <div className="bg-white border border-[#EAE5DA] rounded-sm p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
            <div>
              <h2 className="font-editorial text-xl text-sphere-ink">Bestselling Haute Creations</h2>
              <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                Top sales-generating garments
              </p>
            </div>
            <Shirt className="w-5 h-5 text-sphere-sand" />
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#827E77]">No sales registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-sphere-ink">
                <thead>
                  <tr className="border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                    <th className="py-2 font-semibold">Rank</th>
                    <th className="py-2 font-semibold">Garment Title</th>
                    <th className="py-2 font-semibold">Category</th>
                    <th className="py-2 font-semibold text-right">Units Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EFE9]">
                  {topProducts.map((p, idx) => (
                    <tr key={p.productId || idx} className="hover:bg-[#FAF8F5]">
                      <td className="py-2.5 font-editorial text-sm font-semibold text-sphere-sand">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 font-semibold text-xs text-sphere-ink">
                        {p.productName || 'Garment Creation'}
                      </td>
                      <td className="py-2.5 text-[#827E77]">
                        {p.categoryName || 'Apparel'}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-xs text-sphere-ink">
                        {p.totalSold} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low-Performing / Zero-Sales Garments */}
        <div className="bg-white border border-[#EAE5DA] rounded-sm p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
            <div>
              <h2 className="font-editorial text-xl text-sphere-ink">Stagnant / Low-Performing Garments</h2>
              <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                Garments with zero or lowest sales tally
              </p>
            </div>
            <PackageX className="w-5 h-5 text-[#827E77]" />
          </div>

          {lowPerformingProducts.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#827E77]">No stagnant garments detected.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-sphere-ink">
                <thead>
                  <tr className="border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                    <th className="py-2 font-semibold">Garment Title</th>
                    <th className="py-2 font-semibold">Category</th>
                    <th className="py-2 font-semibold text-right">Units Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EFE9]">
                  {lowPerformingProducts.map((p, idx) => (
                    <tr key={p.productId || idx} className="hover:bg-[#FAF8F5]">
                      <td className="py-2.5 font-semibold text-xs text-sphere-ink">
                        {p.productName}
                      </td>
                      <td className="py-2.5 text-[#827E77]">
                        {p.categoryName || 'Apparel'}
                      </td>
                      <td className="py-2.5 text-right font-mono text-xs text-rose-700 font-semibold">
                        {p.totalSold || 0} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
