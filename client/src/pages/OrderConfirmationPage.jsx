import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Package, Truck, ArrowRight, Printer, Clock, MapPin, CreditCard, ShoppingBag, Eye } from 'lucide-react';
import { useOrderDetail } from '../hooks/useOrders';
import SEO from '../components/common/SEO';

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const { data: order, isLoading, isError } = useOrderDetail(orderNumber);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="w-10 h-10 border-2 border-[#161513]/20 border-t-[#161513] rounded-full animate-spin mx-auto mb-4" />
        <p className="font-serif text-lg text-[#161513]">Retrieving your confirmation...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <h1 className="font-serif text-3xl text-[#161513] mb-4">Order Not Found</h1>
        <p className="text-sm text-[#827E77] mb-8">
          We could not locate order details for <strong className="text-[#161513]">{orderNumber}</strong>.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-[#34302C]"
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-fadeIn">
      <SEO title={`Order Confirmed #${order.orderNumber}`} description="Your ShopSphere order is confirmed." />

      {/* Success Hero Header */}
      <div className="text-center pb-8 border-b border-[#EAE5DA]">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <p className="text-xs uppercase tracking-wider text-[#827E77] font-semibold mb-1">
          Thank you for choosing ShopSphere
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#161513] font-bold mb-3">
          Your Order is Confirmed
        </h1>
        <p className="text-xs sm:text-sm text-[#827E77] max-w-md mx-auto">
          An official order confirmation has been registered. You will receive updates as your garments are packed and dispatched.
        </p>

        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3">
          <span className="px-3.5 py-1.5 bg-[#FBF9F5] border border-[#EAE5DA] text-[#161513] font-mono text-xs font-bold tracking-wider rounded-lg">
            #{order.orderNumber}
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold uppercase tracking-wider rounded-lg border border-emerald-200">
            Status: {order.orderStatus}
          </span>
          <button
            onClick={handlePrint}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#EAE5DA] text-xs font-semibold text-[#827E77] hover:text-[#161513] rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Expected Delivery Notice */}
      <div className="my-6 p-4 bg-[#FBF9F5] border border-[#EAE5DA] rounded-xl flex items-center gap-4">
        <Clock className="w-5 h-5 text-[#161513] shrink-0" />
        <div className="flex-1 text-xs sm:text-sm">
          <span className="text-[#827E77] block text-xs">Estimated Delivery Window:</span>
          <strong className="font-semibold text-[#161513]">
            {formatDate(minDelivery)} – {formatDate(maxDelivery)}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        {/* Shipping Address Snapshot */}
        <div className="bg-white p-5 border border-[#EAE5DA] rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EAE5DA] mb-3 text-[#161513]">
            <MapPin className="w-4 h-4 text-[#827E77]" />
            <h3 className="font-serif text-base font-bold">Delivery Address</h3>
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
        <div className="bg-white p-5 border border-[#EAE5DA] rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EAE5DA] mb-3 text-[#161513]">
            <CreditCard className="w-4 h-4 text-[#827E77]" />
            <h3 className="font-serif text-base font-bold">Payment Details</h3>
          </div>
          <div className="text-xs text-[#5A554E] space-y-2">
            <div className="flex justify-between">
              <span className="text-[#827E77]">Payment Method:</span>
              <span className="font-semibold uppercase tracking-wider">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Secure'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#827E77]">Payment Status:</span>
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
            <div className="flex justify-between pt-2 border-t border-[#EAE5DA]">
              <span className="text-[#827E77]">Order Date:</span>
              <span>{new Date(order.createdAt).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Item Snapshots */}
      <div className="bg-white p-6 border border-[#EAE5DA] rounded-2xl shadow-xs my-6">
        <h3 className="font-serif text-lg font-bold text-[#161513] pb-3 border-b border-[#EAE5DA] mb-4">
          Purchased Garments ({order.items?.length})
        </h3>
        <div className="divide-y divide-[#F2ECE4]">
          {order.items?.map((item, idx) => (
            <div key={`${item.variantSku}-${idx}`} className="py-3.5 flex items-center gap-4">
              <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-lg bg-[#FBF9F5] border border-[#EAE5DA] overflow-hidden flex items-center justify-center p-1 shrink-0">
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'}
                  alt={item.name}
                  className="max-w-full max-h-full w-auto h-auto object-contain object-center"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-[#161513] truncate">{item.name}</h4>
                <p className="text-[11px] text-[#827E77] mt-0.5">
                  Size: {item.size} • Color: {item.color?.name || item.color}
                </p>
                <p className="text-xs text-[#5A554E] mt-0.5">
                  Qty: {item.quantity} × ₹{item.unitPrice?.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-bold text-[#161513]">
                  ₹{item.lineTotal?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Price Breakdown */}
        <div className="pt-4 border-t border-[#EAE5DA] space-y-2 text-xs text-[#5A554E] mt-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{order.subtotal?.toLocaleString('en-IN')}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Promotional Discount ({order.couponCode})</span>
              <span>-₹{order.discount?.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{order.shippingFee === 0 ? 'Complimentary' : `₹${order.shippingFee}`}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxes & Duties (GST Included)</span>
            <span>₹0</span>
          </div>
          <div className="pt-3 border-t border-[#EAE5DA] flex justify-between items-baseline font-serif text-xl text-[#161513] font-bold">
            <span>Grand Total</span>
            <span>₹{order.total?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Continue Shopping & View Order Details */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#EAE5DA]">
        <Link
          to="/shop"
          className="text-xs font-semibold text-[#827E77] hover:text-[#161513] transition-colors"
        >
          ← Continue Shopping
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to={`/account/orders/${order.orderNumber}`}
            className="px-5 py-2.5 bg-[#161513] text-[#FDFBF7] text-xs uppercase font-semibold tracking-wider rounded-lg hover:bg-[#34302C] transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Order Details</span>
          </Link>
          <Link
            to="/account/orders"
            className="px-5 py-2.5 border border-[#EAE5DA] text-xs font-semibold text-[#161513] rounded-lg hover:border-[#161513] transition-colors"
          >
            <span>All Orders</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
