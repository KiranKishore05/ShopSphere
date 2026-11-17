import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import config from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import { checkDbReadiness } from './middleware/dbReadiness.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import { isOriginAllowed } from './utils/corsOrigins.js';

const app = express();

// Configure trusted proxy for accurate client IP detection and rate-limiting on Render / reverse proxies
// Trusts immediate reverse proxy (1 hop) by default, or respects TRUST_PROXY environment override
const trustProxyValue = isNaN(Number(config.TRUST_PROXY))
  ? (config.TRUST_PROXY === 'true' ? true : config.TRUST_PROXY === 'false' ? false : config.TRUST_PROXY)
  : Number(config.TRUST_PROXY);
app.set('trust proxy', trustProxyValue);

// Performance HTTP Compression (gzip / deflate)
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration with multi-origin and project-specific Vercel preview support
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    // Safely reject untrusted origins without raising internal 500 errors
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Razorpay-Signature']
}));

// Body & Cookie Parsers
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.COOKIE_SECRET));

// CSRF Protection for state-changing HTTP methods
app.use(csrfProtection);

// Structured HTTP Request Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Global API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'test' ? 10000 : config.NODE_ENV === 'development' ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again after 15 minutes',
      details: []
    }
  }
});
app.use('/api', generalLimiter);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'ShopSphere API Gateway',
      version: '1.0.0',
      description: 'Advanced Full-Stack Fashion E-Commerce REST API',
      documentation: '/docs',
      health: '/api/v1/health'
    }
  });
});

// Mount Health Check Routes
app.use(healthRoutes);

// Mount API v1 Routes (Database-dependent routes protected by checkDbReadiness)
app.use('/api/v1/auth', checkDbReadiness, authRoutes);
app.use('/api/v1/admin', checkDbReadiness, adminRoutes);
app.use('/api/v1/products', checkDbReadiness, productRoutes);
app.use('/api/v1/categories', checkDbReadiness, categoryRoutes);
app.use('/api/v1/cart', checkDbReadiness, cartRoutes);
app.use('/api/v1/wishlist', checkDbReadiness, wishlistRoutes);
app.use('/api/v1/users', checkDbReadiness, userRoutes);
app.use('/api/v1/orders', checkDbReadiness, orderRoutes);
app.use('/api/v1/coupons', checkDbReadiness, couponRoutes);
app.use('/api/v1/payments', checkDbReadiness, paymentRoutes);
app.use('/api/v1/reviews', checkDbReadiness, reviewRoutes);

// Base API v1 metadata route
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'ShopSphere API v1 Active',
      availableResources: [
        '/api/v1/health',
        '/api/v1/auth',
        '/api/v1/products',
        '/api/v1/categories',
        '/api/v1/cart',
        '/api/v1/wishlist',
        '/api/v1/users',
        '/api/v1/orders',
        '/api/v1/coupons',
        '/api/v1/payments',
        '/api/v1/reviews',
        '/api/v1/admin'
      ]
    }
  });
});

// 404 Route Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

export default app;
