import config from '../config/env.js';
import { getAllowedOrigins, VERCEL_PREVIEW_REGEX } from '../utils/corsOrigins.js';

/**
 * Validates whether an incoming Origin string is well-formed, uses http/https,
 * and matches the trusted-origin allowlist.
 * Rejects 'null', malformed strings, and non-http/https schemes.
 */
export const validateOriginHeader = (origin, customConfig = null) => {
  if (!origin || origin === 'null' || typeof origin !== 'string') {
    return {
      valid: false,
      code: 'FORBIDDEN_ORIGIN',
      message: 'Cross-site request forgery validation failed: Origin is missing, null, or invalid'
    };
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return {
      valid: false,
      code: 'FORBIDDEN_ORIGIN',
      message: 'Cross-site request forgery validation failed: Malformed Origin header'
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      code: 'FORBIDDEN_ORIGIN',
      message: 'Cross-site request forgery validation failed: Untrusted Origin protocol'
    };
  }

  const normalized = parsed.origin;
  const allowedList = getAllowedOrigins(customConfig);
  const nodeEnv = customConfig?.NODE_ENV ?? config.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  let isAllowed = allowedList.includes(normalized);
  if (!isAllowed && !isProd && VERCEL_PREVIEW_REGEX.test(normalized)) {
    isAllowed = true;
  }

  if (!isAllowed) {
    return {
      valid: false,
      code: 'FORBIDDEN_ORIGIN',
      message: 'Cross-site request forgery validation failed: Untrusted Origin'
    };
  }

  return { valid: true, origin: normalized };
};

/**
 * Validates whether an incoming Referer string is well-formed, uses http/https,
 * and matches the trusted-origin allowlist.
 */
export const validateRefererHeader = (referer, customConfig = null) => {
  if (!referer || referer === 'null' || typeof referer !== 'string') {
    return {
      valid: false,
      code: 'CSRF_REFERER_INVALID',
      message: 'Cross-site request forgery validation failed: Referer is missing, null, or invalid'
    };
  }

  let parsed;
  try {
    parsed = new URL(referer);
  } catch {
    return {
      valid: false,
      code: 'CSRF_REFERER_INVALID',
      message: 'Cross-site request forgery validation failed: Malformed Referer header'
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      code: 'CSRF_REFERER_INVALID',
      message: 'Cross-site request forgery validation failed: Untrusted Referer protocol'
    };
  }

  const normalized = parsed.origin;
  const allowedList = getAllowedOrigins(customConfig);
  const nodeEnv = customConfig?.NODE_ENV ?? config.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  let isAllowed = allowedList.includes(normalized);
  if (!isAllowed && !isProd && VERCEL_PREVIEW_REGEX.test(normalized)) {
    isAllowed = true;
  }

  if (!isAllowed) {
    return {
      valid: false,
      code: 'CSRF_REFERER_INVALID',
      message: 'Cross-site request forgery validation failed: Untrusted Referer origin'
    };
  }

  return { valid: true, origin: normalized };
};

/**
 * Validates the presence and exact value of the X-Requested-With header.
 */
export const validateCustomHeader = (req) => {
  const headerValue = req.headers['x-requested-with'];
  if (!headerValue || headerValue !== 'XMLHttpRequest') {
    return {
      valid: false,
      code: 'CSRF_HEADER_MISSING',
      message: 'Cross-site request forgery validation failed: Missing or invalid X-Requested-With header'
    };
  }
  return { valid: true };
};

/**
 * Determines whether a route is an exact registered Razorpay webhook endpoint.
 * Supports trailing slash normalization. Does not match arbitrary subpaths or prefixes.
 */
export const isWebhookExempt = (req) => {
  if (req.method !== 'POST') return false;
  const rawPath = req.originalUrl || req.path || '';
  const pathname = rawPath.split('?')[0].replace(/\/+$/, '') || '/';
  return pathname === '/api/v1/payments/webhook' || pathname === '/api/v1/payments/razorpay/webhook';
};

/**
 * Enterprise-grade CSRF Protection Middleware for ShopSphere.
 * Enforces strict Origin / Referer validation and custom header requirements
 * for cookie-authenticated and state-changing HTTP requests.
 */
export const csrfProtection = (req, res, next) => {
  // 1. Safe HTTP methods (GET, HEAD, OPTIONS) are exempt from CSRF checks
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // 2. Exact registered Razorpay Webhook exemptions
  if (isWebhookExempt(req)) {
    return next();
  }

  // 3. Detect authentication cookies
  const hasAuthCookie = Boolean(
    (req.cookies && req.cookies.token) ||
    (req.signedCookies && req.signedCookies.token)
  );

  const authHeader = req.headers.authorization;
  const hasBearer = Boolean(authHeader && authHeader.startsWith('Bearer '));

  // 4. Bearer-only requests (no cookie present + Bearer header present)
  // Proceed directly to authentication middleware (non-browser or token-only clients)
  if (!hasAuthCookie && hasBearer) {
    return next();
  }

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  // 5. Cookie-authenticated requests (must be strictly protected against CSRF)
  if (hasAuthCookie) {
    // Both Origin and Referer absent -> Reject immediately
    if (!originHeader && !refererHeader) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ORIGIN',
          message: 'Cross-site request forgery validation failed: Missing Origin and Referer headers',
          details: []
        }
      });
    }

    // Validate Origin if present
    if (originHeader) {
      const originRes = validateOriginHeader(originHeader);
      if (!originRes.valid) {
        return res.status(403).json({
          success: false,
          error: {
            code: originRes.code,
            message: originRes.message,
            details: []
          }
        });
      }
    } else {
      // Fallback: Validate Referer if Origin is absent
      const refererRes = validateRefererHeader(refererHeader);
      if (!refererRes.valid) {
        return res.status(403).json({
          success: false,
          error: {
            code: refererRes.code,
            message: refererRes.message,
            details: []
          }
        });
      }
    }

    // Require custom header X-Requested-With: XMLHttpRequest
    const headerRes = validateCustomHeader(req);
    if (!headerRes.valid) {
      return res.status(403).json({
        success: false,
        error: {
          code: headerRes.code,
          message: headerRes.message,
          details: []
        }
      });
    }

    return next();
  }

  // 6. Unauthenticated requests (e.g. public endpoints: /login, /register, /forgot-password, /reset-password)
  // If Origin is present:
  if (originHeader) {
    const originRes = validateOriginHeader(originHeader);
    if (!originRes.valid) {
      return res.status(403).json({
        success: false,
        error: {
          code: originRes.code,
          message: originRes.message,
          details: []
        }
      });
    }

    const headerRes = validateCustomHeader(req);
    if (!headerRes.valid) {
      return res.status(403).json({
        success: false,
        error: {
          code: headerRes.code,
          message: headerRes.message,
          details: []
        }
      });
    }

    return next();
  }

  // If Origin is absent but Referer is present:
  if (refererHeader) {
    const refererRes = validateRefererHeader(refererHeader);
    if (!refererRes.valid) {
      return res.status(403).json({
        success: false,
        error: {
          code: refererRes.code,
          message: refererRes.message,
          details: []
        }
      });
    }

    const headerRes = validateCustomHeader(req);
    if (!headerRes.valid) {
      return res.status(403).json({
        success: false,
        error: {
          code: headerRes.code,
          message: headerRes.message,
          details: []
        }
      });
    }

    return next();
  }

  // Both Origin and Referer are absent with no auth cookie:
  // Preserve compatibility with legitimate non-browser clients (e.g., CLI, curl, native apps)
  return next();
};

export default csrfProtection;

