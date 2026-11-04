import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import { buildEnrichedCart } from './cartController.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Reusable helper to validate a coupon against subtotal and user order history.
 * Returns { coupon, discountAmount } or throws an AppError.
 */
export const validateAndCalculateCoupon = async (couponCode, subtotal, userId) => {
  if (!couponCode) return { coupon: null, discountAmount: 0 };

  const coupon = await Coupon.findOne({
    code: couponCode.trim().toUpperCase(),
    isActive: true
  });

  if (!coupon) {
    throw new AppError('Invalid or inactive promotional code.', 404, 'COUPON_NOT_FOUND', [
      { field: 'couponCode', issue: `Code '${couponCode}' does not exist or is inactive` }
    ]);
  }

  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) {
    throw new AppError('This promotional campaign has not yet commenced.', 400, 'COUPON_NOT_STARTED');
  }

  if (coupon.expiryDate && coupon.expiryDate < now) {
    throw new AppError('This promotional code has expired.', 400, 'COUPON_EXPIRED');
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError('This promotion has reached its maximum total allocation limit.', 400, 'COUPON_USAGE_EXCEEDED');
  }

  if (subtotal < coupon.minOrderAmount) {
    throw new AppError(
      `This code requires a minimum luxury bag order of ₹${coupon.minOrderAmount.toLocaleString('en-IN')}.`,
      400,
      'COUPON_MIN_AMOUNT_NOT_MET',
      [{ field: 'minOrderAmount', issue: `Current: ₹${subtotal}, Required: ₹${coupon.minOrderAmount}` }]
    );
  }

  // Check per-user order limit
  if (userId && coupon.perUserLimit) {
    const userOrderCount = await Order.countDocuments({
      userId,
      couponCode: coupon.code,
      orderStatus: { $ne: 'cancelled' }
    });

    if (userOrderCount >= coupon.perUserLimit) {
      throw new AppError(
        'You have already redeemed this promotional code for your account.',
        400,
        'COUPON_PER_USER_LIMIT_EXCEEDED'
      );
    }
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else if (coupon.discountType === 'fixed') {
    discountAmount = coupon.discountValue;
  }

  // Discount cannot exceed subtotal
  discountAmount = Math.min(subtotal, Math.round(discountAmount));

  return { coupon, discountAmount };
};

/**
 * POST /api/v1/coupons/apply
 * Validates a coupon against customer's current cart and returns computed discount.
 */
export const applyCoupon = async (req, res, next) => {
  try {
    const { code, subtotal: requestedSubtotal } = req.body;

    let subtotal = requestedSubtotal;

    // If client didn't supply subtotal, compute live from customer's cart
    if (subtotal === undefined || subtotal === null) {
      const enrichedCart = await buildEnrichedCart(req.user._id);
      subtotal = enrichedCart.subtotal;
    }

    const { coupon, discountAmount } = await validateAndCalculateCoupon(code, subtotal, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderAmount: coupon.minOrderAmount,
          maxDiscountAmount: coupon.maxDiscountAmount
        },
        discountAmount,
        subtotal,
        discountedSubtotal: Math.max(0, subtotal - discountAmount),
        message: `Promotion '${coupon.code}' applied successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};
