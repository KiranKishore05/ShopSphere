import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * PATCH /api/v1/users/me
 * Update authenticated customer profile (e.g. name, phone).
 * Email and role changes are restricted.
 */
export const updateMe = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          savedAddresses: user.savedAddresses,
          wishlist: user.wishlist,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
