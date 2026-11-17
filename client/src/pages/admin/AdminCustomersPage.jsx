import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  UserX,
  Eye,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { useAdminCustomers, useUpdateCustomerStatus } from '../../hooks/useAdmin';
import { useAuth } from '../../hooks/useAuth';

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | '7d' | '30d'
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modal State for Account Status Toggle
  const [statusModalUser, setStatusModalUser] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusActionError, setStatusActionError] = useState('');
  const [statusActionSuccess, setStatusActionSuccess] = useState('');

  const { user: currentAdmin } = useAuth();

  // Compute ISO dates for date range filter
  const getDateRangeParams = () => {
    if (dateRange === 'all') return {};
    const now = new Date();
    const start = new Date();
    if (dateRange === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === '7d') {
      start.setDate(now.getDate() - 7);
    } else if (dateRange === '30d') {
      start.setDate(now.getDate() - 30);
    }
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString()
    };
  };

  const { startDate, endDate } = getDateRangeParams();

  // Fetch customers with resilient hook
  const {
    data: customersData,
    isLoading,
    isError,
    error,
    refetch
  } = useAdminCustomers({
    page,
    limit,
    search: search.trim() || undefined,
    status: status !== 'all' ? status : undefined,
    startDate,
    endDate
  });

  const updateStatusMutation = useUpdateCustomerStatus();

  // Resilient unwrapping: handles unwrapped object, axios nested object, or raw array
  const customers =
    customersData?.items ||
    customersData?.data?.items ||
    customersData?.customers ||
    customersData?.data?.customers ||
    (Array.isArray(customersData) ? customersData : []);

  const summary =
    customersData?.summary ||
    customersData?.data?.summary ||
    {};

  const meta =
    customersData?.meta ||
    customersData?.data?.meta ||
    { page: 1, limit, total: customers.length, totalPages: Math.ceil(customers.length / limit) || 1 };

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setDateRange('all');
    setPage(1);
  };

  const handleOpenStatusModal = (cust) => {
    setStatusActionError('');
    setStatusActionSuccess('');
    setStatusReason('');
    setStatusModalUser(cust);
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusModalUser) return;
    setStatusActionError('');

    try {
      const newStatus = !statusModalUser.isActive;
      const res = await updateStatusMutation.mutateAsync({
        id: statusModalUser._id,
        data: {
          isActive: newStatus,
          reason: statusReason.trim() || undefined
        }
      });

      setStatusActionSuccess(
        res?.message ||
          `Patron account '${statusModalUser.email}' has been successfully ${newStatus ? 'reactivated' : 'deactivated'}.`
      );
      setStatusModalUser(null);
      setTimeout(() => setStatusActionSuccess(''), 5000);
    } catch (err) {
      console.error('Status update failed:', err);
      setStatusActionError(err.message || 'Failed to update patron account status.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-sphere-ink tracking-tight">
            Patron & Client Directory
          </h1>
          <p className="text-xs text-[#827E77] mt-1 font-sans">
            Oversee registered customer accounts, lifetime acquisitions, address books, and authorization statuses.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#EAE5DA] rounded-sm text-xs text-[#635E56] hover:text-sphere-ink hover:bg-white bg-[#FAF8F5] transition-colors self-start sm:self-auto"
          title="Refresh Directory"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Global Success / Error Feedback */}
      {statusActionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm animate-fadeIn flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>{statusActionSuccess}</span>
          </div>
          <button onClick={() => setStatusActionSuccess('')} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Total Customers */}
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#827E77] block font-semibold">
            Registered Patrons
          </span>
          <p className="font-editorial text-2xl text-sphere-ink mt-1">
            {(summary.totalCustomers ?? meta.total ?? customers.length).toLocaleString()}
          </p>
          <span className="text-[10px] text-[#827E77] font-mono mt-0.5 block">Storefront clientele</span>
        </div>

        {/* 2. Active Accounts */}
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-700 block font-semibold">
            Active Accounts
          </span>
          <p className="font-editorial text-2xl text-emerald-800 mt-1">
            {(summary.activeCustomers ?? customers.filter(c => c.isActive).length).toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-700/80 font-mono mt-0.5 block">Permitted checkout access</span>
        </div>

        {/* 3. Deactivated Accounts */}
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-rose-700 block font-semibold">
            Restricted / Deactivated
          </span>
          <p className="font-editorial text-2xl text-rose-800 mt-1">
            {(summary.deactivatedCustomers ?? customers.filter(c => !c.isActive).length).toLocaleString()}
          </p>
          <span className="text-[10px] text-rose-700/80 font-mono mt-0.5 block">Session access revoked</span>
        </div>

        {/* 4. Cumulative Patron Revenue */}
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-blue-700 block font-semibold">
            Cumulative Revenue
          </span>
          <p className="font-editorial text-2xl text-blue-900 mt-1">
            {formatPrice(summary.totalCustomerRevenue || 0)}
          </p>
          <span className="text-[10px] text-blue-700/80 font-mono mt-0.5 block">Settled acquisitions</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#827E77] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by patron name, email address, or phone number..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none bg-white text-sphere-ink"
            />
          </div>

          {/* Account Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
          >
            <option value="all">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>

          {/* Registration Date Filter */}
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-[#EAE5DA] rounded-sm bg-white text-sphere-ink focus:border-sphere-ink focus:outline-none"
          >
            <option value="all">All Registration Dates</option>
            <option value="today">Registered Today</option>
            <option value="7d">Joined Past 7 Days</option>
            <option value="30d">Joined Past 30 Days</option>
          </select>

          {(search || status !== 'all' || dateRange !== 'all') && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-xs text-[#827E77] hover:text-sphere-ink underline self-start md:self-auto font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#827E77] uppercase font-semibold">Pulling Patron Directory...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto mb-3 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">Unable to Load Patrons</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-4">
              {error?.message || 'A network error or database readiness issue prevented loading the patron directory.'}
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
        ) : customers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-[#C8B293] mx-auto mb-3 opacity-60" />
            <h3 className="font-editorial text-xl text-sphere-ink mb-1">No Patrons Found</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mb-4">
              There are no registered customer records matching the specified criteria.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-3 px-4 font-semibold">Client Name</th>
                  <th className="py-3 px-4 font-semibold">Contact Email & Phone</th>
                  <th className="py-3 px-4 font-semibold">Member Since</th>
                  <th className="py-3 px-4 font-semibold">Acquisitions</th>
                  <th className="py-3 px-4 font-semibold">Lifetime Spend</th>
                  <th className="py-3 px-4 font-semibold">Account Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {customers.map((cust) => {
                  const isCurrentAdminSelf = currentAdmin?._id === cust._id;

                  return (
                    <tr key={cust._id} className="hover:bg-[#FCFAF7] transition-colors">
                      {/* Name & Initials */}
                      <td className="py-3.5 px-4 font-medium text-sphere-ink">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F2EFE9] border border-[#EAE5DA] text-sphere-ink flex items-center justify-center font-editorial text-sm font-semibold shrink-0">
                            {cust.name ? cust.name.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <Link
                              to={`/admin/customers/${cust._id}`}
                              className="font-semibold text-xs text-sphere-ink hover:underline block"
                            >
                              {cust.name || 'Anonymous Client'}
                            </Link>
                            <span className="text-[10px] text-[#827E77] font-mono block">
                              ID: {cust._id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] text-[#4A4742] flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-[#827E77]" />
                          <span>{cust.email}</span>
                        </div>
                        {cust.phone ? (
                          <div className="font-mono text-[10px] text-[#827E77] flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-[#827E77]" />
                            <span>{cust.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#A8A29E] italic">Phone not registered</span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#827E77] whitespace-nowrap">
                        {cust.createdAt
                          ? new Date(cust.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '—'}
                      </td>

                      {/* Total Orders */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#F2EFE9] text-sphere-ink rounded-xs font-semibold">
                          <ShoppingBag className="w-3 h-3 text-[#827E77]" />
                          <span>{cust.totalOrders || 0} order{cust.totalOrders !== 1 ? 's' : ''}</span>
                        </span>
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-sphere-ink">
                        {formatPrice(cust.lifetimeSpend || 0)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {cust.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                            <UserX className="w-3 h-3 text-rose-600" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/customers/${cust._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#635E56] hover:text-sphere-ink bg-[#FAF8F5] hover:bg-white border border-[#EAE5DA] rounded-sm transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Dossier</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(cust)}
                            disabled={isCurrentAdminSelf}
                            title={isCurrentAdminSelf ? 'Cannot modify own administrator account' : undefined}
                            className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-colors border ${
                              cust.isActive
                                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {cust.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-[#EAE5DA] bg-[#FAF8F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#827E77]">
            <div>
              Showing <span className="font-semibold text-sphere-ink">{(meta.page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-sphere-ink">{Math.min(meta.page * limit, meta.total)}</span> of{' '}
              <span className="font-semibold text-sphere-ink">{meta.total}</span> patrons
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="p-1.5 border border-[#EAE5DA] rounded-sm text-[#635E56] hover:text-sphere-ink hover:bg-white bg-[#FDFBF7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-mono text-xs font-semibold text-sphere-ink">
                Page {meta.page} of {meta.totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="p-1.5 border border-[#EAE5DA] rounded-sm text-[#635E56] hover:text-sphere-ink hover:bg-white bg-[#FDFBF7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Status Confirmation Modal */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-xl animate-fadeIn space-y-4">
            <div className="flex items-center gap-3 border-b border-[#EAE5DA] pb-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  statusModalUser.isActive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {statusModalUser.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-editorial text-lg text-sphere-ink">
                  {statusModalUser.isActive ? 'Deactivate Patron Account' : 'Reactivate Patron Account'}
                </h3>
                <p className="text-[11px] text-[#827E77] font-mono">{statusModalUser.email}</p>
              </div>
            </div>

            {statusActionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{statusActionError}</span>
              </div>
            )}

            <div className="text-xs text-[#635E56] space-y-2 leading-relaxed">
              {statusModalUser.isActive ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs">
                  <p className="font-semibold mb-1">Deactivation Notice:</p>
                  <p>
                    Deactivating this account will immediately revoke all active JWT authentication sessions and prevent the customer from logging in or placing new orders. Historical orders and payment transactions remain strictly preserved.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xs">
                  <p className="font-semibold mb-1">Reactivation Notice:</p>
                  <p>
                    Reactivating this account will restore standard customer login permissions and allow checkout access.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1 mt-3">
                  Administrative Reason / Reference Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patron requested voluntary suspension or suspicious checkout activity"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#EAE5DA]">
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateStatusMutation.isPending}
                onClick={handleConfirmStatusToggle}
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors ${
                  statusModalUser.isActive
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                } disabled:opacity-50`}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : statusModalUser.isActive ? (
                  'Confirm Deactivation'
                ) : (
                  'Confirm Activation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

