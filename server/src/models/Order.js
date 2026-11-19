import mongoose from 'mongoose';

const OrderItemSnapshotSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantSku: {
    type: String,
    required: true,
    uppercase: true
  },
  name: { type: String, required: true },
  size: { type: String, required: true },
  color: {
    name: { type: String, required: true },
    hexCode: { type: String, required: true }
  },
  image: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [OrderItemSnapshotSchema],
  shippingAddressSnapshot: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    streetAddress: { type: String, required: true },
    apartment: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  couponCode: { type: String, default: null },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cod'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'authorized', 'paid', 'failed', 'refund_pending', 'refunded'],
    default: 'pending',
    index: true
  },
  orderStatus: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned'],
    default: 'pending_payment',
    index: true
  },
  statusTimeline: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  trackingNumber: { type: String, default: '' },
  carrierName: { type: String, default: '' },
  idempotencyKey: { type: String, default: null },
  cancellationReason: { type: String, default: '' },
  cancelledAt: { type: Date },
  couponUsageApplied: { type: Boolean, default: false },
  couponUsageReleased: { type: Boolean, default: false },
  inventoryDeducted: { type: Boolean, default: false }
}, {
  timestamps: true
});

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, paymentStatus: 1, createdAt: -1 });
OrderSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' }
    }
  }
);

export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export default Order;
