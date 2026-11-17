import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required'],
    index: true
  },
  razorpayOrderId: {
    type: String,
    required: [true, 'Razorpay order ID is required'],
    index: true
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null,
    select: false
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required']
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'authorized', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  failureReason: {
    type: String,
    default: null
  },
  refundInfo: {
    refundId: { type: String },
    amount: { type: Number },
    reason: { type: String },
    refundedAt: { type: Date }
  },
  refunds: [{
    refundId: { type: String },
    amount: { type: Number },
    reason: { type: String },
    refundedAt: { type: Date }
  }]
}, {
  timestamps: true
});

PaymentSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpayPaymentId: { $type: 'string' }
    }
  }
);

export const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
export default Payment;
