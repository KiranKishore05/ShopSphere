import crypto from 'node:crypto';
import User from '../models/User.js';
import config from '../config/env.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { AppError } from '../middleware/errorHandler.js';
import { queueEmail } from '../services/email/emailOutboxService.js';
import { encryptToken } from '../utils/emailTokenCrypto.js';

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

    // Queue welcome email via transactional outbox
    // Use stable deterministic eventKey to prevent duplicate emails upon retries
    try {
      await queueEmail({
        eventKey: `welcome_customer:${user._id.toString()}`,
        eventType: 'welcome_customer',
        recipient: user.email,
        templateData: {
          customerName: user.name,
          exploreUrl: `${config.APP_BASE_URL || 'https://shopsphere.in'}/shop`,
          supportEmail: config.EMAIL_SUPPORT_ADDRESS || 'support@shopsphere.in'
        }
      });
    } catch (emailErr) {
      // Outbox failure must not invalidate already completed account creation.
      // Use a fixed diagnostic message without logging emailErr.message, stack traces, email addresses, or sensitive details.
      const safeErrorCode = emailErr.code && typeof emailErr.code === 'string' ? ` [code: ${emailErr.code}]` : '';
      console.warn(`[Auth] Failed to queue welcome email for user ID ${user._id}${safeErrorCode}`);
    }

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

/**
 * Initiates customer password reset by generating a secure single-use token,
 * storing its SHA-256 hash in MongoDB, encrypting the raw token with AES-256-GCM,
 * and enqueueing a reset email in the durable outbox.
 * Returns a generic success response to mitigate account enumeration attacks.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Consistent response message to prevent account enumeration
    const genericResponse = {
      success: true,
      data: {
        message: 'If an account exists with this email address, password reset instructions have been sent.'
      }
    };

    if (!user || !user.isActive) {
      return res.status(200).json(genericResponse);
    }

    // 1. Generate 32 bytes cryptographically secure random token (64 hex characters)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // 2. Compute SHA-256 hash to store in MongoDB (never store raw reset token)
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    user.passwordResetToken = tokenHash;
    user.passwordResetExpires = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    // 3. Encrypt raw token payload using AES-256-GCM before queueing into outbox
    const encryptedTokenPayload = encryptToken(rawToken);

    // 4. Queue transactional password reset email
    try {
      await queueEmail({
        eventKey: `password_reset_request:${user._id.toString()}:${tokenHash.slice(0, 16)}`,
        eventType: 'password_reset_request',
        recipient: user.email,
        templateData: {
          customerName: user.name,
          encryptedTokenPayload,
          expiresIn: '1 hour'
        }
      });
    } catch (emailErr) {
      const safeErrorCode = emailErr.code && typeof emailErr.code === 'string' ? ` [code: ${emailErr.code}]` : '';
      console.warn(`[Auth] Failed to queue password reset email for user ID ${user._id}${safeErrorCode}`);
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * Completes password reset by atomically verifying and consuming the reset token,
 * setting the new bcrypt password hash, and unsetting reset token fields in a single
 * atomic findOneAndUpdate operation. This eliminates race conditions from concurrent
 * requests attempting to reuse the same token.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const token = req.body.token || req.query.token || req.params.token;
    const { password } = req.body;

    if (!token || typeof token !== 'string') {
      return next(new AppError('Password reset token is required.', 400, 'INVALID_RESET_TOKEN'));
    }

    // Compute SHA-256 hash of provided token to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Securely hash new password with bcrypt
    const passwordHash = await User.hashPassword(password);

    // Atomically find user with matching non-expired reset token and consume it.
    // The atomic findOneAndUpdate ensures that if two concurrent requests attempt
    // to consume the same token, only one can succeed; the other will find no matching document.
    const user = await User.findOneAndUpdate(
      {
        passwordResetToken: tokenHash,
        passwordResetExpires: { $gt: new Date() }
      },
      {
        $set: {
          passwordHash,
          passwordChangedAt: new Date()
        },
        $unset: { passwordResetToken: 1, passwordResetExpires: 1 }
      },
      { new: true }
    );

    if (!user) {
      return next(new AppError('Password reset link is invalid or has expired.', 400, 'INVALID_RESET_TOKEN'));
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Password has been reset successfully. You may now sign in with your new password.'
      }
    });
  } catch (error) {
    next(error);
  }
};
