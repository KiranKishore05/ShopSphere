import crypto from 'crypto';
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

    // Compute expected HMAC SHA-256 signature
    const signaturePayload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(signaturePayload)
      .digest('hex');

    const isValidSignature = timingSafeCompare(expectedSignature, razorpaySignature);

    if (!isValidSignature) {
      // Mark payment and order as failed
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { paymentStatus: 'failed', failureReason: 'Invalid payment signature' }
      );
      order.paymentStatus = 'failed';
      await order.save();

      await queuePaymentFailureEmail({
        order,
        customerEmail: req.user.email,
        customerName: req.user.name || order.shippingAddressSnapshot?.fullName,
        razorpayOrderId,
        failureReason: 'Invalid payment signature'
      });

      return next(new AppError('Invalid payment verification signature.', 400, 'INVALID_PAYMENT_SIGNATURE'));
    }

    // Pre-flight duplicate check: verify whether razorpayPaymentId is already claimed by another order
    const existingPaymentWithId = await Payment.findOne({ razorpayPaymentId });
    if (existingPaymentWithId) {
      if (existingPaymentWithId.orderId.toString() === order._id.toString()) {
        // Legitimate idempotent retry for the exact same order
        return res.status(200).json({
          success: true,
          data: {
            order,
            paymentStatus: 'paid',
            isDuplicate: true
          }
        });
      }

      console.error(
        `[Security Warning] Duplicate Razorpay payment ID ${razorpayPaymentId} attempted for order ${order._id}, but belongs to order ${existingPaymentWithId.orderId}`
      );
      return next(
        new AppError(
          'This Razorpay payment ID is already associated with another order.',
          409,
          'DUPLICATE_PAYMENT_CROSS_ORDER'
        )
      );
    }

    // Deduct inventory atomically with concurrency protection
    await deductOrderInventory(order);

    // Update Payment record
    try {
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        {
          paymentStatus: 'paid',
          razorpayPaymentId,
          razorpaySignature,
          verifiedAt: new Date()
        }
      );
    } catch (payErr) {
      if (
        payErr.code === 11000 &&
        (payErr.keyPattern?.razorpayPaymentId || payErr.message?.includes('razorpayPaymentId'))
      ) {
        const conflictPayment = await Payment.findOne({ razorpayPaymentId });
        if (conflictPayment && conflictPayment.orderId.toString() === order._id.toString()) {
          return res.status(200).json({
            success: true,
            data: {
              order,
              paymentStatus: 'paid',
              isDuplicate: true
            }
          });
        }
        return next(
          new AppError(
            'This Razorpay payment ID is already associated with another order.',
            409,
            'DUPLICATE_PAYMENT_CROSS_ORDER'
          )
        );
      }
      throw payErr;
    }

    // Update Order record
    order.paymentStatus = 'paid';
    order.orderStatus = 'confirmed';
    order.statusTimeline.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: `Payment verified via Razorpay. Reference: ${razorpayPaymentId}`
    });

    await order.save();

    // Atomically consume coupon allocation exactly once with concurrency protection
    if (order.couponId) {
      await consumeOrderCoupon(order._id);
    }

    // Clear customer cart
    await Cart.findOneAndUpdate({ userId: req.user._id }, { $set: { items: [] } });

    await queueOrderConfirmationEmail({
      order: {
        ...(order.toObject ? order.toObject() : order),
        paymentRecord: { razorpayPaymentId }
      },
      customerEmail: req.user.email,
      customerName: req.user.name || order.shippingAddressSnapshot?.fullName
    });

    res.status(200).json({
      success: true,
      data: {
        order,
        message: 'Payment verified and luxury order confirmed.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/razorpay/failed
 * Records client-side payment failure or cancellation for audit and analytics.
 */
export const recordPaymentFailure = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, errorDescription } = req.body;

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) {
      return next(new AppError('Order not found or ownership mismatch.', 404, 'ORDER_NOT_FOUND'));
    }

    if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'failed') {
      order.paymentStatus = 'failed';
      await order.save();

      const updateQuery = razorpayOrderId ? { razorpayOrderId } : { orderId: order._id };
      await Payment.findOneAndUpdate(
        updateQuery,
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

    res.status(200).json({
      success: true,
      data: {
        message: 'Payment failure recorded.',
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus
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
 * Handles payment.captured, order.paid, and payment.failed events.
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

    // Webhook secret validation (fail safely on missing, whitespace, or placeholder secret)
    const webhookSecret = config.RAZORPAY_WEBHOOK_SECRET;
    if (
      !webhookSecret ||
      typeof webhookSecret !== 'string' ||
      !webhookSecret.trim() ||
      webhookSecret === 'rzp_webhook_secret_placeholder'
    ) {
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
          // Pre-check: Detect whether razorpayPaymentId is already claimed by a different order
          if (razorpayPaymentId && razorpayPaymentId !== 'pay_webhook_verified') {
            const conflictPayment = await Payment.findOne({ razorpayPaymentId });
            if (conflictPayment && conflictPayment._id.toString() !== paymentRecord._id.toString()) {
              console.error(
                `[Webhook Security Warning] Webhook payment ID ${razorpayPaymentId} already claimed by order ${conflictPayment.orderId}, cannot apply to order ${paymentRecord.orderId}`
              );
              return res.status(200).json({
                status: 'ignored_cross_order_conflict',
                message: 'Payment ID already associated with another transaction'
              });
            }
          }

          const order = await Order.findById(paymentRecord.orderId);
          if (order && order.paymentStatus !== 'paid' && order.orderStatus !== 'cancelled') {
            await deductOrderInventory(order);

            paymentRecord.paymentStatus = 'paid';
            paymentRecord.razorpayPaymentId = razorpayPaymentId;
            paymentRecord.verifiedAt = new Date();
            try {
              await paymentRecord.save();
            } catch (saveErr) {
              if (
                saveErr.code === 11000 &&
                (saveErr.keyPattern?.razorpayPaymentId || saveErr.message?.includes('razorpayPaymentId'))
              ) {
                console.error(
                  `[Webhook Warning] Duplicate razorpayPaymentId ${razorpayPaymentId} caught during concurrent webhook execution.`
                );
                return res.status(200).json({ status: 'ok', note: 'duplicate_payment_handled' });
              }
              throw saveErr;
            }

            order.paymentStatus = 'paid';
            order.orderStatus = 'confirmed';
            order.statusTimeline.push({
              status: 'confirmed',
              timestamp: new Date(),
              note: `Payment confirmed via webhook (${eventType}: ${razorpayPaymentId})`
            });
            await order.save();

            if (order.couponId) {
              await consumeOrderCoupon(order._id);
            }

            await Cart.findOneAndUpdate({ userId: order.userId }, { $set: { items: [] } });

            const customer = await User.findById(order.userId).select('name email').lean();
            if (customer) {
              await queueOrderConfirmationEmail({
                order: {
                  ...(order.toObject ? order.toObject() : order),
                  paymentRecord: { razorpayPaymentId }
                },
                customerEmail: customer.email,
                customerName: customer.name || order.shippingAddressSnapshot?.fullName
              });
            }
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const errorDescription = paymentEntity?.error_description || 'Payment failed';

      if (razorpayOrderId) {
        const paymentRecord = await Payment.findOneAndUpdate(
          { razorpayOrderId },
          { paymentStatus: 'failed', failureReason: errorDescription },
          { new: true }
        );

        if (paymentRecord) {
          const order = await Order.findById(paymentRecord.orderId);
          if (order && order.paymentStatus !== 'paid' && order.paymentStatus !== 'failed') {
            order.paymentStatus = 'failed';
            await order.save();

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
