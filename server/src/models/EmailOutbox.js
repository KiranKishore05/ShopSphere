import mongoose from 'mongoose';

export const EMAIL_EVENT_TYPES = [
  'welcome_customer',
  'password_reset_request',
  'order_confirmed_cod',
  'order_confirmed_paid',
  'payment_failed',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
  'refund_processed',
  'admin_order_created',
  'admin_payment_failed',
  'admin_order_cancelled'
];

export const EMAIL_OUTBOX_STATUSES = ['pending', 'processing', 'sent', 'failed'];

const EmailOutboxSchema = new mongoose.Schema({
  eventKey: {
    type: String,
    required: [true, 'eventKey is required for idempotency'],
    unique: true,
    trim: true,
    index: true
  },
  eventType: {
    type: String,
    required: [true, 'eventType is required'],
    enum: {
      values: EMAIL_EVENT_TYPES,
      message: 'Unsupported email event type: {VALUE}'
    },
    index: true
  },
  recipient: {
    type: String,
    required: [true, 'Recipient email address is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid recipient email address format']
  },
  templateData: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'templateData is required']
  },
  status: {
    type: String,
    required: true,
    enum: EMAIL_OUTBOX_STATUSES,
    default: 'pending',
    index: true
  },
  attempts: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  maxAttempts: {
    type: Number,
    required: true,
    default: 5,
    min: 1
  },
  nextAttemptAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  processingLeaseExpiresAt: {
    type: Date,
    default: null,
    index: true
  },
  lastError: {
    message: { type: String, default: null },
    statusCode: { type: Number, default: null },
    timestamp: { type: Date, default: null }
  },
  providerMessageId: {
    type: String,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for high-speed worker polling and crash recovery
EmailOutboxSchema.index({ status: 1, nextAttemptAt: 1, processingLeaseExpiresAt: 1 });
EmailOutboxSchema.index({ recipient: 1, createdAt: -1 });

export const EmailOutbox = mongoose.models.EmailOutbox || mongoose.model('EmailOutbox', EmailOutboxSchema);
export default EmailOutbox;

