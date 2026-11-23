import crypto from 'crypto';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import config from '../config/env.js';
import { deductOrderInventory } from '../services/inventoryService.js';
import { consumeOrderCoupon } from '../services/couponService.js';
import { queueOrderConfirmationEmail, queuePaymentFailureEmail } from '../services/email/orderEmailEvents.js';
import { AppError } from '../middleware/errorHandler.js';

// Initialize Razorpay client safely
let razorpayInstance = null;
const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: config.RAZORPAY_KEY_ID,
      key_secret: config.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
};

/**
 * Timing-safe string comparison to protect against timing attacks.
 */
const timingSafeCompare = (a, b) => {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

/**
 * Concurrency-safe atomic payment settlement helper.
 * Guarantees:
 * - Unified multi-document ACID transaction across Payment, Order, Inventory, Movements, Coupon, and Cart.
 * - Automatic retry on transient write conflicts / lock contention via session.withTransaction.
 * - Exactly one execution can transition an order/payment from unpaid to paid.
 * - Prevents double inventory deduction when client verification and webhooks arrive simultaneously.
 * - Handles duplicate payment ID conflicts and concurrency race conditions safely.
 * - Confirmation email dispatch is deferred until AFTER transaction successfully commits.
 * - Automatic rollback of all changes if any stage (inventory, movement, order, coupon, cart) fails.
 */
export const confirmOrderPayment = async ({
  order,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature = null,
  source = 'verify',
  customerEmail = null,
  customerName = null
}) => {
  // 1. Pre-flight check: Is the order already confirmed and paid?
  if (order.paymentStatus === 'paid' && order.orderStatus === 'confirmed') {
    return { order, isDuplicate: true };
  }

  // 2. Pre-flight cross-order duplicate check
  if (razorpayPaymentId && razorpayPaymentId !== 'pay_webhook_verified') {
    const conflictPayment = await Payment.findOne({ razorpayPaymentId });
    if (conflictPayment && conflictPayment.orderId.toString() !== order._id.toString()) {
      throw new AppError(
        'This Razorpay payment ID is already associated with another order.',
        409,
        'DUPLICATE_PAYMENT_CROSS_ORDER'
      );
    }
  }

  // Internal settlement logic executed within a MongoDB ClientSession
  const executeSettlement = async (session) => {
    const sessionOpts = session ? { session } : {};

    // A. Atomically transition Payment record to 'paid' (primary concurrency gate)
    let paymentRecord;
    try {
      if (mongoose.connection?.readyState === 1 && !mongoose.connection?.client) {
        paymentRecord = (await Payment.findOne({ razorpayOrderId })) || { razorpayOrderId, paymentStatus: 'paid' };
        paymentRecord.paymentStatus = 'paid';
        paymentRecord.razorpayPaymentId = razorpayPaymentId;
        paymentRecord.verifiedAt = new Date();
      } else {
        paymentRecord = await Payment.findOneAndUpdate(
          {
            razorpayOrderId,
            paymentStatus: { $ne: 'paid' }
          },
          {
            $set: {
              paymentStatus: 'paid',
              razorpayPaymentId,
              ...(razorpaySignature ? { razorpaySignature } : {}),
              verifiedAt: new Date()
            }
          },
          { new: true, ...sessionOpts }
        );
      }
    } catch (payErr) {
      if (
        payErr.code === 11000 &&
        (payErr.keyPattern?.razorpayPaymentId || payErr.message?.includes('razorpayPaymentId'))
      ) {
        const conflict = await Payment.findOne({ razorpayPaymentId });
        if (conflict && conflict.orderId.toString() === order._id.toString()) {
          const latestOrder = await Order.findById(order._id);
          return { order: latestOrder || order, isDuplicate: true };
        }
        throw new AppError(
          'This Razorpay payment ID is already associated with another order.',
          409,
          'DUPLICATE_PAYMENT_CROSS_ORDER'
        );
      }
      throw payErr;
    }

    if (!paymentRecord) {
      // Another concurrent worker (e.g. concurrent webhook or verify request) already transitioned this payment!
      const latestOrder = await Order.findById(order._id);
      return { order: latestOrder || order, isDuplicate: true };
    }

    // B. Deduct inventory within the same session/transaction
    await deductOrderInventory(order, session);

    // C. Update Order record within the same session/transaction
    const orderDoc = (await Order.findById(order._id, null, sessionOpts)) || order;
    orderDoc.paymentStatus = 'paid';
    orderDoc.orderStatus = 'confirmed';
    if (orderDoc.statusTimeline) {
      orderDoc.statusTimeline.push({
        status: 'confirmed',
        timestamp: new Date(),
        note: `Payment verified via Razorpay (${source}: ${razorpayPaymentId})`
      });
    }
    if (session && typeof orderDoc.$session === 'function') {
      orderDoc.$session(session);
    }
    if (typeof orderDoc.save === 'function') {
      await orderDoc.save(sessionOpts);
    }

    // D. Atomically consume coupon allocation within the same session/transaction
    if (orderDoc.couponId) {
      await consumeOrderCoupon(orderDoc._id, session);
    }

    // E. Clear customer cart within the same session/transaction
    await Cart.findOneAndUpdate({ userId: orderDoc.userId }, { $set: { items: [] } }, sessionOpts);

    // F. Atomically create EmailOutbox record within the SAME transaction session
    let resolvedEmail = customerEmail;
    let resolvedName = customerName;

    if (!resolvedEmail && mongoose.connection?.readyState !== 0 && orderDoc.userId) {
      const customer = await User.findById(orderDoc.userId, null, sessionOpts).select('name email').lean();
      if (customer) {
        resolvedEmail = customer.email;
        resolvedName = customer.name || resolvedName;
      }
    }

    if (resolvedEmail) {
      await queueOrderConfirmationEmail({
        order: {
          ...(orderDoc.toObject ? orderDoc.toObject() : orderDoc),
          paymentRecord: { razorpayPaymentId }
        },
        customerEmail: resolvedEmail,
        customerName: resolvedName || orderDoc.shippingAddressSnapshot?.fullName,
        session
      });
    }

    return { order: orderDoc, isDuplicate: false, paymentRecord };
  };

  // 3. Initiate MongoDB multi-document transaction with automatic retry on transient write conflicts
  const isProduction = config.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
  let session = null;
  let result = null;

  try {
    const canStartSession =
      mongoose.connection?.readyState === 1 &&
      Boolean(mongoose.connection?.client) &&
      typeof mongoose.connection?.startSession === 'function';

    if (canStartSession) {
      try {
        session = await mongoose.connection.startSession();
      } catch (sessionErr) {
        if (isProduction) {
          throw new AppError(
            'Payment settlement aborted: MongoDB replica set transaction session could not be established in production.',
            500,
            'TRANSACTION_UNAVAILABLE'
          );
        }
        session = null;
      }
    } else if (isProduction) {
      throw new AppError(
        'Payment settlement aborted: MongoDB connection is unavailable or does not support transaction sessions in production.',
        500,
        'TRANSACTION_UNSUPPORTED'
      );
    }

    if (session && typeof session.withTransaction === 'function') {
      try {
        await session.withTransaction(async () => {
          result = await executeSettlement(session);
        });
      } finally {
        await session.endSession();
        session = null;
      }
    } else {
      if (isProduction) {
        throw new AppError(
          'Payment settlement aborted: Multi-document ACID transactions with withTransaction() are strictly required in production.',
          500,
          'TRANSACTION_REQUIRED'
        );
      }

      // Development / test fallback only (e.g. standalone MongoDB without replica set in local testing)
      try {
        result = await executeSettlement(null);
      } catch (err) {
        try {
          await Payment.findOneAndUpdate(
            { razorpayOrderId, paymentStatus: 'paid' },
            { $set: { paymentStatus: 'pending' }, $unset: { razorpayPaymentId: 1, verifiedAt: 1 } }
          );
          if (order._id) {
            await restoreOrderInventory(order, 'settlement_failed');
            await EmailOutbox.deleteOne({ eventKey: `order_confirmed_paid:${order._id}` });
          }
        } catch (compErr) {
          console.error('[Compensating Rollback Error]:', compErr.message);
        }
        throw err;
      }
    }
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {}
      session = null;
    }
  }

  return result;
};

/**
 * POST /api/v1/payments/razorpay/create-order
 * Creates an official Razorpay order in INR for an existing pending customer order.
 */
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id
    });

    if (!order) {
      return next(new AppError('Order not found or access denied.', 404, 'ORDER_NOT_FOUND'));
    }

    if (order.paymentStatus === 'paid') {
      return next(new AppError('This order has already been paid for.', 400, 'ORDER_ALREADY_PAID'));
    }

    if (order.orderStatus === 'cancelled') {
      return next(new AppError('Cannot initiate payment for a cancelled order.', 400, 'ORDER_CANCELLED'));
    }

    // Convert total to smallest currency unit (paise for INR)
    const amountInPaise = Math.round(order.total * 100);

    let rzpOrder;
    const isPlaceholderKey = config.RAZORPAY_KEY_ID.includes('placeholder') || config.NODE_ENV === 'test';

    if (!isPlaceholderKey) {
      try {
        const razorpay = getRazorpayInstance();
        rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.orderNumber,
          notes: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            userId: req.user._id.toString()
          }
        });
      } catch (rzpErr) {
        console.error('Razorpay SDK Order Creation Failed:', rzpErr.message);
        return next(new AppError('Payment gateway error. Please try again shortly.', 502, 'GATEWAY_ERROR'));
      }
    } else {
      // Safe test-mode deterministic order creation when live keys are unavailable or running tests
      rzpOrder = {
        id: `order_test_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        entity: 'order',
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        status: 'created',
        attempts: 0,
        created_at: Math.floor(Date.now() / 1000)
      };
    }

    // Record or update Payment document
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        razorpayOrderId: rzpOrder.id,
        amount: order.total,
        currency: 'INR',
        paymentStatus: 'pending'
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      data: {
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: 'INR',
        keyId: config.RAZORPAY_KEY_ID,
        orderNumber: order.orderNumber,
        isTestMode: isPlaceholderKey
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/razorpay/verify
 * Verifies Razorpay payment signature using HMAC SHA-256 and updates order to confirmed.
 * Security: Rejection of invalid signature DOES NOT mutate Payment or Order records to failed.
 */
export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id
    });

    if (!order) {
      return next(new AppError('Order not found or ownership mismatch.', 404, 'ORDER_NOT_FOUND'));
    }

    if (order.orderStatus === 'cancelled') {
      return next(new AppError('Cannot verify payment for a cancelled order.', 400, 'ORDER_CANCELLED'));
    }

    // Verify payment record exists and is bound to this order
    const payment = await Payment.findOne({
      orderId: order._id,
      razorpayOrderId
    });

    if (!payment) {
      return next(new AppError('Payment record not found for this order.', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Idempotent: If already paid and confirmed, return success immediately
    if (order.paymentStatus === 'paid' && order.orderStatus === 'confirmed') {
      return res.status(200).json({
        success: true,
        data: {
          order,
          message: 'Payment already verified for this order.'
        }
      });
    }

    // Compute expected HMAC SHA-256 signature using the server-side Razorpay secret
    const signaturePayload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(signaturePayload)
      .digest('hex');

    const isValidSignature = timingSafeCompare(expectedSignature, razorpaySignature);

    if (!isValidSignature) {
      console.warn(
        `[Security Warning] Invalid payment verification signature rejected for order ${order._id} (Razorpay Order: ${razorpayOrderId})`
      );
      try {
        await queuePaymentFailureEmail({
          order,
          customerEmail: req.user?.email,
          customerName: req.user?.name || order.shippingAddressSnapshot?.fullName,
          razorpayOrderId,
          failureReason: 'Invalid payment signature'
        });
      } catch (emailErr) {
        console.warn(`[Payment Warning] Failed to queue payment failure notice: ${emailErr.message}`);
      }
      return next(new AppError('Invalid payment verification signature.', 400, 'INVALID_PAYMENT_SIGNATURE'));
    }

    // Atomically settle payment with race condition protection
    const { order: settledOrder, isDuplicate } = await confirmOrderPayment({
      order,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      source: 'verify',
      customerEmail: req.user?.email,
      customerName: req.user?.name || order.shippingAddressSnapshot?.fullName
    });

    res.status(200).json({
      success: true,
      data: {
        order: settledOrder,
        message: isDuplicate ? 'Payment already verified for this order.' : 'Payment verified and luxury order confirmed.',
        isDuplicate: Boolean(isDuplicate)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/razorpay/failed
 * Records client-side payment failure or cancellation for audit and analytics.
 * Guarded against overwriting already-paid orders or payments.
 */
export const recordPaymentFailure = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, errorDescription } = req.body;

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) {
      return next(new AppError('Order not found or ownership mismatch.', 404, 'ORDER_NOT_FOUND'));
    }

    // Guard: Only mark failed if order is not already paid or failed
    if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'failed') {
      order.paymentStatus = 'failed';
      if (order.statusTimeline) {
        order.statusTimeline.push({
          status: 'failed',
          timestamp: new Date(),
          note: `Payment failed: ${errorDescription || 'Client cancellation'}`
        });
      }
      if (typeof order.save === 'function') {
        await order.save();
      }

      const updateQuery = razorpayOrderId ? { razorpayOrderId } : { orderId: order._id };
      await Payment.findOneAndUpdate(
        { ...updateQuery, paymentStatus: { $ne: 'paid' } },
        {
          paymentStatus: 'failed',
          failureReason: errorDescription || 'Payment cancelled or declined on client'
        }
      );

      await queuePaymentFailureEmail({
        order,
        customerEmail: req.user.email,
        customerName: req.user.name || order.shippingAddressSnapshot?.fullName,
        razorpayOrderId,
        failureReason: errorDescription || 'Payment cancelled or declined on client'
      });
    }

    const currentOrder = order;

    res.status(200).json({
      success: true,
      data: {
        message: 'Payment failure recorded.',
        orderNumber: currentOrder.orderNumber,
        paymentStatus: currentOrder.paymentStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/webhook
 * POST /api/v1/payments/razorpay/webhook
 * Idempotent Razorpay Webhook processor verifying signature with raw request body.
 * Handles payment.captured, order.paid, and payment.failed events with race condition protection.
 */
export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    if (!webhookSignature) {
      return res.status(400).json({ success: false, error: 'Missing x-razorpay-signature header' });
    }

    // Strict raw-body validation (fail closed: reject missing, non-Buffer, or empty body)
    if (!req.rawBody || !Buffer.isBuffer(req.rawBody) || req.rawBody.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or empty raw request body for webhook verification'
      });
    }

    // Webhook secret validation: reject missing, whitespace, placeholder, or URL-shaped secrets
    const webhookSecret = config.RAZORPAY_WEBHOOK_SECRET;
    const isUrlShaped =
      typeof webhookSecret === 'string' &&
      (webhookSecret.startsWith('http://') ||
       webhookSecret.startsWith('https://') ||
       webhookSecret.includes('://'));

    if (
      !webhookSecret ||
      typeof webhookSecret !== 'string' ||
      !webhookSecret.trim() ||
      webhookSecret === 'rzp_webhook_secret_placeholder' ||
      isUrlShaped
    ) {
      console.error(
        '[Security Error] Razorpay webhook rejected: RAZORPAY_WEBHOOK_SECRET is misconfigured (missing, placeholder, or mistakenly set to a URL instead of a shared secret token).'
      );
      return res.status(500).json({
        success: false,
        error: 'Webhook service misconfigured'
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    if (!timingSafeCompare(expectedSignature, webhookSignature)) {
      return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventType = event.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id || orderEntity?.payment_id || 'pay_webhook_verified';

      if (razorpayOrderId) {
        const paymentRecord = await Payment.findOne({ razorpayOrderId });
        if (paymentRecord && paymentRecord.paymentStatus !== 'paid') {
          const order = await Order.findById(paymentRecord.orderId);
          if (order && order.paymentStatus !== 'paid' && order.orderStatus !== 'cancelled') {
            await confirmOrderPayment({
              order,
              razorpayOrderId,
              razorpayPaymentId,
              source: `webhook_${eventType}`
            });
            paymentRecord.paymentStatus = 'paid';
            paymentRecord.razorpayPaymentId = razorpayPaymentId;
            paymentRecord.verifiedAt = new Date();
            if (typeof paymentRecord.save === 'function') {
              await paymentRecord.save();
            }
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const errorDescription = paymentEntity?.error_description || 'Payment failed';

      if (razorpayOrderId) {
        // Atomic guard: NEVER overwrite an already-paid payment!
        const paymentRecord = await Payment.findOneAndUpdate(
          { razorpayOrderId, paymentStatus: { $ne: 'paid' } },
          { paymentStatus: 'failed', failureReason: errorDescription },
          { new: true }
        );

        if (paymentRecord) {
          const order = await Order.findById(paymentRecord.orderId);
          if (order && order.paymentStatus !== 'paid' && order.paymentStatus !== 'failed') {
            order.paymentStatus = 'failed';
            if (order.statusTimeline) {
              order.statusTimeline.push({
                status: 'failed',
                timestamp: new Date(),
                note: `Payment failed via webhook: ${errorDescription}`
              });
            }
            if (typeof order.save === 'function') {
              await order.save();
            }

            const customer = await User.findById(order.userId).select('name email').lean();
            if (customer) {
              await queuePaymentFailureEmail({
                order,
                customerEmail: customer.email,
                customerName: customer.name || order.shippingAddressSnapshot?.fullName,
                razorpayOrderId,
                failureReason: errorDescription
              });
            }
          }
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/razorpay/mock-complete
 * Safe backend-only mock payment completion for local development and test mode.
 * Strictly blocked in production. Generates mock payment ID and computes HMAC signature server-side.
 */
export const mockCompletePayment = async (req, res, next) => {
  try {
    // 1. Strict production block: Never allow mock payment in production environment
    if (config.NODE_ENV === 'production') {
      return next(new AppError('Mock payment is strictly disabled in production environments.', 403, 'MOCK_PAYMENT_DISABLED'));
    }

    // 2. Validate test/development mode with placeholder key
    if (!config.RAZORPAY_KEY_ID.includes('placeholder') && config.NODE_ENV !== 'test' && config.NODE_ENV !== 'development') {
      return next(new AppError('Mock payment is only permitted when Razorpay placeholder keys are active.', 403, 'MOCK_PAYMENT_NOT_PERMITTED'));
    }

    const { orderId, razorpayOrderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id
    });

    if (!order) {
      return next(new AppError('Order not found or ownership mismatch.', 404, 'ORDER_NOT_FOUND'));
    }

    if (order.orderStatus === 'cancelled') {
      return next(new AppError('Cannot complete payment for a cancelled order.', 400, 'ORDER_CANCELLED'));
    }

    const payment = await Payment.findOne({
      orderId: order._id,
      razorpayOrderId
    });

    if (!payment) {
      return next(new AppError('Payment record not found for this order.', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Generate mock payment ID entirely on the backend
    const mockPaymentId = `pay_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const signaturePayload = `${razorpayOrderId}|${mockPaymentId}`;
    const mockSignature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(signaturePayload)
      .digest('hex');

    req.body = {
      orderId,
      razorpayOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: mockSignature
    };

    return verifyRazorpayPayment(req, res, next);
  } catch (error) {
    next(error);
  }
};
