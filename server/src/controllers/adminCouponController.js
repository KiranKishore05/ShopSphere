import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/v1/admin/coupons
 * Paginated list of promotional codes with code search, status filters, and summary KPIs.
 */
export const getAdminCoupons = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { search, status } = req.query;
    const query = {};
    const now = new Date();

    // 1. Search by Coupon Code
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.code = { $regex: sanitized, $options: 'i' };
    }

    // 2. Status Filter
    if (status === 'active') {
      query.isActive = true;
      query.expiryDate = { $gte: now };
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.expiryDate = { $lt: now };
    }

    const [coupons, total, allCoupons] = await Promise.all([
      Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Coupon.countDocuments(query),
      Coupon.find().select('isActive expiryDate usedCount').lean()
    ]);

    // Aggregate summary metrics across all coupons in atelier collection
    const activeCoupons = allCoupons.filter(c => c.isActive && new Date(c.expiryDate) >= now).length;
    const inactiveCoupons = allCoupons.filter(c => !c.isActive).length;
    const expiredCoupons = allCoupons.filter(c => new Date(c.expiryDate) < now).length;
    const totalRedemptions = allCoupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

    const summary = {
      totalCoupons: allCoupons.length,
      activeCoupons,
      inactiveCoupons,
      expiredCoupons,
      totalRedemptions
    };

    res.status(200).json({
      success: true,
      data: {
        coupons,
        items: coupons,
        summary,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
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

    // Get order redemptions for this coupon
    const ordersCount = await Order.countDocuments({
      $or: [{ couponId: coupon._id }, { couponCode: coupon.code }]
    });

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
 * Safe deletion: Protects historical orders by preventing hard deletion of redeemed vouchers.
 */
export const deleteAdminCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return next(new AppError('Coupon not found.', 404, 'COUPON_NOT_FOUND'));
    }

    // Safety Guard: Check if coupon has been linked to historical orders
    const historicalUsageCount = await Order.countDocuments({
      $or: [{ couponId: coupon._id }, { couponCode: coupon.code }]
    });

    if (historicalUsageCount > 0) {
      return next(
        new AppError(
          `Cannot permanently delete promotion '${coupon.code}' because it is referenced by ${historicalUsageCount} historical order(s). To discontinue this promotion without corrupting purchase audit records, deactivate the coupon instead.`,
          400,
          'CANNOT_DELETE_REDEEMED_COUPON'
        )
      );
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
