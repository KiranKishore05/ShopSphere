import User from '../models/User.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/v1/wishlist
 * Retrieve all items in the authenticated user's wishlist with populated active product details.
 */
export const getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'wishlist',
        match: { isActive: true },
        select: 'name slug brand images basePrice gender variants category averageRating totalSalesCount isActive'
      })
      .lean();

    // Filter out any populated nulls (inactive/deleted products)
    const validWishlist = (user?.wishlist || []).filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        wishlist: validWishlist,
        totalItems: validWishlist.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/wishlist/items
 * Add an active product to the authenticated user's wishlist (idempotent / prevents duplicates).
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return next(new AppError('The requested product was not found or is no longer active.', 404, 'PRODUCT_NOT_FOUND'));
    }

    // $addToSet prevents duplicate entries
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { wishlist: product._id } },
      { new: true }
    ).populate({
      path: 'wishlist',
      match: { isActive: true },
      select: 'name slug brand images basePrice gender variants category averageRating totalSalesCount isActive'
    }).lean();

    const validWishlist = (updatedUser?.wishlist || []).filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        wishlist: validWishlist,
        totalItems: validWishlist.length,
        message: 'Product successfully added to your wishlist'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/wishlist/items/:productId
 * Remove a product from the authenticated user's wishlist.
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: productId } },
      { new: true }
    ).populate({
      path: 'wishlist',
      match: { isActive: true },
      select: 'name slug brand images basePrice gender variants category averageRating totalSalesCount isActive'
    }).lean();

    const validWishlist = (updatedUser?.wishlist || []).filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        wishlist: validWishlist,
        totalItems: validWishlist.length,
        message: 'Product removed from your wishlist'
      }
    });
  } catch (error) {
    next(error);
  }
};
