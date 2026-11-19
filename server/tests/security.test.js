import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src/app.js';
import config, { validateEnv, createEnvSchema } from '../src/config/env.js';
import { generateToken, verifyToken, getCookieOptions, clearAuthCookie } from '../src/utils/token.js';
import { errorHandler, formatSafeErrorLog } from '../src/middleware/errorHandler.js';
import { createProductSchema, updateProductSchema } from '../src/validators/adminValidators.js';
import User from '../src/models/User.js';

describe('Phase 9 Stage 2: Security & Configuration Hardening Suite', () => {

  describe('1. Production Environment Validation & Secret Enforcement (env.js)', () => {
    const validProdEnv = {
      NODE_ENV: 'production',
      PORT: '10000',
      CLIENT_ORIGIN: 'https://shopsphere.vercel.app',
      MONGODB_URI: 'mongodb+srv://produser:StrongPassword987@cluster0.mongodb.net/shopsphere_prod',
      JWT_SECRET: 'd8f4c2e6b0a1f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4',
      COOKIE_SECRET: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      TRUST_PROXY: '1',
      EMAIL_TOKEN_SECRET: 'f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0987654321fedcba09876543210ab',
      EMAIL_PROVIDER: 'brevo',
      BREVO_API_KEY: 'xkeysib-test-prod-key-for-environment-validation-testing',
      EMAIL_WORKER_ENABLED: 'true'
    };

    it('should validate successfully when all production variables meet security criteria', () => {
      const res = validateEnv(validProdEnv);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.data.JWT_SECRET).toBe(validProdEnv.JWT_SECRET);
      expect(res.data.COOKIE_SECRET).toBe(validProdEnv.COOKIE_SECRET);
      expect(res.data.EMAIL_TOKEN_SECRET).toBe(validProdEnv.EMAIL_TOKEN_SECRET);
      expect(res.data.EMAIL_PROVIDER).toBe('brevo');
      expect(res.data.EMAIL_WORKER_ENABLED).toBe(true);
    });

    it('should fail production validation when JWT_SECRET is missing', () => {
      const env = { ...validProdEnv };
      delete env.JWT_SECRET;
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const jwtErr = res.errors.find(e => e.field === 'JWT_SECRET');
      expect(jwtErr).toBeDefined();
    });

    it('should fail production validation when JWT_SECRET is shorter than 32 characters', () => {
      const env = { ...validProdEnv, JWT_SECRET: 'too_short_secret_key' };
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const jwtErr = res.errors.find(e => e.field === 'JWT_SECRET');
      expect(jwtErr.message).toContain('at least 32 characters');
    });

    it('should reject development or placeholder JWT_SECRET values in production', () => {
      const env = { ...validProdEnv, JWT_SECRET: 'dev_jwt_secret_with_more_than_32_characters_long' };
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const jwtErr = res.errors.find(e => e.field === 'JWT_SECRET');
      expect(jwtErr.message).toContain('cannot use development or placeholder secrets');
    });

    it('should fail production validation when COOKIE_SECRET is missing or too short', () => {
      const env = { ...validProdEnv, COOKIE_SECRET: 'short_key' };
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const cookieErr = res.errors.find(e => e.field === 'COOKIE_SECRET');
      expect(cookieErr).toBeDefined();
    });

    it('should reject localhost or 127.0.0.1 MONGODB_URI in production', () => {
      const env = { ...validProdEnv, MONGODB_URI: 'mongodb://localhost:27017/shopsphere' };
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const dbErr = res.errors.find(e => e.field === 'MONGODB_URI');
      expect(dbErr.message).toContain('must not point to localhost in production');
    });

    it('should reject unreplaced placeholder credentials (<username>/<password>) in production MONGODB_URI', () => {
      const env = {
        ...validProdEnv,
        MONGODB_URI: 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/shopsphere'
      };
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const dbErr = res.errors.find(e => e.field === 'MONGODB_URI');
      expect(dbErr.message).toContain('unreplaced placeholder credentials');
    });

    it('should fail production validation when EMAIL_TOKEN_SECRET is missing', () => {
      const env = { ...validProdEnv };
      delete env.EMAIL_TOKEN_SECRET;
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const secretErr = res.errors.find(e => e.field === 'EMAIL_TOKEN_SECRET');
      expect(secretErr).toBeDefined();
    });

    it('should fail production validation when EMAIL_TOKEN_SECRET is shorter than 32 characters', () => {
      const env = { ...validProdEnv, EMAIL_TOKEN_SECRET: 'too_short_key_under_32_chars' };
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const secretErr = res.errors.find(e => e.field === 'EMAIL_TOKEN_SECRET');
      expect(secretErr.message).toContain('at least 32 characters');
    });

    it('should reject development or placeholder EMAIL_TOKEN_SECRET values in production', () => {
      const env = {
        ...validProdEnv,
        EMAIL_TOKEN_SECRET: 'dev_email_token_secret_shopsphere_min_32_characters_key'
      };
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const secretErr = res.errors.find(e => e.field === 'EMAIL_TOKEN_SECRET');
      expect(secretErr.message).toContain('cannot use development or placeholder secrets');
    });

    it('should reject EMAIL_PROVIDER=mock in production', () => {
      const env = { ...validProdEnv, EMAIL_PROVIDER: 'mock' };
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const providerErr = res.errors.find(e => e.field === 'EMAIL_PROVIDER');
      expect(providerErr).toBeDefined();
      expect(providerErr.message).toContain('cannot be \'mock\' in production');
    });

    it('should reject missing EMAIL_PROVIDER in production', () => {
      const env = { ...validProdEnv };
      delete env.EMAIL_PROVIDER;
      const res = validateEnv(env);
      expect(res.valid).toBe(false);
      const providerErr = res.errors.find(e => e.field === 'EMAIL_PROVIDER');
      expect(providerErr).toBeDefined();
    });

    it('should reject unsupported EMAIL_PROVIDER values like resend or smtp', () => {
      const envResend = { ...validProdEnv, EMAIL_PROVIDER: 'resend' };
      const res1 = validateEnv(envResend);
      expect(res1.valid).toBe(false);

      const devResend = validateEnv({ NODE_ENV: 'development', EMAIL_PROVIDER: 'smtp' });
      expect(devResend.valid).toBe(false);
    });

    it('should fail validation when EMAIL_PROVIDER is brevo but BREVO_API_KEY is missing or empty', () => {
      const envNoKey = { ...validProdEnv, EMAIL_PROVIDER: 'brevo', BREVO_API_KEY: '' };
      const res1 = validateEnv(envNoKey);
      expect(res1.valid).toBe(false);
      const keyErr = res1.errors.find(e => e.field === 'BREVO_API_KEY');
      expect(keyErr).toBeDefined();

      const envPlaceholder = { ...validProdEnv, EMAIL_PROVIDER: 'brevo', BREVO_API_KEY: 'placeholder_api_key' };
      const res2 = validateEnv(envPlaceholder);
      expect(res2.valid).toBe(false);
    });

    it('should parse EMAIL_WORKER_ENABLED boolean correctly across string and boolean formats', () => {
      const resTrue = validateEnv({ ...validProdEnv, EMAIL_WORKER_ENABLED: 'true' });
      expect(resTrue.valid).toBe(true);
      expect(resTrue.data.EMAIL_WORKER_ENABLED).toBe(true);

      const resFalse = validateEnv({ ...validProdEnv, EMAIL_WORKER_ENABLED: 'false' });
      expect(resFalse.valid).toBe(true);
      expect(resFalse.data.EMAIL_WORKER_ENABLED).toBe(false);

      const resZero = validateEnv({ ...validProdEnv, EMAIL_WORKER_ENABLED: '0' });
      expect(resZero.valid).toBe(true);
      expect(resZero.data.EMAIL_WORKER_ENABLED).toBe(false);

      const resOne = validateEnv({ ...validProdEnv, EMAIL_WORKER_ENABLED: '1' });
      expect(resOne.valid).toBe(true);
      expect(resOne.data.EMAIL_WORKER_ENABLED).toBe(true);

      const resBool = validateEnv({ ...validProdEnv, EMAIL_WORKER_ENABLED: false });
      expect(resBool.valid).toBe(true);
      expect(resBool.data.EMAIL_WORKER_ENABLED).toBe(false);

      const resInvalid = validateEnv({ ...validProdEnv, EMAIL_WORKER_ENABLED: 'not_a_boolean' });
      expect(resInvalid.valid).toBe(false);
    });

    it('should gracefully allow safe developer defaults in development and test environments', () => {
      const devRes = validateEnv({ NODE_ENV: 'development' });
      expect(devRes.valid).toBe(true);
      expect(devRes.data.JWT_SECRET).toBeDefined();
      expect(devRes.data.COOKIE_SECRET).toBeDefined();
      expect(devRes.data.MONGODB_URI).toBeDefined();

      const testRes = validateEnv({ NODE_ENV: 'test' });
      expect(testRes.valid).toBe(true);
    });
  });

  describe('2. Token Lifecycle & Verification Security (token.js)', () => {
    it('should generate a valid JWT token signed with JWT_SECRET', () => {
      const payload = { id: 'user_123', email: 'test@shopsphere.com', role: 'customer' };
      const token = generateToken(payload);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should reject tampered JWT signatures with JsonWebTokenError', () => {
      const token = generateToken({ id: 'user_123' });
      const tampered = token.slice(0, -6) + 'abcdef';
      expect(() => verifyToken(tampered)).toThrow();
    });

    it('should reject expired JWT tokens with TokenExpiredError', () => {
      const expiredToken = jwt.sign(
        { id: 'user_expired' },
        config.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });

  describe('3. Cookie Security Attributes & Clearing', () => {
    it('should configure HttpOnly, path, and maxAge on session cookie options', () => {
      const options = getCookieOptions();
      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
      expect(['lax', 'none']).toContain(options.sameSite);
    });

    it('should expire and clear authentication cookie immediately on logout', () => {
      const clearCookieSpy = vi.fn();
      const mockRes = { clearCookie: clearCookieSpy };

      clearAuthCookie(mockRes);

      expect(clearCookieSpy).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 0,
          expires: new Date(0)
        })
      );
    });
  });

  describe('4. Authentication & Authorization Middleware Protection (auth.js)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    });

    it('should reject protected endpoint requests without authentication with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject protected endpoint requests with an expired token with 401 TOKEN_EXPIRED', async () => {
      const expiredToken = jwt.sign(
        { id: 'user_expired', email: 'exp@shopsphere.com' },
        config.JWT_SECRET,
        { expiresIn: '-5s' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject deactivated / inactive customer accounts with 403 ACCOUNT_DEACTIVATED', async () => {
      const token = generateToken({ id: '507f1f77bcf86cd799439011', role: 'customer' });

      vi.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439011',
        name: 'Deactivated User',
        email: 'inactive@shopsphere.com',
        role: 'customer',
        isActive: false
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should reject regular customer access to admin routes with 403 FORBIDDEN', async () => {
      const customerToken = generateToken({ id: '507f1f77bcf86cd799439012', role: 'customer' });

      vi.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439012',
        name: 'Normal Customer',
        email: 'customer@shopsphere.com',
        role: 'customer',
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should permit authenticated administrator access to admin routes with 200 OK', async () => {
      const adminToken = generateToken({ id: '507f1f77bcf86cd799439013', role: 'admin' });

      vi.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439013',
        name: 'System Admin',
        email: 'admin@shopsphere.com',
        role: 'admin',
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.role).toBe('admin');
    });
  });

  describe('4.1. SEC-06-01: Password Reset Session Invalidation Suite', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    });

    it('1. should reject a token issued before a password reset (iat < passwordChangedAt)', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const oldIat = nowSec - 100;
      const tokenBeforeReset = jwt.sign(
        { id: '507f1f77bcf86cd799439050', role: 'customer', iat: oldIat },
        config.JWT_SECRET
      );

      vi.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439050',
        name: 'Reset Victim User',
        email: 'victim@shopsphere.com',
        role: 'customer',
        isActive: true,
        passwordChangedAt: new Date(nowSec * 1000)
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenBeforeReset}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Session invalidated due to a recent password reset');
    });

    it('2. should reject a token issued in the exact same second as password reset (same-second precision boundary)', async () => {
      const sameSecond = 1750000000;
      const sameSecondToken = jwt.sign(
        { id: '507f1f77bcf86cd799439051', role: 'customer', iat: sameSecond },
        config.JWT_SECRET
      );

      vi.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439051',
        name: 'Same Second User',
        email: 'samesecond@shopsphere.com',
        role: 'customer',
        isActive: true,
        passwordChangedAt: new Date(sameSecond * 1000 + 500)
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${sameSecondToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Session invalidated due to a recent password reset');
    });

    it('3. should accept a newly issued token after password reset (iat > passwordChangedAt)', async () => {
      const resetSec = 1750000000;
      const newIat = resetSec + 5;
      const tokenAfterReset = jwt.sign(
        { id: '507f1f77bcf86cd799439052', role: 'customer', iat: newIat },
        config.JWT_SECRET
      );

      vi.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439052',
        name: 'Post Reset User',
        email: 'postreset@shopsphere.com',
        role: 'customer',
        isActive: true,
        passwordChangedAt: new Date(resetSec * 1000)
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenAfterReset}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('postreset@shopsphere.com');
    });

    it('4. should allow existing users without passwordChangedAt to authenticate normally', async () => {
      const normalToken = generateToken({ id: '507f1f77bcf86cd799439053', role: 'customer' });

      vi.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439053',
        name: 'Legacy User',
        email: 'legacy@shopsphere.com',
        role: 'customer',
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${normalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('legacy@shopsphere.com');
    });

    it('5. should reject deactivated users even when a valid new token is presented', async () => {
      const resetSec = 1750000000;
      const newToken = jwt.sign(
        { id: '507f1f77bcf86cd799439054', role: 'customer', iat: resetSec + 10 },
        config.JWT_SECRET
      );

      vi.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439054',
        name: 'Banned Post Reset User',
        email: 'banned@shopsphere.com',
        role: 'customer',
        isActive: false,
        passwordChangedAt: new Date(resetSec * 1000)
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('6. should reject malformed or invalid JWT tokens with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer this_is_a_completely_invalid_token_string');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('5. Security Headers & Rate Limiting Enforcement', () => {
    it('should enforce security headers via Helmet (nosniff, frameguard, xssFilter)', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('should return rate-limiting headers on API endpoints', async () => {
      const res = await request(app)
        .get('/api/v1')
        .set('X-Forwarded-For', '198.51.100.99');

      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('6. Error Logging Security & Sensitive Information Exposure Protection (errorHandler.js)', () => {
    it('should never include query parameters or hash fragments in formatted error logs', () => {
      const mockReq = {
        method: 'POST',
        originalUrl: '/api/v1/orders/checkout?token=super_secret_jwt_123&signature=razorpay_sig#section',
      };
      const mockErr = new Error('Database write failed');

      const logProd = formatSafeErrorLog(mockErr, mockReq, 500, 'production', 'test-uuid-1');
      expect(logProd).not.toContain('token');
      expect(logProd).not.toContain('super_secret_jwt_123');
      expect(logProd).not.toContain('signature');
      expect(logProd).not.toContain('razorpay_sig');
      expect(logProd).not.toContain('?');
      expect(logProd).not.toContain('#');
      expect(logProd).toContain('/api/v1/orders/checkout');

      const logDev = formatSafeErrorLog(mockErr, mockReq, 500, 'development', 'test-uuid-2');
      expect(logDev).not.toContain('token');
      expect(logDev).not.toContain('super_secret_jwt_123');
      expect(logDev).not.toContain('?');
      expect(logDev).toContain('/api/v1/orders/checkout');
    });

    it('should never include raw error messages in production error logs', () => {
      const mockReq = {
        method: 'GET',
        originalUrl: '/api/v1/products',
      };
      const sensitiveErrMsg = 'MongoServerError: authentication failed for user "admin" with pass "SecretPass123"';
      const mockErr = new Error(sensitiveErrMsg);

      const log = formatSafeErrorLog(mockErr, mockReq, 500, 'production', 'test-uuid-prod');
      expect(log).not.toContain(sensitiveErrMsg);
      expect(log).not.toContain('SecretPass123');
      expect(log).not.toContain('MongoServerError');
      expect(log).toBe('[Internal Server Error] [test-uuid-prod] GET /api/v1/products (Status: 500)');
    });

    it('should preserve error message for development debugging without leaking query params', () => {
      const mockReq = {
        method: 'DELETE',
        originalUrl: '/api/v1/cart/items/item123?sensitive=abc',
      };
      const mockErr = new Error('Item not found in inventory stock');

      const log = formatSafeErrorLog(mockErr, mockReq, 500, 'development', 'test-uuid-dev');
      expect(log).toContain('Item not found in inventory stock');
      expect(log).not.toContain('sensitive=abc');
      expect(log).toContain('DELETE /api/v1/cart/items/item123');
    });

    it('should safely handle missing or empty request object without throwing', () => {
      const mockErr = new Error('Something broke');
      const log = formatSafeErrorLog(mockErr, null, 500, 'production', 'test-uuid-fallback');
      expect(log).toBe('[Internal Server Error] [test-uuid-fallback] UNKNOWN unknown (Status: 500)');
    });

    it('should sanitize client responses and never return internal stack traces in production', () => {
      const origEnv = config.NODE_ENV;
      config.NODE_ENV = 'production';

      const err = new Error('Raw sensitive driver error: failed to connect to Atlas cluster');
      const req = {
        method: 'POST',
        originalUrl: '/api/v1/payments/verify?secret=secret_payment_param',
      };
      let statusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (payload) => {
          responseBody = payload;
          return res;
        }
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        errorHandler(err, req, res, () => {});

        expect(statusCode).toBe(500);
        expect(responseBody.success).toBe(false);
        expect(responseBody.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(responseBody.error.message).toBe('An unexpected internal error occurred on the server');
        expect(responseBody.error.message).not.toContain('Atlas cluster');
        expect(responseBody.error.stack).toBeUndefined();

        // Check console.error was called with sanitized log
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        const loggedOutput = consoleErrorSpy.mock.calls[0][0];
        expect(loggedOutput).not.toContain('secret_payment_param');
        expect(loggedOutput).not.toContain('Atlas cluster');
        expect(loggedOutput).toContain('POST /api/v1/payments/verify (Status: 500)');
      } finally {
        config.NODE_ENV = origEnv;
        consoleErrorSpy.mockRestore();
      }
    });

    it('should expose stack traces to client only in development mode for debugging', () => {
      const origEnv = config.NODE_ENV;
      config.NODE_ENV = 'development';

      const err = new Error('Dev debugging error');
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/test',
      };
      let statusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (payload) => {
          responseBody = payload;
          return res;
        }
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        errorHandler(err, req, res, () => {});

        expect(statusCode).toBe(500);
        expect(responseBody.error.stack).toBeDefined();
        expect(responseBody.error.stack).toContain('Dev debugging error');
      } finally {
        config.NODE_ENV = origEnv;
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('7. Zod Collection Defense-in-Depth Hardening (adminValidators.js)', () => {
    const validProduct = {
      name: 'Linen Classic Shirt',
      description: 'Breathable classic cut linen shirt for everyday wear',
      categoryId: '507f1f77bcf86cd799439011',
      brand: 'ShopSphere Atelier',
      gender: 'men',
      tags: ['summer', 'linen', 'casual'],
      images: [
        { url: 'https://images.unsplash.com/photo-1.jpg', isPrimary: true }
      ],
      variants: [
        {
          sku: 'SHIRT-LINEN-WHT-M',
          size: 'M',
          color: { name: 'White', hexCode: '#FFFFFF' },
          price: 2499,
          stockQuantity: 15
        }
      ]
    };

    it('should accept valid products with collections within permitted size limits', () => {
      const parsed = createProductSchema.safeParse(validProduct);
      expect(parsed.success).toBe(true);
    });

    it('should reject product payloads with more than 50 tags', () => {
      const tooManyTags = Array.from({ length: 51 }, (_, i) => `tag-${i}`);
      const parsed = createProductSchema.safeParse({ ...validProduct, tags: tooManyTags });
      expect(parsed.success).toBe(false);
      const tagErr = parsed.error.errors.find(e => e.path.includes('tags'));
      expect(tagErr).toBeDefined();
      expect(tagErr.message).toContain('Tags cannot exceed 50 items');
    });

    it('should reject individual tag strings exceeding 50 characters', () => {
      const longTag = 'a'.repeat(51);
      const parsed = createProductSchema.safeParse({ ...validProduct, tags: [longTag] });
      expect(parsed.success).toBe(false);
      const tagErr = parsed.error.errors.find(e => e.path.includes('tags'));
      expect(tagErr).toBeDefined();
      expect(tagErr.message).toContain('Tag cannot exceed 50 characters');
    });

    it('should reject product payloads with more than 20 images', () => {
      const tooManyImages = Array.from({ length: 21 }, (_, i) => ({
        url: `https://images.unsplash.com/photo-${i}.jpg`
      }));
      const parsed = createProductSchema.safeParse({ ...validProduct, images: tooManyImages });
      expect(parsed.success).toBe(false);
      const imgErr = parsed.error.errors.find(e => e.path.includes('images'));
      expect(imgErr).toBeDefined();
      expect(imgErr.message).toContain('Images cannot exceed 20 items');
    });

    it('should reject product payloads with more than 100 variants', () => {
      const tooManyVariants = Array.from({ length: 101 }, (_, i) => ({
        sku: `SHIRT-SKU-${i}`,
        size: 'M',
        color: { name: 'White', hexCode: '#FFFFFF' },
        price: 1999,
        stockQuantity: 10
      }));
      const parsed = createProductSchema.safeParse({ ...validProduct, variants: tooManyVariants });
      expect(parsed.success).toBe(false);
      const variantErr = parsed.error.errors.find(e => e.path.includes('variants'));
      expect(variantErr).toBeDefined();
      expect(variantErr.message).toContain('Variants cannot exceed 100 items');
    });

    it('should preserve existing minimum collection constraints (images >= 1, variants >= 1)', () => {
      const noImages = createProductSchema.safeParse({ ...validProduct, images: [] });
      expect(noImages.success).toBe(false);
      expect(noImages.error.errors[0].message).toContain('At least one image is required');

      const noVariants = createProductSchema.safeParse({ ...validProduct, variants: [] });
      expect(noVariants.success).toBe(false);
      expect(noVariants.error.errors[0].message).toContain('At least one variant is required');
    });

    it('should enforce collection limits on updateProductSchema when collections are updated', () => {
      const updateTooManyImages = updateProductSchema.safeParse({
        images: Array.from({ length: 21 }, (_, i) => ({ url: `https://images.unsplash.com/photo-${i}.jpg` }))
      });
      expect(updateTooManyImages.success).toBe(false);
      expect(updateTooManyImages.error.errors[0].message).toContain('Images cannot exceed 20 items');

      const validPartialUpdate = updateProductSchema.safeParse({
        name: 'Updated Shirt Name',
        tags: ['spring', 'cotton']
      });
      expect(validPartialUpdate.success).toBe(true);
    });
  });

  // ============================================================================
  // 8. Production Log Privacy & Secret Masking Verification
  // ============================================================================
  describe('8. Production Log Privacy & Secret Masking Verification', () => {
    it('should strip query strings containing tokens or keys in formatted server error logs', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/auth/reset-password?token=secret_raw_token_xyz123&apiKey=xkeysib-live-key'
      };
      const err = new Error('Database connection failed');

      const log = formatSafeErrorLog(err, req, 500, 'production', 'test-err-id-1');
      expect(log).not.toContain('secret_raw_token_xyz123');
      expect(log).not.toContain('xkeysib-live-key');
      expect(log).toContain('/api/v1/auth/reset-password');
      expect(log).toContain('test-err-id-1');
    });

    it('should completely omit error.message and stack traces in production error logs', () => {
      const sensitiveLeakError = new Error(
        'MongoServerError: authentication failed for mongodb+srv://app_user:SuperSecretPassword123@cluster0.mongodb.net/shopsphere'
      );
      sensitiveLeakError.stack = 'Error: MongoServerError at TCPConnectWrap.afterConnect (node:net:1607:16)';

      const req = { method: 'POST', originalUrl: '/api/v1/orders/checkout' };
      const log = formatSafeErrorLog(sensitiveLeakError, req, 500, 'production', 'test-err-id-2');

      expect(log).not.toContain('SuperSecretPassword123');
      expect(log).not.toContain('mongodb+srv://');
      expect(log).not.toContain('TCPConnectWrap');
      expect(log).toContain('[Internal Server Error]');
      expect(log).toContain('POST /api/v1/orders/checkout (Status: 500)');
    });

    it('should never expose stack traces or raw error messages in production HTTP error responses', () => {
      const origEnv = config.NODE_ENV;
      config.NODE_ENV = 'production';

      const req = { method: 'POST', originalUrl: '/api/v1/payments/razorpay/verify' };
      let responseBody = {};
      let statusCode = 0;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => {
              responseBody = body;
            }
          };
        }
      };

      const internalError = new Error(
        'Razorpay key secret rzp_live_secret_999 rejected HMAC payload for signature abc123def456'
      );
      internalError.stack = 'Error at paymentController.js:180';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        errorHandler(internalError, req, res, () => {});

        expect(statusCode).toBe(500);
        expect(responseBody.error.stack).toBeUndefined();
        expect(responseBody.error.message).toBe('An unexpected internal error occurred on the server');
        expect(responseBody.error.message).not.toContain('rzp_live_secret_999');
      } finally {
        config.NODE_ENV = origEnv;
        consoleErrorSpy.mockRestore();
      }
    });

    it('should verify log sanitization in transactional email events and auth controllers', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const orderEmailEvents = await import('../src/services/email/orderEmailEvents.js');

      // 1. Password or secret in failure reason
      const rawLeakedReason = 'User entered secret=MyPassword123 in token header at node:internal/process';
      const sanitized = orderEmailEvents.sanitizeFailureReason(rawLeakedReason);

      expect(sanitized).not.toContain('MyPassword123');
      expect(sanitized).toBe('Payment authorization declined by issuing bank');

      // 2. Database URI in failure reason
      const mongoReason = 'MongoServerError: connection timed out to cluster mongodb+srv://app:pass@cluster.net';
      expect(orderEmailEvents.sanitizeFailureReason(mongoReason)).toBe('Payment authorization declined by issuing bank');

      warnSpy.mockRestore();
    });
  });

  describe('8. Account-Level Brute-Force Lockout Protection (SEC-06-02)', () => {
    it('should increment failedLoginAttempts and lock account after 5 failed attempts', async () => {
      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'victim@example.com',
        role: 'customer',
        isActive: true,
        failedLoginAttempts: 4,
        lockUntil: null,
        comparePassword: vi.fn().mockResolvedValue(false)
      };

      const findOneSpy = vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      });
      const updateOneSpy = vi.spyOn(User, 'updateOne').mockResolvedValue({ modifiedCount: 1 });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'victim@example.com', password: 'WrongPassword123!' });

      expect(res.status).toBe(423);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(res.body.error.message).toContain('Account is temporarily locked for 15 minutes');
      expect(updateOneSpy).toHaveBeenCalledWith(
        { _id: mockUser._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            failedLoginAttempts: 0,
            lockUntil: expect.any(Date)
          })
        })
      );

      findOneSpy.mockRestore();
      updateOneSpy.mockRestore();
    });

    it('should reject login with HTTP 423 while account lockUntil timestamp is active', async () => {
      const mockLockedUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'locked@example.com',
        role: 'customer',
        isActive: true,
        failedLoginAttempts: 0,
        lockUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes remaining
        comparePassword: vi.fn()
      };

      const findOneSpy = vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockLockedUser)
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'locked@example.com', password: 'AnyPassword123!' });

      expect(res.status).toBe(423);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(res.body.error.message).toContain('Account is temporarily locked');
      expect(mockLockedUser.comparePassword).not.toHaveBeenCalled();

      findOneSpy.mockRestore();
    });

    it('should reset failed login attempts upon successful authentication', async () => {
      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Recovered User',
        email: 'recovered@example.com',
        role: 'customer',
        isActive: true,
        failedLoginAttempts: 3,
        lockUntil: null,
        comparePassword: vi.fn().mockResolvedValue(true)
      };

      const findOneSpy = vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      });
      const updateOneSpy = vi.spyOn(User, 'updateOne').mockResolvedValue({ modifiedCount: 1 });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'recovered@example.com', password: 'CorrectPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(updateOneSpy).toHaveBeenCalledWith(
        { _id: mockUser._id },
        { $set: { failedLoginAttempts: 0, lockUntil: null } }
      );

      findOneSpy.mockRestore();
      updateOneSpy.mockRestore();
    });
  });

  describe('9. Password Complexity Validation Rules (SEC-06-04)', () => {
    it('should reject registration when password lacks uppercase characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const issue = res.body.error.details.find(d => d.field === 'password');
      expect(issue).toBeDefined();
      expect(issue.issue).toContain('uppercase letter');
    });

    it('should reject registration when password lacks special characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const issue = res.body.error.details.find(d => d.field === 'password');
      expect(issue).toBeDefined();
      expect(issue.issue).toContain('special character');
    });

    it('should reject registration when password lacks numeric digits', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'PasswordSecret!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const issue = res.body.error.details.find(d => d.field === 'password');
      expect(issue).toBeDefined();
      expect(issue.issue).toContain('number');
    });
  });
});
