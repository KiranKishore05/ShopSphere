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
  FileText,
  User,
  MapPin,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { useAdminOrder, useUpdateOrderStatus } from '../../hooks/useAdmin';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const { data: order, isLoading, isError, refetch } = useAdminOrder(id);
  const updateStatusMutation = useUpdateOrderStatus();

  // Status Modal State
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrierName, setCarrierName] = useState('BlueDart Express');
  const [statusNote, setStatusNote] = useState('');
  const [actionError, setActionError] = useState('');

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
        <p className="text-xs text-[#827E77] uppercase font-semibold">Loading Order Dossier...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="p-8 bg-white border border-red-200 rounded-sm text-center">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h2 className="font-editorial text-xl text-sphere-ink mb-2">Order Not Found</h2>
        <p className="text-xs text-sphere-charcoal mb-4">
          The requested fulfillment dossier does not exist or could not be loaded.
        </p>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 px-4 py-2 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-wider rounded-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Orders Queue</span>
        </Link>
      </div>
    );
  }

  const handleStatusTransition = async (targetStatus, extraPayload = {}) => {
    setActionError('');
    try {
      await updateStatusMutation.mutateAsync({
        id: order._id,
        data: {
          orderStatus: targetStatus,
          ...extraPayload
        }
      });
      setShippingModalOpen(false);
      setCancelModalOpen(false);
      setStatusNote('');
    } catch (err) {
      console.error('Update status error:', err);
      setActionError(err.message || 'Failed to update order fulfillment status.');
    }
  };

  const currentStatus = order.orderStatus;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE5DA]">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="p-1.5 border border-[#EAE5DA] rounded-sm text-[#635E56] hover:text-sphere-ink hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
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

        {/* Dynamic Action Buttons based on valid state progression */}
        <div className="flex items-center gap-2">
          {currentStatus === 'confirmed' && (
            <button
              onClick={() => handleStatusTransition('processing', { note: 'Order package queued for tailoring and packing.' })}
              disabled={updateStatusMutation.isPending}
              className="px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors"
            >
              Start Processing
            </button>
          )}

          {currentStatus === 'processing' && (
            <button
              onClick={() => setShippingModalOpen(true)}
              className="px-4 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch / Ship</span>
            </button>
          )}

          {currentStatus === 'shipped' && (
            <button
              onClick={() => handleStatusTransition('delivered', { note: 'Confirmed final white-glove handover to recipient.' })}
              disabled={updateStatusMutation.isPending}
              className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-emerald-900 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Mark Delivered</span>
            </button>
          )}

          {['confirmed', 'processing'].includes(currentStatus) && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-3 py-2 border border-red-300 text-red-700 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Grid: Order Contents & Customer Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Order Items & Pricing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Card */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <h2 className="font-editorial text-lg text-sphere-ink border-b border-[#EAE5DA] pb-2">
              Itemized Garment Manifest
            </h2>

            <div className="divide-y divide-[#F2EFE9]">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=200&q=80'}
                      alt={item.name}
                      className="w-14 h-18 object-cover rounded-xs border border-[#EAE5DA] bg-[#F7F4EC]"
                    />
                    <div>
                      <p className="font-semibold text-xs text-sphere-ink">{item.name}</p>
                      <p className="text-[11px] font-mono text-[#827E77]">SKU: {item.sku}</p>
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
                    <p className="font-medium text-xs text-sphere-ink">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    <p className="text-[10px] text-[#827E77]">
                      {formatPrice(item.price)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Ledger */}
            <div className="pt-4 border-t border-[#EAE5DA] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#635E56]">
                <span>Garment Subtotal</span>
                <span>{formatPrice(order.subtotal || order.totalAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Privilege Discount</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#635E56]">
                <span>White-Glove Courier Logistics</span>
                <span>{order.shippingFee === 0 ? 'Complimentary' : formatPrice(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-[#635E56]">
                <span>Goods & Services Tax (GST)</span>
                <span>{formatPrice(order.taxAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-sphere-ink pt-2 border-t border-[#EAE5DA]">
                <span>Gross Settlement</span>
                <span className="font-editorial text-base">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Status Progression Timeline */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <h2 className="font-editorial text-lg text-sphere-ink border-b border-[#EAE5DA] pb-2">
              Status Progression History
            </h2>

            {order.statusHistory?.length === 0 ? (
              <p className="text-xs text-[#827E77]">No status history events logged.</p>
            ) : (
              <div className="space-y-4">
                {order.statusHistory?.map((hist, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-sphere-sand mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase tracking-wider text-sphere-ink">
                          {hist.status}
                        </span>
                        <span className="font-mono text-[11px] text-[#827E77]">
                          {new Date(hist.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                      {hist.note && <p className="text-xs text-[#635E56] mt-0.5">{hist.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Client, Shipping & Payment Information */}
        <div className="space-y-6">
          {/* Client & Shipping Destination */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-2">
              <User className="w-4 h-4 text-sphere-sand" />
              <h2 className="font-editorial text-lg text-sphere-ink">Client Destination</h2>
            </div>

            <div className="text-xs space-y-2 text-sphere-charcoal">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Recipient Full Name
                </span>
                <p className="font-semibold text-sphere-ink">{order.shippingAddress?.fullName}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Contact Telephony
                </span>
                <p className="font-mono">{order.shippingAddress?.phone}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Registered Account Email
                </span>
                <p className="font-mono">{order.userId?.email || 'N/A'}</p>
              </div>

              <div className="pt-2 border-t border-[#F2EFE9]">
                <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                  Courier Delivery Address
                </span>
                <p className="leading-relaxed">
                  {order.shippingAddress?.addressLine1}
                  {order.shippingAddress?.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                  <br />
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} —{' '}
                  <span className="font-mono font-semibold">{order.shippingAddress?.postalCode}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Payment Snapshot */}
          <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-2">
              <CreditCard className="w-4 h-4 text-sphere-sand" />
              <h2 className="font-editorial text-lg text-sphere-ink">Settlement Channel</h2>
            </div>

            <div className="text-xs space-y-2.5 text-sphere-charcoal">
              <div className="flex justify-between items-center">
                <span className="text-[#827E77]">Settlement Method:</span>
                <span className="font-semibold uppercase text-sphere-ink">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#827E77]">Payment Status:</span>
                <span className="font-semibold uppercase text-emerald-800">{order.paymentStatus}</span>
              </div>
              {order.paymentId && (
                <div className="pt-2 border-t border-[#F2EFE9]">
                  <span className="text-[10px] uppercase tracking-wider text-[#827E77] block font-semibold">
                    Gateway Transaction Token
                  </span>
                  <p className="font-mono text-[11px] text-[#635E56] break-all">
                    {order.paymentId?.razorpayPaymentId || order.paymentId?._id || 'Verified'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Courier Dispatch Meta (if shipped) */}
          {order.tracking && (
            <div className="bg-white p-6 border border-[#EAE5DA] rounded-sm shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-2">
                <Truck className="w-4 h-4 text-sphere-sand" />
                <h2 className="font-editorial text-lg text-sphere-ink">Courier Dispatch</h2>
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#827E77]">Carrier:</span>
                  <span className="font-semibold text-sphere-ink">{order.tracking.carrierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#827E77]">AWB / Tracking #:</span>
                  <span className="font-mono font-bold text-sphere-ink">{order.tracking.trackingNumber}</span>
                </div>
              </div>
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
                  placeholder="Handed over to BlueDart express courier courier pickup."
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
                  disabled={!trackingNumber.trim() || updateStatusMutation.isPending}
                  onClick={() =>
                    handleStatusTransition('shipped', {
                      carrierName: carrierName.trim(),
                      trackingNumber: trackingNumber.trim(),
                      note: statusNote.trim()
                    })
                  }
                  className="px-5 py-2 bg-[#161513] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#34302C] transition-colors disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? 'Dispatching...' : 'Confirm Dispatch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Order */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#EAE5DA] shadow-lg animate-fadeIn space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b border-[#EAE5DA] pb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-editorial text-xl text-sphere-ink">Authorize Order Cancellation</h3>
            </div>

            <p className="text-xs text-sphere-charcoal leading-relaxed">
              Cancelling this order will release reserved inventory back into available warehouse stock and write an immutable audit movement log.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#635E56] mb-1">
                  Cancellation Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client requested cancellation prior to tailoring dispatch."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
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
                  disabled={!statusNote.trim() || updateStatusMutation.isPending}
                  onClick={() =>
                    handleStatusTransition('cancelled', {
                      note: statusNote.trim()
                    })
                  }
                  className="px-5 py-2 bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-red-800 transition-colors disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
