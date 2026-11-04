import User from '../models/User.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { AppError } from '../middleware/errorHandler.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check for existing user account
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('An account with this email address already exists.', 409, 'RESOURCE_CONFLICT', [
        { field: 'email', issue: 'Email already registered' }
      ]));
    }

    // Securely hash password with bcrypt
    const passwordHash = await User.hashPassword(password);

    // Create user record (role defaults to 'customer'; never accept client-provided role)
    const user = await User.create({
      name,
      email,
      passwordHash,
      phone: phone || '',
      role: 'customer'
    });

    // Generate JWT and set secure HTTP-only cookie
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Retrieve user including passwordHash for comparison
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return next(new AppError('Invalid email or password credentials.', 401, 'INVALID_CREDENTIALS'));
    }

    // Verify password hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password credentials.', 401, 'INVALID_CREDENTIALS'));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    // Issue new session JWT token
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    data: {
      message: 'Successfully logged out'
    }
  });
};

export const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        savedAddresses: req.user.savedAddresses || [],
        wishlist: req.user.wishlist || [],
        createdAt: req.user.createdAt
      }
    }
  });
};
