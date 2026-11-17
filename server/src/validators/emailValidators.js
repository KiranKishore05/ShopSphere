import { z } from 'zod';
import { EMAIL_EVENT_TYPES } from '../models/EmailOutbox.js';

const SENSITIVE_FORBIDDEN_KEYS = [
  'password',
  'passwordHash',
  'rawToken',
  'resetToken',
  'token',
  'razorpaySignature',
  'signature',
  'cardNumber',
  'cardDetails',
  'cvv',
  'secret'
];

/**
 * Validates that an object contains none of the known forbidden credential keys
 * before Zod parsing, providing explicit security assertion against accidental data leakage.
 */
export const assertNoSensitiveKeys = (data, path = '') => {
  if (!data || typeof data !== 'object') return;

  for (const key of Object.keys(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FORBIDDEN_KEYS.some(forbidden => lowerKey === forbidden.toLowerCase())) {
      throw new Error(`Security violation: Sensitive field '${path ? `${path}.${key}` : key}' must not be stored in email outbox templateData.`);
    }

    if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
      assertNoSensitiveKeys(data[key], path ? `${path}.${key}` : key);
    }
  }
};

const addressSnapshotSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).optional(),
  streetAddress: z.string().trim().min(1).max(200),
  apartment: z.string().trim().max(100).optional().default(''),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(60).default('India')
}).strict();

const orderItemSnapshotSchema = z.object({
  title: z.string().trim().min(1).max(150),
  name: z.string().trim().min(1).max(150).optional(),
  variantSku: z.string().trim().min(1).max(50).optional(),
  size: z.string().trim().min(1).max(20),
  color: z.string().trim().min(1).max(40),
  quantity: z.number().int().positive().max(50),
  price: z.number().nonnegative(),
  lineTotal: z.number().nonnegative()
}).strict();

export const welcomeTemplateDataSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required').max(80),
  exploreUrl: z.string().url('Explore URL must be a valid URL'),
  supportEmail: z.string().email().optional()
}).strict();

export const passwordResetTemplateDataSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required').max(80),
  encryptedTokenPayload: z.object({
    ciphertext: z.string().min(1, 'Ciphertext is required'),
    iv: z.string().length(32, 'IV must be a 32-character hex string (16 bytes)'),
    authTag: z.string().length(32, 'Auth tag must be a 32-character hex string (16 bytes)')
  }).strict(),
  expiresIn: z.string().default('1 hour')
}).strict();

export const orderConfirmedCodTemplateDataSchema = z.object({
  customerName: z.string().trim().min(1).max(80),
  orderNumber: z.string().trim().min(1).max(50),
  paymentMethod: z.literal('cod'),
  paymentStatus: z.enum(['pending', 'paid']).default('pending'),
  items: z.array(orderItemSnapshotSchema).min(1, 'At least one order item is required').max(100),
  shippingAddress: addressSnapshotSchema,
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  shippingFee: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  estimatedDeliveryDays: z.string().trim().max(50).default('3-5 business days'),
  orderDetailsUrl: z.string().url().optional()
}).strict();

export const orderConfirmedPaidTemplateDataSchema = z.object({
  customerName: z.string().trim().min(1).max(80),
  orderNumber: z.string().trim().min(1).max(50),
  paymentMethod: z.literal('razorpay'),
  paymentStatus: z.literal('paid'),
  razorpayPaymentId: z.string().trim().min(1).max(100).optional(),
  items: z.array(orderItemSnapshotSchema).min(1, 'At least one order item is required').max(100),
  shippingAddress: addressSnapshotSchema,
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  shippingFee: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  estimatedDeliveryDays: z.string().trim().max(50).default('3-5 business days'),
  orderDetailsUrl: z.string().url().optional()
}).strict();

export const paymentFailedTemplateDataSchema = z.object({
  customerName: z.string().trim().min(1).max(80),
  orderNumber: z.string().trim().min(1).max(50),
  razorpayOrderId: z.string().trim().min(1).max(100),
  failureReason: z.string().trim().max(250).default('Payment authorization declined'),
  retryPaymentUrl: z.string().url('Retry payment URL must be a valid URL'),
  orderDetailsUrl: z.string().url().optional()
}).strict();

export const orderShippedTemplateDataSchema = z.object({
  customerName: z.string().trim().min(1).max(80),
  orderNumber: z.string().trim().min(1).max(50),
  carrierName: z.string().trim().min(1).max(100),
  trackingNumber: z.string().trim().min(1).max(100),
  trackingUrl: z.string().url().optional(),
  orderDetailsUrl: z.string().url().optional()
}).strict();

export const orderDeliveredTemplateDataSchema = z.object({
  customerName: z.string().trim().min(1).max(80),
  orderNumber: z.string().trim().min(1).max(50),
  deliveredAt: z.string().trim().max(50).optional(),
  reviewUrl: z.string().url().optional(),
  orderDetailsUrl: z.string().url().optional()
}).strict();

export const orderCancelledTemplateDataSchema = z.object({
  customerName: z.string().trim().min(1).max(80),
  orderNumber: z.string().trim().min(1).max(50),
  cancellationReason: z.string().trim().max(300),
  refundSummary: z.string().trim().max(250),
  orderDetailsUrl: z.string().url().optional()
}).strict();

export const refundProcessedTemplateDataSchema = z.object({
  customerName: z.string().trim().min(1).max(80),
  orderNumber: z.string().trim().min(1).max(50),
  refundAmount: z.number().positive(),
  refundId: z.string().trim().max(100).optional(),
  refundMethod: z.string().trim().max(100).default('Original Payment Method')
}).strict();

export const adminOrderCreatedTemplateDataSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
  customerName: z.string().trim().min(1).max(80),
  total: z.number().nonnegative(),
  itemCount: z.number().int().positive(),
  paymentMethod: z.string().trim().min(1).max(30),
  paymentStatus: z.string().trim().min(1).max(30),
  adminOrderUrl: z.string().url().optional()
}).strict();

export const adminPaymentFailedTemplateDataSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
  customerName: z.string().trim().min(1).max(80),
  total: z.number().nonnegative(),
  paymentMethod: z.string().trim().min(1).max(30),
  failureReason: z.string().trim().max(250),
  adminOrderUrl: z.string().url().optional()
}).strict();

export const adminOrderCancelledTemplateDataSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
  customerName: z.string().trim().min(1).max(80),
  total: z.number().nonnegative(),
  paymentMethod: z.string().trim().min(1).max(30),
  paymentStatus: z.string().trim().min(1).max(30),
  cancellationReason: z.string().trim().max(300),
  adminOrderUrl: z.string().url().optional()
}).strict();

export const EVENT_TEMPLATE_SCHEMAS = {
  welcome_customer: welcomeTemplateDataSchema,
  password_reset_request: passwordResetTemplateDataSchema,
  order_confirmed_cod: orderConfirmedCodTemplateDataSchema,
  order_confirmed_paid: orderConfirmedPaidTemplateDataSchema,
  payment_failed: paymentFailedTemplateDataSchema,
  order_shipped: orderShippedTemplateDataSchema,
  order_delivered: orderDeliveredTemplateDataSchema,
  order_cancelled: orderCancelledTemplateDataSchema,
  refund_processed: refundProcessedTemplateDataSchema,
  admin_order_created: adminOrderCreatedTemplateDataSchema,
  admin_payment_failed: adminPaymentFailedTemplateDataSchema,
  admin_order_cancelled: adminOrderCancelledTemplateDataSchema
};

/**
 * Validates that templateData strictly adheres to the event-specific Zod schema
 * and contains no sensitive credentials.
 */
export const validateTemplateData = (eventType, templateData) => {
  if (!EMAIL_EVENT_TYPES.includes(eventType)) {
    throw new Error(`Unsupported email event type: '${eventType}'`);
  }

  // Pre-assertion: Block sensitive forbidden keys immediately
  assertNoSensitiveKeys(templateData);

  const schema = EVENT_TEMPLATE_SCHEMAS[eventType];
  if (!schema) {
    throw new Error(`No validation schema registered for email event: '${eventType}'`);
  }

  return schema.parse(templateData);
};

export const queueEmailParamsSchema = z.object({
  eventKey: z.string().trim().min(1, 'eventKey cannot be empty').max(150),
  eventType: z.enum(EMAIL_EVENT_TYPES, {
    required_error: 'eventType is required',
    invalid_type_error: 'Unsupported eventType'
  }),
  recipient: z.string().trim().email('Invalid recipient email address format'),
  templateData: z.record(z.any())
});

