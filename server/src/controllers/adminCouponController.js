import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/v1/admin/coupons
 * List all promotional codes with redemption counts.
 */
export const getAdminCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: {
        coupons
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/coupons/:id
 */
export const getAdminCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id).lean();
    if (!coupon) {
      return next(new AppError('Coupon not found.', 404, 'COUPON_NOT_FOUND'));
    }

    // Get recent orders using this coupon
    const ordersCount = await Order.countDocuments({ couponCode: coupon.code });

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          ...coupon,
          totalRedemptions: ordersCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/coupons
 */
export const createAdminCoupon = async (req, res, next) => {
  try {
    const data = req.body;
    const code = data.code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return next(new AppError(`Promotional code '${code}' already exists.`, 409, 'DUPLICATE_COUPON_CODE'));
    }

    const coupon = await Coupon.create({
      ...data,
      code
    });

    res.status(201).json({
      success: true,
      data: {
        coupon,
        message: `Promotion '${coupon.code}' created successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/coupons/:id
 */
export const updateAdminCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return next(new AppError('Coupon not found.', 404, 'COUPON_NOT_FOUND'));
    }

    const data = req.body;
    if (data.code) {
      const code = data.code.trim().toUpperCase();
      if (code !== coupon.code) {
        const existing = await Coupon.findOne({ _id: { $ne: coupon._id }, code });
        if (existing) {
          return next(new AppError(`Promotional code '${code}' already exists.`, 409, 'DUPLICATE_COUPON_CODE'));
        }
        data.code = code;
      }
    }

    Object.assign(coupon, data);
    await coupon.save();

    res.status(200).json({
      success: true,
      data: {
        coupon,
        message: `Promotion '${coupon.code}' updated successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/coupons/:id
 */
export const deleteAdminCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return next(new AppError('Coupon not found.', 404, 'COUPON_NOT_FOUND'));
    }

    await Coupon.findByIdAndDelete(coupon._id);

    res.status(200).json({
      success: true,
      data: {
        message: `Promotion '${coupon.code}' deleted successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};
