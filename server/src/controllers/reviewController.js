import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Resolve product ID from slug or ObjectId string.
 */
const resolveProductId = async (identifier) => {
  if (!identifier) return null;
  const trimmed = identifier.trim();
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    return new mongoose.Types.ObjectId(trimmed);
  }
  const product = await Product.findOne({ slug: trimmed.toLowerCase() }).select('_id');
  return product ? product._id : null;
};

/**
 * GET /api/v1/products/:productId/reviews
 * Public paginated review list with rating distribution breakdown.
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const rawId = req.params.productId || req.query.productId;
    const productId = await resolveProductId(rawId);

    if (!productId) {
      return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const sort = req.query.sort || 'newest';

    const filter = {
      productId,
      $or: [
        { status: 'approved' },
        { isApproved: true, status: { $ne: 'rejected' } }
      ]
    };

    if (req.query.rating) {
      const r = parseInt(req.query.rating, 10);
      if (r >= 1 && r <= 5) {
        filter.rating = r;
      }
    }

    let sortObj = { isFeatured: -1, createdAt: -1 };
    if (sort === 'highest_rating') {
      sortObj = { isFeatured: -1, rating: -1, createdAt: -1 };
    } else if (sort === 'lowest_rating') {
      sortObj = { isFeatured: -1, rating: 1, createdAt: -1 };
    }

    const [reviews, total, aggregateStats] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        {
          $match: {
            productId,
            $or: [
              { status: 'approved' },
              { isApproved: true, status: { $ne: 'rejected' } }
            ]
          }
        },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Build 5-star distribution breakdown
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumRatings = 0;
    let allReviewsCount = 0;

    aggregateStats.forEach((bucket) => {
      if (distribution[bucket._id] !== undefined) {
        distribution[bucket._id] = bucket.count;
        sumRatings += bucket._id * bucket.count;
        allReviewsCount += bucket.count;
      }
    });

    const averageRating = allReviewsCount > 0
      ? Math.round((sumRatings / allReviewsCount) * 10) / 10
      : 0;

    const breakdown = {
      5: { count: distribution[5], percentage: allReviewsCount ? Math.round((distribution[5] / allReviewsCount) * 100) : 0 },
      4: { count: distribution[4], percentage: allReviewsCount ? Math.round((distribution[4] / allReviewsCount) * 100) : 0 },
      3: { count: distribution[3], percentage: allReviewsCount ? Math.round((distribution[3] / allReviewsCount) * 100) : 0 },
      2: { count: distribution[2], percentage: allReviewsCount ? Math.round((distribution[2] / allReviewsCount) * 100) : 0 },
      1: { count: distribution[1], percentage: allReviewsCount ? Math.round((distribution[1] / allReviewsCount) * 100) : 0 }
    };

    res.status(200).json({
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          _id: r._id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          isVerifiedPurchase: r.isVerifiedPurchase,
          isFeatured: r.isFeatured,
          userName: r.userId?.name || 'Verified Client',
          userId: r.userId?._id || r.userId,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        })),
        summary: {
          averageRating,
          totalReviews: allReviewsCount,
          breakdown
        }
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reviews/eligibility/:productId
 * Authenticated customer review eligibility and existing review check.
 */
export const checkReviewEligibility = async (req, res, next) => {
  try {
    const rawId = req.params.productId;
    const productId = await resolveProductId(rawId);

    if (!productId) {
      return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));
    }

    // 1. Check if user already submitted a review
    const existingReview = await Review.findOne({
      productId,
      userId: req.user._id
    }).lean();

    // 2. Check if user has a delivered order for this product
    const deliveredOrder = await Order.findOne({
      userId: req.user._id,
      orderStatus: 'delivered',
      'items.productId': productId
    })
      .select('orderNumber createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const isEligible = Boolean(deliveredOrder);
    const canReview = isEligible && !existingReview;

    res.status(200).json({
      success: true,
      data: {
        isEligible,
        canReview,
        hasReviewed: Boolean(existingReview),
        existingReview: existingReview
          ? {
              _id: existingReview._id,
              rating: existingReview.rating,
              title: existingReview.title,
              comment: existingReview.comment,
              createdAt: existingReview.createdAt
            }
          : null,
        deliveredOrder: deliveredOrder
          ? {
              orderNumber: deliveredOrder.orderNumber,
              deliveredAt: deliveredOrder.createdAt
            }
          : null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/products/:productId/reviews
 * Submit a verified customer product review.
 */
export const createProductReview = async (req, res, next) => {
  try {
    const rawId = req.params.productId || req.body.productId;
    const productId = await resolveProductId(rawId);

    if (!productId) {
      return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));
    }

    const { rating, title, comment } = req.body;

    // 1. Prevent duplicate review for the same product
    const duplicate = await Review.findOne({
      productId,
      userId: req.user._id
    });

    if (duplicate) {
      return next(
        new AppError(
          'You have already submitted a review for this garment. You may edit your existing review instead.',
          409,
          'DUPLICATE_REVIEW'
        )
      );
    }

    // 2. Strict delivered-order verification
    const deliveredOrder = await Order.findOne({
      userId: req.user._id,
      orderStatus: 'delivered',
      'items.productId': productId
    }).sort({ createdAt: -1 });

    if (!deliveredOrder) {
      return next(
        new AppError(
          'Verified purchase required: You can only review products from delivered orders.',
          403,
          'REVIEW_ELIGIBILITY_FAILED'
        )
      );
    }

    // 3. Create review
    const review = await Review.create({
      productId,
      userId: req.user._id,
      orderId: deliveredOrder._id,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      isVerifiedPurchase: true,
      status: 'approved',
      isApproved: true
    });

    // 4. Ensure product rating stats are up to date
    await Review.calculateAverageRating(productId);

    const updatedProduct = await Product.findById(productId).select('averageRating reviewCount');

    res.status(201).json({
      success: true,
      data: {
        review: {
          _id: review._id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isVerifiedPurchase: review.isVerifiedPurchase,
          createdAt: review.createdAt
        },
        productStats: {
          averageRating: updatedProduct?.averageRating || review.rating,
          reviewCount: updatedProduct?.reviewCount || 1
        },
        message: 'Your verified garment review has been published.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/reviews/:id
 * Customer updates their own review.
 */
export const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return next(new AppError('Review not found.', 404, 'REVIEW_NOT_FOUND'));
    }

    // Customer ownership guard
    if (review.userId.toString() !== req.user._id.toString()) {
      return next(
        new AppError('You do not have permission to modify another customer’s review.', 403, 'FORBIDDEN_REVIEW_MODIFICATION')
      );
    }

    if (req.body.rating !== undefined) review.rating = req.body.rating;
    if (req.body.title !== undefined) review.title = req.body.title.trim();
    if (req.body.comment !== undefined) review.comment = req.body.comment.trim();

    await review.save();
    await Review.calculateAverageRating(review.productId);

    res.status(200).json({
      success: true,
      data: {
        review: {
          _id: review._id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          updatedAt: review.updatedAt
        },
        message: 'Review successfully updated.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/reviews/:id
 * Customer deletes their own review (or admin).
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return next(new AppError('Review not found.', 404, 'REVIEW_NOT_FOUND'));
    }

    if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(
        new AppError('You do not have permission to delete this review.', 403, 'FORBIDDEN_REVIEW_DELETION')
      );
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(id);
    await Review.calculateAverageRating(productId);

    res.status(200).json({
      success: true,
      data: {
        message: 'Review removed successfully.'
      }
    });
  } catch (error) {
    next(error);
  }
};
