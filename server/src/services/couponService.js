import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Atomically consumes coupon allocation for an order.
 * Guarantees:
 * - One successful order consumes exactly one coupon use.
 * - Concurrent verification and webhook requests cannot increment twice.
 * - Global usage limit is enforced atomically at consumption.
 * - Coupon active status, start date, and expiry are evaluated at final consumption.
 * - Handled within a multi-document ACID transaction when replica set transactions are supported.
 * - Automatic retry on transient write conflicts via session.withTransaction.
 */
export const consumeOrderCoupon = async (orderId, externalSession = null) => {
  let session = externalSession;
  let ownsSession = false;

  const canUseTransactions =
    mongoose.connection?.readyState === 1 &&
    typeof mongoose.startSession === 'function';

  if (!session && canUseTransactions) {
    try {
      session = await mongoose.startSession();
      ownsSession = true;
    } catch {
      session = null;
      ownsSession = false;
    }
  }

  const executeLogic = async (currentSession) => {
    const sessionOpts = currentSession ? { session: currentSession } : {};

    // 1. Fetch order within session or read
    const order = await Order.findById(orderId, null, sessionOpts);
    if (!order || !order.couponId) {
      return { consumed: false, reason: 'NO_COUPON' };
    }

    // 2. Check if coupon was already consumed (Idempotency Guard)
    if (order.couponUsageApplied) {
      return { consumed: false, alreadyApplied: true };
    }

    // 3. Validate coupon validity at consumption time
    const now = new Date();
    const coupon = await Coupon.findById(order.couponId, null, sessionOpts);
    if (!coupon || !coupon.isActive) {
      throw new AppError('This promotional voucher is no longer active.', 400, 'COUPON_INACTIVE');
    }

    if (coupon.startDate && new Date(coupon.startDate) > now) {
      throw new AppError('This promotional voucher is not yet active.', 400, 'COUPON_NOT_YET_ACTIVE');
    }

    if (new Date(coupon.expiryDate) < now) {
      throw new AppError('This promotional voucher has expired.', 400, 'COUPON_EXPIRED');
    }

    // 4. Atomically increment Coupon.usedCount enforcing global usage limit
    const updatedCoupon = await Coupon.findOneAndUpdate(
      {
        _id: coupon._id,
        isActive: true,
        expiryDate: { $gte: now },
        $or: [
          { usageLimit: null },
          { usageLimit: { $exists: false } },
          { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
        ]
      },
      { $inc: { usedCount: 1 } },
      { new: true, ...sessionOpts }
    );

    if (!updatedCoupon) {
      throw new AppError('This promotional voucher has reached its maximum global usage limit.', 400, 'COUPON_USAGE_EXCEEDED');
    }

    // 5. Atomically mark Order.couponUsageApplied = true with concurrency lock
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        couponUsageApplied: { $ne: true }
      },
      {
        $set: { couponUsageApplied: true }
      },
      { new: true, ...sessionOpts }
    );

    if (!updatedOrder) {
      // Another concurrent worker (e.g. concurrent webhook/verify) already marked it!
      // In standalone non-transaction mode, roll back the incremented counter
      if (!currentSession) {
        await Coupon.updateOne(
          { _id: coupon._id, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      }
      return { consumed: false, alreadyApplied: true };
    }

    return { consumed: true, coupon: updatedCoupon, order: updatedOrder };
  };

  if (session && ownsSession && typeof session.withTransaction === 'function') {
    let result = null;
    try {
      await session.withTransaction(async () => {
        result = await executeLogic(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  } else {
    return await executeLogic(session);
  }
};

/**
 * Atomically releases a previously consumed coupon usage count upon order cancellation.
 * Guarantees:
 * - Coupon usage is released exactly once.
 * - Concurrent cancellation requests cannot decrement twice.
 * - Abandoned or unpaid orders that never consumed usage cannot decrement counter.
 * - Counter can never become negative.
 * - Uses session.withTransaction when transactions are supported.
 */
export const releaseOrderCoupon = async (orderId, externalSession = null) => {
  let session = externalSession;
  let ownsSession = false;

  const canUseTransactions =
    mongoose.connection?.readyState === 1 &&
    typeof mongoose.startSession === 'function';

  if (!session && canUseTransactions) {
    try {
      session = await mongoose.startSession();
      ownsSession = true;
    } catch {
      session = null;
      ownsSession = false;
    }
  }

  const executeRelease = async (currentSession) => {
    const sessionOpts = currentSession ? { session: currentSession } : {};

    // 1. Atomically claim release on Order
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        couponId: { $ne: null },
        couponUsageApplied: true,
        couponUsageReleased: { $ne: true }
      },
      {
        $set: {
          couponUsageReleased: true,
          couponUsageApplied: false
        }
      },
      { new: true, ...sessionOpts }
    );

    if (!order) {
      // Order had no coupon, was abandoned (couponUsageApplied was false), or was already released
      return { released: false };
    }

    // 2. Atomically decrement coupon counter with non-negative guard
    const updatedCoupon = await Coupon.findOneAndUpdate(
      {
        _id: order.couponId,
        usedCount: { $gt: 0 }
      },
      {
        $inc: { usedCount: -1 }
      },
      { new: true, ...sessionOpts }
    );

    return { released: true, order, coupon: updatedCoupon };
  };

  if (session && ownsSession && typeof session.withTransaction === 'function') {
    let result = null;
    try {
      await session.withTransaction(async () => {
        result = await executeRelease(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  } else {
    return await executeRelease(session);
  }
};
