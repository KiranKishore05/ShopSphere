import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/v1/admin/reviews
 * Administrative review moderation queue with filtering and search.
 */
export const getAdminReviews = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by moderation status
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    // Filter by rating
    if (req.query.rating && req.query.rating !== 'all') {
      const r = parseInt(req.query.rating, 10);
      if (r >= 1 && r <= 5) {
        filter.rating = r;
      }
    }

    // Filter by featured
    if (req.query.isFeatured !== undefined) {
      filter.isFeatured = req.query.isFeatured === 'true';
    }

    // Search by title or comment
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: searchRegex },
        { comment: searchRegex }
      ];
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('productId', 'name brand images slug')
        .populate('userId', 'name email')
        .populate('orderId', 'orderNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter)
    ]);

    // Summary counts for admin quick filters
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      Review.countDocuments({ status: 'pending' }),
      Review.countDocuments({ status: 'approved' }),
      Review.countDocuments({ status: 'rejected' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          _id: r._id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          status: r.status || (r.isApproved ? 'approved' : 'pending'),
          isApproved: r.isApproved,
          isFeatured: r.isFeatured,
          isVerifiedPurchase: r.isVerifiedPurchase,
          customer: {
            id: r.userId?._id,
            name: r.userId?.name || 'Customer',
            email: r.userId?.email || ''
          },
          product: {
            id: r.productId?._id,
            name: r.productId?.name || 'Garment',
            brand: r.productId?.brand || 'ShopSphere',
            slug: r.productId?.slug,
            image: r.productId?.images?.[0]?.url || ''
          },
          orderNumber: r.orderId?.orderNumber || '—',
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        })),
        counts: {
          total,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount
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
 * PATCH /api/v1/admin/reviews/:id/moderation
 * Approve, reject, or feature reviews.
 */
export const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return next(new AppError('Review not found.', 404, 'REVIEW_NOT_FOUND'));
    }

    const { status, isApproved, isFeatured } = req.body;

    if (status !== undefined) {
      review.status = status;
      review.isApproved = status === 'approved';
    } else if (isApproved !== undefined) {
      review.isApproved = isApproved;
      review.status = isApproved ? 'approved' : 'rejected';
    }

    if (isFeatured !== undefined) {
      review.isFeatured = isFeatured;
    }

    await review.save();
    await Review.calculateAverageRating(review.productId);

    res.status(200).json({
      success: true,
      data: {
        review: {
          _id: review._id,
          status: review.status,
          isApproved: review.isApproved,
          isFeatured: review.isFeatured
        },
        message: `Review has been marked as ${review.status}.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/reviews/:id
 * Permanently purge abusive reviews.
 */
export const deleteAdminReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return next(new AppError('Review not found.', 404, 'REVIEW_NOT_FOUND'));
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(id);
    await Review.calculateAverageRating(productId);

    res.status(200).json({
      success: true,
      data: {
        message: 'Review permanently removed from atelier records.'
      }
    });
  } catch (error) {
    next(error);
  }
};
