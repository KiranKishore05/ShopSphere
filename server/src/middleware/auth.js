import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';
import { AppError } from './errorHandler.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check signed or unsigned cookies
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.signedCookies && req.signedCookies.token) {
      token = req.signedCookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      // Authorization Bearer header fallback
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. Please sign in to continue.', 401, 'UNAUTHORIZED'));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
      }
      return next(new AppError('Invalid authentication session.', 401, 'UNAUTHORIZED'));
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this session no longer exists.', 401, 'UNAUTHORIZED'));
    }

    if (!currentUser.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    // Verify token was not issued prior to or during a password reset (SEC-06-01)
    if (currentUser.passwordChangedAt) {
      const passwordChangedSeconds = Math.floor(currentUser.passwordChangedAt.getTime() / 1000);
      // JWT `iat` is an integer expressed in seconds, while JavaScript Date timestamps have millisecond precision.
      // An old session token issued in the same second as the password change will have
      // `decoded.iat === passwordChangedSeconds`.
      // Using `<=` ensures that any token issued at or before that second is strictly invalidated,
      // preventing an old session issued in the same second from accidentally remaining valid.
      // Newly authenticated sessions issued after the password reset will have `decoded.iat > passwordChangedSeconds`.
      if (decoded.iat <= passwordChangedSeconds) {
        return next(
          new AppError('Session invalidated due to a recent password reset. Please sign in again.', 401, 'UNAUTHORIZED')
        );
      }
    }

    // Attach authenticated user to request
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Access denied: You do not possess administrative permissions for this resource.', 403, 'FORBIDDEN'));
    }
    next();
  };
};
