import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle,
  Truck,
  Package,
  AlertCircle,
  XCircle,
  Printer,
  Loader2
} from 'lucide-react';
import { useOrderDetail, useCancelOrder } from '../hooks/useOrders';

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const { data: order, isLoading, isError, error } = useOrderDetail(orderNumber);
  const cancelOrderMutation = useCancelOrder();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of delivery plans');
  const [actionMessage, setActionMessage] = useState('');

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="w-10 h-10 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mx-auto mb-4" />
        <p className="font-editorial text-lg text-sphere-ink">Retrieving commission details...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <h1 className="font-editorial text-3xl text-sphere-ink mb-3">Order Not Found</h1>
        <p className="text-xs text-sphere-muted mb-6">
          Order <strong>{orderNumber}</strong> was not found in your account history.
        </p>
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium"
        >
          <span>Return to Orders</span>
        </Link>
      </div>
    );
  }

  const handleCancel = async () => {
    try {
      await cancelOrderMutation.mutateAsync({
        orderNumber: order.orderNumber,
        reason: cancelReason
      });
      setIsCancelModalOpen(false);
      setActionMessage('Your order was successfully cancelled.');
    } catch (err) {
      setActionMessage(err.message || 'Failed to cancel order.');
    }
  };

  const isCancellable = ['pending_payment', 'confirmed'].includes(order.orderStatus);

  // Status timeline steps
  const orderDate = new Date(order.createdAt);
  const minDelivery = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const maxDelivery = new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000);

  const steps = [
    { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle },
    { key: 'processing', label: 'Atelier Tailoring', icon: Package },
    { key: 'shipped', label: 'Dispatched & Courier', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle }
  ];

  const getStepStatus = (stepKey) => {
    if (order.orderStatus === 'cancelled') return 'cancelled';
    const hierarchy = ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = hierarchy.indexOf(order.orderStatus);
    const stepIndex = hierarchy.indexOf(stepKey);

    if (currentIndex >= stepIndex) return 'completed';
    return 'upcoming';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
      {/* Back Link */}
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-xs text-sphere-muted hover:text-sphere-ink transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Order Archives</span>
      </Link>

      {/* Header Banner */}
      <div className="bg-white p-6 border border-sphere-border shadow-luxury flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-editorial text-2xl sm:text-3xl text-sphere-ink font-normal">
              Order {order.orderNumber}
            </h1>
            <span
              className={`px-3 py-1 text-xs uppercase tracking-wider font-medium border ${
                order.orderStatus === 'confirmed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : order.orderStatus === 'cancelled'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {order.orderStatus.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-sphere-muted mt-1">
            Commissioned on {new Date(order.createdAt).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-sphere-border text-xs text-sphere-muted hover:text-sphere-ink transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
          {isCancellable && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              type="button"
              className="px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 text-xs uppercase tracking-wider font-medium transition-colors"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Visual Status Progress */}
      {order.orderStatus !== 'cancelled' ? (
        <div className="bg-white p-6 border border-sphere-border shadow-sm mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((st, i) => {
              const status = getStepStatus(st.key);
              const Icon = st.icon;
              return (
                <div key={st.key} className="flex flex-col items-center text-center p-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2.5 transition-colors ${
                      status === 'completed'
                        ? 'bg-sphere-ink text-sphere-ivory'
                        : 'bg-sphere-sand-light text-sphere-muted border border-sphere-border'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${status === 'completed' ? 'text-sphere-ink' : 'text-sphere-muted'}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-sphere-border flex items-center gap-2 text-xs text-sphere-charcoal justify-center">
            <Clock className="w-4 h-4 text-sphere-sand" />
            <span>
              Expected Atelier Delivery: <strong>{minDelivery.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – {maxDelivery.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</strong>
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 p-5 border border-red-200 text-red-900 text-xs mb-8 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5">Order Cancelled</strong>
            <p className="text-red-800">
              This order was cancelled on {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('en-IN') : 'record'}.
              {order.cancellationReason && ` Reason: "${order.cancellationReason}".`}
            </p>
          </div>
        </div>
      )}

      {/* Order Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Shipping Address */}
        <div className="bg-white p-6 border border-sphere-border shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-sphere-border mb-3 text-sphere-ink">
            <MapPin className="w-4 h-4 text-sphere-sand" />
            <h3 className="font-editorial text-base font-normal">Shipping Address</h3>
          </div>
          <div className="text-xs text-sphere-charcoal space-y-1">
            <p className="font-semibold text-sphere-ink">{order.shippingAddressSnapshot?.fullName}</p>
            <p>{order.shippingAddressSnapshot?.streetAddress}{order.shippingAddressSnapshot?.apartment ? `, ${order.shippingAddressSnapshot.apartment}` : ''}</p>
            <p>{order.shippingAddressSnapshot?.city}, {order.shippingAddressSnapshot?.state} - {order.shippingAddressSnapshot?.postalCode}</p>
            <p>{order.shippingAddressSnapshot?.country}</p>
            <p className="text-sphere-muted pt-1">Tel: {order.shippingAddressSnapshot?.phone}</p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white p-6 border border-sphere-border shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-sphere-border mb-3 text-sphere-ink">
            <CreditCard className="w-4 h-4 text-sphere-sand" />
            <h3 className="font-editorial text-base font-normal">Payment Information</h3>
          </div>
          <div className="text-xs text-sphere-charcoal space-y-2">
            <div className="flex justify-between">
              <span className="text-sphere-muted">Method:</span>
              <span className="font-medium uppercase tracking-wider">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Gateway'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sphere-muted">Payment Status:</span>
              <span className={`font-semibold uppercase tracking-wider ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {order.paymentStatus}
              </span>
            </div>
            {order.couponCode && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Coupon Applied:</span>
                <span>{order.couponCode}</span>
              </div>
            )}
            {order.trackingNumber && (
              <div className="flex justify-between pt-2 border-t border-sphere-border">
                <span className="text-sphere-muted">Tracking Code:</span>
                <span className="font-mono">{order.trackingNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white p-6 border border-sphere-border shadow-sm mb-8">
        <h3 className="font-editorial text-lg text-sphere-ink pb-3 border-b border-sphere-border mb-4">
          Commissions ({order.items?.length})
        </h3>
        <div className="divide-y divide-sphere-border">
          {order.items?.map((item, idx) => (
            <div key={idx} className="py-4 flex items-center gap-4">
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-20 object-cover bg-sphere-sand-light shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-sphere-ink truncate">{item.name}</h4>
                <p className="text-[11px] text-sphere-muted mt-0.5">
                  SKU: {item.variantSku} • Size: {item.size} • Color: {item.color?.name || item.color}
                </p>
                <p className="text-xs text-sphere-charcoal mt-1">
                  Qty: {item.quantity} × ₹{item.unitPrice?.toLocaleString('en-IN')}
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

        {/* Financial Summary */}
        <div className="pt-4 border-t border-sphere-border space-y-2 text-xs text-sphere-charcoal mt-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{order.subtotal?.toLocaleString('en-IN')}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Promotional Discount ({order.couponCode})</span>
              <span>-₹{order.discount?.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Packaging & Shipping</span>
            <span>{order.shippingFee === 0 ? 'Complimentary' : `₹${order.shippingFee}`}</span>
          </div>
          <div className="pt-3 border-t border-sphere-border flex justify-between items-baseline font-editorial text-xl text-sphere-ink font-normal">
            <span>Total Paid</span>
            <span>₹{order.total?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Activity Timeline Log */}
      <div className="bg-white p-6 border border-sphere-border shadow-sm">
        <h3 className="font-editorial text-lg text-sphere-ink pb-3 border-b border-sphere-border mb-4">
          Historical Audit Timeline
        </h3>
        <div className="space-y-4">
          {order.statusTimeline?.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-sphere-ink mt-1 shrink-0" />
              <div>
                <span className="font-semibold text-sphere-ink uppercase tracking-wider block">
                  {item.status.replace('_', ' ')}
                </span>
                <span className="text-[11px] text-sphere-muted block">
                  {new Date(item.timestamp).toLocaleString('en-IN')}
                </span>
                {item.note && <p className="text-xs text-sphere-charcoal mt-0.5">{item.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel Order Dialog */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sphere-ink/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white max-w-md w-full p-6 border border-sphere-border shadow-2xl animate-scaleUp">
            <h3 className="font-editorial text-xl text-sphere-ink mb-2">Cancel Order</h3>
            <p className="text-xs text-sphere-muted mb-4 leading-relaxed">
              Are you sure you wish to cancel order <strong>{order.orderNumber}</strong>? Reserved stock will be released back to the atelier catalogue.
            </p>

            <div className="mb-5">
              <label className="block text-[11px] uppercase tracking-wider text-sphere-muted mb-1 font-medium">
                Reason for Cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-sphere-border text-xs focus:border-sphere-ink focus:outline-none"
              >
                <option value="Change of delivery plans">Change of delivery plans</option>
                <option value="Selected wrong size or variant">Selected wrong size or variant</option>
                <option value="Found alternative styling piece">Found alternative styling piece</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Other customer preference">Other customer preference</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelOrderMutation.isPending}
                className="flex-1 py-2.5 bg-red-700 text-white text-xs uppercase tracking-luxury font-medium hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
              >
                {cancelOrderMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2.5 border border-sphere-border text-xs text-sphere-muted hover:text-sphere-ink"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
