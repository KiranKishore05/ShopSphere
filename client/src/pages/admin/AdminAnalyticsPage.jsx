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
  ArrowUpRight
} from 'lucide-react';
import { useAdminAnalytics } from '../../hooks/useAdmin';

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const { data: analytics, isLoading, isError, refetch } = useAdminAnalytics({ period });

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

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
      <div className="p-8 bg-white border border-red-200 rounded-sm text-center">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h2 className="font-editorial text-xl text-sphere-ink mb-2">Analytics Computation Error</h2>
        <p className="text-xs text-sphere-charcoal mb-4">
          Failed to retrieve aggregated performance metrics from the database.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-wider rounded-sm hover:bg-sphere-charcoal"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = analytics?.kpis || {};
  const revenueByDay = analytics?.revenueByDay || [];
  const statusBreakdown = analytics?.statusBreakdown || [];
  const topProducts = analytics?.topProducts || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header and Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-sphere-ink tracking-tight">
            Executive Analytics & Fiscal Audit
          </h1>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Verified database aggregation pipelines for revenue, AOV, order distribution, and bestsellers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-[#F2EFE9] p-1 rounded-sm border border-[#E4DEC3]">
            {['7d', '30d', '90d', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors ${
                  period === p
                    ? 'bg-[#161513] text-[#FDFBF7]'
                    : 'text-[#635E56] hover:text-sphere-ink'
                }`}
              >
                {p === 'all' ? 'All Time' : p.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 border border-[#EAE5DA] bg-white rounded-sm text-[#635E56] hover:text-sphere-ink"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase tracking-widest text-[#827E77] font-semibold block mb-1">
            Settled Net Revenue
          </span>
          <p className="font-editorial text-3xl text-sphere-ink">{formatPrice(kpis.revenue)}</p>
          <span className="text-[11px] text-emerald-700 font-medium mt-2 inline-block">
            Paid & Active COD Transactions
          </span>
        </div>

        <div className="bg-white p-5 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase tracking-widest text-[#827E77] font-semibold block mb-1">
            Gross Order Volume
          </span>
          <p className="font-editorial text-3xl text-sphere-ink">{kpis.orders || 0}</p>
          <span className="text-[11px] text-[#635E56] mt-2 inline-block">Total client orders logged</span>
        </div>

        <div className="bg-white p-5 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase tracking-widest text-[#827E77] font-semibold block mb-1">
            Average Order Value (AOV)
          </span>
          <p className="font-editorial text-3xl text-sphere-ink">
            {formatPrice(kpis.averageOrderValue)}
          </p>
          <span className="text-[11px] text-[#635E56] mt-2 inline-block">Revenue per settled basket</span>
        </div>

        <div className="bg-white p-5 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase tracking-widest text-[#827E77] font-semibold block mb-1">
            Atelier Customer Base
          </span>
          <p className="font-editorial text-3xl text-sphere-ink">{kpis.customers || 0}</p>
          <span className="text-[11px] text-[#635E56] mt-2 inline-block">Registered luxury shoppers</span>
        </div>
      </div>

      {/* Dual Section: Revenue Timeline & Order Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Revenue over Time Daily Table */}
        <div className="lg:col-span-2 bg-white border border-[#EAE5DA] rounded-sm p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
            <div>
              <h2 className="font-editorial text-xl text-sphere-ink">Daily Revenue Progression</h2>
              <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
                Day-by-day cash intake and fulfillment volume
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
                    <th className="py-2.5 font-semibold">Date</th>
                    <th className="py-2.5 font-semibold">Orders Count</th>
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

        {/* Right Col: Order Fulfillment Status Breakdown */}
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

          <div className="space-y-3">
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
      </div>

      {/* Top Selling Garments Ranking */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
          <div>
            <h2 className="font-editorial text-xl text-sphere-ink">Bestselling Haute Creations</h2>
            <p className="text-[11px] text-[#827E77] uppercase tracking-wider">
              Top revenue-generating garments in the atelier collection
            </p>
          </div>
          <Shirt className="w-5 h-5 text-sphere-sand" />
        </div>

        {topProducts.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#827E77]">No sales registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-2.5 font-semibold">Rank</th>
                  <th className="py-2.5 font-semibold">Garment Title</th>
                  <th className="py-2.5 font-semibold">Units Sold</th>
                  <th className="py-2.5 font-semibold text-right">Gross Revenue Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {topProducts.map((p, idx) => (
                  <tr key={p.productId || idx} className="hover:bg-[#FAF8F5]">
                    <td className="py-3 font-editorial text-sm font-semibold text-sphere-sand">
                      #{idx + 1}
                    </td>
                    <td className="py-3 font-semibold text-xs text-sphere-ink">
                      {p.productName || 'Garment Creation'}
                    </td>
                    <td className="py-3 font-mono text-xs text-[#635E56]">{p.totalSold} units</td>
                    <td className="py-3 text-right font-medium text-xs font-mono">
                      {formatPrice(p.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
