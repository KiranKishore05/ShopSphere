import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  UserCheck,
  UserX,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { useAdminCustomer, useUpdateCustomerStatus } from '../../hooks/useAdmin';
import { useAuth } from '../../hooks/useAuth';

export default function AdminCustomerDetailPage() {
  const { id } = useParams();
  const { data: customerData, isLoading, isError, error, refetch } = useAdminCustomer(id);
  const updateStatusMutation = useUpdateCustomerStatus();
  const { user: currentAdmin } = useAuth();

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Resilient unwrapping: handles unwrapped { customer, summary, orders } or axios nested
  const customer =
    customerData?.customer ||
    customerData?.data?.customer ||
    customerData?.user ||
    null;

  const summary =
    customerData?.summary ||
    customerData?.data?.summary ||
    customerData?.metrics ||
    customerData?.data?.metrics ||
    {};

  const orders =
    customerData?.orders ||
    customerData?.data?.orders ||
    [];

  const addressesList =
    customer?.savedAddresses ||
    customer?.addresses ||
    [];

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-3" />
        <p className="text-xs text-[#827E77] uppercase font-semibold">Retrieving Patron Dossier...</p>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="p-8 bg-white border border-rose-200 rounded-sm text-center max-w-lg mx-auto my-12 animate-fadeIn">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h2 className="font-editorial text-2xl text-sphere-ink mb-2">Patron Dossier Not Found</h2>
        <p className="text-xs text-[#827E77] mb-6">
          {error?.message || 'The requested customer record does not exist or has been removed from the patron directory.'}
        </p>
        <Link
          to="/admin/customers"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Customer Directory</span>
        </Link>
      </div>
    );
  }

  const isCurrentAdminSelf = currentAdmin?._id === customer._id;

  const handleStatusToggle = async () => {
    setActionError('');
    try {
      const newStatus = !customer.isActive;
      const res = await updateStatusMutation.mutateAsync({
        id: customer._id,
        data: {
          isActive: newStatus,
          reason: statusReason.trim() || undefined
        }
      });

      setStatusModalOpen(false);
      setStatusReason('');
      setActionSuccess(
        res?.message || `Patron account '${customer.email}' successfully ${newStatus ? 'reactivated' : 'deactivated'}.`
      );
      setTimeout(() => setActionSuccess(''), 5000);
      refetch();
    } catch (err) {
      console.error('Customer status toggle error:', err);
      setActionError(err.message || 'Failed to update account status.');
    }
  };

  const getOrderStatusBadge = (st) => {
    switch (st) {
      case 'delivered':
        return <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-emerald-100 text-emerald-800 rounded-xs">Delivered</span>;
      case 'shipped':
        return <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-blue-100 text-blue-800 rounded-xs">Shipped</span>;
      case 'processing':
        return <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-amber-100 text-amber-800 rounded-xs">Processing</span>;
      case 'confirmed':
        return <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-purple-100 text-purple-800 rounded-xs">Confirmed</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-rose-100 text-rose-800 rounded-xs">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-zinc-100 text-zinc-800 rounded-xs">{st}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/customers"
            className="p-1.5 border border-[#EAE5DA] rounded-sm text-[#635E56] hover:text-sphere-ink hover:bg-white transition-colors"
            title="Back to Customer Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-editorial text-2xl font-normal text-sphere-ink">
                Patron Dossier: {customer.name || 'Anonymous Client'}
              </h1>
              {customer.isActive ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs uppercase font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs uppercase font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                  Deactivated
                </span>
              )}
            </div>
            <p className="text-xs text-[#827E77] font-sans mt-0.5">
              Member registered on{' '}
              {customer.createdAt
                ? new Date(customer.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                : '—'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            disabled={isCurrentAdminSelf}
            onClick={() => setStatusModalOpen(true)}
            title={isCurrentAdminSelf ? 'Cannot modify own administrator account' : undefined}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors border ${
              customer.isActive
                ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
            } disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5`}
          >
            {customer.isActive ? (
              <>
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate Account</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reactivate Account</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Success Banner */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm animate-fadeIn flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 4 Patron Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#827E77] block font-semibold">
            Lifetime Spend
          </span>
          <p className="font-editorial text-2xl text-sphere-ink mt-1">
            {formatPrice(summary.lifetimeSpend || 0)}
          </p>
          <span className="text-[10px] text-[#827E77] font-mono mt-0.5 block">Settled acquisitions</span>
        </div>

        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-purple-700 block font-semibold">
            Total Orders Placed
          </span>
          <p className="font-editorial text-2xl text-purple-900 mt-1">
            {summary.totalOrders || 0}
          </p>
          <span className="text-[10px] text-purple-700/80 font-mono mt-0.5 block">
            {summary.completedOrders || 0} delivered
          </span>
        </div>

        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-700 block font-semibold">
            Average Order Value
          </span>
          <p className="font-editorial text-2xl text-emerald-900 mt-1">
            {formatPrice(summary.averageOrderValue || 0)}
          </p>
          <span className="text-[10px] text-emerald-700/80 font-mono mt-0.5 block">Per settled checkout</span>
        </div>

        <div className="bg-white p-4 border border-[#EAE5DA] rounded-sm shadow-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-blue-700 block font-semibold">
            Saved Delivery Sites
          </span>
          <p className="font-editorial text-2xl text-blue-900 mt-1">
            {addressesList.length || 0}
          </p>
          <span className="text-[10px] text-blue-700/80 font-mono mt-0.5 block">Registered addresses</span>
        </div>
      </div>

      {/* Main Grid: Profile Info & Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Patron Account Profile */}
        <div className="space-y-6">
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-2">
              <User className="w-4 h-4 text-sphere-sand" />
              <h2 className="font-editorial text-lg text-sphere-ink">Identity & Authentication</h2>
            </div>

            <div className="text-xs space-y-3 text-sphere-charcoal">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Patron Full Name
                </span>
                <p className="font-semibold text-sphere-ink text-sm">{customer.name || 'Anonymous Client'}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Account Email
                </span>
                <p className="font-mono text-[11px] text-[#4A4742] flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-[#827E77]" />
                  <span>{customer.email}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Registered Telephony
                </span>
                <p className="font-mono text-[11px] text-[#4A4742] flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-[#827E77]" />
                  <span>{customer.phone || 'Not Registered'}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-[#F2EFE9]">
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Authorization Role
                </span>
                <span className="inline-block mt-1 font-mono text-[10px] uppercase px-2 py-0.5 rounded-xs bg-[#F2EFE9] text-sphere-ink font-semibold">
                  {customer.role}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Atelier Client ID
                </span>
                <span className="font-mono text-[11px] text-[#827E77] break-all">{customer._id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Delivery Destinations (Address Book) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-2">
              <MapPin className="w-4 h-4 text-sphere-sand" />
              <h2 className="font-editorial text-lg text-sphere-ink">Registered Delivery Address Book</h2>
            </div>

            {(!addressesList || addressesList.length === 0) ? (
              <p className="text-xs text-[#827E77] italic py-4">
                No delivery addresses have been recorded in this customer's address book.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addressesList.map((addr, idx) => (
                  <div
                    key={addr._id || idx}
                    className="p-4 border border-[#EAE5DA] rounded-sm bg-[#FAF8F5] text-xs space-y-1.5 relative"
                  >
                    {addr.isDefault && (
                      <span className="absolute top-3 right-3 text-[9px] uppercase font-semibold font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-xs">
                        Default
                      </span>
                    )}
                    <p className="font-semibold text-sphere-ink">{addr.fullName}</p>
                    <p className="text-[#635E56] leading-relaxed">
                      {addr.streetAddress || addr.street}
                      {addr.apartment && `, ${addr.apartment}`}
                      <br />
                      {addr.city}, {addr.state} — <span className="font-mono font-semibold">{addr.postalCode}</span>
                      <br />
                      <span className="text-[#827E77]">{addr.country}</span>
                    </p>
                    {addr.phone && (
                      <p className="font-mono text-[11px] text-[#827E77] pt-1 border-t border-[#EAE5DA]">
                        Phone: {addr.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Order History Table */}
      <div className="bg-white border border-[#EAE5DA] rounded-sm shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#EAE5DA] bg-[#FAF8F5] flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-lg text-sphere-ink">Acquisition & Order History</h2>
            <p className="text-[11px] text-[#827E77]">Chronological log of customer orders and payment settlements</p>
          </div>
          <span className="font-mono text-xs text-[#827E77]">
            {orders.length} order{orders.length !== 1 ? 's' : ''} logged
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ShoppingBag className="w-10 h-10 text-[#C8B293] mx-auto mb-2 opacity-50" />
            <h3 className="font-editorial text-base text-sphere-ink">No Orders Placed Yet</h3>
            <p className="text-xs text-[#827E77] max-w-sm mx-auto mt-1">
              This patron has not registered any checkouts or orders at the atelier.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-sphere-ink">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE5DA] text-[10px] uppercase tracking-widest text-[#827E77]">
                  <th className="py-3 px-4 font-semibold">Order Reference</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Fulfillment State</th>
                  <th className="py-3 px-4 font-semibold">Payment Channel</th>
                  <th className="py-3 px-4 font-semibold">Gateway Transaction ID</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9]">
                {orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-[#FCFAF7] transition-colors">
                    {/* Order Reference */}
                    <td className="py-3 px-4 font-mono font-semibold text-xs text-sphere-ink">
                      <Link to={`/admin/orders/${ord._id}`} className="hover:underline">
                        {ord.orderNumber}
                      </Link>
                      <span className="block text-[10px] text-[#827E77] font-sans font-normal">
                        {ord.items?.length || 0} item{ord.items?.length !== 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[#827E77] whitespace-nowrap">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Fulfillment Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getOrderStatusBadge(ord.orderStatus)}
                    </td>

                    {/* Payment Channel & Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] uppercase font-semibold text-sphere-ink">
                          {ord.paymentMethod === 'cod' ? 'COD' : 'Razorpay'}
                        </span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded-xs font-semibold ${
                            ord.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.paymentStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {ord.paymentStatus}
                        </span>
                      </div>
                    </td>

                    {/* Gateway ID */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[#635E56] whitespace-nowrap">
                      {(ord.paymentRecord?.razorpayPaymentId || ord.payment?.razorpayPaymentId) ? (
                        <span className="font-semibold text-sphere-ink">
                          {ord.paymentRecord?.razorpayPaymentId || ord.payment?.razorpayPaymentId}
                        </span>
                      ) : ord.paymentMethod === 'cod' ? (
                        <span className="text-[#827E77] italic">Cash Settlement</span>
                      ) : (
                        <span className="text-amber-700 italic">Awaiting Capture</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 font-mono font-bold text-xs text-sphere-ink">
                      {formatPrice(ord.total ?? ord.totalAmount ?? 0)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/admin/orders/${ord._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#635E56] hover:text-sphere-ink bg-[#FAF8F5] hover:bg-white border border-[#EAE5DA] rounded-sm transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Order</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Status Confirmation Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-xl animate-fadeIn space-y-4">
            <div className="flex items-center gap-3 border-b border-[#EAE5DA] pb-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  customer.isActive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {customer.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-editorial text-lg text-sphere-ink">
                  {customer.isActive ? 'Deactivate Patron Account' : 'Reactivate Patron Account'}
                </h3>
                <p className="text-[11px] text-[#827E77] font-mono">{customer.email}</p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="text-xs text-[#635E56] space-y-2 leading-relaxed">
              {customer.isActive ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs">
                  <p className="font-semibold mb-1">Notice of Deactivation:</p>
                  <p>
                    Deactivating this account will immediately revoke all active JWT sessions and block this customer from logging in or placing new orders. All historical orders and payment records will be preserved.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xs">
                  <p className="font-semibold mb-1">Notice of Reactivation:</p>
                  <p>
                    Reactivating this account will restore customer login and checkout permissions.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1 mt-3">
                  Administrative Justification / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patron requested suspension or suspicious checkout activity"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#EAE5DA]">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateStatusMutation.isPending}
                onClick={handleStatusToggle}
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors ${
                  customer.isActive
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                } disabled:opacity-50`}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : customer.isActive ? (
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

