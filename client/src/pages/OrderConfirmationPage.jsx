import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Package, Truck, ArrowRight, Printer, Clock, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import { useOrderDetail } from '../hooks/useOrders';

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const { data: order, isLoading, isError } = useOrderDetail(orderNumber);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="w-10 h-10 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mx-auto mb-4" />
        <p className="font-editorial text-lg text-sphere-ink">Retrieving your atelier confirmation...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <h1 className="font-editorial text-3xl text-sphere-ink mb-4">Order Not Found</h1>
        <p className="text-sm text-sphere-muted mb-8">
          We could not locate order details for <strong className="text-sphere-ink">{orderNumber}</strong>.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium"
        >
          <span>Return to Boutique</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Calculate delivery date estimation (3 to 5 business days from creation)
  const orderDate = new Date(order.createdAt);
  const minDelivery = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const maxDelivery = new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000);

  const formatDate = (date) =>
    date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      {/* Success Hero Header */}
      <div className="text-center pb-8 border-b border-sphere-border">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <p className="text-xs uppercase tracking-luxury text-sphere-sand font-medium mb-1">
          Thank you for choosing ShopSphere Atelier
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink font-normal mb-3">
          Your Order is Confirmed
        </h1>
        <p className="text-xs text-sphere-muted max-w-md mx-auto">
          An archival order confirmation has been registered for your account. You will receive updates as your garments are tailored and dispatched.
        </p>

        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3">
          <span className="px-3.5 py-1.5 bg-sphere-sand-light/40 border border-sphere-border text-sphere-ink font-mono text-xs font-semibold tracking-wider">
            {order.orderNumber}
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-medium uppercase tracking-wider rounded-sm border border-emerald-200">
            Status: {order.orderStatus}
          </span>
          <button
            onClick={handlePrint}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-sphere-border text-xs text-sphere-muted hover:text-sphere-ink transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Expected Delivery Notice */}
      <div className="my-8 p-4 bg-sphere-sand-light/20 border border-sphere-border flex items-center gap-4">
        <Clock className="w-5 h-5 text-sphere-sand shrink-0" />
        <div className="flex-1 text-xs">
          <span className="text-sphere-muted block">Estimated Delivery Window:</span>
          <strong className="font-medium text-sphere-ink text-sm">
            {formatDate(minDelivery)} – {formatDate(maxDelivery)}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
        {/* Shipping Address Snapshot */}
        <div className="bg-white p-5 border border-sphere-border shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-sphere-border mb-3 text-sphere-ink">
            <MapPin className="w-4 h-4 text-sphere-sand" />
            <h3 className="font-editorial text-base font-normal">Delivery Address Snapshot</h3>
          </div>
          <div className="text-xs text-sphere-charcoal space-y-1">
            <p className="font-medium text-sphere-ink">{order.shippingAddressSnapshot?.fullName}</p>
            <p>{order.shippingAddressSnapshot?.streetAddress}{order.shippingAddressSnapshot?.apartment ? `, ${order.shippingAddressSnapshot.apartment}` : ''}</p>
            <p>{order.shippingAddressSnapshot?.city}, {order.shippingAddressSnapshot?.state} - {order.shippingAddressSnapshot?.postalCode}</p>
            <p>{order.shippingAddressSnapshot?.country}</p>
            <p className="text-sphere-muted pt-1">Tel: {order.shippingAddressSnapshot?.phone}</p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white p-5 border border-sphere-border shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-sphere-border mb-3 text-sphere-ink">
            <CreditCard className="w-4 h-4 text-sphere-sand" />
            <h3 className="font-editorial text-base font-normal">Payment Details</h3>
          </div>
          <div className="text-xs text-sphere-charcoal space-y-2">
            <div className="flex justify-between">
              <span className="text-sphere-muted">Payment Method:</span>
              <span className="font-medium uppercase tracking-wider">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Secure'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sphere-muted">Payment Status:</span>
              <span className={`font-semibold uppercase tracking-wider ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {order.paymentStatus}
              </span>
            </div>
            {order.couponCode && (
              <div className="flex justify-between text-emerald-700">
                <span>Coupon Applied:</span>
                <span className="font-semibold">{order.couponCode}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-sphere-border">
              <span className="text-sphere-muted">Order Date:</span>
              <span>{new Date(order.createdAt).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Item Snapshots */}
      <div className="bg-white p-6 border border-sphere-border shadow-sm my-8">
        <h3 className="font-editorial text-lg text-sphere-ink pb-3 border-b border-sphere-border mb-4">
          Purchased Garments ({order.items?.length})
        </h3>
        <div className="divide-y divide-sphere-border">
          {order.items?.map((item, idx) => (
            <div key={`${item.variantSku}-${idx}`} className="py-4 flex items-center gap-4">
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
                  Quantity: {item.quantity} × ₹{item.unitPrice?.toLocaleString('en-IN')}
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

        {/* Detailed Price Breakdown */}
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
            <span>Shipping & Handling</span>
            <span>{order.shippingFee === 0 ? 'Complimentary' : `₹${order.shippingFee}`}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxes & Duties (GST Included)</span>
            <span>₹0</span>
          </div>
          <div className="pt-3 border-t border-sphere-border flex justify-between items-baseline font-editorial text-xl text-sphere-ink font-normal">
            <span>Grand Total</span>
            <span>₹{order.total?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white p-6 border border-sphere-border shadow-sm my-8">
        <h3 className="font-editorial text-lg text-sphere-ink pb-3 border-b border-sphere-border mb-4">
          Order Status Journey
        </h3>
        <div className="space-y-4">
          {order.statusTimeline?.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-sphere-ink mt-1 shrink-0" />
              <div>
                <span className="font-semibold text-sphere-ink uppercase tracking-wider block">
                  {step.status}
                </span>
                <span className="text-[11px] text-sphere-muted block">
                  {new Date(step.timestamp).toLocaleString('en-IN')}
                </span>
                {step.note && <p className="text-xs text-sphere-charcoal mt-0.5">{step.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-sphere-border">
        <Link
          to="/shop"
          className="text-xs uppercase tracking-luxury text-sphere-muted hover:text-sphere-ink transition-colors"
        >
          ← Continue Shopping
        </Link>
        <Link
          to="/account/orders"
          className="px-6 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-luxury font-medium hover:bg-sphere-charcoal transition-all shadow-luxury flex items-center gap-2"
        >
          <span>View Order History</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
