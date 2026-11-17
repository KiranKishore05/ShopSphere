import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  CheckCircle,
  Clock,
  Package,
  AlertTriangle,
  XCircle,
  User,
  CreditCard,
  Banknote,
  RotateCcw,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useAdminOrder, useUpdateOrderStatus } from '../../hooks/useAdmin';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const { data: orderData, isLoading, isError, error, refetch } = useAdminOrder(id);
  const updateStatusMutation = useUpdateOrderStatus();

  // Modal states
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  // Form states
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrierName, setCarrierName] = useState('BlueDart Express');
  const [statusNote, setStatusNote] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const order = orderData?.order || orderData?.data?.order || orderData;

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
        <p className="text-xs text-[#827E77] uppercase font-semibold">Retrieving Order Dossier...</p>
      </div>
    );
  }

  if (isError || !order || !order._id) {
    return (
      <div className="p-8 bg-white border border-red-200 rounded-sm text-center max-w-lg mx-auto my-12 animate-fadeIn">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h2 className="font-editorial text-2xl text-sphere-ink mb-2">Order Dossier Not Found</h2>
        <p className="text-xs text-[#827E77] mb-6">
          {error?.message || 'The requested fulfillment dossier does not exist in atelier records or could not be loaded.'}
        </p>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Orders Queue</span>
        </Link>
      </div>
    );
  }

  const handleStatusTransition = async (targetStatus, extraPayload = {}) => {
    setActionError('');
    setActionSuccess('');

    try {
      const res = await updateStatusMutation.mutateAsync({
        id: order._id,
        data: {
          orderStatus: targetStatus,
          ...extraPayload
        }
      });

      setShippingModalOpen(false);
      setCancelModalOpen(false);
      setReturnModalOpen(false);
      setStatusNote('');
      setCancellationReason('');
      setActionSuccess(res?.message || `Order successfully transitioned to '${targetStatus}'.`);
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      console.error('Update status error:', err);
      const serverMsg = err.response?.data?.message || err.message;
      setActionError(serverMsg || 'Failed to update order fulfillment status.');
    }
  };

  const currentStatus = order.orderStatus;
  const isPaidRazorpay = order.paymentMethod === 'razorpay' && order.paymentStatus === 'paid';
  const paymentRecord = order.paymentRecord;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="p-1.5 border border-[#EAE5DA] rounded-sm text-[#635E56] hover:text-sphere-ink hover:bg-white transition-colors"
            title="Back to Orders Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-editorial text-2xl font-normal text-sphere-ink">
                Fulfillment Dossier: {order.orderNumber}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs uppercase font-semibold bg-[#F2EFE9] text-sphere-ink">
                {order.orderStatus}
              </span>
            </div>
            <p className="text-xs text-[#827E77] font-sans mt-0.5">
              Acquisition logged on{' '}
              {new Date(order.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </p>
          </div>
        </div>

        {/* Dynamic Action Buttons based on valid state machine transitions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Confirmed -> Processing */}
          {currentStatus === 'confirmed' && (
            <button
              onClick={() =>
                handleStatusTransition('processing', {
                  note: 'Order package queued for tailoring inspection and luxury packing.'
                })
              }
              disabled={updateStatusMutation.isPending}
              className="px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors disabled:opacity-50"
            >
              Start Processing
            </button>
          )}

          {/* Processing -> Shipped */}
          {currentStatus === 'processing' && (
            <button
              onClick={() => setShippingModalOpen(true)}
              className="px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch via Courier</span>
            </button>
          )}

          {/* Shipped -> Delivered */}
          {currentStatus === 'shipped' && (
            <button
              onClick={() =>
                handleStatusTransition('delivered', {
                  note: 'Confirmed white-glove handover and recipient acknowledgment.'
                })
              }
              disabled={updateStatusMutation.isPending}
              className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-emerald-900 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Confirm Delivery</span>
            </button>
          )}

          {/* Delivered -> Return Requested */}
          {currentStatus === 'delivered' && (
            <button
              onClick={() => setReturnModalOpen(true)}
              className="px-3 py-2 border border-amber-300 text-amber-800 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-amber-50 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Initiate Return</span>
            </button>
          )}

          {/* Return Requested -> Returned */}
          {currentStatus === 'return_requested' && (
            <button
              onClick={() =>
                handleStatusTransition('returned', {
                  note: 'Returned garments received at atelier warehouse and restocked.'
                })
              }
              disabled={updateStatusMutation.isPending}
              className="px-4 py-2 bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-stone-900 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Confirm Garment Restocked</span>
            </button>
          )}

          {/* Cancellation options */}
          {['confirmed', 'processing', 'pending_payment'].includes(currentStatus) && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-3 py-2 border border-red-300 text-red-700 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Grid: Order Contents & Customer Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Itemized Manifest & Financial Ledger & Audit Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Manifest */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <h2 className="font-editorial text-lg text-sphere-ink border-b border-[#EAE5DA] pb-2">
              Itemized Garment Manifest
            </h2>

            <div className="divide-y divide-[#F2EFE9]">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        item.image ||
                        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=200&q=80'
                      }
                      alt={item.name}
                      className="w-14 h-18 object-cover rounded-xs border border-[#EAE5DA] bg-[#F7F4EC]"
                    />
                    <div>
                      <p className="font-semibold text-xs text-sphere-ink">{item.name}</p>
                      <p className="text-[11px] font-mono text-[#827E77]">SKU: {item.variantSku}</p>
                      <div className="text-[11px] text-[#635E56] flex items-center gap-2 mt-0.5">
                        <span>Size: {item.size}</span>
                        <span>•</span>
                        <span>Color: {item.color?.name || item.color}</span>
                        <span>•</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-xs text-sphere-ink">
                      {formatPrice(item.lineTotal || item.unitPrice * item.quantity)}
                    </p>
                    <p className="text-[10px] text-[#827E77]">
                      {formatPrice(item.unitPrice)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Ledger */}
            <div className="pt-4 border-t border-[#EAE5DA] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#635E56]">
                <span>Garment Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Privilege Coupon Discount {order.couponCode && `(${order.couponCode})`}</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#635E56]">
                <span>White-Glove Courier Logistics</span>
                <span>{order.shippingFee === 0 ? 'Complimentary' : formatPrice(order.shippingFee)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-[#635E56]">
                  <span>Goods & Services Tax (GST)</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-sphere-ink pt-2 border-t border-[#EAE5DA]">
                <span>Gross Settlement Total</span>
                <span className="font-editorial text-base">{formatPrice(order.total ?? order.totalAmount ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Status Progression Timeline */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <h2 className="font-editorial text-lg text-sphere-ink border-b border-[#EAE5DA] pb-2">
              Status Progression History & Audit Trail
            </h2>

            {!order.statusTimeline || order.statusTimeline.length === 0 ? (
              <p className="text-xs text-[#827E77]">No status progression events recorded.</p>
            ) : (
              <div className="space-y-4">
                {order.statusTimeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-sphere-sand mt-1 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase tracking-wider text-sphere-ink">
                          {item.status}
                        </span>
                        <span className="font-mono text-[11px] text-[#827E77]">
                          {new Date(item.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                      {item.note && <p className="text-xs text-[#635E56] mt-0.5">{item.note}</p>}
                      {item.updatedBy && (
                        <p className="text-[10px] text-[#827E77] font-mono mt-0.5">
                          Logged by: {item.updatedBy.name || item.updatedBy.email || 'Administrator'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Client Destination, Payment Record, & Dispatch */}
        <div className="space-y-6">
          {/* Client Destination Snapshot */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-2">
              <User className="w-4 h-4 text-sphere-sand" />
              <h2 className="font-editorial text-lg text-sphere-ink">Client Destination</h2>
            </div>

            <div className="text-xs space-y-2.5 text-sphere-charcoal">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Recipient Full Name
                </span>
                <p className="font-semibold text-sphere-ink">
                  {order.shippingAddressSnapshot?.fullName || order.shippingAddress?.fullName || order.userId?.name || 'Valued Client'}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Contact Telephony
                </span>
                <p className="font-mono">{order.shippingAddressSnapshot?.phone || order.shippingAddress?.phoneNumber || order.shippingAddress?.phone || order.userId?.phone || 'N/A'}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Account Email
                </span>
                <p className="font-mono text-[11px]">{order.userId?.email || 'Guest Client'}</p>
              </div>

              <div className="pt-2 border-t border-[#F2EFE9]">
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Delivery Destination
                </span>
                <p className="leading-relaxed mt-0.5">
                  {order.shippingAddressSnapshot?.streetAddress || order.shippingAddress?.streetAddress || order.shippingAddress?.addressLine1 || ''}
                  {(order.shippingAddressSnapshot?.apartment || order.shippingAddress?.apartment || order.shippingAddress?.addressLine2) && `, ${order.shippingAddressSnapshot?.apartment || order.shippingAddress?.apartment || order.shippingAddress?.addressLine2}`}
                  <br />
                  {order.shippingAddressSnapshot?.city || order.shippingAddress?.city || ''}, {order.shippingAddressSnapshot?.state || order.shippingAddress?.state || ''} —{' '}
                  <span className="font-mono font-semibold">
                    {order.shippingAddressSnapshot?.postalCode || order.shippingAddress?.postalCode || order.shippingAddress?.pincode || ''}
                  </span>
                  <br />
                  <span className="text-[#827E77]">{order.shippingAddressSnapshot?.country || order.shippingAddress?.country || 'India'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Payment & Gateway Record */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-2">
              <CreditCard className="w-4 h-4 text-sphere-sand" />
              <h2 className="font-editorial text-lg text-sphere-ink">Settlement Channel</h2>
            </div>

            <div className="text-xs space-y-2.5 text-sphere-charcoal">
              <div className="flex justify-between items-center">
                <span className="text-[#827E77]">Channel:</span>
                <span className="font-semibold uppercase text-sphere-ink font-mono">
                  {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Online'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#827E77]">Payment Status:</span>
                <span
                  className={`font-semibold uppercase px-2 py-0.5 text-[10px] rounded-xs ${
                    order.paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.paymentStatus === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>

              {/* Gateway Transaction Details for Razorpay */}
              {paymentRecord ? (
                <div className="pt-2 border-t border-[#F2EFE9] space-y-2 text-[11px]">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                      Razorpay Payment ID
                    </span>
                    <p className="font-mono text-[#635E56] break-all font-semibold">
                      {paymentRecord.razorpayPaymentId || 'Awaiting Payment'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                      Razorpay Order ID
                    </span>
                    <p className="font-mono text-[#827E77] break-all">
                      {paymentRecord.razorpayOrderId}
                    </p>
                  </div>

                  {paymentRecord.verifiedAt && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                        HMAC Signature Verification
                      </span>
                      <p className="font-mono text-emerald-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified on {new Date(paymentRecord.verifiedAt).toLocaleString('en-IN')}</span>
                      </p>
                    </div>
                  )}

                  {paymentRecord.failureReason && (
                    paymentRecord.paymentStatus === 'paid' || order.paymentStatus === 'paid' ? (
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xs text-[11px] text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Prior Attempt Notice (Historical):</span>
                        </div>
                        <p className="text-[#635E56] pl-5 leading-relaxed">
                          An earlier payment attempt was declined: &ldquo;{paymentRecord.failureReason}&rdquo;. The customer subsequently completed payment successfully.
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-xs text-red-800">
                        <span className="font-semibold block">Gateway Error:</span>
                        {paymentRecord.failureReason}
                      </div>
                    )
                  )}
                </div>
              ) : order.paymentMethod === 'cod' ? (
                <div className="pt-2 border-t border-[#F2EFE9] text-[11px] text-[#635E56]">
                  <p className="leading-relaxed">
                    Cash collection of <span className="font-bold text-sphere-ink">{formatPrice(order.total)}</span> upon white-glove handover. Marked paid automatically when delivered.
                  </p>
                </div>
              ) : (
                <div className="pt-2 border-t border-[#F2EFE9] text-[11px] text-[#827E77]">
                  <p>No external gateway transaction logged yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Courier Dispatch Meta (if shipped or delivered) */}
          {order.trackingNumber && (
            <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-2">
                <Truck className="w-4 h-4 text-sphere-sand" />
                <h2 className="font-editorial text-lg text-sphere-ink">Courier Dispatch</h2>
              </div>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#827E77]">Logistics Carrier:</span>
                  <span className="font-semibold text-sphere-ink">{order.carrierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#827E77]">AWB / Tracking #:</span>
                  <span className="font-mono font-bold text-sphere-ink">{order.trackingNumber}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Information (if cancelled) */}
          {order.orderStatus === 'cancelled' && (
            <div className="bg-red-50 p-6 border border-red-200 rounded-sm shadow-xs space-y-2 text-xs text-red-900">
              <h2 className="font-editorial text-base font-bold text-red-800 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-700" />
                <span>Order Cancelled</span>
              </h2>
              <p>
                <strong>Reason:</strong> {order.cancellationReason || 'No reason provided.'}
              </p>
              {order.cancelledAt && (
                <p className="text-[11px] text-red-700 font-mono">
                  Recorded on: {new Date(order.cancelledAt).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Dispatch / Mark Shipped */}
      {shippingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn space-y-4">
            <h3 className="font-editorial text-xl text-sphere-ink border-b border-[#EAE5DA] pb-2">
              Dispatch Order via Courier
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Logistics Carrier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BlueDart Express, Delhivery, DHL"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  AWB Tracking Number / Air Waybill *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BD-99482710IN"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Fulfillment Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Handed over to courier express pickup."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE5DA]">
                <button
                  type="button"
                  onClick={() => setShippingModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!trackingNumber.trim() || !carrierName.trim() || updateStatusMutation.isPending}
                  onClick={() =>
                    handleStatusTransition('shipped', {
                      carrierName: carrierName.trim(),
                      trackingNumber: trackingNumber.trim(),
                      note: statusNote.trim()
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    'Confirm Dispatch'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Authorize Cancellation */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b border-[#EAE5DA] pb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-editorial text-xl text-sphere-ink">Authorize Order Cancellation</h3>
            </div>

            {isPaidRazorpay ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xs text-xs text-red-800 leading-relaxed space-y-1.5">
                <p className="font-semibold">Automated Gateway Refund Policy Notice:</p>
                <p>
                  This order was settled online via Razorpay (₹{order.total}). Automated refund workflows are restricted in this environment to protect reconciliation. Please process the customer refund in your Razorpay Merchant Portal before cancelling.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs text-xs text-amber-800 leading-relaxed">
                Cancelling this order will release reserved inventory back into available atelier warehouse stock and log an immutable audit movement.
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Cancellation Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patron requested cancellation prior to tailoring dispatch."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE5DA]">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!cancellationReason.trim() || updateStatusMutation.isPending || isPaidRazorpay}
                  onClick={() =>
                    handleStatusTransition('cancelled', {
                      cancellationReason: cancellationReason.trim()
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-red-800 transition-colors disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    'Confirm Cancellation'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Initiate Return */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn space-y-4">
            <div className="flex items-center gap-3 text-amber-700 border-b border-[#EAE5DA] pb-2">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-editorial text-xl text-sphere-ink">Initiate Garment Return</h3>
            </div>

            <p className="text-xs text-sphere-charcoal leading-relaxed">
              Record a return request for order <span className="font-bold">{order.orderNumber}</span>. Once garments are received back at the atelier warehouse, advance status to "Returned" to complete stock replenishment.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Return Assessment Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Size exchange request / Fit adjustment"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE5DA] rounded-sm focus:border-sphere-ink focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE5DA]">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE5DA] text-xs font-semibold uppercase tracking-wider text-[#635E56] hover:bg-[#FAF8F5] rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateStatusMutation.isPending}
                  onClick={() =>
                    handleStatusTransition('return_requested', {
                      note: statusNote.trim() || 'Client initiated garment return request'
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Record Return Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
