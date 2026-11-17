import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getMe, forgotPassword, resetPassword } from '../controllers/authController.js';
import { validateBody, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/authValidators.js';
import { protect } from '../middleware/auth.js';
import config from '../config/env.js';

const router = Router();

// Strict rate limiter for sensitive authentication entrypoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      details: []
    }
  }
});

router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// Customer Password Reset Routes
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), resetPassword);

export default router;
