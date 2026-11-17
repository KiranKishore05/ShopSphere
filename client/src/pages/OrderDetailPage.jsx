import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle2,
  Truck,
  Package,
  AlertCircle,
  XCircle,
  Printer,
  Loader2,
  Check
} from 'lucide-react';
import { useOrderDetail, useCancelOrder } from '../hooks/useOrders';
import SEO from '../components/common/SEO';

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const { data: order, isLoading, isError } = useOrderDetail(orderNumber);
  const cancelOrderMutation = useCancelOrder();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of delivery plans');
  const [actionMessage, setActionMessage] = useState('');

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="w-10 h-10 border-2 border-[#161513]/20 border-t-[#161513] rounded-full animate-spin mx-auto mb-4" />
        <p className="font-serif text-lg text-[#161513]">Retrieving order tracking...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <h1 className="font-serif text-3xl text-[#161513] mb-3">Order Not Found</h1>
        <p className="text-xs text-[#827E77] mb-6">
          Order <strong>{orderNumber}</strong> was not found in your account history.
        </p>
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold rounded-lg"
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
    { key: 'confirmed', label: 'Order Confirmed', description: 'Payment verified and order accepted' },
    { key: 'processing', label: 'Processing', description: 'Garments packed at atelier' },
    { key: 'shipped', label: 'Shipped', description: 'Dispatched via premier logistics' },
    { key: 'out_for_delivery', label: 'Out for Delivery', description: 'Arriving at destination today' },
    { key: 'delivered', label: 'Delivered', description: 'Successfully handed over' }
  ];

  const getStepStatus = (stepKey) => {
    if (order.orderStatus === 'cancelled') return 'cancelled';
    const hierarchy = ['pending_payment', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
    const currentIndex = hierarchy.indexOf(order.orderStatus);
    const stepIndex = hierarchy.indexOf(stepKey);

    if (currentIndex >= stepIndex) return 'completed';
    return 'upcoming';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fadeIn">
      <SEO title={`Order #${order.orderNumber} Tracking`} description={`Tracking timeline for order #${order.orderNumber}.`} />

      {/* Back Link */}
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#827E77] hover:text-[#161513] transition-colors mb-6 group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Order Archives</span>
      </Link>

      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 border border-[#EAE5DA] rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl text-[#161513] font-bold">
              Order {order.orderNumber}
            </h1>
            <span
              className={`px-3 py-1 text-xs uppercase tracking-wider font-semibold rounded-lg border ${
                order.orderStatus === 'confirmed' || order.orderStatus === 'delivered'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : order.orderStatus === 'cancelled'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {order.orderStatus.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-[#827E77] mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#EAE5DA] text-xs font-semibold text-[#827E77] hover:text-[#161513] rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
          {isCancellable && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              type="button"
              className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Two Column Layout: Tracking Timeline (Left) & Purchased Garments (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
        {/* Left Column: Visual Order Tracking Timeline */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 border border-[#EAE5DA] rounded-2xl shadow-xs">
          <h2 className="font-serif text-lg font-bold text-[#161513] pb-3.5 border-b border-[#EAE5DA] mb-6 flex items-center justify-between">
            <span>Order Tracking</span>
            {order.trackingNumber && (
              <span className="text-xs font-normal text-[#827E77]">Tracking: {order.trackingNumber}</span>
            )}
          </h2>

          {order.orderStatus !== 'cancelled' ? (
            <div className="relative pl-6 space-y-7 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#EAE5DA]">
              {steps.map((st) => {
                const status = getStepStatus(st.key);
                const isCompleted = status === 'completed';
                return (
                  <div key={st.key} className="relative flex items-start gap-4 text-xs">
                    {/* Status Circle */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 -ml-5 z-10 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[#F4EDE4] text-[#827E77] border border-[#D5CEC2]'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="w-2 h-2 rounded-full bg-[#A8A29A]" />}
                    </div>

                    <div className="flex-1 min-w-0 -mt-0.5">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-sm ${isCompleted ? 'text-[#161513]' : 'text-[#827E77]'}`}>
                          {st.label}
                        </span>
                        {isCompleted && (
                          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#827E77] mt-0.5 leading-relaxed">
                        {st.description}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 border-t border-[#EAE5DA] flex items-center gap-2 text-xs text-[#5A554E]">
                <Clock className="w-4 h-4 text-[#161513] shrink-0" />
                <span>
                  Estimated Delivery: <strong>{minDelivery.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – {maxDelivery.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Order Cancelled</strong>
                <p className="text-rose-800">
                  This order was cancelled on {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('en-IN') : 'record'}.
                  {order.cancellationReason && ` Reason: "${order.cancellationReason}".`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Garment Item Preview & Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 sm:p-6 border border-[#EAE5DA] rounded-2xl shadow-xs">
            <h3 className="font-serif text-base font-bold text-[#161513] pb-3 border-b border-[#EAE5DA] mb-4">
              Items in this Order ({order.items?.length})
            </h3>
            <div className="divide-y divide-[#F2ECE4]">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 flex items-center gap-3.5">
                  <div className="w-14 h-16 rounded-lg bg-[#FBF9F5] border border-[#EAE5DA] overflow-hidden flex items-center justify-center p-1 shrink-0">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'}
                      alt={item.name}
                      className="max-w-full max-h-full w-auto h-auto object-contain object-center"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-[#161513] truncate">{item.name}</h4>
                    <p className="text-[11px] text-[#827E77] mt-0.5">
                      Size: {item.size} • Qty: {item.quantity}
                    </p>
                    <p className="text-xs font-bold text-[#161513] mt-0.5">
                      ₹{item.lineTotal?.toLocaleString('en-IN') || item.unitPrice?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Snapshot */}
            <div className="pt-3 border-t border-[#EAE5DA] space-y-2 text-xs text-[#5A554E] mt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{order.subtotal?.toLocaleString('en-IN')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Discount</span>
                  <span>-₹{order.discount?.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{order.shippingFee === 0 ? 'Complimentary' : `₹${order.shippingFee}`}</span>
              </div>
              <div className="pt-2.5 border-t border-[#EAE5DA] flex justify-between font-bold text-sm text-[#161513]">
                <span>Total</span>
                <span>₹{order.total?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Destination & Payment Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Shipping Address */}
        <div className="bg-white p-5 sm:p-6 border border-[#EAE5DA] rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EAE5DA] mb-3 text-[#161513]">
            <MapPin className="w-4 h-4 text-[#827E77]" />
            <h3 className="font-serif text-base font-bold">Shipping Address</h3>
          </div>
          <div className="text-xs text-[#5A554E] space-y-1">
            <p className="font-bold text-[#161513]">{order.shippingAddressSnapshot?.fullName}</p>
            <p>{order.shippingAddressSnapshot?.streetAddress}{order.shippingAddressSnapshot?.apartment ? `, ${order.shippingAddressSnapshot.apartment}` : ''}</p>
            <p>{order.shippingAddressSnapshot?.city}, {order.shippingAddressSnapshot?.state} - {order.shippingAddressSnapshot?.postalCode}</p>
            <p>{order.shippingAddressSnapshot?.country}</p>
            <p className="text-[#827E77] pt-1">Tel: {order.shippingAddressSnapshot?.phone}</p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white p-5 sm:p-6 border border-[#EAE5DA] rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EAE5DA] mb-3 text-[#161513]">
            <CreditCard className="w-4 h-4 text-[#827E77]" />
            <h3 className="font-serif text-base font-bold">Payment Information</h3>
          </div>
          <div className="text-xs text-[#5A554E] space-y-2">
            <div className="flex justify-between">
              <span className="text-[#827E77]">Method:</span>
              <span className="font-semibold uppercase tracking-wider">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Gateway'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#827E77]">Status:</span>
              <span className={`font-semibold uppercase tracking-wider ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {order.paymentStatus}
              </span>
            </div>
            {order.couponCode && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Coupon:</span>
                <span>{order.couponCode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white max-w-md w-full p-6 border border-[#EAE5DA] rounded-2xl shadow-xl animate-scaleUp">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAE5DA] mb-4">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h3 className="font-serif text-lg font-bold text-[#161513]">Cancel Order</h3>
            </div>
            <p className="text-xs text-[#5A554E] mb-4">
              Are you sure you wish to cancel order #{order.orderNumber}? If this order was paid online, your refund will be automatically refunded to your original payment method.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-[#161513] uppercase tracking-wider mb-1.5">
                Reason for Cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-[#EAE5DA] rounded-lg text-xs bg-[#FDFBF7] focus:border-[#161513] focus:outline-hidden"
              >
                <option value="Change of delivery plans">Change of delivery plans</option>
                <option value="Ordered wrong size or colour">Ordered wrong size or colour</option>
                <option value="Found better pricing elsewhere">Found better pricing elsewhere</option>
                <option value="Duplicate order placed accidentally">Duplicate order placed accidentally</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelOrderMutation.isPending}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs uppercase font-semibold tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {cancelOrderMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2.5 border border-[#EAE5DA] rounded-lg text-xs font-semibold text-[#827E77] hover:text-[#161513] transition-colors"
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
