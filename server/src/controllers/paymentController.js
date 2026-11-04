import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import config from '../config/env.js';
import { deductOrderInventory } from '../services/inventoryService.js';
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
      // Mark payment as failed in audit
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { paymentStatus: 'failed', failureReason: 'Invalid payment signature' }
      );
      return next(new AppError('Invalid payment verification signature.', 400, 'INVALID_PAYMENT_SIGNATURE'));
    }

    // Deduct inventory atomically with concurrency protection
    await deductOrderInventory(order);

    // Update Payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        paymentStatus: 'paid',
        razorpayPaymentId,
        razorpaySignature,
        verifiedAt: new Date()
      }
    );

    // Update Order record
    order.paymentStatus = 'paid';
    order.orderStatus = 'confirmed';
    order.statusTimeline.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: `Payment verified via Razorpay. Reference: ${razorpayPaymentId}`
    });

    await order.save();

    // Increment coupon usage if applied
    if (order.couponId) {
      await Coupon.findByIdAndUpdate(order.couponId, { $inc: { usedCount: 1 } });
    }

    // Clear customer cart
    await Cart.findOneAndUpdate({ userId: req.user._id }, { $set: { items: [] } });

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
 * POST /api/v1/payments/razorpay/webhook
 * Idempotent Razorpay Webhook processor verifying signature with raw request body.
 */
export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    if (!webhookSignature) {
      return res.status(400).json({ success: false, error: 'Missing x-razorpay-signature header' });
    }

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (!timingSafeCompare(expectedSignature, webhookSignature)) {
      return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventType = event.event;

    if (eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const paymentRecord = await Payment.findOne({ razorpayOrderId });
        if (paymentRecord && paymentRecord.paymentStatus !== 'paid') {
          const order = await Order.findById(paymentRecord.orderId);
          if (order && order.paymentStatus !== 'paid') {
            await deductOrderInventory(order);

            paymentRecord.paymentStatus = 'paid';
            paymentRecord.razorpayPaymentId = razorpayPaymentId;
            paymentRecord.verifiedAt = new Date();
            await paymentRecord.save();

            order.paymentStatus = 'paid';
            order.orderStatus = 'confirmed';
            order.statusTimeline.push({
              status: 'confirmed',
              timestamp: new Date(),
              note: `Payment confirmed via webhook (${razorpayPaymentId})`
            });
            await order.save();

            if (order.couponId) {
              await Coupon.findByIdAndUpdate(order.couponId, { $inc: { usedCount: 1 } });
            }

            await Cart.findOneAndUpdate({ userId: order.userId }, { $set: { items: [] } });
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const errorDescription = paymentEntity?.error_description || 'Payment failed';

      if (razorpayOrderId) {
        await Payment.findOneAndUpdate(
          { razorpayOrderId },
          { paymentStatus: 'failed', failureReason: errorDescription }
        );
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};
