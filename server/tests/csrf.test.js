import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import config from '../src/config/env.js';
import { generateToken } from '../src/utils/token.js';
import {
  csrfProtection,
  validateOriginHeader,
  validateRefererHeader,
  validateCustomHeader,
  isWebhookExempt
} from '../src/middleware/csrfProtection.js';
import { isOriginAllowed, getAllowedOrigins, VERCEL_PREVIEW_REGEX } from '../src/utils/corsOrigins.js';
import Order from '../src/models/Order.js';
import Cart from '../src/models/Cart.js';
import Payment from '../src/models/Payment.js';
import User from '../src/models/User.js';

describe('Phase 6.4A: CSRF Protection & Origin Validation Test Suite', () => {
  const validCustomerPayload = {
    id: new mongoose.Types.ObjectId().toString(),
    email: 'customer@example.com',
    role: 'customer'
  };
  const validToken = generateToken(validCustomerPayload);
  const validCookie = `token=${validToken}`;
  const trustedOrigin = 'https://shopsphere.vercel.app';
  const untrustedOrigin = 'https://attacker.com';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Mandatory Core Regression Tests (CSRF-REG-01 through CSRF-REG-08)
  // ==========================================================================
  describe('Mandatory Core Regression Tests (CSRF-REG-01 to CSRF-REG-08)', () => {
    /**
     * CSRF-REG-01: Invalid Cookie + Valid Bearer Token
     * Request with invalid cookie and valid bearer from untrusted origin must be rejected with 403.
     * Ambient cookie presence mandates strict CSRF validation. Cart & order must not be mutated.
     */
    it('CSRF-REG-01: should reject POST /api/v1/orders/checkout with 403 when ambient cookie is present with untrusted Origin despite valid Bearer token', async () => {
      const orderCreateSpy = vi.spyOn(Order, 'create');
      const cartUpdateSpy = vi.spyOn(Cart, 'updateOne');

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', 'token=expired_or_invalid_jwt_cookie')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Origin', untrustedOrigin)
        .set('Content-Type', 'application/json')
        .send({ paymentMethod: 'cod', shippingAddressId: new mongoose.Types.ObjectId().toString() });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
      expect(orderCreateSpy).not.toHaveBeenCalled();
      expect(cartUpdateSpy).not.toHaveBeenCalled();
    });

    /**
     * CSRF-REG-02: Malformed Referer
     * Unsafe wishlist request with valid cookie, absent Origin, and malformed Referer suffix attack.
     * Expected: 403 Forbidden. Wishlist remains unmodified.
     */
    it('CSRF-REG-02: should reject unsafe request with 403 when Origin is absent and Referer is a suffix spoof attempt', async () => {
      const userSpy = vi.spyOn(User, 'findByIdAndUpdate');

      const res = await request(app)
        .put('/api/v1/wishlist/items')
        .set('Cookie', validCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Referer', 'https://shopsphere.vercel.app.attacker.com/account/wishlist')
        .set('Content-Type', 'application/json')
        .send({ productId: new mongoose.Types.ObjectId().toString() });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CSRF_REFERER_INVALID');
      expect(userSpy).not.toHaveBeenCalled();
    });

    /**
     * CSRF-REG-03: Trusted Origin Without Custom Header
     * POST checkout with valid cookie and trusted origin but missing X-Requested-With.
     * Expected: HTTP 403 CSRF_HEADER_MISSING. No order created.
     */
    it('CSRF-REG-03: should reject POST /api/v1/orders/checkout with 403 when trusted Origin is present but X-Requested-With is missing', async () => {
      const orderCreateSpy = vi.spyOn(Order, 'create');

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', validCookie)
        .set('Origin', trustedOrigin)
        .set('Content-Type', 'application/json')
        .send({ paymentMethod: 'cod', shippingAddressId: new mongoose.Types.ObjectId().toString() });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CSRF_HEADER_MISSING');
      expect(orderCreateSpy).not.toHaveBeenCalled();
    });

    /**
     * CSRF-REG-04: URL-Encoded Checkout Form Attack
     * POST checkout with application/x-www-form-urlencoded from trusted origin without custom header.
     * Expected: HTTP 403. No order or inventory mutation.
     */
    it('CSRF-REG-04: should reject URL-encoded simple form POST with 403 when custom header is omitted', async () => {
      const orderCreateSpy = vi.spyOn(Order, 'create');

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', validCookie)
        .set('Origin', trustedOrigin)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('paymentMethod=cod&shippingAddressId=64b7f1234567890abcdef123');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CSRF_HEADER_MISSING');
      expect(orderCreateSpy).not.toHaveBeenCalled();
    });

    /**
     * CSRF-REG-05: Exact Razorpay Webhook Exemption
     * POST to registered webhook routes (/api/v1/payments/webhook and /api/v1/payments/razorpay/webhook/).
     * Expected: CSRF middleware must not reject with 403; requests pass through cleanly.
     */
    it('CSRF-REG-05: should exempt exact registered Razorpay webhook endpoints including trailing slashes', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
      vi.spyOn(Payment, 'findOne').mockResolvedValue(null);

      const eventPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_exempt_123',
              order_id: 'order_test_exempt_123',
              amount: 500000,
              currency: 'INR',
              status: 'captured'
            }
          }
        }
      };

      const rawBody = JSON.stringify(eventPayload);
      const signature = crypto
        .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      // Test endpoint 1: /api/v1/payments/webhook
      const res1 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('ok');

      // Test endpoint 2: /api/v1/payments/razorpay/webhook/ (with trailing slash)
      const res2 = await request(app)
        .post('/api/v1/payments/razorpay/webhook/')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('ok');
    });

    /**
     * CSRF-REG-06: Webhook-Like Path Spoofing
     * POST /api/v1/payments/webhook-spoof with cookie and untrusted Origin.
     * Expected: Never treated as an exempt webhook; rejected by CSRF with 403.
     */
    it('CSRF-REG-06: should NOT exempt spoofed webhook path /api/v1/payments/webhook-spoof and must reject with 403', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhook-spoof')
        .set('Cookie', validCookie)
        .set('Origin', untrustedOrigin)
        .set('Content-Type', 'application/json')
        .send({ fake: 'data' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
    });

    /**
     * CSRF-REG-07: Missing Raw Body Webhook (Regression Boundary Test)
     * Confirms CSRF middleware does not interfere with webhook route execution or raw-body capture.
     */
    it('CSRF-REG-07: should allow webhook routes without CSRF interference, reaching webhook controller handler', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

      // Webhook request without signature returns 400 from paymentController, confirming CSRF passed it through
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .send({ test: 'payload' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing x-razorpay-signature header');
    });

    /**
     * CSRF-REG-08: Forgot Password Origin Enforcement
     * POST /api/v1/auth/forgot-password from untrusted origin.
     * Expected: HTTP 403 FORBIDDEN_ORIGIN. No password reset token generated or email sent.
     */
    it('CSRF-REG-08: should reject POST /api/v1/auth/forgot-password with 403 when Origin is untrusted', async () => {
      const userFindSpy = vi.spyOn(User, 'findOne');

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .set('Origin', untrustedOrigin)
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Content-Type', 'application/json')
        .send({ email: 'target_customer@example.com' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
      expect(userFindSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 2. Additional Required CSRF & Origin Validation Tests
  // ==========================================================================
  describe('Additional Required CSRF & Origin Validation Cases', () => {
    it('1. should allow request when trusted Origin, valid custom header, and valid cookie are provided', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', validCookie)
        .set('Origin', trustedOrigin)
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Content-Type', 'application/json')
        .send({});

      // Passes CSRF and proceeds past CSRF middleware (returns 503 db readiness or downstream response, NOT 403)
      expect(res.status).not.toBe(403);
    });

    it('2. should reject cookie-authenticated request when both Origin and Referer are missing', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', validCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
    });

    it('3. should allow request when Origin is absent but trusted Referer and valid custom header are present', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', validCookie)
        .set('Referer', `${trustedOrigin}/checkout`)
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).not.toBe(403);
    });

    it('4. should reject request with literal Origin: null', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', validCookie)
        .set('Origin', 'null')
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
    });

    it('5. should reject request with malformed Origin string', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', validCookie)
        .set('Origin', 'not-a-valid-url')
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
    });

    it('6. should reject request when trusted Origin is present but custom header has invalid value', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', validCookie)
        .set('Origin', trustedOrigin)
        .set('X-Requested-With', 'Fetch') // Incorrect value
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CSRF_HEADER_MISSING');
    });

    it('7. should reject request with Cookie + Bearer + untrusted Origin', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Cookie', validCookie)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Origin', untrustedOrigin)
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
    });

    it('8. should allow Bearer-only requests to proceed to authentication middleware without CSRF rejection', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/json')
        .send({});

      // Proceeds past CSRF middleware directly to auth/order validator
      expect(res.status).not.toBe(403);
    });

    it('9. should preserve compatibility for public login requests from CLI/mobile clients (no Origin, no Referer, no cookie)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send({ email: 'nonexistent@example.com', password: 'Password123!' });

      // Proceeds past CSRF to auth controller (returns 503 or 401, not 403 CSRF)
      expect(res.status).not.toBe(403);
    });

    it('10. should allow safe GET requests without CSRF validation', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', validCookie)
        .set('Origin', untrustedOrigin);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('11. should allow OPTIONS preflight requests without CSRF interference', async () => {
      const res = await request(app)
        .options('/api/v1/orders/checkout')
        .set('Origin', trustedOrigin)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
    });

    it('12. should NOT accept arbitrary shopsphere-*.vercel.app preview origins in production', () => {
      const prodConfig = {
        NODE_ENV: 'production',
        CLIENT_ORIGIN: 'https://shopsphere.vercel.app'
      };

      // Attacker registering a rogue preview URL
      const roguePreview = 'https://shopsphere-evil-attacker.vercel.app';
      expect(isOriginAllowed(roguePreview, prodConfig)).toBe(false);

      // Validate directly with validateOriginHeader
      const originRes = validateOriginHeader(roguePreview, prodConfig);
      expect(originRes.valid).toBe(false);
      expect(originRes.code).toBe('FORBIDDEN_ORIGIN');
    });

    it('13. should accept exact explicitly configured origins in production', () => {
      const prodConfig = {
        NODE_ENV: 'production',
        CLIENT_ORIGIN: 'https://shopsphere.vercel.app',
        ALLOWED_ORIGINS: 'https://admin.shopsphere.com,https://partners.shopsphere.com'
      };

      expect(isOriginAllowed('https://shopsphere.vercel.app', prodConfig)).toBe(true);
      expect(isOriginAllowed('https://admin.shopsphere.com', prodConfig)).toBe(true);
      expect(isOriginAllowed('https://partners.shopsphere.com', prodConfig)).toBe(true);
      expect(isOriginAllowed('https://other.shopsphere.com', prodConfig)).toBe(false);
    });

    it('14. should preserve development localhost behaviour consistent with development configuration', () => {
      const devConfig = {
        NODE_ENV: 'development',
        CLIENT_ORIGIN: 'http://localhost:5173'
      };

      expect(isOriginAllowed('http://localhost:5173', devConfig)).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:5173', devConfig)).toBe(true);
      expect(isOriginAllowed('http://localhost:4173', devConfig)).toBe(true);

      // But in production, localhost defaults are stripped
      const prodConfig = {
        NODE_ENV: 'production',
        CLIENT_ORIGIN: 'https://shopsphere.vercel.app'
      };
      expect(isOriginAllowed('http://localhost:5173', prodConfig)).toBe(false);
      expect(isOriginAllowed('http://127.0.0.1:5173', prodConfig)).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Unit Validation Functions Coverage
  // ==========================================================================
  describe('Unit Validation Functions (csrfProtection.js)', () => {
    it('validateOriginHeader should reject non-string, null, or empty origins', () => {
      expect(validateOriginHeader(null).valid).toBe(false);
      expect(validateOriginHeader(undefined).valid).toBe(false);
      expect(validateOriginHeader('').valid).toBe(false);
      expect(validateOriginHeader('null').valid).toBe(false);
      expect(validateOriginHeader(12345).valid).toBe(false);
    });

    it('validateOriginHeader should reject dangerous protocols like javascript: or data:', () => {
      expect(validateOriginHeader('javascript:alert(1)').valid).toBe(false);
      expect(validateOriginHeader('data:text/html;base64,PHNjcmlwdD4=').valid).toBe(false);
    });

    it('validateRefererHeader should reject non-string, null, or empty referers', () => {
      expect(validateRefererHeader(null).valid).toBe(false);
      expect(validateRefererHeader(undefined).valid).toBe(false);
      expect(validateRefererHeader('').valid).toBe(false);
      expect(validateRefererHeader('null').valid).toBe(false);
    });

    it('validateCustomHeader should reject missing or non-XMLHttpRequest headers', () => {
      expect(validateCustomHeader({ headers: {} }).valid).toBe(false);
      expect(validateCustomHeader({ headers: { 'x-requested-with': 'axios' } }).valid).toBe(false);
      expect(validateCustomHeader({ headers: { 'x-requested-with': 'xmlhttprequest' } }).valid).toBe(false);
      expect(validateCustomHeader({ headers: { 'x-requested-with': 'XMLHttpRequest' } }).valid).toBe(true);
    });

    it('isWebhookExempt should strictly match registered webhook endpoints', () => {
      expect(isWebhookExempt({ method: 'POST', originalUrl: '/api/v1/payments/webhook' })).toBe(true);
      expect(isWebhookExempt({ method: 'POST', originalUrl: '/api/v1/payments/webhook/' })).toBe(true);
      expect(isWebhookExempt({ method: 'POST', originalUrl: '/api/v1/payments/razorpay/webhook' })).toBe(true);
      expect(isWebhookExempt({ method: 'POST', originalUrl: '/api/v1/payments/razorpay/webhook/' })).toBe(true);
      expect(isWebhookExempt({ method: 'POST', originalUrl: '/api/v1/payments/razorpay/webhook?query=1' })).toBe(true);

      // Rejections
      expect(isWebhookExempt({ method: 'GET', originalUrl: '/api/v1/payments/webhook' })).toBe(false);
      expect(isWebhookExempt({ method: 'POST', originalUrl: '/api/v1/payments/webhook-spoof' })).toBe(false);
      expect(isWebhookExempt({ method: 'POST', originalUrl: '/api/v1/orders/webhook' })).toBe(false);
      expect(isWebhookExempt({ method: 'POST', originalUrl: '/api/v1/payments' })).toBe(false);
    });
  });
});
